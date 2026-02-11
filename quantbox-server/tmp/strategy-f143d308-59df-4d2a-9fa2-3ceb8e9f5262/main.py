from quantbox import QuantBoxStrategy

class HedgingStrategy(QuantBoxStrategy):
    """
    QuantBox AI Expert Guide: Hedging Strategy for BTC-15m
    Attempts to buy UP at 0.45 and DOWN at 0.53 to create a 0.02 profit hedge.
    """
    def __init__(self):
        super().__init__()
        self.target_qty = 10 # Quantity for each side of the hedge

    async def on_tick(self):
        # 1. Safety Check
        if not self.bull_id or not self.bear_id:
            self.log("Market IDs not available yet.", "warning")
            return

        # Get current inventory for both sides
        current_up_qty = self.inventory.get(self.bull_id, 0)
        current_down_qty = self.inventory.get(self.bear_id, 0)

        # Check if the hedge is already fully established
        if current_up_qty >= self.target_qty and current_down_qty >= self.target_qty:
            self.log(f"Hedge of {self.target_qty} UP and {self.target_qty} DOWN is already established.", "info")
            return # Do nothing if the hedge is complete

        # Attempt to acquire the UP side if needed
        if current_up_qty < self.target_qty:
            qty_to_buy_up = self.target_qty - current_up_qty
            self.log(f"Attempting to buy {qty_to_buy_up} UP at 0.45.", "info")
            success_up = await self.buy("UP", qty_to_buy_up, price_limit=0.45)
            if success_up:
                self.log(f"Successfully bought {qty_to_buy_up} UP at 0.45.", "success")
            else:
                # Log current ask price for debugging why it failed
                current_ask_up = self.latest_prices.get(self.bull_id, {}).get('ask', 'N/A')
                self.log(f"Failed to buy {qty_to_buy_up} UP at 0.45. Current ask: {current_ask_up}", "warning")

        # Attempt to acquire the DOWN side if needed
        if current_down_qty < self.target_qty:
            qty_to_buy_down = self.target_qty - current_down_qty
            self.log(f"Attempting to buy {qty_to_buy_down} DOWN at 0.53.", "info")
            success_down = await self.buy("DOWN", qty_to_buy_down, price_limit=0.53)
            if success_down:
                self.log(f"Successfully bought {qty_to_buy_down} DOWN at 0.53.", "success")
            else:
                # Log current ask price for debugging why it failed
                current_ask_down = self.latest_prices.get(self.bear_id, {}).get('ask', 'N/A')
                self.log(f"Failed to buy {qty_to_buy_down} DOWN at 0.53. Current ask: {current_ask_down}", "warning")

        # After attempts, check if the hedge is now fully established
        # This check is important because a buy might succeed and update inventory within the same tick
        if self.inventory.get(self.bull_id, 0) >= self.target_qty and \
           self.inventory.get(self.bear_id, 0) >= self.target_qty:
            self.log("Both UP and DOWN positions acquired. Hedge established.", "success")

if __name__ == "__main__":
    try:
        bot = MyStrategy()
        asyncio.run(bot.run())
    except NameError:
        print(json.dumps({"type": "log", "level": "error", "message": "CRITICAL: Class 'MyStrategy' not found in generated code."}))
    except Exception as e:
        print(json.dumps({"type": "log", "level": "error", "message": f"CRITICAL: Failed to initialize strategy: {str(e)}"}))