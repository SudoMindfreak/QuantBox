import json
import asyncio
from quantbox import QuantBoxStrategy

class MyStrategy(QuantBoxStrategy):
    """
    Expert Example: Hedging Strategy (Polymarket)
    Buys both UP and DOWN tokens when their combined ask price is <= 0.98 to lock in a profit.
    Prioritizes buying the cheaper side first.
    """
    async def on_tick(self):
        # 1. Safety Check: Ensure we have price data for both tokens
        if not self.latest_prices.get(self.bull_id) or not self.latest_prices.get(self.bear_id):
            self.log("Waiting for full price data for both UP and DOWN tokens.", "info")
            return

        # 2. Get current ask prices for UP and DOWN tokens
        ask_up = self.latest_prices[self.bull_id]['ask']
        ask_down = self.latest_prices[self.bear_id]['ask']

        # 3. Calculate the combined ask price
        combined_ask_price = ask_up + ask_down

        # 4. Hedging Logic: Buy both sides if combined price is favorable and we don't have existing positions
        # The user specified a target of 0.98 for combined price.
        target_combined_price = 0.98
        qty_to_buy = 10 # Example quantity for each side of the hedge

        if combined_ask_price <= target_combined_price:
            # Check if we already have positions for both sides.
            # For a simple initial hedge, we only enter if we have no inventory for either side.
            # This prevents repeatedly buying if the condition remains true.
            if self.inventory.get(self.bull_id, 0) == 0 and self.inventory.get(self.bear_id, 0) == 0:
                self.log(f"Favorable hedge opportunity detected: UP ({ask_up}) + DOWN ({ask_down}) = {combined_ask_price}. Target <= {target_combined_price}", "info")

                # Determine which side is cheaper to buy first, as per user's request
                if ask_up <= ask_down:
                    # Buy UP first
                    buy_up_success = await self.buy("UP", qty_to_buy)
                    if buy_up_success:
                        self.log(f"Successfully bought {qty_to_buy} UP tokens at {ask_up}", "success")
                        # Then buy DOWN
                        buy_down_success = await self.buy("DOWN", qty_to_buy)
                        if buy_down_success:
                            self.log(f"Successfully bought {qty_to_buy} DOWN tokens at {ask_down}", "success")
                        else:
                            self.log(f"Failed to buy {qty_to_buy} DOWN tokens at {ask_down}. UP side might be unhedged!", "error")
                    else:
                        self.log(f"Failed to buy {qty_to_buy} UP tokens at {ask_up}.", "error")
                else:
                    # Buy DOWN first
                    buy_down_success = await self.buy("DOWN", qty_to_buy)
                    if buy_down_success:
                        self.log(f"Successfully bought {qty_to_buy} DOWN tokens at {ask_down}", "success")
                        # Then buy UP
                        buy_up_success = await self.buy("UP", qty_to_buy)
                        if buy_up_success:
                            self.log(f"Successfully bought {qty_to_buy} UP tokens at {ask_up}", "success")
                        else:
                            self.log(f"Failed to buy {qty_to_buy} UP tokens at {ask_up}. DOWN side might be unhedged!", "error")
                    else:
                        self.log(f"Failed to buy {qty_to_buy} DOWN tokens at {ask_down}.", "error")
            else:
                self.log(f"Combined ask price {combined_ask_price} is favorable, but already have existing positions. Skipping new hedge.", "info")
        else:
            self.log(f"No favorable hedge opportunity: UP ({ask_up}) + DOWN ({ask_down}) = {combined_ask_price}. Target <= {target_combined_price}", "info")

if __name__ == "__main__":
    try:
        bot = MyStrategy()
        asyncio.run(bot.run())
    except NameError:
        print(json.dumps({"type": "log", "level": "error", "message": "CRITICAL: The AI generated a strategy without the 'MyStrategy' class. Please ask it to 'Fix the class name'."}))
    except Exception as e:
        print(json.dumps({"type": "log", "level": "error", "message": f"CRITICAL: Failed to initialize strategy: {str(e)}"}))