import { MarketMetadata } from '../types/polymarket';

/**
 * Market Timeframe Categories
 */
export type MarketTimeframe = '15m' | '1h' | '4h' | 'one-off';

/**
 * Market Type Enum
 */
export enum MarketType {
    ROLLING_15MIN = 'rolling_15m',
    ROLLING_1H = 'rolling_1h',
    ROLLING_4H = 'rolling_4h',
    ONE_OFF = 'one_off'
}

/**
 * Market Pattern Detection Result
 */
export interface MarketPattern {
    type: MarketType;
    timeframe: MarketTimeframe;
    baseSlug: string;
    isDiscoverable: boolean;
}

/**
 * MarketTypeDetector - Detects market types and extracts base slugs
 */
export class MarketTypeDetector {
    // Patterns for rolling markets: <base>-<timeframe>-<unix_timestamp>
    private readonly PATTERNS = {
        '15m': /^(.+)-15m-\d{10}$/i,
        '1h': /^(.+)-1h-\d{10}$/i,
        '4h': /^(.+)-4h-\d{10}$/i,
    };

    /**
     * Detect market type from slug or URL
     */
    detectType(input: string): MarketPattern {
        // Clean input: remove URL prefix if present
        let slug = input.trim();
        if (slug.includes('/event/')) {
            slug = slug.split('/event/').pop()?.split('?')[0] || slug;
        }

        for (const [tf, regex] of Object.entries(this.PATTERNS)) {
            const match = slug.match(regex);
            if (match) {
                return {
                    type: this.tfToType(tf as MarketTimeframe),
                    timeframe: tf as MarketTimeframe,
                    baseSlug: `${match[1]}-${tf}`,
                    isDiscoverable: true
                };
            }
        }

        // Special case: if slug ends with timeframe but no timestamp
        for (const tf of ['15m', '1h', '4h']) {
            if (slug.endsWith(`-${tf}`)) {
                return {
                    type: this.tfToType(tf as MarketTimeframe),
                    timeframe: tf as MarketTimeframe,
                    baseSlug: slug,
                    isDiscoverable: true
                };
            }
        }

        return {
            type: MarketType.ONE_OFF,
            timeframe: 'one-off',
            baseSlug: slug,
            isDiscoverable: false
        };
    }

    private tfToType(tf: MarketTimeframe): MarketType {
        switch (tf) {
            case '15m': return MarketType.ROLLING_15MIN;
            case '1h': return MarketType.ROLLING_1H;
            case '4h': return MarketType.ROLLING_4H;
            default: return MarketType.ONE_OFF;
        }
    }

    /**
     * Extract base slug from any market slug
     */
    extractBaseSlug(slug: string): string {
        return this.detectType(slug).baseSlug;
    }
}
