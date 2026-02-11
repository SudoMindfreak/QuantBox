import json
import asyncio
from quantbox import QuantBoxStrategy

class MyStrategy(QuantBoxStrategy):
    async def on_tick(self):
        if not self.bull_id or not self.bear_id:
            self.log("Bull or Bear ID not available, skipping tick.", "warning")
            return

        # Check if we already have positions in both outcomes to avoid re-hedging
        if self.inventory.get(self.bull_id, 0) > 0 and self.inventory.get(self.bear_id, 0) > 0:
            return

        target_up_price = 0.45
        target_down_price = 0.53
        hedge_qty = 10

        up_ask_price = self.latest_prices.get(self.bull_id, {}).get('ask')
        down_ask_price = self.latest_prices.get(self.bear_id, {}).get('ask')

        if up_ask_price is None or down_ask_price is None:
            self.log("Could not get latest ask prices for both outcomes.", "warning")
            return

        # Attempt to buy UP side if not already held and price is favorable
        if self.inventory.get(self.bull_id, 0) == 0 and up_ask_price <= target_up_price:
            self.log(f"Attempting to buy UP at {target_up_price} (current ask: {up_ask_price})", "info")
            bought_up = await self.buy("UP", hedge_qty, price_limit=target_up_price)
            if bought_up:
                self.log(f"Successfully bought {hedge_qty} UP at {target_up_price}", "success")
            else:
                self.log(f"Failed to buy UP at {target_up_price}", "error")

        # Attempt to buy DOWN side if not already held and price is favorable
        if self.inventory.get(self.bear_id, 0) == 0 and down_ask_price <= target_down_price:
            self.log(f"Attempting to buy DOWN at {target_down_price} (current ask: {down_ask_price})", "info")
            bought_down = await self.buy("DOWN", hedge_qty, price_limit=target_down_price)
            if bought_down:
                self.log(f"Successfully bought {hedge_qty} DOWN at {target_down_price}", "success")
            else:
                self.log(f"Failed to buy DOWN at {target_down_price}", "error")

if __name__ == "__main__":
    try:
        bot = MyStrategy()
        asyncio.run(bot.run())
    except NameError:
        print(json.dumps({"type": "log", "level": "error", "message": "CRITICAL: The AI generated a strategy without the 'MyStrategy' class. Please ask it to 'Fix the class name'."}))
    except Exception as e:
        print(json.dumps({"type": "log", "level": "error", "message": f"CRITICAL: Failed to initialize strategy: {str(e)}"}))