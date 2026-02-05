import { MarketMetadata } from '../types/polymarket';

/**
 * Market Type Enum - Simplified for 15min focus
 */
export enum MarketType {
    ROLLING_15MIN = 'rolling_15min',  // Primary market type
    ONE_OFF = 'one_off'                // Fallback for non-rolling markets
}

/**
 * Market Pattern Detection Result
 */
export interface MarketPattern {
    type: MarketType;
    baseSlug: string;
    isDiscoverable: boolean;
}

/**
 * MarketTypeDetector - Detects market types and extracts base slugs
 * 
 * Primary focus: 15-minute rolling markets (btc-updown-15m-*)
 */
export class MarketTypeDetector {
    // Pattern for 15-minute rolling markets: <base>-15m-<unix_timestamp>
    private readonly ROLLING_15MIN_PATTERN = /^(.+)-15m-\d{10}$/i;

    /**
     * Detect market type from slug
     * 
     * @param slug - Market slug to analyze
     * @returns Market pattern with type and base slug
     * 
     * @example
     * detectType('btc-updown-15m-1770273000')
     * // Returns: { type: ROLLING_15MIN, baseSlug: 'btc-updown-15m', isDiscoverable: true }
     * 
     * detectType('who-will-trump-nominate-as-fed-chair')
     * // Returns: { type: ONE_OFF, baseSlug: 'who-will-trump-nominate-as-fed-chair', isDiscoverable: false }
     */
    detectType(slug: string): MarketPattern {
        // Check for 15-minute rolling market pattern
        const match = slug.match(this.ROLLING_15MIN_PATTERN);

        if (match) {
            const baseSlug = match[1] + '-15m'; // e.g., 'btc-updown-15m'

            return {
                type: MarketType.ROLLING_15MIN,
                baseSlug,
                isDiscoverable: true
            };
        }

        // Default: one-off market (not discoverable)
        return {
            type: MarketType.ONE_OFF,
            baseSlug: slug,
            isDiscoverable: false
        };
    }

    /**
     * Check if a slug matches the 15-minute rolling pattern
     * 
     * @param slug - Slug to check
     * @returns True if matches 15min pattern
     */
    is15MinRollingMarket(slug: string): boolean {
        return this.ROLLING_15MIN_PATTERN.test(slug);
    }

    /**
     * Extract base slug from a 15-minute market slug
     * 
     * @param slug - Full market slug
     * @returns Base slug without timestamp, or original slug if not 15min market
     * 
     * @example
     * extractBaseSlug('btc-updown-15m-1770273000') // 'btc-updown-15m'
     * extractBaseSlug('eth-updown-15m-1770274800') // 'eth-updown-15m'
     */
    extractBaseSlug(slug: string): string {
        const pattern = this.detectType(slug);
        return pattern.baseSlug;
    }

    /**
     * Validate if a slug is a valid base slug for 15min markets
     * 
     * @param baseSlug - Base slug to validate
     * @returns True if valid base slug (ends with '-15m')
     */
    isValidBaseSlug(baseSlug: string): boolean {
        return baseSlug.endsWith('-15m');
    }
}
