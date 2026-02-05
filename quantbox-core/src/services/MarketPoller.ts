import { EventEmitter } from 'events';
import { MarketResolver } from './MarketResolver';
import { GammaMarket, MarketMetadata } from '../types/polymarket';

/**
 * Configuration for MarketPoller
 */
export interface MarketPollerConfig {
    pollingInterval?: number;      // Milliseconds between polls (default: 30000)
    expiringThreshold?: number;    // Milliseconds before expiry to emit 'expiring' (default: 60000)
    enabled?: boolean;              // Whether polling is enabled (default: true)
    maxRetries?: number;            // Max consecutive failures before giving up (default: 10)
    backoffMultiplier?: number;     // Exponential backoff multiplier (default: 1.5)
}

/**
 * MarketPoller - Continuous polling for rolling market detection
 * 
 * Monitors a base slug (e.g., 'bitcoin-up-or-down') for new market instances
 * and emits events when markets are detected, expiring, or expired.
 * 
 * Events:
 * - 'market:detected' - New market instance found
 * - 'market:active' - Current market is still active
 * - 'market:expiring' - Market approaching end time
 * - 'market:expired' - Market has ended
 * - 'error' - Polling or API errors
 * 
 * Usage:
 * ```typescript
 * const poller = new MarketPoller(resolver, 'bitcoin-up-or-down');
 * 
 * poller.on('market:detected', async (market) => {
 *   console.log('New market:', market.question);
 *   await switchToMarket(market);
 * });
 * 
 * poller.start();
 * ```
 */
export class MarketPoller extends EventEmitter {
    private resolver: MarketResolver;
    private baseSlug: string;
    private config: Required<MarketPollerConfig>;

    private intervalId: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private currentMarket: MarketMetadata | null = null;

    private consecutiveFailures: number = 0;
    private currentBackoff: number = 0;

    constructor(
        resolver: MarketResolver,
        baseSlug: string,
        config: MarketPollerConfig = {}
    ) {
        super();

        this.resolver = resolver;
        this.baseSlug = baseSlug;

        // Apply defaults
        this.config = {
            pollingInterval: config.pollingInterval ?? 30000,      // 30 seconds
            expiringThreshold: config.expiringThreshold ?? 60000,  // 1 minute
            enabled: config.enabled ?? true,
            maxRetries: config.maxRetries ?? 10,
            backoffMultiplier: config.backoffMultiplier ?? 1.5
        };

        this.validateConfig();
    }

    /**
     * Validate configuration values
     */
    private validateConfig(): void {
        if (this.config.pollingInterval < 1000) {
            throw new Error('Polling interval must be at least 1000ms to avoid rate limiting');
        }
        if (this.config.expiringThreshold < 0) {
            throw new Error('Expiring threshold must be non-negative');
        }
        if (this.config.maxRetries < 1) {
            throw new Error('Max retries must be at least 1');
        }
    }

    /**
     * Start polling for market updates
     */
    start(): void {
        if (this.isRunning) {
            console.warn('⚠️  MarketPoller already running');
            return;
        }

        if (!this.config.enabled) {
            console.log('ℹ️  Auto-discovery disabled in config');
            return;
        }

        console.log(`🔄 Starting MarketPoller for "${this.baseSlug}"`);
        console.log(`   Polling interval: ${this.config.pollingInterval}ms`);

        this.isRunning = true;
        this.poll(); // Initial poll

        // Schedule recurring polls
        this.intervalId = setInterval(() => {
            this.poll();
        }, this.config.pollingInterval);
    }

    /**
     * Stop polling
     */
    stop(): void {
        if (!this.isRunning) {
            return;
        }

        console.log('🛑 Stopping MarketPoller');

        this.isRunning = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.removeAllListeners();
    }

    /**
     * Get current active market
     */
    getCurrentMarket(): MarketMetadata | null {
        return this.currentMarket;
    }

    /**
     * Check if poller is running
     */
    isPolling(): boolean {
        return this.isRunning;
    }

    /**
     * Main polling logic
     */
    private async poll(): Promise<void> {
        try {
            // Resolve the base slug to get current market
            const market = await this.resolver.resolve(this.baseSlug);

            // Check if this is a new market
            const isNewMarket = !this.currentMarket ||
                this.currentMarket.condition_id !== market.condition_id;

            if (isNewMarket) {
                console.log(`🆕 New market detected: ${market.question}`);

                const previousMarket = this.currentMarket;
                this.currentMarket = market;

                this.emit('market:detected', {
                    previousMarket,
                    currentMarket: market,
                    timestamp: Date.now()
                });

                // Reset failure counter on success
                this.consecutiveFailures = 0;
                this.currentBackoff = 0;

            } else {
                // Same market, check if expiring
                const timeUntilExpiry = this.getTimeUntilExpiry(market);

                if (timeUntilExpiry !== null) {
                    if (timeUntilExpiry <= 0) {
                        // Market expired
                        console.log('⏱️  Market expired');
                        this.emit('market:expired', {
                            currentMarket: market,
                            timestamp: Date.now()
                        });
                    } else if (timeUntilExpiry <= this.config.expiringThreshold) {
                        // Market expiring soon
                        const secondsLeft = Math.floor(timeUntilExpiry / 1000);
                        console.log(`⏰ Market expiring in ${secondsLeft}s`);
                        this.emit('market:expiring', {
                            currentMarket: market,
                            timeUntilExpiry,
                            timestamp: Date.now()
                        });
                    } else {
                        // Market still active
                        this.emit('market:active', {
                            currentMarket: market,
                            timeUntilExpiry,
                            timestamp: Date.now()
                        });
                    }
                }
            }

        } catch (error) {
            this.handlePollingError(error as Error);
        }
    }

    /**
     * Calculate time until market expiry in milliseconds
     */
    private getTimeUntilExpiry(market: MarketMetadata): number | null {
        if (!market.end_date_iso) {
            return null;
        }

        const endTime = new Date(market.end_date_iso).getTime();
        const now = Date.now();

        return endTime - now;
    }

    /**
     * Handle polling errors with exponential backoff
     */
    private handlePollingError(error: Error): void {
        this.consecutiveFailures++;

        console.error(`❌ Polling error (${this.consecutiveFailures}/${this.config.maxRetries}):`, error.message);

        if (this.consecutiveFailures >= this.config.maxRetries) {
            console.error('🚨 Max retries reached, stopping poller');
            this.stop();
            this.emit('error', {
                error,
                consecutiveFailures: this.consecutiveFailures,
                fatal: true
            });
            return;
        }

        // Calculate backoff delay
        this.currentBackoff = Math.min(
            this.config.pollingInterval * Math.pow(this.config.backoffMultiplier, this.consecutiveFailures),
            300000 // Max 5 minutes
        );

        console.log(`   Backing off for ${Math.floor(this.currentBackoff / 1000)}s...`);

        this.emit('error', {
            error,
            consecutiveFailures: this.consecutiveFailures,
            nextRetryIn: this.currentBackoff,
            fatal: false
        });

        // Schedule retry with backoff
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setTimeout(() => {
            this.poll();

            // Resume normal interval
            this.intervalId = setInterval(() => {
                this.poll();
            }, this.config.pollingInterval);
        }, this.currentBackoff);
    }
}
