# -*- coding: utf-8 -*-
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

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("QuantBox")

class QuantBoxStrategy:
    def __init__(self):
        self.running = True
        self.slug = os.getenv("MARKET_SLUG")
        self.simulation_id = os.getenv("SIMULATION_ID")
        self.api_url = os.getenv("API_URL")
        
        # State
        self.balance = float(os.getenv("INITIAL_CAPITAL") or "1000.0")
        self.initial_capital = self.balance
        self.inventory = defaultdict(float)
        self.inventory_cost = defaultdict(float)
        self.realized_pnl = 0.0
        
        # Market Data
        self.strike_price = 0.0
        self.spot_price = 0.0
        self.latest_prices = {} 
        self.asset_map = {}     
        self.bull_id = None
        self.bear_id = None
        self.market_end = 0
        self.asset_ids = []
        
        self.lock = asyncio.Lock()
        
    def log(self, message, level="info"):
        # We print to stdout so the Node.js runner can capture it
        print(json.dumps({
            "type": "log",
            "level": level,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }), flush=True)

    async def buy(self, outcome, qty, price_limit=0.99):
        asset_id = self.bull_id if outcome.upper() == "UP" else self.bear_id
        if not asset_id: return False
        
        prices = self.latest_prices.get(asset_id)
        if not prices: return False
        
        current_price = prices["ask"]
        if current_price > price_limit: return False
        
        cost = qty * current_price
        if self.balance < cost: return False
        
        async with self.lock:
            self.balance -= cost
            self.inventory[asset_id] += qty
            self.inventory_cost[asset_id] += cost
            self.log(f"💸 BUY FILL: {qty} {outcome} @ {current_price} | Cost: ${cost:.2f}", "success")
            await self._report_trade(asset_id, "BUY", current_price, qty)
            self._emit_wallet()
        return True

    async def sell(self, outcome, qty):
        asset_id = self.bull_id if outcome.upper() == "UP" else self.bear_id
        if not asset_id: return False
        if self.inventory[asset_id] < qty: return False
        
        prices = self.latest_prices.get(asset_id)
        if not prices: return False
        
        current_price = prices["bid"]
        val = qty * current_price
        
        async with self.lock:
            avg_cost = self.inventory_cost[asset_id] / self.inventory[asset_id]
            realized = val - (qty * avg_cost)
            
            self.balance += val
            self.realized_pnl += realized
            self.inventory[asset_id] -= qty
            if self.inventory[asset_id] <= 0:
                self.inventory_cost[asset_id] = 0
            else:
                self.inventory_cost[asset_id] -= (qty * avg_cost)
                
            self.log(f"💰 SELL FILL: {qty} {outcome} @ {current_price} | PnL: ${realized:.2f}", "success")
            await self._report_trade(asset_id, "SELL", current_price, qty, pnl=realized)
            self._emit_wallet()
        return True

    async def on_tick(self):
        pass

    def _emit_wallet(self):
        # Construct rich position objects
        positions_list = []
        for asset_id, size in self.inventory.items():
            if size == 0: continue
            
            # Calculate metrics (simplified for now as we track cost in aggregate)
            avg_entry = 0.50 
            if self.inventory[asset_id] > 0 and self.inventory_cost[asset_id] > 0:
                avg_entry = self.inventory_cost[asset_id] / self.inventory[asset_id]
                
            current_price = 0.0
            if asset_id in self.latest_prices:
                current_price = self.latest_prices[asset_id]['bid']
                
            unrealized = (current_price - avg_entry) * size
            
            positions_list.append({
                "tokenId": asset_id,
                "outcome": self.asset_map.get(asset_id, "UNKNOWN"),
                "quantity": size,
                "averageEntryPrice": avg_entry,
                "currentPrice": current_price,
                "unrealizedPnL": unrealized
            })

        print(json.dumps({
            "type": "wallet",
            "balance": self.balance,
            "pnl": self.realized_pnl,
            "positions": positions_list,
            "timestamp": datetime.utcnow().isoformat()
        }), flush=True)

    async def _report_trade(self, asset_id, side, price, size, pnl=None):
        print(json.dumps({
            "type": "trade",
            "asset_id": asset_id,
            "side": side,
            "price": price,
            "size": size,
            "pnl": pnl,
            "timestamp": datetime.utcnow().isoformat()
        }), flush=True)

    async def run(self):
        self.log(f"🚀 Strategy Started | Market: {self.slug}")
        await self._fetch_market_info()
        
        tasks = [
            asyncio.create_task(self._binance_ws()),
            asyncio.create_task(self._poly_ws())
        ]
        
        try:
            while self.running:
                await asyncio.sleep(1)
        finally:
            for t in tasks: t.cancel()

    async def _fetch_market_info(self):
        try:
            url = f"https://gamma-api.polymarket.com/events?slug={self.slug}"
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as resp:
                    data = await resp.json()
                    market = data[0]['markets'][0]
                    self.bull_id = json.loads(market['clobTokenIds'])[0]
                    self.bear_id = json.loads(market['clobTokenIds'])[1]
                    self.asset_ids = [self.bull_id, self.bear_id]
                    self.asset_map = {self.bull_id: "UP", self.bear_id: "DOWN"}
                    self.strike_price = 0.0 
        except Exception as e:
            self.log(f"Failed to fetch market info: {e}", "error")

    async def _binance_ws(self):
        url = "wss://stream.binance.com:9443/ws/btcusdt@trade"
        async with websockets.connect(url) as ws:
            while self.running:
                msg = await ws.recv()
                data = json.loads(msg)
                self.spot_price = float(data['p'])
                await self.on_tick()

    async def _poly_ws(self):
        url = "wss://ws-subscriptions-clob.polymarket.com/ws"
        async with websockets.connect(url) as ws:
            await ws.send(json.dumps({
                "type": "market",
                "assets_ids": self.asset_ids,
                "initial_dump": True
            }))
            while self.running:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=30)
                    if msg == "PONG": continue
                    data = json.loads(msg)
                    messages = data if isinstance(data, list) else [data]
                    for m in messages:
                        asset_id = m.get("asset_id")
                        if not asset_id or "asks" not in m: continue
                        best_ask = float(min(m["asks"], key=lambda x: float(x["price"]))["price"])
                        best_bid = float(max(m["bids"], key=lambda x: float(x["price"]))["price"])
                        self.latest_prices[asset_id] = {"ask": best_ask, "bid": best_bid}
                except asyncio.TimeoutError:
                    await ws.send("PING")
                except Exception as e:
                    self.log(f"Polymarket WS Error: {e}", "error")
                    await asyncio.sleep(5)
                    break