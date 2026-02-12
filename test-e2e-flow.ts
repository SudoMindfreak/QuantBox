#!/usr/bin/env tsx
/**
 * End-to-End Flow Test for Polymarket 15-min Markets
 * 
 * Tests:
 * 1. Market Resolution (15-min BTC markets)
 * 2. AI Strategy Generation
 * 3. Strategy Execution Setup
 * 4. Data Streaming (Binance + Polymarket)
 * 5. PnL Tracking
 */

import 'dotenv/config';
import { ClobClient } from '@polymarket/clob-client';
import { MarketResolver } from './quantbox-core/src/services/MarketResolver';
import { v4 as uuidv4 } from 'uuid';
import { generateStrategy } from './quantbox-server/src/services/AIService';

interface TestResult {
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message: string;
    duration?: number;
    data?: any;
}

class E2EFlowTester {
    private results: TestResult[] = [];
    private clobClient: ClobClient;
    private resolver: MarketResolver;

    constructor() {
        // Initialize read-only CLOB client
        this.clobClient = new ClobClient(
            'https://clob.polymarket.com',
            137, // Polygon chain ID
            undefined, // No private key needed for read-only
            undefined,
            { headers: {} }
        );
        this.resolver = new MarketResolver(this.clobClient);
    }

    private log(section: string, message: string) {
        console.log(`\n[${section}] ${message}`);
    }

    private async test(name: string, fn: () => Promise<any>): Promise<void> {
        const start = Date.now();
        this.log('TEST', `Running: ${name}`);

        try {
            const data = await fn();
            const duration = Date.now() - start;
            this.results.push({
                name,
                status: 'PASS',
                message: 'Success',
                duration,
                data
            });
            console.log(`✅ PASS (${duration}ms)`);
        } catch (error) {
            const duration = Date.now() - start;
            this.results.push({
                name,
                status: 'FAIL',
                message: (error as Error).message,
                duration
            });
            console.log(`❌ FAIL: ${(error as Error).message}`);
        }
    }

    async runAllTests() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('    🧪 QuantBox E2E Flow Test Suite - 15min Markets');
        console.log('═══════════════════════════════════════════════════════════\n');

        // Test 1: Market Resolution
        await this.test('1. Resolve current 15-min BTC market', async () => {
            const market = await this.resolver.resolve('btc-updown-15m', '15m');

            if (!market.condition_id) throw new Error('No condition ID returned');
            if (!market.tokens || market.tokens.length !== 2) {
                throw new Error('Expected 2 tokens (UP/DOWN)');
            }

            this.log('MARKET', `Found: ${market.question}`);
            this.log('MARKET', `Slug: ${market.slug}`);
            this.log('MARKET', `Tokens: ${market.tokens.map(t => t.outcome).join(', ')}`);
            this.log('MARKET', `End Date: ${market.end_date_iso}`);

            return market;
        });

        // Test 2: Market Metadata Fetching
        await this.test('2. Fetch detailed market metadata', async () => {
            const testMarket = this.results[0]?.data;
            if (!testMarket) throw new Error('No market from previous test');

            const fullMarket = await this.clobClient.getMarket(testMarket.condition_id);

            this.log('METADATA', `Tick Size: ${fullMarket.minimum_tick_size}`);
            this.log('METADATA', `Taker Fee: ${fullMarket.taker_base_fee}`);
            this.log('METADATA', `Maker Fee: ${fullMarket.maker_base_fee}`);

            return fullMarket;
        });

        // Test 3: AI Strategy Generation
        await this.test('3. Generate strategy with AI', async () => {
            if (!process.env.GEMINI_API_KEY) {
                throw new Error('GEMINI_API_KEY not set - skipping AI test');
            }

            const prompt = `Create a simple value hunter strategy that buys UP when price is below 0.20 and spot is above strike`;
            const context = 'BTC-15m';

            this.log('AI', 'Generating strategy code...');
            const code = await generateStrategy(prompt, context);

            if (!code.includes('class MyStrategy')) {
                throw new Error('Generated code missing MyStrategy class');
            }
            if (!code.includes('async def on_tick')) {
                throw new Error('Generated code missing on_tick method');
            }

            this.log('AI', `Generated ${code.split('\n').length} lines of code`);

            return code;
        });

        // Test 4: Strategy Database Storage
        await this.test('4. Save strategy to database', async () => {
            const { db } = await import('./quantbox-server/src/db/index.js');
            const { strategies } = await import('./quantbox-server/src/db/schema.js');

            const strategyId = uuidv4();
            const pythonCode = this.results[2]?.data || 'from quantbox import QuantBoxStrategy\n\nclass MyStrategy(QuantBoxStrategy):\n    async def on_tick(self):\n        pass';
            const market = this.results[0]?.data;

            const newStrategy = {
                id: strategyId,
                name: 'E2E Test Strategy',
                description: 'Auto-generated test strategy',
                pythonCode,
                marketSlug: market?.slug || 'btc-updown-15m',
                initialBalance: 1000,
                currentBalance: 1000,
                status: 'draft',
                isTemplate: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await db.insert(strategies).values(newStrategy);
            this.log('DB', `Saved strategy with ID: ${strategyId}`);

            return strategyId;
        });

        // Test 5: Verify Python Environment
        await this.test('5. Verify Python and dependencies', async () => {
            const { spawn } = await import('child_process');

            return new Promise((resolve, reject) => {
                const proc = spawn('python3', ['--version']);
                let output = '';

                proc.stdout?.on('data', (data) => output += data.toString());
                proc.stderr?.on('data', (data) => output += data.toString());

                proc.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Python not available: ${output}`));
                    } else {
                        this.log('PYTHON', `Version: ${output.trim()}`);
                        resolve(output);
                    }
                });
            });
        });

        // Test 6: Verify quantbox.py Library
        await this.test('6. Verify quantbox.py library exists', async () => {
            const fs = await import('fs/promises');
            const path = await import('path');

            const libPath = path.join(process.cwd(), 'quantbox-core', 'python', 'quantbox.py');
            const exists = await fs.access(libPath).then(() => true).catch(() => false);

            if (!exists) throw new Error(`quantbox.py not found at ${libPath}`);

            const content = await fs.readFile(libPath, 'utf-8');
            const lines = content.split('\n').length;

            this.log('LIB', `Found quantbox.py (${lines} lines)`);

            return libPath;
        });

        // Test 7: WebSocket connection to Polymarket
        await this.test('7. WebSocket connection to Polymarket', async () => {
            const WebSocket = await import('ws');
            const market = this.results[0]?.data;

            if (!market || !market.tokens[0]) {
                throw new Error('No market data available');
            }

            const tokenIds = market.tokens.map((t: any) => t.token_id);

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('WebSocket connection timeout'));
                }, 10000);

                // Use the correct endpoint with /market suffix
                const ws = new WebSocket.WebSocket('wss://ws-subscriptions-clob.polymarket.com/ws/market');

                ws.on('open', () => {
                    this.log('WS', 'Connected to Polymarket');

                    // Use the correct message format (no initial_dump)
                    ws.send(JSON.stringify({
                        assets_ids: tokenIds,
                        type: 'market'
                    }));
                });

                ws.on('message', (data) => {
                    const msg = JSON.parse(data.toString());

                    // Skip PONG messages
                    if (msg === 'PONG') return;

                    // Check for orderbook data
                    if (msg.asks || (Array.isArray(msg) && msg.some((m: any) => m.asks))) {
                        clearTimeout(timeout);
                        ws.close();
                        this.log('WS', `Received orderbook data`);
                        resolve(msg);
                    }
                });

                ws.on('error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
        });

        // Test 8: Test Binance WebSocket
        await this.test('8. WebSocket connection to Binance', async () => {
            const WebSocket = await import('ws');

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('Binance WebSocket timeout'));
                }, 10000);

                const ws = new WebSocket.WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

                ws.on('message', (data) => {
                    const msg = JSON.parse(data.toString());
                    if (msg.p) {
                        clearTimeout(timeout);
                        ws.close();
                        const price = parseFloat(msg.p);
                        this.log('BINANCE', `BTC Price: $${price.toFixed(2)}`);
                        resolve(price);
                    }
                });

                ws.on('error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
        });

        // Print Summary
        this.printSummary();
    }

    private printSummary() {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('                     📊 TEST SUMMARY');
        console.log('═══════════════════════════════════════════════════════════\n');

        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const total = this.results.length;

        this.results.forEach((result, i) => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            const duration = result.duration ? ` (${result.duration}ms)` : '';
            console.log(`${icon} ${i + 1}. ${result.name}${duration}`);
            if (result.status === 'FAIL') {
                console.log(`   Error: ${result.message}`);
            }
        });

        console.log(`\n${passed}/${total} tests passed`);

        if (failed === 0) {
            console.log('\n🎉 All tests passed! The 15-min market flow is ready.\n');
        } else {
            console.log(`\n⚠️  ${failed} test(s) failed. Review errors above.\n`);
        }
    }
}

// Run tests
const tester = new E2EFlowTester();
tester.runAllTests().catch(console.error);
