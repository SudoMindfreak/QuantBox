import axios from 'axios';
import { GammaEvent, GammaMarket, MarketMetadata } from '../types/polymarket';
import { ClobClient } from '@polymarket/clob-client';

/**
 * MarketResolver - Intelligent market fetching and rollover
 * 
 * Handles:
 * - Parsing Polymarket URLs to extract slugs
 * - Fetching events from Gamma API
 * - Auto-rollover for 15-minute markets (e.g., btc-updown-15m)
 * - Converting Gamma API data to our MarketMetadata format
 */
export class MarketResolver {
    private clobClient: ClobClient;
    private gammaApiBase = 'https://gamma-api.polymarket.com';

    constructor(clobClient: ClobClient) {
        this.clobClient = clobClient;
    }

    /**
     * Main entry point: Resolve any input (URL, slug, condition ID) to market metadata
     */
    async resolve(input: string): Promise<MarketMetadata> {
        const parsed = this.parseInput(input);

        console.log(`🔍 Resolving market: ${parsed.type} = "${parsed.value}"`);

        if (parsed.type === 'condition_id') {
            // Direct fetch by condition ID (backward compatibility)
            return await this.fetchByConditionId(parsed.value);
        }

        // Fetch event by slug
        let slug = parsed.value;
        let event = await this.fetchEventBySlug(slug);

        if (!event) {
            throw new Error(`Market not found for slug: ${slug}`);
        }

        // Check if this is a rolling market (has timestamp in slug)
        const activeMarket = await this.ensureActiveMarket(event, slug);

        return this.gammaToMarketMetadata(activeMarket);
    }

    /**
     * Parse input to determine type: URL, slug, or condition_id
     */
    parseInput(input: string): { type: string; value: string } {
        const trimmed = input.trim();

        // Check if it's a full URL
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            const url = new URL(trimmed);
            // Extract slug from path: /event/bitcoin-crosses-100000
            const pathParts = url.pathname.split('/').filter(Boolean);
            if (pathParts.length >= 2 && pathParts[0] === 'event') {
                return { type: 'slug', value: pathParts[1] };
            }
            throw new Error(`Invalid Polymarket URL format: ${trimmed}`);
        }

        // Check if it's a condition ID (0x + hex)
        if (trimmed.startsWith('0x') && trimmed.length > 40) {
            return { type: 'condition_id', value: trimmed };
        }

        // Otherwise, treat as slug
        return { type: 'slug', value: trimmed };
    }

    /**
     * Fetch event from Gamma API by slug
     */
    async fetchEventBySlug(slug: string): Promise<GammaEvent | null> {
        try {
            const url = `${this.gammaApiBase}/events?slug=${slug}`;
            const response = await axios.get(url);

            if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
                return null;
            }

            const event = response.data[0] as GammaEvent;
            console.log(`📊 Found event: "${event.title}"`);

            return event;
        } catch (error) {
            console.error(`Error fetching event by slug "${slug}":`, error);
            return null;
        }
    }

    /**
     * Ensure we have the ACTIVE market for rolling markets
     * 
     * For markets like btc-updown-15m-1770220800:
     * - If market is expired, calculate current 15-min window
     * - Poll Gamma API for the active market
     */
    async ensureActiveMarket(event: GammaEvent, originalSlug: string): Promise<GammaMarket> {
        const firstMarket = event.markets[0];

        if (!firstMarket) {
            throw new Error(`Event has no markets: ${event.title}`);
        }

        // Check if this is a timestamped rolling market
        const slugParts = originalSlug.split('-');
        const lastPart = slugParts[slugParts.length - 1];

        if (!this.isNumeric(lastPart)) {
            // Not a timestamped market, return as-is
            console.log('✅ Market does not have timestamp suffix, using as-is');
            return firstMarket;
        }

        // It's a rolling market! Check if it's active
        const marketTimestamp = parseInt(lastPart);
        const now = Math.floor(Date.now() / 1000);
        const marketEnd = marketTimestamp + 900; // 15 minutes after start

        if (now < marketEnd) {
            // Market is still active
            console.log(`✅ Market is active (ends at ${new Date(marketEnd * 1000).toLocaleTimeString()})`);
            return firstMarket;
        }

        // Market expired! Calculate current active market
        console.log('⏰ Market expired, rolling over to current active market...');

        const baseSlug = slugParts.slice(0, -1).join('-');
        const currentWindowStart = Math.floor(now / 900) * 900;

        // Try to find the current active market
        for (let attempt = 0; attempt < 12; attempt++) {
            const targetTimestamp = currentWindowStart + (attempt * 900);
            const targetSlug = `${baseSlug}-${targetTimestamp}`;

            console.log(`🔍 Attempt ${attempt + 1}/12: Trying ${targetSlug}`);

            const targetEvent = await this.fetchEventBySlug(targetSlug);

            if (targetEvent && targetEvent.markets && targetEvent.markets.length > 0) {
                console.log(`✅ Found active market: ${targetEvent.title}`);
                return targetEvent.markets[0];
            }

            // Wait before next attempt (except on last iteration)
            if (attempt < 11) {
                await this.sleep(5000); // 5 seconds
            }
        }

        throw new Error(`Could not find active rolling market for ${baseSlug}`);
    }

    /**
     * Fetch market directly by condition ID (backward compatibility)
     */
    async fetchByConditionId(conditionId: string): Promise<MarketMetadata> {
        console.log(`📋 Fetching market by condition ID: ${conditionId}`);
        const market = await this.clobClient.getMarket(conditionId);

        // Convert CLOB market to our MarketMetadata format
        return {
            condition_id: market.condition_id,
            question: market.question,
            end_date_iso: market.end_date_iso,
            tokens: market.tokens.map((t: any) => ({
                token_id: t.token_id,
                outcome: t.outcome,
                price: t.price || '0'
            })),
            tick_size: parseFloat(market.minimum_tick_size || '0.01'),
            taker_base_fee: parseFloat(market.taker_base_fee || '0'),
            maker_base_fee: parseFloat(market.maker_base_fee || '0'),
            neg_risk: market.neg_risk || false,
            active: market.active !== false
        };
    }

    /**
     * Convert Gamma API market to our MarketMetadata type
     */
    gammaToMarketMetadata(gammaMarket: GammaMarket): MarketMetadata {
        console.log('🔍 DEBUG: Gamma market data:', JSON.stringify(gammaMarket, null, 2));

        // Parse outcomes if they're a JSON string
        let outcomes: string[] = [];
        if (typeof gammaMarket.outcomes === 'string') {
            try {
                outcomes = JSON.parse(gammaMarket.outcomes);
            } catch {
                outcomes = [gammaMarket.outcomes];
            }
        } else if (Array.isArray(gammaMarket.outcomes)) {
            outcomes = gammaMarket.outcomes;
        }

        // Parse token IDs if they're a JSON string
        let tokenIds: string[] = [];
        if (typeof gammaMarket.clobTokenIds === 'string') {
            try {
                tokenIds = JSON.parse(gammaMarket.clobTokenIds);
            } catch {
                tokenIds = [gammaMarket.clobTokenIds];
            }
        } else if (Array.isArray(gammaMarket.clobTokenIds)) {
            tokenIds = gammaMarket.clobTokenIds;
        }

        // Parse outcome prices if available
        let prices: string[] = [];
        if (gammaMarket.outcomePrices) {
            if (typeof gammaMarket.outcomePrices === 'string') {
                try {
                    prices = JSON.parse(gammaMarket.outcomePrices);
                } catch {
                    prices = outcomes.map(() => '0.50');
                }
            } else if (Array.isArray(gammaMarket.outcomePrices)) {
                prices = gammaMarket.outcomePrices;
            }
        } else {
            prices = outcomes.map(() => '0.50');
        }

        // Build tokens array
        const tokens = outcomes.map((outcome, i) => ({
            token_id: tokenIds[i] || '',
            outcome: outcome,
            price: prices[i] || '0.50'
        }));

        return {
            condition_id: gammaMarket.conditionId,
            question: gammaMarket.question,
            end_date_iso: gammaMarket.endDate,
            tokens,
            tick_size: 0.01, // Default, will be overridden by CLOB API if needed
            taker_base_fee: 0.0, // Will be fetched from CLOB
            maker_base_fee: 0.0, // Will be fetched from CLOB
            neg_risk: false,
            active: gammaMarket.active !== false
        };
    }

    /**
     * Helper: Check if string is numeric
     */
    private isNumeric(str: string): boolean {
        return /^\d+$/.test(str);
    }

    /**
     * Helper: Sleep for ms
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
