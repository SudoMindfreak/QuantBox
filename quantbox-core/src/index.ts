import dotenv from 'dotenv';
import { ClobClient } from '@polymarket/clob-client';
import { MarketService } from './services/MarketService';
import { MarketResolver } from './services/MarketResolver';
import { MarketOrchestrator } from './services/MarketOrchestrator';
import { BinanceService } from './services/BinanceService';
import { OrderbookStream } from './engine/stream';

export { MarketService, MarketResolver, MarketOrchestrator, BinanceService, OrderbookStream };
import { VirtualWallet } from './engine/wallet';
import { OrderBookMessage, MarketTransitionEvent, PollingErrorEvent, MarketMode } from './types/polymarket';

// Load environment variables
dotenv.config();

const POLYMARKET_HOST = 'https://clob.polymarket.com';
const POLYGON_CHAIN_ID = 137;

// Global state
let currentTokenIds: { yes: string; no: string } | null = null;
let wallet: VirtualWallet;
let stream: OrderbookStream;
let orderbookData: { [key: string]: OrderBookMessage } = {};

async function main() {
    console.log('\n🔮 QuantBox - Virtual Trading Engine Demo\n');
    console.log('💡 Phase 3.5: Market Type Intelligence (15min Focus)\n');

    // ========================================
    // 1. Initialize Read-Only CLOB Client
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 1: Initialize Services');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const clobClient = new ClobClient(
        POLYMARKET_HOST,
        POLYGON_CHAIN_ID,
        undefined,
        { key: '', secret: '', passphrase: '' }
    );

    console.log('✅ Read-only CLOB client initialized');

    // Initialize services
    const resolver = new MarketResolver(clobClient);
    const marketService = new MarketService(clobClient);

    // ========================================
    // 2. Initialize Virtual Wallet
    // ========================================
    const initialBalance = parseFloat(process.env.INITIAL_VIRTUAL_BALANCE || '10000');
    wallet = new VirtualWallet(initialBalance);
    console.log(`✅ Virtual wallet initialized with $${initialBalance}\n`);

    // ========================================
    // 3. Initialize WebSocket Stream
    // ========================================
    stream = new OrderbookStream();
    await stream.connect();

    // Setup orderbook listener
    stream.on('orderbook', handleOrderbookUpdate);

    // ========================================
    // 4. Market Orchestr ation with Type Intelligence
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 2: Configure Market Discovery');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const marketMode = (process.env.MARKET_MODE || 'auto') as MarketMode;
    const baseSlug = process.env.BASE_SLUG;
    const marketUrl = process.env.MARKET_URL || process.argv[2];

    // Determine market input
    let marketInput: string;

    if (marketMode === 'rolling' && baseSlug) {
        marketInput = baseSlug;
        console.log(`🔄 Mode: Rolling market (15min auto-discovery)`);
        console.log(`   Base slug: ${baseSlug}`);
    } else if (marketUrl) {
        marketInput = marketUrl;
        console.log(`📌 Mode: ${marketMode}`);
        console.log(`   Market input: ${marketUrl}`);
    } else if (baseSlug) {
        marketInput = baseSlug;
        console.log(`🔍 Mode: ${marketMode}`);
        console.log(`   Input: ${baseSlug}`);
    } else {
        console.error('❌ Error: No market input provided');
        console.error('   Provide MARKET_URL or BASE_SLUG in .env, or pass as CLI argument\n');
        process.exit(1);
    }

    console.log(`⏱️  Polling interval: ${parseInt(process.env.POLLING_INTERVAL_MS || '30000') / 1000}s`);
    console.log(`⏰ Expiring threshold: ${parseInt(process.env.EXPIRING_THRESHOLD_MS || '60000') / 1000}s\n`);

    // Initialize orchestrator
    const orchestrator = new MarketOrchestrator(resolver, marketService, {
        pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '30000'),
        expiringThreshold: parseInt(process.env.EXPIRING_THRESHOLD_MS || '60000')
    });

    // Setup event listeners
    orchestrator.on('market:detected', async (event: MarketTransitionEvent) => {
        await handleMarketDetected(event, marketService);
    });

    orchestrator.on('market:expiring', (event: MarketTransitionEvent) => {
        handleMarketExpiring(event);
    });

    orchestrator.on('market:expired', (event: MarketTransitionEvent) => {
        handleMarketExpired(event);
    });

    orchestrator.on('error', (event: PollingErrorEvent) => {
        console.error(`❌ Orchestrator error: ${event.error.message}`);
        if (event.fatal) {
            console.error('🚨 Fatal error - stopping orchestrator');
        }
    });

    // Start orchestrator
    await orchestrator.start(marketInput, marketMode);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ ${orchestrator.isPolling() ? 'Auto-discovery active' : 'Market subscribed'} - monitoring...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down...');
        orchestrator.stop();
        console.log(wallet.getSummary());
        stream.disconnect();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n\n👋 Shutting down...');
        orchestrator.stop();
        stream.disconnect();
        process.exit(0);
    });
}

/**
 * Handle new market detection
 */
async function handleMarketDetected(
    event: MarketTransitionEvent,
    marketService: MarketService
): Promise<void> {
    const { previousMarket, currentMarket } = event;

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🆕 NEW MARKET DETECTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 ${currentMarket.question}`);
    console.log(`   Condition ID: ${currentMarket.condition_id.substring(0, 12)}...`);
    console.log(`   End Date: ${currentMarket.end_date_iso}`);
    console.log(`   Active: ${currentMarket.active ? '✅' : '❌'}\n`);

    if (previousMarket) {
        console.log(`⬅️  Previous: ${previousMarket.question}`);
        console.log(`   (ended ${previousMarket.end_date_iso})\n`);
    }

    // Fetch full market metadata
    const fullMarket = await marketService.getMarketByConditionId(currentMarket.condition_id);
    const newTokenIds = marketService.extractTokenIds(fullMarket);

    // Switch subscriptions if we had a previous market
    if (currentTokenIds) {
        console.log('🔄 Switching market subscriptions...');
        const oldTokens = [currentTokenIds.yes, currentTokenIds.no];
        const newTokens = [newTokenIds.yes, newTokenIds.no];
        stream.switchSubscription(oldTokens, newTokens);
    } else {
        // First market, just subscribe
        await subscribeToMarket(fullMarket, newTokenIds, marketService);
    }

    currentTokenIds = newTokenIds;
    orderbookData = {}; // Reset orderbook data

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Now tracking new market');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Handle market expiring soon
 */
function handleMarketExpiring(event: MarketTransitionEvent): void {
    const { currentMarket, timeUntilExpiry } = event;
    const secondsLeft = Math.floor((timeUntilExpiry || 0) / 1000);

    console.log(`\n⏰ MARKET EXPIRING: ${currentMarket.question}`);
    console.log(`   Time remaining: ${secondsLeft}s\n`);
}

/**
 * Handle market expired
 */
function handleMarketExpired(event: MarketTransitionEvent): void {
    const { currentMarket } = event;

    console.log(`\n⏱️  MARKET EXPIRED: ${currentMarket.question}`);
    console.log('   Waiting for new market instance...\n');
}

/**
 * Subscribe to market tokens
 */
async function subscribeToMarket(
    fullMarket: any,
    tokenIds: { yes: string; no: string },
    marketService: MarketService
): Promise<void> {
    const outcome1 = fullMarket.tokens[0].outcome;
    const outcome2 = fullMarket.tokens[1].outcome;

    console.log(`   ${outcome1} Token: ${tokenIds.yes.substring(0, 12)}...`);
    console.log(`   ${outcome2} Token: ${tokenIds.no.substring(0, 12)}...`);

    stream.subscribe([tokenIds.yes, tokenIds.no]);

    console.log(`\n✅ Subscribed to market orderbook`);
}

/**
 * Handle orderbook updates
 */
function handleOrderbookUpdate(message: OrderBookMessage): void {
    if (!currentTokenIds) return;

    const tokenId = message.asset_id;
    const isFirstToken = tokenId === currentTokenIds.yes;
    const outcome = isFirstToken ? 'Token 1' : 'Token 2';

    // Store latest orderbook
    orderbookData[tokenId] = message;

    // Display orderbook
    console.log(`\n📊 ${outcome} Orderbook Update (${new Date(parseInt(message.timestamp)).toLocaleTimeString()})`);
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
}

// Run the demo
main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
