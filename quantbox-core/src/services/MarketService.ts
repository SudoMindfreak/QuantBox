import { ClobClient } from '@polymarket/clob-client';
import { MarketMetadata, TickSize } from '../types/polymarket';

/**
 * MarketService - Fetch and cache market metadata from Polymarket CLOB API
 */
export class MarketService {
    private clobClient: ClobClient;
    private marketCache: Map<string, MarketMetadata> = new Map();
    private tickSizeCache: Map<string, TickSize> = new Map();

    constructor(clobClient: ClobClient) {
        this.clobClient = clobClient;
    }

    /**
     * Fetch market metadata by condition ID
     */
    async getMarketByConditionId(conditionId: string): Promise<MarketMetadata> {
        // Check cache first
        if (this.marketCache.has(conditionId)) {
            return this.marketCache.get(conditionId)!;
        }

        console.log(`📊 Fetching market metadata for condition: ${conditionId}`);

        const market = await this.clobClient.getMarket(conditionId);

        const metadata: MarketMetadata = {
            condition_id: market.condition_id,
            question: market.question,
            slug: (market as any).slug || market.condition_id,
            end_date_iso: market.end_date_iso,
            tokens: market.tokens.map((t: any) => ({
                token_id: t.token_id,
                outcome: t.outcome,
                price: t.price ? String(t.price) : '0.50'
            })),
            tick_size: market.minimum_tick_size,
            taker_base_fee: market.taker_base_fee,
            maker_base_fee: market.maker_base_fee,
            neg_risk: market.neg_risk,
            active: market.active,
        };

        // Cache for future use
        this.marketCache.set(conditionId, metadata);

        console.log(`✅ Market: ${metadata.question}`);
        console.log(`   Tokens: ${metadata.tokens.map(t => `${t.outcome} (${t.token_id.substring(0, 8)}...)`).join(', ')}`);
        console.log(`   Tick Size: ${metadata.tick_size}, NegRisk: ${metadata.neg_risk}`);

        return metadata;
    }

    /**
     * Extract token IDs from a binary market (first and second outcomes)
     * Intelligent mapping based on outcome labels
     */
    extractTokenIds(market: MarketMetadata): { yes: string; no: string } {
        if (market.tokens.length < 2) {
            throw new Error(`Market ${market.condition_id} must have at least 2 tokens (has ${market.tokens.length})`);
        }

        let yesToken = '';
        let noToken = '';

        for (const token of market.tokens) {
            const outcome = token.outcome.toLowerCase();
            if (outcome === 'yes' || outcome === 'up' || outcome === 'higher' || outcome === 'over') {
                yesToken = token.token_id;
            } else if (outcome === 'no' || outcome === 'down' || outcome === 'lower' || outcome === 'under') {
                noToken = token.token_id;
            }
        }

        // Fallback to indices if labels don't match standard patterns
        if (!yesToken || !noToken) {
            console.log('⚠️ Could not identify tokens by label, falling back to indices');
            yesToken = market.tokens[0].token_id;
            noToken = market.tokens[1].token_id;
        }

        return {
            yes: yesToken,
            no: noToken,
        };
    }

    /**
     * Get tick size for a specific token
     */
    async getTickSize(tokenId: string): Promise<TickSize> {
        if (this.tickSizeCache.has(tokenId)) {
            return this.tickSizeCache.get(tokenId)!;
        }

        const tickSize = await this.clobClient.getTickSize(tokenId);
        const tickSizeObj: TickSize = { value: tickSize };

        this.tickSizeCache.set(tokenId, tickSizeObj);
        return tickSizeObj;
    }

    /**
     * Validate that a price aligns with the market's tick size
     */
    validatePrice(price: number, tickSize: number): boolean {
        const remainder = price % tickSize;
        return Math.abs(remainder) < 0.0000001; // floating point tolerance
    }

    /**
     * Round price to nearest valid tick
     */
    roundToTickSize(price: number, tickSize: number): number {
        return Math.round(price / tickSize) * tickSize;
    }

    /**
     * Search for active BTC up/down markets (for auto-discovery)
     * This queries the Gamma API for events matching the BTC up/down pattern
     */
    async findActiveBTCUpDownMarkets(): Promise<MarketMetadata[]> {
        // Note: This is a simplified version. 
        // The Gamma API endpoint would be: https://gamma-api.polymarket.com/events
        // We'd filter by slug pattern "btc-updown-15m-*" and active=true

        // For Phase 1, we'll implement basic discovery
        // Phase 2 can add more sophisticated filtering and polling

        console.log('🔍 Auto-discovery not yet implemented - use manual condition ID for now');
        return [];
    }

    /**
     * Clear cache (useful for testing or when market updates)
     */
    clearCache(): void {
        this.marketCache.clear();
        this.tickSizeCache.clear();
    }
}
