import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { OrderbookStream } from 'quantbox-core/dist/engine/stream.js';
import { OrderBookMessage, MarketMetadata, MarketTransitionEvent } from 'quantbox-core/dist/types/polymarket.js';
import { MarketResolver } from 'quantbox-core/dist/services/MarketResolver.js';
import { MarketService } from 'quantbox-core/dist/services/MarketService.js';
import { MarketOrchestrator } from 'quantbox-core/dist/services/MarketOrchestrator.js';
import { BinanceService } from 'quantbox-core/dist/services/BinanceService.js';
import { VirtualWallet } from 'quantbox-core/dist/engine/wallet.js';
import { NodeInput, NodeExecutor, OrderbookData, PriceSide } from './types.js';

interface Node {
    id: string;
    type: string;
    data: any;
}

interface OrderbookState {
    bids: Map<string, string>; // price -> size
    asks: Map<string, string>; // price -> size
    timestamp: string;
}

interface Edge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
}

export class StrategyRunner extends EventEmitter {
    private id: string;
    private nodes: Map<string, Node>;
    private edges: Edge[];
    private active: boolean = false;
    private io: Server;
    private stream: OrderbookStream;
    private resolver: MarketResolver;
    private marketService: MarketService;
    private binance: BinanceService;
    private wallet: VirtualWallet;
    private orchestrators: Map<string, MarketOrchestrator> = new Map();
    private currentMarketMetadata: Map<string, MarketMetadata> = new Map();
    private subscribedAssets: Set<string> = new Set();
    private latestOrderbooks: Map<string, OrderBookMessage> = new Map();

    // Strategy Memory State
    private nodeMemory: Map<string, any> = new Map();
    private strikePrices: Map<string, number> = new Map();
    private volatilityThresholds: Map<string, number> = new Map();
    private lastEvaluationLog: Map<string, number> = new Map();
    private nodeCooldowns: Map<string, number> = new Map();
    private pendingStrikeLookups: Set<string> = new Set();

    // Side Tracking
    // Side Tracking
    private bull_id: string | null = null;
    private bear_id: string | null = null;

    private orderbooks: Map<string, OrderbookState> = new Map();


    // Node executor map for modular execution
    private nodeExecutors: Record<string, NodeExecutor>;

    constructor(
        id: string,
        strategyData: any,
        io: Server,
        stream: OrderbookStream,
        resolver: MarketResolver,
        marketService: MarketService,
        binance: BinanceService
    ) {
        super();
        this.id = id;
        const nodes = typeof strategyData.nodes === 'string' ? JSON.parse(strategyData.nodes) : strategyData.nodes;
        const edges = typeof strategyData.edges === 'string' ? JSON.parse(strategyData.edges) : strategyData.edges;
        this.nodes = new Map((nodes as Node[]).map(n => [n.id, n]));
        this.edges = edges;
        this.io = io;
        this.stream = stream;
        this.resolver = resolver;
        this.marketService = marketService;
        this.binance = binance;
        this.wallet = new VirtualWallet(strategyData.initialBalance || 1000);

        // Initialize executor map
        this.nodeExecutors = {
            marketDetector: this.executeMarketDetector.bind(this),
            orderbook: this.executeOrderbook.bind(this),
            price: this.executePrice.bind(this),
            timer: this.executeTimer.bind(this),
            condition: this.executeCondition.bind(this),
            buyAction: this.executeBuyAction.bind(this),
            sellAction: this.executeSellAction.bind(this),
            portfolio: this.executePortfolio.bind(this),
        };
    }

    public async start() {
        if (this.active) return;
        this.active = true;
        this.log('Strategy started');

        const entryNodes = Array.from(this.nodes.values()).filter(n => n.type === 'marketDetector');
        for (const node of entryNodes) {
            await this.initializeMarketDetector(node);
        }

        this.log('📡 Waiting for market data pulse...');
        this.stream.on('orderbook', this.handleMarketData);
        this.stream.on('price_change', this.handleMarketData);

        this.binance.on('price', (data: any) => {
            if (!this.active) return;
            const detectors = Array.from(this.nodes.values()).filter(n => n.type === 'marketDetector');
            for (const detector of detectors) {
                const firstId = Array.from(this.subscribedAssets)[0];
                if (firstId) {
                    this.executeNode(detector.id, { assetId: firstId, fromSpot: true });
                }
            }
        });
    }

    public stop() {
        this.active = false;
        this.log('Strategy stopped');
        this.stream.off('orderbook', this.handleMarketData);
        this.binance.removeAllListeners('price');
        for (const orchestrator of this.orchestrators.values()) {
            orchestrator.stop();
        }
        this.orchestrators.clear();
    }

    private handleMarketData = (data: any) => {
        if (!this.active) return;

        // --- 1. State Maintenance ---
        if (data.event_type === 'book') {
            // Snapshot: Replace state
            const state: OrderbookState = {
                bids: new Map(),
                asks: new Map(),
                timestamp: data.timestamp
            };
            if (data.bids) data.bids.forEach((o: any) => state.bids.set(o.price, o.size));
            if (data.asks) data.asks.forEach((o: any) => state.asks.set(o.price, o.size));
            this.orderbooks.set(data.asset_id, state);
            // console.log(`[Stream] Snapshot for ${data.asset_id}`);
        } else if (data.event_type === 'price_change') {
            // Delta: Update state
            const state = this.orderbooks.get(data.asset_id);
            if (state) {
                if (data.bids) {
                    data.bids.forEach((o: any) => {
                        if (o.size === '0' || o.size === 0) state.bids.delete(o.price);
                        else state.bids.set(o.price, o.size);
                    });
                }
                if (data.asks) {
                    data.asks.forEach((o: any) => {
                        if (o.size === '0' || o.size === 0) state.asks.delete(o.price);
                        else state.asks.set(o.price, o.size);
                    });
                }
                state.timestamp = data.timestamp;
            }
        }

        // Keep raw message for fallback/legacy (though it might be a delta now!)
        this.latestOrderbooks.set(data.asset_id, data);

        // --- 2. Trigger Logic ---
        // Only trigger if we track this asset
        if (data.asset_id && this.subscribedAssets.has(data.asset_id)) {
            // Debounce or verify significant change? For now, trigger on every update.
            const detectors = Array.from(this.nodes.values()).filter(n => n.type === 'marketDetector');
            for (const detector of detectors) {
                this.executeNode(detector.id, { assetId: data.asset_id });
            }
        }
    }



    private async settlePositions(previousMarket: MarketMetadata) {
        this.log(`🏁 Settling expired market: ${previousMarket.question}`, 'info');

        // In simulation, we determine the winner based on the spot price vs strike price 
        // because the API winner might not be available yet.
        const symbol = 'BTCUSDT';
        const spot = this.binance.getCurrentPrice(symbol);

        // Find the strike price for the detector node that was watching this market
        let strike = 0;
        for (const s of this.strikePrices.values()) strike = s;

        if (spot && strike) {
            const winnerId = spot > strike ? this.bull_id : this.bear_id;
            const winnerLabel = spot > strike ? 'UP' : 'DOWN';

            this.log(`🏆 Market Result: ${winnerLabel} (Spot $${spot.toFixed(2)} vs Strike $${strike.toFixed(2)})`, 'success');

            const positions = this.wallet.getAllPositions();
            for (const pos of positions) {
                const finalPrice = pos.tokenId === winnerId ? 1.0 : 0.0;
                this.wallet.simulateSell(pos.tokenId, pos.outcome, pos.quantity, previousMarket, { bids: [{ price: finalPrice.toString(), size: pos.quantity.toString() }], asks: [] });
                this.log(`💰 Settle: ${pos.quantity} ${pos.outcome} @ $${finalPrice.toFixed(2)}`, finalPrice > 0 ? 'success' : 'info');
            }
            this.emitWalletUpdate();
        }
    }

    private async initializeMarketDetector(node: Node) {
        const input = node.data.baseSlug || 'https://polymarket.com/event/btc-updown-15m-1770311700';
        const category = node.data.category || 'auto';
        this.log(`🔍 Initializing Market: ${input.split('/').pop()}`);

        return new Promise<void>(async (resolve) => {
            const timeout = setTimeout(() => {
                this.log(`❌ Discovery Timeout for ${input}`, 'error');
                resolve();
            }, 10000);

            try {
                const orchestrator = new MarketOrchestrator(this.resolver, this.marketService);
                this.orchestrators.set(node.id, orchestrator);

                orchestrator.on('market:detected', async (event: MarketTransitionEvent) => {
                    clearTimeout(timeout);
                    const { currentMarket, previousMarket } = event;

                    if (previousMarket) {
                        await this.settlePositions(previousMarket);
                        this.log(`♻️ Rollover to "${currentMarket.question}"`, 'info');
                        this.subscribedAssets.clear();
                        this.currentMarketMetadata.clear();
                        this.latestOrderbooks.clear();
                        this.strikePrices.clear();
                        this.volatilityThresholds.clear();
                        this.pendingStrikeLookups.clear();
                    }

                    const fullMarket = await this.marketService.getMarketByConditionId(currentMarket.condition_id);
                    const tokenIds = this.marketService.extractTokenIds(fullMarket);

                    this.bull_id = tokenIds.yes;
                    this.bear_id = tokenIds.no;

                    this.log(`✅ Market Active: ${currentMarket.question}`);
                    this.subscribedAssets.add(this.bull_id);
                    this.subscribedAssets.add(this.bear_id);
                    this.currentMarketMetadata.set(this.bull_id, currentMarket);
                    this.currentMarketMetadata.set(this.bear_id, currentMarket);

                    this.stream.subscribe([this.bull_id, this.bear_id]);

                    const fullUrl = `https://polymarket.com/event/${currentMarket.slug}`;
                    this.io.to(`strategy:${this.id}`).emit('strategy:market:changed', {
                        nodeId: node.id,
                        market: currentMarket,
                        fullUrl,
                        tokenIds
                    });

                    this.persistMarketUpdate(node.id, fullUrl);
                    resolve();
                });

                orchestrator.on('error', (err) => this.log(`❌ Error: ${err.error.message}`, 'error'));
                await orchestrator.start(input, category === 'generic' ? 'one-off' : 'auto');
            } catch (error) {
                this.log(`❌ Setup Failed: ${(error as Error).message}`, 'error');
                resolve();
            }
        });
    }

    private async executeNode(nodeId: string, inputData: any) {
        if (!this.active) return;
        const node = this.nodes.get(nodeId);
        if (!node) return;

        // --- COOLDOWN CHECK ---
        const now = Date.now();
        const lastExec = this.nodeCooldowns.get(nodeId) || 0;
        // Entry nodes (Actions) have a 30s cooldown to prevent spam
        if ((node.type === 'buyAction' || node.type === 'sellAction') && (now - lastExec < 30000)) {
            return;
        }

        this.emitNodeStatus(nodeId, 'running');
        let outputData = { ...inputData };
        let shouldContinue = true;

        try {
            // Use modular executors if available
            const executor = this.nodeExecutors[node.type];
            if (executor) {
                const result = await executor(node, inputData);
                shouldContinue = result.shouldContinue;
                outputData = result.outputData;
            } else if (node.type === 'marketDetector') {
                // Market detector is special - handled separately
                shouldContinue = true;

            } else {
                // Unknown node type
                this.log(`⚠️ Unknown node type: ${node.type}`, 'error');
                shouldContinue = false;
            }
            this.emitNodeStatus(nodeId, 'success');
        } catch (err) {
            this.log(`Error: ${(err as Error).message}`, 'error');
            this.emitNodeStatus(nodeId, 'error');
            shouldContinue = false;
        }

        if (shouldContinue) {
            const outgoingEdges = this.edges.filter(e => e.source === nodeId);
            for (const edge of outgoingEdges) {
                let executionData = outputData;

                // Handle split outputs for Price Node
                if (node.type === 'price') {
                    if (edge.sourceHandle === 'yes' && outputData.priceData?.yes) {
                        executionData = { ...outputData, yesPrice: outputData.priceData.yes };
                    } else if (edge.sourceHandle === 'no' && outputData.priceData?.no) {
                        executionData = { ...outputData, noPrice: outputData.priceData.no };
                    }
                }

                this.executeNode(edge.target, executionData);
            }
        }
    }

    // ============================================
    // MODULAR NODE EXECUTORS
    // ============================================

    private async executeMarketDetector(node: any, inputData: NodeInput) {
        // Market detector logic is handled separately in initializeMarketDetector
        return { shouldContinue: true, outputData: inputData };
    }

    private async executeOrderbook(node: any, inputData: NodeInput) {
        // console.log(`[Orderbook] Executing for ${inputData.assetId} (Node ${node.id})`);
        const ob = this.latestOrderbooks.get(inputData.assetId!);
        if (!ob) {
            this.log(`⚠️ Orderbook missing for ${inputData.assetId}`, 'error');
            return { shouldContinue: false, outputData: inputData };
        }

        // Parse Yes/No sides from orderbook
        const yesSide = this.parsePriceSide(ob, this.bull_id!);
        const noSide = this.parsePriceSide(ob, this.bear_id!);
        const spread = yesSide.midPrice - noSide.midPrice;

        const yesSpread = yesSide.bestAsk > 0 && yesSide.bestBid > 0 ? yesSide.bestAsk - yesSide.bestBid : 0;
        const noSpread = noSide.bestAsk > 0 && noSide.bestBid > 0 ? noSide.bestAsk - noSide.bestBid : 0;

        const orderbookData: OrderbookData = {
            yes: yesSide,
            no: noSide,
            spread,
            yesSpread,
            noSpread,
            assetId: inputData.assetId!
        };

        // Emit to UI
        this.io.to(`strategy:${this.id}`).emit('strategy:node:data', {
            nodeId: node.id,
            data: orderbookData
        });

        return {
            shouldContinue: true,
            outputData: { ...inputData, orderbook: orderbookData }
        };
    }

    private async executePrice(node: any, inputData: NodeInput) {
        const ob = inputData.orderbook as OrderbookData | undefined;
        if (!ob) {
            return { shouldContinue: false, outputData: inputData };
        }

        const priceData = {
            yes: { side: 'YES' as const, ...ob.yes },
            no: { side: 'NO' as const, ...ob.no }
        };

        this.io.to(`strategy:${this.id}`).emit('strategy:node:data', {
            nodeId: node.id,
            data: priceData,
        });

        return {
            shouldContinue: true,
            outputData: { ...inputData, priceData }
        };
    }

    private async executeBuyAction(node: any, inputData: NodeInput) {
        const buyQty = node.data.quantity || 5;
        const buyOutcome = node.data.outcome || 'UP';
        const buyAssetId = buyOutcome === 'UP' ? this.bull_id : this.bear_id;

        if (!buyAssetId) {
            return { shouldContinue: false, outputData: inputData };
        }

        const obBuy = this.latestOrderbooks.get(buyAssetId);
        const metaBuy = this.currentMarketMetadata.get(buyAssetId);

        if (obBuy && metaBuy) {
            const order = this.wallet.simulateBuy(buyAssetId, buyOutcome, buyQty, metaBuy, obBuy);
            if (order.status === 'FILLED') {
                this.log(`💰 BUY FILLED: ${order.filledSize} ${buyOutcome} @ ${(order.averageFillPrice * 100).toFixed(1)}¢`, 'success');
                this.nodeCooldowns.set(node.id, Date.now());
                this.emitWalletUpdate();
                return { shouldContinue: true, outputData: { ...inputData, order } };
            } else {
                this.log(`❌ BUY FAILED: ${order.status}`, 'error');
                return { shouldContinue: false, outputData: inputData };
            }
        }
        return { shouldContinue: false, outputData: inputData };
    }

    private async executeSellAction(node: any, inputData: NodeInput) {
        const sellQty = node.data.quantity || 5;
        const sellOutcome = node.data.outcome || 'UP';
        const sellAssetId = sellOutcome === 'UP' ? this.bull_id : this.bear_id;

        if (!sellAssetId) {
            return { shouldContinue: false, outputData: inputData };
        }

        const obSell = this.latestOrderbooks.get(sellAssetId);
        const metaSell = this.currentMarketMetadata.get(sellAssetId);

        if (obSell && metaSell) {
            const position = this.wallet.getPosition(sellAssetId);
            if (!position || position.quantity < sellQty) {
                this.log(`❌ SELL REJECTED: Insufficient shares`, 'error');
                this.emitNodeStatus(node.id, 'error');
                return { shouldContinue: false, outputData: inputData };
            }

            const order = this.wallet.simulateSell(sellAssetId, sellOutcome, sellQty, metaSell, obSell);
            if (order.status === 'FILLED') {
                this.log(`💸 SELL FILLED: ${order.filledSize} ${sellOutcome} @ ${(order.averageFillPrice * 100).toFixed(1)}¢`, 'success');
                this.nodeCooldowns.set(node.id, Date.now());
                this.emitWalletUpdate();
                return { shouldContinue: true, outputData: { ...inputData, order } };
            } else {
                this.log(`❌ SELL FAILED: ${order.status}`, 'error');
                return { shouldContinue: false, outputData: inputData };
            }
        }
        return { shouldContinue: false, outputData: inputData };
    }

    // ============================================
    // NEW ARCHITECTURE NODE EXECUTORS
    // ============================================

    private async executeCondition(node: any, inputData: NodeInput) {
        // TODO: Implement condition evaluator
        // For now, pass through with a simple threshold check
        const threshold = node.data?.threshold || 0.5;
        const operator = node.data?.operator || '<';
        const price = inputData.yesPrice?.midPrice || inputData.noPrice?.midPrice || 0;

        let conditionMet = false;
        if (operator === '<') {
            conditionMet = price < threshold;
        } else if (operator === '>') {
            conditionMet = price > threshold;
        } else if (operator === '<=') {
            conditionMet = price <= threshold;
        } else if (operator === '>=') {
            conditionMet = price >= threshold;
        }

        this.log(`⚡ Condition: ${price.toFixed(3)} ${operator} ${threshold} = ${conditionMet ? 'TRUE ✅' : 'FALSE ❌'}`);

        return {
            shouldContinue: conditionMet,
            outputData: {
                ...inputData,
                conditionMet,
                conditionValue: price,
            }
        };
    }

    private async executeTimer(node: any, inputData: NodeInput) {
        const seconds = node.data?.seconds || 1;
        this.log(`⏳ Timer: Waiting ${seconds} seconds...`);

        await new Promise(resolve => setTimeout(resolve, seconds * 1000));

        return {
            shouldContinue: true,
            outputData: inputData
        };
    }

    private async executePortfolio(node: any, inputData: NodeInput) {
        // Log current portfolio state
        const balance = this.wallet.getBalance();
        const positions = this.wallet.getAllPositions();
        const pnl = this.wallet.getTotalPnL();

        this.log(`💼 Portfolio: Balance $${balance.toFixed(2)} | P&L $${pnl.total.toFixed(2)} | Positions: ${positions.length}`);

        return {
            shouldContinue: true,
            outputData: {
                ...inputData,
                portfolioSnapshot: {
                    balance,
                    positions,
                    pnl,
                    timestamp: Date.now(),
                }
            }
        };
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    private parsePriceSide(ob: OrderBookMessage, assetId: string): PriceSide {
        // Use reconstructed state if available
        const state = this.orderbooks.get(assetId);

        if (state) {
            // Convert Map to Array and Sort
            // Bids: Descending (Highest First)
            const sBids = Array.from(state.bids.entries())
                .map(([price, size]) => ({ price, size }))
                .sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

            // Asks: Ascending (Lowest First)
            const sAsks = Array.from(state.asks.entries())
                .map(([price, size]) => ({ price, size }))
                .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

            const bestBid = sBids.length > 0 ? parseFloat(sBids[0].price) : 0;
            const bestAsk = sAsks.length > 0 ? parseFloat(sAsks[0].price) : 0;
            const midPrice = (bestBid + bestAsk) / 2;
            const volume = sBids.reduce((sum, b) => sum + parseFloat(b.size), 0) +
                sAsks.reduce((sum, a) => sum + parseFloat(a.size), 0);

            return {
                bestAsk,
                bestBid,
                midPrice: isNaN(midPrice) ? 0 : midPrice,
                volume
            };
        }

        // Fallback to legacy raw message logic (only if state missing)
        const targetOb = assetId ? this.latestOrderbooks.get(assetId) : ob;
        if (!targetOb || !targetOb.bids || !targetOb.asks) {
            return { bestAsk: 0, bestBid: 0, midPrice: 0, volume: 0 };
        }

        const sBids = [...targetOb.bids].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        const sAsks = [...targetOb.asks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

        const bestBid = sBids.length > 0 ? parseFloat(sBids[0].price) : 0;
        const bestAsk = sAsks.length > 0 ? parseFloat(sAsks[0].price) : 0;
        const midPrice = (bestBid + bestAsk) / 2;
        const volume = sBids.reduce((sum, b) => sum + parseFloat(b.size), 0) +
            sAsks.reduce((sum, a) => sum + parseFloat(a.size), 0);

        return { bestAsk, bestBid, midPrice, volume };
    }

    private emitNodeStatus(nodeId: string, status: 'idle' | 'running' | 'success' | 'error') {
        this.io.to(`strategy:${this.id}`).emit('strategy:node:status', { nodeId, status });
    }

    private emitWalletUpdate() {
        this.io.to(`strategy:${this.id}`).emit('strategy:wallet', {
            balance: this.wallet.getBalance(),
            positions: this.wallet.getAllPositions(),
            pnl: this.wallet.getTotalPnL(),
            summary: this.wallet.getSummary()
        });
    }

    private log(message: string, type: 'info' | 'success' | 'error' = 'info') {
        this.io.to(`strategy:${this.id}`).emit('strategy:log', {
            timestamp: new Date().toISOString(),
            message,
            type
        });
        console.log(`[Strategy ${this.id}] ${message}`);
    }

    private async persistMarketUpdate(nodeId: string, newUrl: string) {
        try {
            const { db } = await import('../db/index.js');
            const { strategies } = await import('../db/schema.js');
            const { eq } = await import('drizzle-orm');
            const strategy = await db.select().from(strategies).where(eq(strategies.id, this.id)).get();
            if (!strategy) return;
            const nodes = JSON.parse(strategy.nodes as string);
            const updatedNodes = nodes.map((n: any) => n.id === nodeId ? { ...n, data: { ...n.data, baseSlug: newUrl } } : n);
            await db.update(strategies).set({ nodes: JSON.stringify(updatedNodes), updatedAt: new Date() }).where(eq(strategies.id, this.id));
            this.log(`💾 Auto-saved market rollover`, 'info');
        } catch (error) {
            console.error('Failed to auto-persist market update:', error);
        }
    }
}
