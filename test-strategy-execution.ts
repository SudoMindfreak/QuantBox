#!/usr/bin/env tsx
/**
 * Strategy Execution Test
 * 
 * Tests the actual Python strategy runner with a simple test strategy
 */

import 'dotenv/config';
import { PythonStrategyRunner } from './quantbox-server/src/engine/PythonStrategyRunner';
import { Server } from 'socket.io';
import { createServer } from 'http';

const TEST_STRATEGY = `from quantbox import QuantBoxStrategy

class MyStrategy(QuantBoxStrategy):
    """
    Test Strategy: Simple Price Logger
    Logs prices every tick without trading
    """
    async def on_tick(self):
        if not self.bull_id or not self.bear_id:
            return

        up_price = self.latest_prices.get(self.bull_id, {}).get('ask', 0)
        down_price = self.latest_prices.get(self.bear_id, {}).get('ask', 0)
        
        self.log(f"📊 UP: {up_price:.3f} | DOWN: {down_price:.3f} | Spot: {self.spot_price:.2f}", "info")
`;

async function testStrategyExecution() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('         🧪 Strategy Execution Test');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Create a mock Socket.io server
    const httpServer = createServer();
    const io = new Server(httpServer);

    console.log('✓ Created Socket.io server');

    // Create strategy runner
    const runner = new PythonStrategyRunner(
        'test-' + Date.now(),
        {
            pythonCode: TEST_STRATEGY,
            marketSlug: 'btc-updown-15m'
        },
        io
    );

    console.log('✓ Created Python strategy runner');
    console.log('\n🚀 Starting strategy (will run for 30 seconds)...\n');

    // Listen for logs
    io.on('connection', (socket) => {
        console.log('Socket client connected');
    });

    // Start the runner
    await runner.start();

    // Let it run for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Stop the runner
    console.log('\n⏹️  Stopping strategy...');
    runner.stop();

    console.log('\n✅ Test completed successfully\n');
    process.exit(0);
}

testStrategyExecution().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
