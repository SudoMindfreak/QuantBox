from quantbox import QuantBoxStrategy

class MyStrategy(QuantBoxStrategy):
    """
    Expert Example: Spread Arbitrage / Value Hunter
    Looks for extremely cheap tokens when the price is near strike.
    """
    async def on_tick(self):
        if not self.bull_id or not self.bear_id:
            return

        # 1. Get current prices for both sides
        up_price = self.latest_prices.get(self.bull_id, {}).get('ask', 1.0)
        down_price = self.latest_prices.get(self.bear_id, {}).get('ask', 1.0)

        # 2. Logic: If 'UP' is under 0.10 but spot is ABOVE strike, it's a huge mispricing
        if up_price < 0.10 and self.spot_price > self.strike_price:
            self.log(f"Mispricing detected! UP at {up_price} while spot is bullish.", "success")
            await self.buy("UP", 100)

        # 3. Logic: If 'DOWN' is under 0.10 but spot is BELOW strike
        if down_price < 0.10 and self.spot_price < self.strike_price:
            self.log(f"Mispricing detected! DOWN at {down_price} while spot is bearish.", "success")
            await self.buy("DOWN", 100)
