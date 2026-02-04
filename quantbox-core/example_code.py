# -*- coding: utf-8 -*-
"""
🎯 Polymarket Strike Price Momentum Simulator
==============================================
Based on Gabagool V21.8 strategy with new_binance_sim.py framework

Strategy: Trade based on price difference vs strike price
Signal: Diff = Current_Binance_Price - Strike_Price
  - Diff > +THRESHOLD → Buy UP (bullish momentum)
  - Diff < -THRESHOLD → Buy DOWN (bearish momentum)

Features:
- Real-time Binance Spot WebSocket price feed
- Strike price from 15m candle OPEN at game start
- Risk management: circuit breaker, cooldown, price limits
- Simulated order execution with PnL tracking
- Auto-rollover to next 15-minute market
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
from py_clob_client.client import ClobClient
from py_clob_client.clob_types import ApiCreds, OrderArgs, OrderType
from py_clob_client.order_builder.constants import BUY, SELL

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("StrikeMomentumSim")

# Constants
HOST = "https://clob.polymarket.com"
CHAIN_ID = 137
POLY_WS_HOST = "wss://ws-subscriptions-clob.polymarket.com/ws"

def parse_iso_date(date_str):
    if not date_str: return None
    if date_str.endswith('Z'): date_str = date_str[:-1] + '+00:00'
    try: return datetime.fromisoformat(date_str)
    except: return None


class Bot:
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
        
        # API Creds (Not needed for sim, but keeping structure)
        self.api_key = os.getenv("API_KEY")
        self.api_secret = os.getenv("API_SECRET")
        self.api_passphrase = os.getenv("API_PASSPHRASE")

        self.slug = self._extract_slug(self.initial_market_url)
        self.ws = None
        self.lock = asyncio.Lock()
        
        # State
        self.active_market_id = None
        self.market_end = 0
        self.market_start = 0 
        self.asset_ids = []
        self.asset_map = {} 
        self.ws_tasks = []
        self.bull_id = None  # UP/YES token
        self.bear_id = None  # DOWN/NO token
        
        # Strategy State
        self.state = "SEARCHING"
        self.strike_price = 0.0
        self.cumulative_cost = 0.0
        self.stop_triggered = False
        self.cooldown_until = 0.0
        
        # Binance Data
        self.current_binance_price = 0.0
        
        # Parameters - Strike Momentum Strategy
        self.initial_capital = float(os.getenv("INITIAL_CAPITAL") or "2000.0")
        self.balance = self.initial_capital
        self.binance_pair = (os.getenv("BINANCE_PAIR") or "BTCUSDT").upper()
        self.binance_symbol = self.binance_pair  # For API compatibility
        self.momentum_threshold = float(os.getenv("MOMENTUM_THRESHOLD") or "3.0")
        self.base_qty = int(os.getenv("BASE_QTY") or "10")
        self.max_risk_per_round = float(os.getenv("MAX_RISK_PER_ROUND") or "90.0")
        self.cooldown_seconds = float(os.getenv("COOLDOWN_SECONDS") or "2.0")
        self.max_chase_price = float(os.getenv("MAX_CHASE_PRICE") or "0.92")
        self.closing_buffer_seconds = int(os.getenv("CLOSING_BUFFER_SECONDS") or "20")

        self.latest_prices = {}  # {asset_id: {ask, bid}}

        logger.info("🧪 STRIKE MOMENTUM SIMULATION INITIALIZED")
        logger.info(f"💰 Capital: ${self.initial_capital} | 📦 Qty: {self.base_qty} shares")
        logger.info(f"🌊 Threshold: ±${self.momentum_threshold} | 🛡️ Max Risk: ${self.max_risk_per_round}")
        logger.info(f"📊 Asset: {self.binance_pair} | ⏱️ Cooldown: {self.cooldown_seconds}s")

    def _extract_slug(self, url):
        if not url: return None
        clean_url = url.split("?")[0]
        if "/" in clean_url: return clean_url.rstrip("/").split("/")[-1]
        return clean_url

    def _sanitize(self, val, decimals=2):
        factor = 10 ** decimals
        return math.floor(float(val) * factor) / factor

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
            logger.info(f"⏰ Start: {datetime.fromtimestamp(self.market_start).strftime('%H:%M:%S')} | End: {datetime.fromtimestamp(self.market_end).strftime('%H:%M:%S')}")
            
            # Calculate strike price
            await self._fetch_strike_price()
            
            return True
        except Exception as e:
            logger.error(f"Error fetching market: {e}")
            return False

    async def _fetch_strike_price(self):
        """
        Fetch strike price using 15m candle OPEN at game start time.
        Aligned with analysis.ts logic: OPEN price of the 15m candle that starts when game begins.
        """
        try:
            # For a 9:00-9:15 game, we want the OPEN price of the 9:00-9:15 candle
            # market_start = game start time (9:00)
            start_time_ms = int(self.market_start * 1000)
            
            url = "https://api.binance.com/api/v3/klines"
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
                            # [OpenTime, Open, High, Low, Close, ...]
                            self.strike_price = float(candle[1])  # OPEN price
                            logger.info(f"🎯 Strike Price (15m OPEN): ${self.strike_price:.2f}")
                            return
            
            logger.warning("⚠️ Could not fetch strike price from Binance")
        except Exception as e:
            logger.error(f"Strike price fetch error: {e}")

    async def _warmup_prices(self):
        """Fetches initial orderbook snapshot via REST to avoid waiting for WS."""
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
                                # Ensure sorted (Polymarket API usually reciprocates, but let's be safe)
                                # Asks: Lowest price first
                                asks.sort(key=lambda x: float(x["price"]))
                                # Bids: Highest price first
                                bids.sort(key=lambda x: float(x["price"]), reverse=True)
                                
                                await self._update_prices({"asset_id": tid, "asks": asks, "bids": bids})
                                logger.info(f"   ✅ Book fetched for {tid} (Best Ask: {asks[0]['price']})")
                        else:
                             logger.warning(f"   ⚠️ Failed to fetch book for {tid}: Status {resp.status}")
                except Exception as e:
                    logger.warning(f"   ⚠️ Failed to fetch book for {tid}: {e}")

    async def _place_order(self, token_id, price, size, side, order_type=OrderType.FOK):
        """Simulates order placement."""
        order_id = str(uuid.uuid4())
        limit_price = self._sanitize(price, 2)
        safe_qty = self._sanitize(size, 2)
        
        asset_name = self.asset_map.get(token_id, token_id[:8])
        logger.info(f"🧪 SIM ORDER: {side} {safe_qty} {asset_name} @ {limit_price} ({order_type})")

        # FOK Logic: Check Immediate Fill
        if order_type == OrderType.FOK:
            prices = self.latest_prices.get(token_id)
            if not prices:
                logger.info("ℹ️ SIM: No price data, FOK failed.")
                return None
            
            market_price = prices["ask"] if side == BUY else prices["bid"]
            
            can_fill = False
            if side == BUY and market_price <= limit_price: can_fill = True
            if side == SELL and market_price >= limit_price: can_fill = True
            
            if can_fill:
                await self._execute_sim_fill(token_id, side, limit_price, safe_qty)
                return order_id
            else:
                logger.info(f"ℹ️ SIM: FOK not filled (Limit {limit_price} vs Market {market_price})")
                return None
        
        # GTC Logic: Add to open orders
        self.open_sim_orders[order_id] = {
            "id": order_id,
            "asset_id": token_id,
            "price": limit_price,
            "size": safe_qty,
            "side": side,
            "type": "GTC"
        }
        return order_id

    async def _cancel_order(self, order_id):
        if order_id in self.open_sim_orders:
            logger.info(f"🧪 SIM CANCEL: {order_id}")
            del self.open_sim_orders[order_id]

    async def _report_sim_trade(self, asset_id, side, price, size, pnl=None):
        if not self.api_url or not self.simulation_id: return
        try:
            label = self.asset_map.get(asset_id, asset_id[:8])
            payload = {"assetId": label, "side": side, "price": price, "size": size, "pnl": pnl}
            url = f"{self.api_url}/simulations/{self.simulation_id}/trade"
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as resp:
                    if resp.status != 200:
                        logger.error(f"Failed to report sim trade: {resp.status}")
        except: pass

    async def _execute_sim_fill(self, asset_id, side, price, size):
        """Updates Sim Inventory and PnL."""
        val = size * price
        asset_name = self.asset_map.get(asset_id, asset_id[:5])
        
        if side == BUY:
            # Check balance
            if self.balance < val:
                logger.error(f"❌ Insufficient balance! Need ${val:.2f}, have ${self.balance:.2f}")
                return
            
            self.balance -= val
            self.cumulative_cost += val
            self.inventory[asset_id] += size
            self.inventory_cost[asset_id] += val
            logger.info(f"💸 SIM BUY FILL: {size} {asset_name} @ {price} | Cost: ${val:.2f} | Bal: ${self.balance:.2f}")
        else:
            # Sell
            avg_cost = 0
            if self.inventory[asset_id] > 0:
                avg_cost = self.inventory_cost[asset_id] / self.inventory[asset_id]
            
            realized = val - (size * avg_cost)
            self.realized_pnl += realized
            self.balance += val
            
            self.inventory[asset_id] -= size
            if self.inventory[asset_id] <= 0:
                 self.inventory_cost[asset_id] = 0
            else:
                 self.inventory_cost[asset_id] -= (size * avg_cost)
            
            logger.info(f"💰 SIM SELL FILL: {size} {asset_name} @ {price} | PnL: ${realized:.2f} | Total PnL: ${self.realized_pnl:.2f}")
        
        await self._report_sim_trade(asset_id, side, price, size, pnl=realized if side == SELL else None)

    async def _update_prices(self, data):
        asset_id = data.get("asset_id")
        if not asset_id or not data.get("asks") or not data.get("bids"): return

        best_ask = float(min(data["asks"], key=lambda x: float(x["price"]))["price"])
        best_bid = float(max(data["bids"], key=lambda x: float(x["price"]))["price"])
        
        self.latest_prices[asset_id] = {"ask": best_ask, "bid": best_bid}

        # --- SIMULATION GTC FILL CHECK ---
        filled_orders = []
        for oid, order in self.open_sim_orders.items():
            if order["asset_id"] == asset_id:
                should_fill = False
                fill_price = order["price"]
                
                if order["side"] == BUY and best_ask <= order["price"]:
                    should_fill = True
                    fill_price = order["price"]
                elif order["side"] == SELL and best_bid >= order["price"]:
                    should_fill = True
                    fill_price = order["price"]
                
                if should_fill:
                    await self._execute_sim_fill(asset_id, order["side"], fill_price, order["size"])
                    filled_orders.append(oid)

        for oid in filled_orders:
            del self.open_sim_orders[oid]

    async def execute_momentum_strategy(self):
        """
        Core momentum trading logic.
        Monitors Diff = Current_Price - Strike_Price
        Executes trades when |Diff| > threshold
        """
        if self.state != "SEARCHING": return
        if not self.strike_price or self.strike_price <= 0: return
        if not self.bull_id or not self.bear_id: return
        
        # Check cooldown
        if time.time() < self.cooldown_until: return
        
        # Check circuit breaker
        if self.cumulative_cost >= self.max_risk_per_round:
            if not self.stop_triggered:
                logger.warning(f"🛑 CIRCUIT BREAKER! Invested ${self.cumulative_cost:.2f}. Stopping trades.")
                self.stop_triggered = True
            return
        
        # Calculate Diff
        diff = self.current_binance_price - self.strike_price
        
        # Get latest prices
        up_prices = self.latest_prices.get(self.bull_id)
        down_prices = self.latest_prices.get(self.bear_id)
        
        if not up_prices or not down_prices: return
        
        ask_up = up_prices["ask"]
        ask_down = down_prices["ask"]
        
        # Momentum Signal
        if diff > self.momentum_threshold:
            # Strong bullish momentum → Buy UP
            if 0 < ask_up < self.max_chase_price:
                logger.info(f"📈 BULLISH SIGNAL | Diff: +${diff:.2f} | Buying UP @ {ask_up}")
                oid = await self._place_order(self.bull_id, ask_up, self.base_qty, BUY, OrderType.FOK)
                if oid:
                    self.cooldown_until = time.time() + self.cooldown_seconds
        
        elif diff < -self.momentum_threshold:
            # Strong bearish momentum → Buy DOWN
            if 0 < ask_down < self.max_chase_price:
                logger.info(f"📉 BEARISH SIGNAL | Diff: ${diff:.2f} | Buying DOWN @ {ask_down}")
                oid = await self._place_order(self.bear_id, ask_down, self.base_qty, BUY, OrderType.FOK)
                if oid:
                    self.cooldown_until = time.time() + self.cooldown_seconds

    async def binance_ws_handler(self):
        """Real-time Binance Spot price via WebSocket."""
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
                        
                        if now - last_log_time > 10:
                            diff = price - self.strike_price if self.strike_price > 0 else 0
                            logger.info(f"📊 {self.binance_symbol}: ${price:.2f} | Diff: {diff:+.2f}")
                            last_log_time = now
                        
                        # Execute strategy on price update
                        async with self.lock:
                            await self.execute_momentum_strategy()

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
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Market WS Error: {e}"); await asyncio.sleep(5)

    async def _ping(self, ws):
        try:
            while True:
                await asyncio.sleep(10)
                await ws.send("PING")
        except: pass

    async def _settle_simulation(self):
        """Settle positions at market end."""
        logger.info("🏁 Settling Simulation...")
        
        # Try to determine winner
        winner_id = None
        for i in range(12):
            await self.fetch_market()
            if self.market_details:
                try:
                    clob_ids = json.loads(self.market_details.get("clobTokenIds", "[]"))
                    prices = json.loads(self.market_details.get("outcomePrices", "[]"))
                    if clob_ids and prices:
                        for idx, price_str in enumerate(prices):
                            if float(price_str) > 0.95:
                                winner_id = clob_ids[idx]
                                break
                except Exception: pass
            if winner_id: break
            
            logger.info(f"⏳ Waiting for settlement prices... (Attempt {i+1}/12)")
            await asyncio.sleep(10)
        
        if not winner_id:
            # Fallback: determine winner based on final price vs strike
            if self.current_binance_price > self.strike_price:
                winner_id = self.bull_id
                logger.info(f"✅ Winner determined by price: UP (${self.current_binance_price:.2f} > ${self.strike_price:.2f})")
            else:
                winner_id = self.bear_id
                logger.info(f"✅ Winner determined by price: DOWN (${self.current_binance_price:.2f} <= ${self.strike_price:.2f})")

        try:
            await self._report_sim_trade(winner_id, "WINNER", 1.0, 0, pnl=0)
            game_settlement_pnl = 0.0
            
            has_inventory = False
            if self.inventory:
                for asset_id, size in list(self.inventory.items()):
                    if size <= 0: continue
                    has_inventory = True
                    final_price = 1.0 if asset_id == winner_id else 0.0
                    revenue = size * final_price
                    cost = self.inventory_cost[asset_id]
                    asset_pnl = revenue - cost
                    game_settlement_pnl += asset_pnl
                    logger.info(f"⚖️ Settling {self.asset_map.get(asset_id, asset_id)}: {size} shares @ {final_price} | Asset PNL: ${asset_pnl:.2f}")
                    await self._report_sim_trade(asset_id, "SETTLEMENT", final_price, size, pnl=asset_pnl)
                    
                    # Update balance
                    self.balance += revenue
                    self.inventory[asset_id] = 0
                    self.inventory_cost[asset_id] = 0
            
            if not has_inventory:
                logger.info("Portfolio empty at market end.")

            self.realized_pnl += game_settlement_pnl
            total_pnl = self.balance - self.initial_capital
            logger.info(f"🏆 GAME OVER | Winner: {self.asset_map.get(winner_id, 'Unknown')} | Game PNL: ${game_settlement_pnl:.2f}")
            logger.info(f"💰 Balance: ${self.balance:.2f} | Total PNL: ${total_pnl:+.2f}")
        except Exception as e:
            logger.error(f"Settlement Error: {e}")

    async def rollover(self):
        logger.info("🔄 Rolling over to next market...")
        
        # Reset state
        self.asset_ids = []
        self.asset_map.clear()
        self.state = "SEARCHING"
        self.bull_id = None
        self.bear_id = None
        self.strike_price = 0.0
        self.cumulative_cost = 0.0
        self.stop_triggered = False
        self.cooldown_until = 0.0
        self.open_sim_orders.clear()
        
        try:
            if not self.slug: self.running = False; return
            clean_slug = self.slug.split('?')[0]
            parts = clean_slug.split("-")
            if not parts[-1].isdigit():
                if await self.fetch_market(): return
                self.running = False; return
            
            current_ts = int(parts[-1])
            now = time.time()
            next_ts = current_ts + 900 if (now - current_ts) <= 1800 else (int(now) // 900) * 900
            base_slug = "-".join(parts[:-1])
            
            for i in range(12):
                self.slug = f"{base_slug}-{next_ts}"
                logger.info(f"🔍 Searching for next market: {self.slug}")
                if await self.fetch_market(): break
                await asyncio.sleep(10)
        except Exception as e:
            logger.error(f"Rollover error: {e}"); self.running = False

    async def run(self):
        logger.info(f"🚀 STRIKE MOMENTUM SIMULATOR STARTED | Target: {self.slug}")
        if not await self.fetch_market(): return
        
        while self.running:
            self.ws_tasks = [
                asyncio.create_task(self.market_ws_handler()),
                asyncio.create_task(self.binance_ws_handler())
            ]
            
            time_left = self.market_end - time.time()
            if time_left > 0:
                try: await asyncio.sleep(time_left)
                except asyncio.CancelledError: pass
            
            for task in self.ws_tasks: task.cancel()
            await asyncio.gather(*self.ws_tasks, return_exceptions=True)
            self.ws_tasks = []
            
            await asyncio.sleep(10)
            await self._settle_simulation()
            await self.rollover()

if __name__ == "__main__":
    bot = Bot()
    try: asyncio.run(bot.run())
    except KeyboardInterrupt: logger.info("Bot stopped by user.")
