import { EventEmitter } from 'events';
import { MarketResolver } from './MarketResolver';
import { MarketService } from './MarketService';
import { MarketPoller } from './MarketPoller';
import { MarketTypeDetector, MarketType } from './MarketTypeDetector';
import { MarketMetadata, MarketTransitionEvent, PollingErrorEvent, MarketMode } from '../types/polymarket';

/**
 * MarketOrchestrator - Factory pattern for choosing market strategy
 * 
 * Decides between:
 * - Rolling markets: Use MarketPoller for continuous discovery
 * - One-off markets: Subscribe once, run until end
 */
export class MarketOrchestrator extends EventEmitter {
    private resolver: MarketResolver;
    private marketService: MarketService;
    private detector: MarketTypeDetector;
    private poller?: MarketPoller;
    private currentMarket?: MarketMetadata;
    private pollingConfig: {
        pollingInterval: number;
        expiringThreshold: number;
    };

    constructor(
        resolver: MarketResolver,
        marketService: MarketService,
        config: {
            pollingInterval?: number;
            expiringThreshold?: number;
        } = {}
    ) {
        super();

        this.resolver = resolver;
        this.marketService = marketService;
        this.detector = new MarketTypeDetector();

        this.pollingConfig = {
            pollingInterval: config.pollingInterval ?? 30000,
            expiringThreshold: config.expiringThreshold ?? 60000
        };
    }

    /**
     * Start orchestration based on market input and mode
     * 
     * @param marketInput - Market URL, slug, or condition ID
     * @param mode - 'rolling', 'one-off', or 'auto' (detect from pattern)
     */
    async start(marketInput: string, mode: MarketMode = 'auto'): Promise<void> {
        console.log(`🎬 MarketOrchestrator starting...`);
        console.log(`   Mode: ${mode}`);
        console.log(`   Input: ${marketInput}\n`);

        // Detect market type
        const pattern = this.detector.detectType(marketInput);

        let usePolling = false;
        let baseSlug = marketInput;

        if (mode === 'auto') {
            // Auto-detect based on pattern
            usePolling = pattern.isDiscoverable;
            baseSlug = pattern.baseSlug;
            console.log(`🔍 Auto-detected: ${pattern.type} (${usePolling ? 'polling enabled' : 'one-off'})`);
        } else if (mode === 'rolling') {
            // Force polling mode
            usePolling = true;
            if (pattern.type === MarketType.ROLLING_15MIN) {
                baseSlug = pattern.baseSlug;
            }
            console.log(`🔄 Rolling mode: Polling enabled`);
        } else {
            // Force one-off mode
            usePolling = false;
            console.log(`📌 One-off mode: Single subscription`);
        }

        if (usePolling) {
            await this.startRollingMarketStrategy(baseSlug);
        } else {
            await this.startOneOffMarketStrategy(marketInput);
        }
    }

    /**
     * Strategy for rolling markets - use MarketPoller
     */
    private async startRollingMarketStrategy(baseSlug: string): Promise<void> {
        console.log(`\n🔄 Using Rolling Market Strategy`);
        console.log(`   Base slug: ${baseSlug}`);
        console.log(`   Polling interval: ${this.pollingConfig.pollingInterval}ms\n`);

        // Create poller
        this.poller = new MarketPoller(this.resolver, baseSlug, {
            pollingInterval: this.pollingConfig.pollingInterval,
            expiringThreshold: this.pollingConfig.expiringThreshold,
            enabled: true
        });

        // Forward events from poller
        this.poller.on('market:detected', (event: MarketTransitionEvent) => {
            this.currentMarket = event.currentMarket;
            this.emit('market:detected', event);
        });

        this.poller.on('market:active', (event: MarketTransitionEvent) => {
            this.emit('market:active', event);
        });

        this.poller.on('market:expiring', (event: MarketTransitionEvent) => {
            this.emit('market:expiring', event);
        });

        this.poller.on('market:expired', (event: MarketTransitionEvent) => {
            this.emit('market:expired', event);
        });

        this.poller.on('error', (event: PollingErrorEvent) => {
            this.emit('error', event);
        });

        // Start polling
        this.poller.start();
    }

    /**
     * Strategy for one-off markets - subscribe once, no polling
     */
    private async startOneOffMarketStrategy(marketInput: string): Promise<void> {
        console.log(`\n📌 Using One-Off Market Strategy`);
        console.log(`   Market: ${marketInput}`);
        console.log(`   No polling - will run until market ends\n`);

        try {
            // Resolve market once
            const market = await this.resolver.resolve(marketInput);
            this.currentMarket = market;

            // Emit market:detected once
            this.emit('market:detected', {
                previousMarket: undefined,
                currentMarket: market,
                timestamp: Date.now()
            });

            console.log(`✅ One-off market subscribed`);
            console.log(`   Will run until: ${market.end_date_iso}\n`);

        } catch (error) {
            this.emit('error', {
                error: error as Error,
                consecutiveFailures: 1,
                fatal: true
            });
            throw error;
        }
    }

    /**
     * Stop orchestration
     */
    stop(): void {
        console.log(`🛑 MarketOrchestrator stopping...`);

        if (this.poller) {
            this.poller.stop();
            this.poller = undefined;
        }

        this.removeAllListeners();
    }

    /**
     * Get current market
     */
    getCurrentMarket(): MarketMetadata | undefined {
        return this.currentMarket;
    }

    /**
     * Check if currently using polling strategy
     */
    isPolling(): boolean {
        return this.poller !== undefined;
    }
}
