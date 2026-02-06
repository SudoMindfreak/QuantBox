import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { OrderbookStream } from 'quantbox-core/dist/engine/stream.js';
import { OrderBookMessage, MarketMetadata, MarketTransitionEvent } from 'quantbox-core/dist/types/polymarket.js';
import { MarketResolver } from 'quantbox-core/dist/services/MarketResolver.js';
import { MarketService } from 'quantbox-core/dist/services/MarketService.js';
import { MarketOrchestrator } from 'quantbox-core/dist/services/MarketOrchestrator.js';
import { BinanceService } from 'quantbox-core/dist/services/BinanceService.js';
import { VirtualWallet } from 'quantbox-core/dist/engine/wallet.js';

interface Node {
    id: string;
    type: string;
    data: any;
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

    // Side Tracking
    private bull_id: string | null = null;
    private bear_id: string | null = null;

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
        if (data.asset_id && this.subscribedAssets.has(data.asset_id)) {
            this.latestOrderbooks.set(data.asset_id, data);
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
            switch (node.type) {
                case 'marketDetector': break;

                case 'orderbookSnapshot':
                    const ob = this.latestOrderbooks.get(inputData.assetId);
                    if (!ob) shouldContinue = false;
                    else outputData = { ...inputData, orderbook: ob };
                    break;

                case 'imbalanceCheck':
                    if (!outputData.orderbook) { shouldContinue = false; break; }
                    const { ratio, outcome } = node.data;
                    const targetOutcome = outcome || 'UP';
                    const targetAssetId = targetOutcome === 'UP' ? this.bull_id : this.bear_id;
                    
                    if (!targetAssetId) { shouldContinue = false; break; }
                    const targetOb = this.latestOrderbooks.get(targetAssetId);
                    if (!targetOb) { shouldContinue = false; break; }

                    const sBids = [...targetOb.bids].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                    const sAsks = [...targetOb.asks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                    
                    if (sBids.length === 0 || sAsks.length === 0) { shouldContinue = false; break; }

                    const bidVol = sBids.slice(0, 5).reduce((acc: number, b: any) => acc + parseFloat(b.size), 0);
                    const askVol = sAsks.slice(0, 5).reduce((acc: number, a: any) => acc + parseFloat(a.size), 0);

                    const currentRatio = bidVol / (askVol || 1);
                    const imbThreshold = parseFloat(ratio) || 1.5;

                    shouldContinue = currentRatio >= imbThreshold;
                    if (shouldContinue) {
                        outputData = { 
                            ...outputData, 
                            assetId: targetAssetId,
                            currentRatio, 
                            bestAsk: sAsks[0].price, 
                            bestBid: sBids[0].price 
                        };
                    }
                    break;

                case 'buyAction':
                    const buyQty = node.data.quantity || 5;
                    const buyOutcome = node.data.outcome || 'UP';
                    const buyAssetId = buyOutcome === 'UP' ? this.bull_id : this.bear_id;
                    
                    if (!buyAssetId) { shouldContinue = false; break; }
                    const obBuy = this.latestOrderbooks.get(buyAssetId);
                    const metaBuy = this.currentMarketMetadata.get(buyAssetId);

                    if (obBuy && metaBuy) {
                        const order = this.wallet.simulateBuy(buyAssetId, buyOutcome, buyQty, metaBuy, obBuy);
                        if (order.status === 'FILLED') {
                            this.log(`💰 BUY FILLED: ${order.filledSize} ${buyOutcome} @ ${(order.averageFillPrice * 100).toFixed(1)}¢`, 'success');
                            this.nodeCooldowns.set(nodeId, Date.now()); // Set cooldown on successful buy
                            this.emitWalletUpdate();
                        } else {
                            this.log(`❌ BUY FAILED: ${order.status}`, 'error');
                            shouldContinue = false;
                        }
                    } else shouldContinue = false;
                    break;

                case 'sellAction':
                    const sellQty = node.data.quantity || 5;
                    const sellOutcome = node.data.outcome || 'UP';
                    const sellAssetId = sellOutcome === 'UP' ? this.bull_id : this.bear_id;

                    if (!sellAssetId) { shouldContinue = false; break; }
                    const obSell = this.latestOrderbooks.get(sellAssetId);
                    const metaSell = this.currentMarketMetadata.get(sellAssetId);

                    if (obSell && metaSell) {
                        const position = this.wallet.getPosition(sellAssetId);
                        if (!position || position.quantity < sellQty) {
                            this.log(`❌ SELL REJECTED: Insufficient shares`, 'error');
                            this.emitNodeStatus(nodeId, 'error');
                            shouldContinue = false;
                            break;
                        }
                        const order = this.wallet.simulateSell(sellAssetId, sellOutcome, sellQty, metaSell, obSell);
                        if (order.status === 'FILLED') {
                            this.log(`💸 SELL FILLED: ${order.filledSize} ${sellOutcome} @ ${(order.averageFillPrice * 100).toFixed(1)}¢`, 'success');
                            this.nodeCooldowns.set(nodeId, Date.now());
                            this.emitWalletUpdate();
                        } else {
                            this.log(`❌ SELL FAILED: ${order.status}`, 'error');
                            shouldContinue = false;
                        }
                    } else shouldContinue = false;
                    break;

                case 'logAction':
                    const msg = node.data.message || 'Log';
                    const targetOutcomeL = node.data.outcome || 'UP';
                    const targetId = targetOutcomeL === 'UP' ? this.bull_id : this.bear_id;
                    const targetObLog = targetId ? this.latestOrderbooks.get(targetId) : null;
                    
                    let cents = 'N/A';
                    if (targetObLog) {
                        const sAsks = [...targetObLog.asks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                        if (sAsks[0]) cents = (parseFloat(sAsks[0].price) * 100).toFixed(1) + '¢';
                    }

                    this.log(`📝 ${msg} | ${targetOutcomeL} Price: ${cents}`);
                    break;

                case 'strikeMomentum':
                    const symbol = node.data.symbol || 'BTCUSDT';
                    const k = parseFloat(node.data.volatilityK) || 0.6;
                    const minDiff = parseFloat(node.data.minDiff) || 2.0;
                    const spot = this.binance.getCurrentPrice(symbol);
                    
                    if (!spot) { 
                        const subKey = `waiting_price_${symbol}`;
                        if (!this.nodeMemory.get(subKey)) {
                            this.log(`📡 Connecting to live data feed for ${symbol}...`);
                            this.binance.subscribePrice(symbol);
                            this.nodeMemory.set(subKey, true);
                        }
                        shouldContinue = false; 
                        break; 
                    }

                    const metadata = Array.from(this.currentMarketMetadata.values())[0];
                    if (!metadata) { shouldContinue = false; break; }
                    const marketStart = new Date(metadata.end_date_iso).getTime() - (900 * 1000);
                    
                    if (!this.strikePrices.has(node.id)) {
                        const strike = await this.binance.getStrikePrice(symbol, marketStart);
                        const prevRange = await this.binance.getPreviousRange(symbol);
                        if (strike && prevRange) {
                            this.strikePrices.set(node.id, strike);
                            const threshold = Math.max(prevRange.range * k, minDiff);
                            this.volatilityThresholds.set(node.id, threshold);
                            this.log(`🎯 Strike Locked: $${strike.toFixed(2)} | Trigger Gap: ±$${threshold.toFixed(2)}`, 'success');
                        } else { shouldContinue = false; break; }
                    }

                    const strikePrice = this.strikePrices.get(node.id)!;
                    const momThreshold = this.volatilityThresholds.get(node.id)!;
                    const diff = spot - strikePrice;

                    this.io.to(`strategy:${this.id}`).emit('strategy:node:data', {
                        nodeId: node.id,
                        data: { liveSpot: spot, strikePrice, diff, threshold: momThreshold }
                    });

                    const lastLog = this.lastEvaluationLog.get(node.id) || 0;
                    if (Date.now() - lastLog > 5000) {
                        const dir = diff >= 0 ? 'ABOVE' : 'BELOW';
                        const progress = (Math.abs(diff) / momThreshold * 100).toFixed(0);
                        this.log(`🌊 Momentum: $${spot.toFixed(2)} (${Math.abs(diff).toFixed(2)} ${dir} strike) | ${progress}% to trigger`);
                        this.lastEvaluationLog.set(node.id, Date.now());
                    }

                    const outgoing = this.edges.filter(e => e.source === nodeId);
                    for (const edge of outgoing) {
                        if (edge.sourceHandle === 'bullish' && diff > momThreshold) {
                            this.executeNode(edge.target, { ...inputData, spot, strikePrice, diff });
                        } else if (edge.sourceHandle === 'bearish' && diff < -momThreshold) {
                            this.executeNode(edge.target, { ...inputData, spot, strikePrice, diff });
                        }
                    }
                    shouldContinue = false;
                    break;

                case 'memory':
                    if (inputData.value !== undefined) {
                        this.nodeMemory.set(node.id, inputData.value);
                        this.io.to(`strategy:${this.id}`).emit('strategy:node:data', {
                            nodeId: node.id,
                            data: { storedValue: inputData.value }
                        });
                    }
                    outputData = { ...inputData, storedValue: this.nodeMemory.get(node.id) };
                    break;

                case 'priceChange':
                    const valA = inputData.a || 0;
                    const valB = inputData.b || 0;
                    const result = (node.data.mode || 'percentage') === 'percentage' 
                        ? (valB !== 0 ? ((valA - valB) / valB) * 100 : 0) 
                        : valA - valB;
                    outputData = { ...inputData, change: result };
                    break;
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
                this.executeNode(edge.target, outputData);
            }
        }
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
