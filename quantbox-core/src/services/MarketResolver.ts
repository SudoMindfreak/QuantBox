import axios from 'axios';
import { GammaEvent, GammaMarket, MarketMetadata } from '../types/polymarket';
import { ClobClient } from '@polymarket/clob-client';
import { MarketTypeDetector } from './MarketTypeDetector';

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
    private detector: MarketTypeDetector;

    constructor(clobClient: ClobClient) {
        this.clobClient = clobClient;
        this.detector = new MarketTypeDetector();
    }

    private getIntervalSeconds(category: string): number {
        switch (category) {
            case '1h': return 3600;
            case '4h': return 14400;
            case '15m':
            default: return 900;
        }
    }

    /**
     * Main entry point: Resolve any input (URL, slug, condition ID) to market metadata
     */
    async resolve(input: string, category?: string): Promise<MarketMetadata> {
        const parsed = this.parseInput(input);

        console.log(`🔍 Resolving market: ${parsed.type} = "${parsed.value}" (Category: ${category || 'none'})`);

        if (parsed.type === 'condition_id') {
            return await this.fetchByConditionId(parsed.value);
        }

        const slug = parsed.value;
        const baseSlug = this.detector.extractBaseSlug(slug);
        const isRolling = category === '15m' || category === '1h' || category === '4h' || 
                          baseSlug !== slug || slug.endsWith('-15m') || slug.endsWith('-1h') || slug.endsWith('-4h');

        // 1. Try resolving the specific slug provided
        try {
            const event = await this.fetchEventBySlug(slug);
            if (event && event.markets && event.markets.length > 0) {
                const market = event.markets[0];
                const now = Math.floor(Date.now() / 1000);
                const marketEnd = new Date(market.endDate).getTime() / 1000;

                // If it's active, we're done
                if (market.active && marketEnd > now) {
                    return this.gammaToMarketMetadata(market);
                }
                
                // If it's expired and rolling, continue to discovery
                if (isRolling) {
                    console.log(`⏰ Market "${slug}" is expired, searching for current instance...`);
                } else {
                    return this.gammaToMarketMetadata(market); // One-off, return as-is
                }
            }
        } catch (err) {
            console.log(`ℹ️  Slug "${slug}" not found, moving to discovery...`);
        }

        // 2. Discovery logic for rolling markets
        if (isRolling) {
            const interval = this.getIntervalSeconds(category || '15m');
            return await this.findCurrentRollingMarket(slug, interval);
        }

        throw new Error(`Market not found: ${slug}`);
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
    async ensureActiveMarket(event: GammaEvent, originalSlug: string, category?: string): Promise<GammaMarket> {
        const firstMarket = event.markets[0];

        if (!firstMarket) {
            throw new Error(`Event has no markets: ${event.title}`);
        }

        const now = Math.floor(Date.now() / 1000);
        const marketEnd = new Date(firstMarket.endDate).getTime() / 1000;

        // If market is still active, use it
        if (now < marketEnd && firstMarket.active) {
            return firstMarket;
        }

        // Market is expired or inactive, check if it's a rolling market
        const baseSlug = this.detector.extractBaseSlug(originalSlug);
        const isRolling = category === '15m' || category === '1h' || category === '4h' || 
                          baseSlug !== originalSlug || originalSlug.endsWith('-15m');

        if (isRolling) {
            console.log(`⏰ Market "${originalSlug}" is expired, searching for current instance...`);
            
            const interval = this.getIntervalSeconds(category || '15m');
            const currentMetadata = await this.findCurrentRollingMarket(originalSlug, interval);
            
            // Re-fetch event for the resolved active slug to get the GammaMarket object
            // We use the question title to search or the baseSlug
            const searchTerms = currentMetadata.question.split(' - ')[0]; // E.g. "Bitcoin Up or Down"
            const activeEvent = await this.fetchEventBySlug(baseSlug); 
            
            if (activeEvent && activeEvent.markets && activeEvent.markets.length > 0) {
                // Find the market that matches the condition ID we resolved
                const matched = activeEvent.markets.find(m => m.conditionId === currentMetadata.condition_id);
                if (matched) return matched;
                return activeEvent.markets[0];
            }
        }

        return firstMarket;
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
            slug: (market as any).slug || market.condition_id,
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
            slug: gammaMarket.slug,
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

    /**
     * Resolve market from base slug or old instance slug
     */
    async resolveFromBaseSlug(baseSlug: string, category?: string): Promise<MarketMetadata> {
        const interval = this.getIntervalSeconds(category || '15m');
        console.log(`🔍 Using predictive rollover for ${category || '15m'} market (Interval: ${interval}s)`);
        
        return await this.findCurrentRollingMarket(baseSlug, interval);
    }

    /**
     * Find the current active rolling market using predictive timestamps
     */
    private async findCurrentRollingMarket(slugOrBase: string, interval: number): Promise<MarketMetadata> {
        const now = Math.floor(Date.now() / 1000);
        
        // 1. Extract base and timestamp if exists
        const parts = slugOrBase.split('-');
        const lastPart = parts[parts.length - 1];
        let base = slugOrBase;
        let ts = 0;

        if (this.isNumeric(lastPart)) {
            ts = parseInt(lastPart);
            base = parts.slice(0, -1).join('-');
        }

        // 2. Calculate target timestamp (Logic from example.py)
        // If we have a timestamp and it's recent (within 2 intervals), try next one.
        // Otherwise, jump to the current time block.
        let targetTs: number;
        if (ts > 0 && (now - ts) <= (interval * 2)) {
            targetTs = ts + interval;
        } else {
            targetTs = Math.floor(now / interval) * interval;
        }

        console.log(`🎯 Predicted next timestamp: ${targetTs} (from ${ts || 'none'})`);

        // 3. Try to fetch the predicted slug and its neighbors
        // We try 3 windows: current, next, and previous (just in case of slight delays)
        const windows = [targetTs, targetTs + interval, targetTs - interval];
        
        for (const windowTs of windows) {
            const predictedSlug = `${base}-${windowTs}`;
            console.log(`   Trying: ${predictedSlug}...`);
            const event = await this.fetchEventBySlug(predictedSlug);
            
            if (event && event.markets && event.markets.length > 0) {
                const market = event.markets[0];
                const marketEnd = new Date(market.endDate).getTime() / 1000;
                
                if (market.active && marketEnd > now) {
                    console.log(`✅ Found active market: ${predictedSlug}`);
                    return this.gammaToMarketMetadata(market);
                }
            }
        }

        // 4. Fallback: If predictive fails, search Gamma API (the old way)
        console.log('⚠️  Predictive fetch failed, falling back to Gamma search...');
        return await this.findCurrent15MinMarket(base);
    }

    /**
     * Find the current active 15-minute rolling market (Search Fallback)
     */
    private async findCurrent15MinMarket(baseSlug: string): Promise<MarketMetadata> {
        try {
            console.log(`🔍 Searching for active instances of "${baseSlug}"...`);
            
            // Try fetching with a query parameter first for better filtering
            const response = await axios.get(`${this.gammaApiBase}/events`, {
                params: {
                    active: true,
                    limit: 100,
                    query: baseSlug
                }
            });

            if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
                // If query failed, try fetching more active events as fallback
                console.log('⚠️  Query returned no results, trying broader search...');
                const fallbackRes = await axios.get(`${this.gammaApiBase}/events`, {
                    params: {
                        active: true,
                        limit: 100,
                        offset: 0
                    }
                });
                response.data = fallbackRes.data;
            }

            // Pattern to match: <something>-15m-<unix_timestamp>
            // Note: baseSlug might be 'btc-updown-15m' or 'btc-updown'
            const cleanBase = baseSlug.replace('-15m', '');
            const pattern = new RegExp(`^${this.escapeRegExp(cleanBase)}-15m-\\d{10}$`, 'i');

            // Filter for matching 15min markets
            const matchingEvents = response.data.filter((event: GammaEvent) => {
                return (pattern.test(event.slug) || event.slug.includes(baseSlug)) && 
                       event.active && !event.closed;
            });

            if (matchingEvents.length === 0) {
                // Last ditch effort: Search for the common series slug
                console.log('⚠️  No exact matches, searching for series: btc-up-or-down-15m');
                const seriesRes = await axios.get(`${this.gammaApiBase}/events`, {
                    params: { active: true, query: 'btc-up-or-down-15m' }
                });
                
                const seriesMatches = seriesRes.data.filter((e: any) => e.active && !e.closed);
                if (seriesMatches.length > 0) {
                    matchingEvents.push(...seriesMatches);
                } else {
                    throw new Error(`No active 15min markets found for base slug: ${baseSlug}`);
                }
            }

            // Sort by end time (earliest = current instance)
            const sorted = matchingEvents.sort((a: GammaEvent, b: GammaEvent) => {
                const aTime = new Date(a.end_date_iso || a.markets[0]?.endDate).getTime();
                const bTime = new Date(b.end_date_iso || b.markets[0]?.endDate).getTime();
                return aTime - bTime;
            });

            const currentEvent = sorted[0];
            console.log(`✅ Found current instance: ${currentEvent.slug}`);
            console.log(`   Question: ${currentEvent.title}`);

            // Use existing resolve logic
            return await this.resolve(currentEvent.slug);

        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to search Gamma API: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Escape special regex characters
     */
    private escapeRegExp(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
