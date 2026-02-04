import dotenv from 'dotenv';
import { ClobClient } from '@polymarket/clob-client';
import { MarketService } from './services/MarketService';
import { MarketResolver } from './services/MarketResolver';
import { OrderbookStream } from './engine/stream';
import { VirtualWallet } from './engine/wallet';
import { OrderBookMessage } from './types/polymarket';

// Load environment variables
dotenv.config();

const POLYMARKET_HOST = 'https://clob.polymarket.com';
const POLYGON_CHAIN_ID = 137;

async function main() {
    console.log('\n🔮 QuantBox - Virtual Trading Engine Demo\n');
    console.log('💡 Phase 2: URL-Based Market Discovery\n');

    // ========================================
    // 1. Initialize Read-Only CLOB Client
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 1: Initialize Read-Only CLOB Client');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const clobClient = new ClobClient(
        POLYMARKET_HOST,
        POLYGON_CHAIN_ID,
        undefined,
        { key: '', secret: '', passphrase: '' }
    );

    console.log('✅ Read-only client initialized\n');

    // ========================================
    // 2. Resolve Market from URL/Slug
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 2: Resolve Market from URL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get market input from environment or CLI args
    const marketInput = process.env.MARKET_URL ||
        process.argv[2] ||
        'bitcoin-up-or-down-february-4-11am-et';

    console.log(`🎯 Input: ${marketInput}\n`);

    const resolver = new MarketResolver(clobClient);
    const market = await resolver.resolve(marketInput);

    console.log(`\n📊 Market: ${market.question}`);
    console.log(`   Condition ID: ${market.condition_id.substring(0, 12)}...`);
    console.log(`   End Date: ${market.end_date_iso}`);
    console.log(`   Active: ${market.active ? '✅' : '❌'}`);

    // ========================================
    // 3. Fetch Full Market Metadata from CLOB
    // ========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 3: Fetch Market Metadata from CLOB');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const marketService = new MarketService(clobClient);
    const fullMarket = await marketService.getMarketByConditionId(market.condition_id);
    const { yes: yesTokenId, no: noTokenId } = marketService.extractTokenIds(fullMarket);

    console.log(`   YES Token: ${yesTokenId.substring(0, 12)}...`);
    console.log(`   NO Token: ${noTokenId.substring(0, 12)}...\n`);

    // ========================================
    // 4. Initialize Virtual Wallet
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 4: Initialize Virtual Wallet');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const initialBalance = parseFloat(process.env.INITIAL_VIRTUAL_BALANCE || '10000');
    const wallet = new VirtualWallet(initialBalance);

    // =======================================
    // 5. Connect to WebSocket Stream
    // ========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 5: Connect to Public Orderbook WebSocket');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const stream = new OrderbookStream();
    await stream.connect();

    // Subscribe to both YES and NO tokens
    stream.subscribe([yesTokenId, noTokenId]);

    // ========================================
    // 6. Monitor Orderbook Updates
    // ========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 6: Monitor Live Orderbook Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let orderbookData: { [key: string]: OrderBookMessage } = {};
    let hasExecutedTestOrder = false;

    stream.on('orderbook', (message: OrderBookMessage) => {
        const tokenId = message.asset_id;
        const outcome = tokenId === yesTokenId ? 'YES' : 'NO';

        // Store latest orderbook
        orderbookData[tokenId] = message;

        // Display orderbook
        console.log(`\n📊 ${outcome} Token Orderbook Update (${new Date(parseInt(message.timestamp)).toLocaleTimeString()})`);
        console.log('   ┌─────────────────────────────────┐');
        console.log('   │         ASKS (Selling)          │');
        console.log('   ├──────────────┬──────────────────┤');

        const asks = message.asks.slice(0, 3);
        asks.reverse().forEach(ask => {
            console.log(`   │ $${parseFloat(ask.price).toFixed(4)}  │  ${parseFloat(ask.size).toFixed(2)} shares  │`);
        });

        const bestAsk = parseFloat(message.asks[0]?.price || '0');
        const bestBid = parseFloat(message.bids[0]?.price || '0');
        const spread = bestAsk - bestBid;
        const midPrice = (bestAsk + bestBid) / 2;

        console.log('   ├──────────────┴──────────────────┤');
        console.log(`   │  Spread: $${spread.toFixed(4)} | Mid: $${midPrice.toFixed(4)}  │`);
        console.log('   ├──────────────┬──────────────────┤');

        const bids = message.bids.slice(0, 3);
        bids.forEach(bid => {
            console.log(`   │ $${parseFloat(bid.price).toFixed(4)}  │  ${parseFloat(bid.size).toFixed(2)} shares  │`);
        });

        console.log('   │         BIDS (Buying)           │');
        console.log('   └─────────────────────────────────┘');

        // Update position prices
        wallet.updatePositionPrices(tokenId, midPrice);

        // Execute a test order after first orderbook update (demo only)
        if (!hasExecutedTestOrder && orderbookData[yesTokenId] && orderbookData[noTokenId]) {
            hasExecutedTestOrder = true;

            console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📋 Step 7: Execute Test Virtual Orders');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            setTimeout(() => {
                const testSize = 10;
                const yesOrderbook = orderbookData[yesTokenId];

                console.log(`\n🎯 Testing: BUY ${testSize} YES tokens at MARKET price`);

                const order = wallet.simulateBuy(
                    yesTokenId,
                    'YES',
                    testSize,
                    fullMarket,
                    { bids: yesOrderbook.bids, asks: yesOrderbook.asks }
                );

                if (order.status === 'FILLED') {
                    console.log(wallet.getSummary());

                    // Test selling half the position after 5 seconds
                    setTimeout(() => {
                        console.log('\n🎯 Testing: SELL 5 YES tokens at MARKET price');

                        const sellOrder = wallet.simulateSell(
                            yesTokenId,
                            'YES',
                            5,
                            fullMarket,
                            { bids: yesOrderbook.bids, asks: yesOrderbook.asks }
                        );

                        if (sellOrder.status === 'FILLED') {
                            console.log(wallet.getSummary());
                        }
                    }, 5000);
                }
            }, 1000);
        }
    });

    // Handle errors
    stream.on('error', (error) => {
        console.error('❌ Stream error:', error);
    });

    // Keep the process running
    console.log('\n💡 Press Ctrl+C to exit\n');

    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down...');
        console.log(wallet.getSummary());
        stream.disconnect();
        process.exit(0);
    });
}

// Run the demo
main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
