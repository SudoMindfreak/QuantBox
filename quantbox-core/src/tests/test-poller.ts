/**
 * Manual test script for MarketPoller
 * Tests the auto-discovery logic without running the full application
 */

import dotenv from 'dotenv';
import { ClobClient } from '@polymarket/clob-client';
import { MarketResolver } from '../services/MarketResolver';
import { MarketPoller } from '../services/MarketPoller';

dotenv.config();

const POLYMARKET_HOST = 'https://clob.polymarket.com';
const POLYGON_CHAIN_ID = 137;

async function testPoller() {
    console.log('\n🧪 Testing MarketPoller...\n');

    // Initialize services
    const clobClient = new ClobClient(
        POLYMARKET_HOST,
        POLYGON_CHAIN_ID,
        undefined,
        { key: '', secret: '', passphrase: '' }
    );

    const resolver = new MarketResolver(clobClient);

    // Test with a known rolling market slug
    const baseSlug = process.env.BASE_SLUG || 'bitcoin-up-or-down';

    console.log(`📊 Testing with base slug: ${baseSlug}`);
    console.log(`⏱️  Polling interval: 5 seconds (test mode)`);
    console.log(`⏰ Expiring threshold: 30 seconds (test mode)\n`);

    const poller = new MarketPoller(resolver, baseSlug, {
        pollingInterval: 5000,  // 5 seconds for testing
        expiringThreshold: 30000,  // 30 seconds
        enabled: true
    });

    // Setup event listeners
    poller.on('market:detected', (event) => {
        console.log('\n✅ EVENT: market:detected');
        console.log(`   Question: ${event.currentMarket.question}`);
        console.log(`   Condition ID: ${event.currentMarket.condition_id.substring(0, 12)}...`);
        console.log(`   End Date: ${event.currentMarket.end_date_iso}`);

        if (event.previousMarket) {
            console.log(`   Previous: ${event.previousMarket.question}`);
        }
    });

    poller.on('market:active', (event) => {
        const timeLeft = Math.floor((event.timeUntilExpiry || 0) / 1000);
        console.log(`\n💚 EVENT: market:active (${timeLeft}s remaining)`);
    });

    poller.on('market:expiring', (event) => {
        const timeLeft = Math.floor((event.timeUntilExpiry || 0) / 1000);
        console.log(`\n⏰ EVENT: market:expiring (${timeLeft}s remaining)`);
    });

    poller.on('market:expired', (event) => {
        console.log(`\n⏱️  EVENT: market:expired`);
        console.log(`   Market: ${event.currentMarket.question}`);
    });

    poller.on('error', (event) => {
        console.error(`\n❌ EVENT: error`);
        console.error(`   Message: ${event.error.message}`);
        console.error(`   Failures: ${event.consecutiveFailures}`);
        console.error(`   Fatal: ${event.fatal}`);
    });

    // Start the poller
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Starting poller...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    poller.start();

    // Run for 30 seconds then stop
    setTimeout(() => {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🛑 Test complete - stopping poller...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        poller.stop();
        process.exit(0);
    }, 30000);

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n👋 Interrupted - stopping test...');
        poller.stop();
        process.exit(0);
    });
}

testPoller().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
