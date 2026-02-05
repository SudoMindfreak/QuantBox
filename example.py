# -*- coding: utf-8 -*-
"""
🌊 Polymarket Volatility Hunter Simulator
=======================================
Based on Gabagool V21.9 logic + Strike Momentum WS Architecture

Strategy:
- Calculates Dynamic Threshold based on recent volatility
- Threshold = (Prev_15m_High - Prev_15m_Low) * K
- Enters when |Price - Strike| > Dynamic_Threshold
- Uses WebSockets for real-time execution (FOK orders)

Parameters:
- VOLATILITY_K: Sensitivity multiplier
- MIN_DIFF_LIMIT: Safety floor for threshold
"""

import os
import sys
import asyncio
import json
import logging
import time
import math
import uuid
from datetime import datetime
from collections import defaultdict
import websockets
import aiohttp

# Platform libraries (structure kept for potential real trading)
from py_clob_client.clob_types import OrderType
from py_clob_client.order_builder.constants import BUY, SELL

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("VolatilityHunterSim")

# Constants
HOST = "https://clob.polymarket.com"
POLY_WS_HOST = "wss://ws-subscriptions-clob.polymarket.com/ws"
BINANCE_API = "https://api.binance.com/api/v3"

def parse_iso_date(date_str):
    if not date_str: return None
    if date_str.endswith('Z'): date_str = date_str[:-1] + '+00:00'
    try: return datetime.fromisoformat(date_str)
    except: return None


class VolatilityBot:
    def __init__(self):
        self.running = True
        
        # Load Config from Env
        self.initial_market_url = os.getenv("INITIAL_MARKET_URL") or os.getenv("MARKET_SLUG")
        
        # Simulation Config
        self.simulation_id = os.getenv("SIMULATION_ID")
        self.api_url = os.getenv("API_URL")
        self.inventory = defaultdict(float)      # {asset_id: shares}
        self.inventory_cost = defaultdict(float) # {asset_id: total_cost_usdc}
        self.realized_pnl = 0.0
        self.open_sim_orders = {} # {order_id: {asset, price, size, side, type}}
        
        # Identify Slug
        self.slug = self._extract_slug(self.initial_market_url)
        self.ws = None
        self.lock = asyncio.Lock()
        
        # Market State
        self.active_market_id = None
        self.market_end = 0
        self.market_start = 0 
        self.asset_ids = []
        self.asset_map = {} 
        self.ws_tasks = []
        self.bull_id = None
        self.bear_id = None
        
        # Strategy State
        self.state = "SEARCHING"
        self.strike_price = 0.0
        self.cumulative_cost = 0.0
        self.stop_triggered = False
        self.cooldown_until = 0.0
        
        # Binance Data
        self.current_binance_price = 0.0
        self.dynamic_threshold = 2.0  # Will be updated
        self.last_vol_range = 0.0
        self.last_vol_check = 0
        
        # Parameters
        self.initial_capital = float(os.getenv("INITIAL_CAPITAL") or "2000.0")
        self.balance = self.initial_capital
        
        self.binance_pair = (os.getenv("BINANCE_PAIR") or "BTCUSDT").upper()
        self.binance_symbol = self.binance_pair
        
        # Volatility Params
        self.volatility_k = float(os.getenv("VOLATILITY_K") or "0.6")
        self.min_diff_limit = float(os.getenv("MIN_DIFF_LIMIT") or "2.0")
        
        # Trading Params
        self.base_qty = int(os.getenv("BASE_QTY") or "10")
        self.max_risk_per_round = float(os.getenv("MAX_RISK_PER_ROUND") or "50.0")
        self.max_chase_price = float(os.getenv("MAX_CHASE_PRICE") or "0.95")
        self.closing_buffer_seconds = int(os.getenv("CLOSING_BUFFER_SECONDS") or "30")
        self.cooldown_seconds = 2.0

        self.latest_prices = {}  # {asset_id: {ask, bid}}

        logger.info("🌊 VOLATILITY HUNTER SIMULATION INITIALIZED")
        logger.info(f"💰 Capital: ${self.initial_capital} | 📦 Qty: {self.base_qty}")
        logger.info(f"🌊 Volatility K: {self.volatility_k} | Min Limit: {self.min_diff_limit}")
        logger.info(f"📊 Asset: {self.binance_pair}")

    def _extract_slug(self, url):
        if not url: return None
        clean_url = url.split("?")[0]
        if "/" in clean_url: return clean_url.rstrip("/").split("/")[-1]
        return clean_url

    def _sanitize(self, val, decimals=2):
        factor = 10 ** decimals
        return math.floor(float(val) * factor) / factor

    async def _update_volatility_threshold(self):
        """Calculates dynamic threshold based on previous 15m candle range."""
        try:
            url = f"{BINANCE_API}/klines"
            params = {
                "symbol": self.binance_symbol,
                "interval": "15m",
                "limit": 2 
            }
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=5) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data and len(data) >= 2:
                            # Use the previously COMPLETED candle (index 0)
                            # Data format: [OpenTime, Open, High, Low, Close, ...]
                            prev_candle = data[0]
                            high = float(prev_candle[2])
                            low = float(prev_candle[3])
                            
                            vol_range = high - low
                            calculated_thresh = vol_range * self.volatility_k
                            
                            # Safety floor
                            self.dynamic_threshold = max(calculated_thresh, self.min_diff_limit)
                            self.last_vol_range = vol_range
                            self.last_vol_check = time.time()
                            
                            logger.info(f"🌊 Volatility Update: Range ${vol_range:.2f} -> Threshold ${self.dynamic_threshold:.2f}")
        except Exception as e:
            logger.warning(f"⚠️ Failed to update volatility: {e}")

    async def fetch_market(self):
        try:
            logger.info(f"Fetching market for slug: {self.slug}")
            url = f"https://gamma-api.polymarket.com/events?slug={self.slug}"
            async with aiohttp.ClientSession(trust_env=True) as session:
                async with session.get(url) as response:
                    if response.status != 200: return False
                    data = await response.json()
            
            if not data or not isinstance(data, list) or len(data) == 0: return False
            event = data[0]
            if not event.get('markets'): return False

            market = event['markets'][0]
            self.market_details = market
            self.active_market_id = market['conditionId']
            
            clob_tokens = market.get('clobTokenIds')
            if isinstance(clob_tokens, str): self.asset_ids = json.loads(clob_tokens)
            elif isinstance(clob_tokens, list): self.asset_ids = clob_tokens
            else:
                self.asset_ids = []
            
            outcomes = json.loads(market.get('outcomes', '[]'))
            for idx, tid in enumerate(self.asset_ids):
                if idx < len(outcomes): self.asset_map[tid] = outcomes[idx]
            
            self.bull_id = None
            self.bear_id = None
            for tid, name in self.asset_map.items():
                n = name.lower()
                if self.bull_id is None and (n == "yes" or n == "up"):
                    self.bull_id = tid
                elif self.bear_id is None and (n == "no" or n == "down"):
                    self.bear_id = tid
            
            if self.bull_id and self.bear_id:
                logger.info(f"✅ Sides Identified: UP={self.bull_id} | DOWN={self.bear_id}")
                await self._warmup_prices()
            else:
                logger.warning(f"⚠️ Could not identify YES/UP vs NO/DOWN in: {self.asset_map}")

            end_date_str = market.get('endDate')
            if end_date_str:
                dt_end = parse_iso_date(end_date_str)
                if dt_end: 
                    self.market_end = dt_end.timestamp()
                    self.market_start = self.market_end - 900  # 15 minutes before

            logger.info(f"Found Market: {market['question']}")
            
            # 1. Fetch Strike Price (15m OPEN)
            await self._fetch_strike_price()
            
            # 2. Initial Volatility Calculation
            await self._update_volatility_threshold()
            
            return True
        except Exception as e:
            logger.error(f"Error fetching market: {e}")
            return False

    async def _fetch_strike_price(self):
        try:
            start_time_ms = int(self.market_start * 1000)
            url = f"{BINANCE_API}/klines"
            params = {
                "symbol": self.binance_symbol,
                "interval": "15m",
                "startTime": start_time_ms,
                "limit": 1
            }
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=5) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data and len(data) > 0:
                            candle = data[0]
                            self.strike_price = float(candle[1])  # OPEN price
                            logger.info(f"🎯 Strike Price (15m OPEN): ${self.strike_price:.2f}")
                            return
            logger.warning("⚠️ Could not fetch strike price from Binance")
        except Exception as e:
            logger.error(f"Strike price fetch error: {e}")

    async def _warmup_prices(self):
        """Fetches initial orderbook snapshot via REST (Sorted)."""
        logger.info(f"🔥 Warming up order books... Assets: {self.asset_ids}")
        async with aiohttp.ClientSession() as session:
            for tid in self.asset_ids:
                try:
                    url = f"{HOST}/book?token_id={tid}"
                    async with session.get(url) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            asks = data.get("asks", [])
                            bids = data.get("bids", [])
                            if asks and bids:
                                asks.sort(key=lambda x: float(x["price"]))
                                bids.sort(key=lambda x: float(x["price"]), reverse=True)
                                await self._update_prices({"asset_id": tid, "asks": asks, "bids": bids})
                except Exception: pass

    async def _place_order(self, token_id, price, size, side, order_type=OrderType.FOK):
        order_id = str(uuid.uuid4())
        limit_price = self._sanitize(price, 2)
        safe_qty = self._sanitize(size, 2)
        
        asset_name = self.asset_map.get(token_id, token_id[:8])
        logger.info(f"🧪 SIM ORDER: {side} {safe_qty} {asset_name} @ {limit_price} ({order_type})")

        # FOK Logic
        if order_type == OrderType.FOK:
            prices = self.latest_prices.get(token_id)
            if not prices: return None
            
            market_price = prices["ask"] if side == BUY else prices["bid"]
            can_fill = False
            if side == BUY and market_price <= limit_price: can_fill = True
            if side == SELL and market_price >= limit_price: can_fill = True
            
            if can_fill:
                await self._execute_sim_fill(token_id, side, limit_price, safe_qty)
                return order_id
            return None
        
        return None

    async def _report_sim_trade(self, asset_id, side, price, size, pnl=None):
        if not self.api_url or not self.simulation_id: return
        try:
            label = self.asset_map.get(asset_id, asset_id[:8])
            payload = {"assetId": label, "side": side, "price": price, "size": size, "pnl": pnl}
            url = f"{self.api_url}/simulations/{self.simulation_id}/trade"
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as resp:
                    pass
        except: pass

    async def _execute_sim_fill(self, asset_id, side, price, size):
        val = size * price
        asset_name = self.asset_map.get(asset_id, asset_id[:5])
        
        if side == BUY:
            if self.balance < val: return
            self.balance -= val
            self.cumulative_cost += val
            self.inventory[asset_id] += size
            self.inventory_cost[asset_id] += val
            logger.info(f"💸 SIM BUY FILL: {size} {asset_name} @ {price} | Cost: ${val:.2f} | Bal: ${self.balance:.2f}")
        else:
            avg_cost = 0
            if self.inventory[asset_id] > 0:
                avg_cost = self.inventory_cost[asset_id] / self.inventory[asset_id]
            
            realized = val - (size * avg_cost)
            self.realized_pnl += realized
            self.balance += val
            self.inventory[asset_id] -= size
            if self.inventory[asset_id] <= 0: self.inventory_cost[asset_id] = 0
            else: self.inventory_cost[asset_id] -= (size * avg_cost)
            
            logger.info(f"💰 SIM SELL FILL: {size} {asset_name} @ {price} | PnL: ${realized:.2f}")
        
        await self._report_sim_trade(asset_id, side, price, size, pnl=realized if side == SELL else None)

    async def _update_prices(self, data):
        asset_id = data.get("asset_id")
        if not asset_id or not data.get("asks") or not data.get("bids"): return

        best_ask = float(min(data["asks"], key=lambda x: float(x["price"]))["price"])
        best_bid = float(max(data["bids"], key=lambda x: float(x["price"]))["price"])
        
        self.latest_prices[asset_id] = {"ask": best_ask, "bid": best_bid}

    async def execute_strategy(self):
        """
        Check for entry signals using dynamic threshold.
        """
        if self.state != "SEARCHING": return
        if not self.strike_price or self.strike_price <= 0: return
        if not self.bull_id or not self.bear_id: return
        if time.time() < self.cooldown_until: return
        
        # Circuit Breaker
        if self.cumulative_cost >= self.max_risk_per_round:
            if not self.stop_triggered:
                logger.warning(f"🛑 CIRCUIT BREAKER! Invested ${self.cumulative_cost:.2f}. Stopping trades.")
                self.stop_triggered = True
            return
        
        diff = self.current_binance_price - self.strike_price
        
        up_prices = self.latest_prices.get(self.bull_id)
        down_prices = self.latest_prices.get(self.bear_id)
        if not up_prices or not down_prices: return
        
        ask_up = up_prices["ask"]
        ask_down = down_prices["ask"]
        
        # Signal Check with Dynamic Threshold
        if diff > self.dynamic_threshold:
            # Bullish
            if 0 < ask_up < self.max_chase_price:
                logger.info(f"📈 BULLISH: Diff +${diff:.2f} > Thresh ${self.dynamic_threshold:.2f} | Buying UP @ {ask_up}")
                oid = await self._place_order(self.bull_id, ask_up, self.base_qty, BUY, OrderType.FOK)
                if oid: self.cooldown_until = time.time() + self.cooldown_seconds
        
        elif diff < -self.dynamic_threshold:
            # Bearish
            if 0 < ask_down < self.max_chase_price:
                logger.info(f"📉 BEARISH: Diff ${diff:.2f} < -Thresh ${self.dynamic_threshold:.2f} | Buying DOWN @ {ask_down}")
                oid = await self._place_order(self.bear_id, ask_down, self.base_qty, BUY, OrderType.FOK)
                if oid: self.cooldown_until = time.time() + self.cooldown_seconds

    async def binance_ws_handler(self):
        symbol = self.binance_symbol.lower()
        url = f"wss://stream.binance.com:9443/ws/{symbol}@trade"
        logger.info(f"🔌 Connecting to Binance Spot: {url}")
        last_log_time = 0
        
        while True:
            try:
                async with websockets.connect(url) as ws:
                    logger.info(f"✅ Connected to Binance for {self.binance_symbol}")
                    while True:
                        msg = await ws.recv()
                        data = json.loads(msg)
                        price = float(data['p'])
                        now = time.time()
                        self.current_binance_price = price
                        
                        # Periodically refresh volatility (every 60s)
                        if now - self.last_vol_check > 60:
                            await self._update_volatility_threshold()
                        
                        if now - last_log_time > 10:
                            diff = price - self.strike_price if self.strike_price > 0 else 0
                            logger.info(f"📊 ${price:.2f} | Diff: {diff:+.2f} | Thresh: ±${self.dynamic_threshold:.2f}")
                            last_log_time = now
                        
                        async with self.lock:
                            await self.execute_strategy()

            except Exception as e:
                logger.error(f"Binance WS Error: {e}")
                await asyncio.sleep(5)

    async def market_ws_handler(self):
        url = f"{POLY_WS_HOST}/market"
        while True:
            try:
                async with websockets.connect(url) as ws:
                    ping = asyncio.create_task(self._ping(ws))
                    try:
                        if self.asset_ids:
                            await ws.send(json.dumps({"assets_ids": self.asset_ids, "type": "market"}))
                        async for msg in ws:
                            if msg == "PONG": continue
                            data = json.loads(msg)
                            items = data if isinstance(data, list) else [data]
                            for item in items:
                                if "asks" in item:
                                    async with self.lock: await self._update_prices(item)
                    finally:
                        ping.cancel()
            except Exception as e:
                logger.error(f"Market WS Error: {e}"); await asyncio.sleep(5)

    async def _ping(self, ws):
        try:
            while True:
                await asyncio.sleep(10); await ws.send("PING")
        except: pass

    async def _settle_simulation(self):
        logger.info("🏁 Settling Simulation...")
        winner_id = None
        # Try fetch Gamma
        for i in range(12):
            await self.fetch_market()
            if self.market_details:
                try:
                    clob_ids = json.loads(self.market_details.get("clobTokenIds", "[]"))
                    prices = json.loads(self.market_details.get("outcomePrices", "[]"))
                    if clob_ids and prices:
                        for idx, p in enumerate(prices):
                            if float(p) > 0.95: winner_id = clob_ids[idx]; break
                except: pass
            if winner_id: break
            await asyncio.sleep(10)
        
        # Fallback to Binance Price
        if not winner_id:
            if self.current_binance_price > self.strike_price:
                winner_id = self.bull_id
                logger.info(f"✅ Winner (Price): UP (${self.current_binance_price:.2f} > ${self.strike_price:.2f})")
            else:
                winner_id = self.bear_id
                logger.info(f"✅ Winner (Price): DOWN (${self.current_binance_price:.2f} <= ${self.strike_price:.2f})")

        # Calculate PnL
        game_pnl = 0.0
        if self.inventory:
            for asset_id, size in list(self.inventory.items()):
                if size <= 0: continue
                final_price = 1.0 if asset_id == winner_id else 0.0
                revenue = size * final_price
                cost = self.inventory_cost[asset_id]
                asset_pnl = revenue - cost
                game_pnl += asset_pnl
                
                await self._report_sim_trade(asset_id, "SETTLEMENT", final_price, size, pnl=asset_pnl)
                self.balance += revenue
                self.inventory[asset_id] = 0
                self.inventory_cost[asset_id] = 0

        self.realized_pnl += game_pnl
        total_pnl = self.balance - self.initial_capital
        logger.info(f"🏆 GAME OVER | Winner: {self.asset_map.get(winner_id, 'Unknown')} | Game PnL: ${game_pnl:.2f} | Total: ${total_pnl:+.2f}")

    async def rollover(self):
        logger.info("🔄 Rolling over...")
        self.asset_ids = []; self.asset_map.clear(); self.state = "SEARCHING"
        self.bull_id = None; self.bear_id = None
        self.strike_price = 0.0; self.cumulative_cost = 0.0
        self.stop_triggered = False; self.open_sim_orders.clear()
        
        try:
            if not self.slug: self.running = False; return
            clean = self.slug.split('?')[0].split("-")
            if not clean[-1].isdigit(): self.running = False; return
            
            ts = int(clean[-1])
            now = time.time()
            next_ts = ts + 900 if (now - ts) <= 1800 else (int(now) // 900) * 900
            
            base = "-".join(clean[:-1])
            for i in range(12):
                self.slug = f"{base}-{next_ts}"
                logger.info(f"🔍 Searching: {self.slug}")
                if await self.fetch_market(): break
                await asyncio.sleep(10)
        except: self.running = False

    async def run(self):
        logger.info(f"🚀 VOLATILITY HUNTER STARTED | Target: {self.slug}")
        if not await self.fetch_market(): return
        
        while self.running:
            self.ws_tasks = [
                asyncio.create_task(self.market_ws_handler()),
                asyncio.create_task(self.binance_ws_handler())
            ]
            
            wait = self.market_end - time.time()
            if wait > 0:
                try: await asyncio.sleep(wait)
                except: pass
            
            for t in self.ws_tasks: t.cancel()
            self.ws_tasks = []
            
            await self._settle_simulation()
            await self.rollover()

if __name__ == "__main__":
    bot = VolatilityBot()
    try: asyncio.run(bot.run())
    except KeyboardInterrupt: pass
