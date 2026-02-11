from quantbox import QuantBoxStrategy

class MyStrategy(QuantBoxStrategy):
    """
    Expert Example: Basic Volatility Scalper
    Buys UP if price jumps $20 above strike, sells if it drops back.
    """
    async def on_tick(self):
        # 1. Safety Check
        if not self.bull_id or not self.strike_price:
            return

        # 2. Logic Variables
        diff = self.spot_price - self.strike_price
        
        # 3. Entry Logic (Buy UP if bullish momentum)
        if diff > 20 and self.inventory[self.bull_id] == 0:
            self.log(f"Bullish momentum detected (+${diff})", "info")
            await self.buy("UP", 50)

        # 4. Exit Logic (Sell if profit reached or trend reverses)
        if self.inventory[self.bull_id] > 0:
            if diff < 5:
                self.log("Trend weakening, taking profit/closing", "warning")
                await self.sell("UP", self.inventory[self.bull_id])
