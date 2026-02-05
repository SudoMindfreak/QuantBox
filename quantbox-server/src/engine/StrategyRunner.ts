import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { OrderbookStream } from 'quantbox-core/dist/engine/stream.js';
import { OrderBookMessage, MarketMetadata, MarketTransitionEvent } from 'quantbox-core/dist/types/polymarket.js';
import { MarketResolver } from 'quantbox-core/dist/services/MarketResolver.js';
import { MarketService } from 'quantbox-core/dist/services/MarketService.js';
import { MarketOrchestrator } from 'quantbox-core/dist/services/MarketOrchestrator.js';
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

interface StrategyData {
    nodes: Node[];
    edges: Edge[];
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
    private wallet: VirtualWallet;
    private orchestrators: Map<string, MarketOrchestrator> = new Map();
    private currentMarketMetadata: Map<string, MarketMetadata> = new Map();
    private subscribedAssets: Set<string> = new Set();
    private latestOrderbooks: Map<string, OrderBookMessage> = new Map();
    
    // Side Tracking
    private bull_id: string | null = null;
    private bear_id: string | null = null;

    constructor(
        id: string,
        strategyData: any,
        io: Server,
        stream: OrderbookStream,
        resolver: MarketResolver,
        marketService: MarketService
    ) {
        super();
        this.id = id;
        
        // Ensure nodes and edges are objects
        const nodes = typeof strategyData.nodes === 'string' ? JSON.parse(strategyData.nodes) : strategyData.nodes;
        const edges = typeof strategyData.edges === 'string' ? JSON.parse(strategyData.edges) : strategyData.edges;

        this.nodes = new Map((nodes as Node[]).map(n => [n.id, n]));
        this.edges = edges;
        this.io = io;
        this.stream = stream;
        this.resolver = resolver;
        this.marketService = marketService;
        this.wallet = new VirtualWallet(strategyData.initialBalance || 10000);
    }

    public async start() {
        if (this.active) return;
        this.active = true;
        this.log('Strategy started');

        // Find entry nodes (Market Detector)
        const entryNodes = Array.from(this.nodes.values()).filter(n => n.type === 'marketDetector');

        for (const node of entryNodes) {
            await this.initializeMarketDetector(node);
        }

        this.log('📡 Waiting for market data pulse...');

        // Listen to global stream data
        this.stream.on('orderbook', this.handleMarketData);
    }

    public stop() {
        this.active = false;
        this.log('Strategy stopped');
        this.stream.off('orderbook', this.handleMarketData);
        
        // Stop all market orchestrators
        for (const orchestrator of this.orchestrators.values()) {
            orchestrator.stop();
        }
        this.orchestrators.clear();
    }

    private handleMarketData = (data: any) => {
        if (!this.active) return;

        if (data.asset_id && this.subscribedAssets.has(data.asset_id)) {
            // Update the latest orderbook for this SPECIFIC asset
            this.latestOrderbooks.set(data.asset_id, data);

            // Trigger flow from Market Detector nodes
            const detectors = Array.from(this.nodes.values()).filter(n => n.type === 'marketDetector');
            for (const detector of detectors) {
                // Pass the assetId that triggered this pulse so nodes know which one to look at
                this.executeNode(detector.id, { assetId: data.asset_id });
            }
        }
    }

    private async initializeMarketDetector(node: Node) {
        const input = node.data.baseSlug || 'https://polymarket.com/event/btc-updown-15m-1770303600';
        const category = node.data.category || 'auto';
        this.log(`🔍 Starting Market Orchestrator for: ${input} (Category: ${category})`);

        try {
            const orchestrator = new MarketOrchestrator(this.resolver, this.marketService);
            this.orchestrators.set(node.id, orchestrator);

            orchestrator.on('market:detected', async (event: MarketTransitionEvent) => {
                const { currentMarket, previousMarket } = event;
                
                if (previousMarket) {
                    this.log(`♻️ Rollover: Market "${previousMarket.question}" expired. Switching to "${currentMarket.question}"`, 'info');
                    this.subscribedAssets.clear();
                    this.currentMarketMetadata.clear();
                    this.latestOrderbooks.clear();
                }

                const fullMarket = await this.marketService.getMarketByConditionId(currentMarket.condition_id);
                const tokenIds = this.marketService.extractTokenIds(fullMarket);

                // Identify Sides (Logic from example.py)
                this.bull_id = tokenIds.yes;
                this.bear_id = tokenIds.no;

                this.log(`📡 Sides Identified: UP=${this.bull_id.substring(0, 8)} | DOWN=${this.bear_id.substring(0, 8)}`);

                this.subscribedAssets.add(this.bull_id);
                this.subscribedAssets.add(this.bear_id);
                
                // Track metadata for BOTH tokens so wallet knows fees/ticksize
                this.currentMarketMetadata.set(this.bull_id, currentMarket);
                this.currentMarketMetadata.set(this.bear_id, currentMarket);

                // Subscribe stream
                this.stream.subscribe([this.bull_id, this.bear_id]);

                const fullUrl = `https://polymarket.com/event/${currentMarket.slug}`;
                this.io.to(`strategy:${this.id}`).emit('strategy:market:changed', {
                    nodeId: node.id,
                    market: currentMarket,
                    fullUrl,
                    tokenIds
                });

                this.persistMarketUpdate(node.id, fullUrl);
            });

            orchestrator.on('error', (err) => {
                this.log(`❌ Orchestrator Error: ${err.error.message}`, 'error');
            });

            await orchestrator.start(input, category === 'generic' ? 'one-off' : 'auto');

        } catch (error) {
            this.log(`❌ Error initializing market detector: ${(error as Error).message}`, 'error');
        }
    }

    private async executeNode(nodeId: string, inputData: any) {
        if (!this.active) return;
        const node = this.nodes.get(nodeId);
        if (!node) return;

        this.emitNodeStatus(nodeId, 'running');

        let outputData = inputData;
        let shouldContinue = true;

        try {
            switch (node.type) {
                case 'marketDetector':
                    break;

                case 'orderbookSnapshot':
                    // inputData.assetId is the one that pulsed
                    const ob = this.latestOrderbooks.get(inputData.assetId);
                    if (!ob) {
                        shouldContinue = false;
                    } else {
                        outputData = { ...inputData, orderbook: ob };
                    }
                    break;

                case 'imbalanceCheck':
                    if (!outputData.orderbook) { shouldContinue = false; break; }
                    const { ratio } = node.data;
                    
                    // Correct Sort: Bids (Highest to Lowest), Asks (Lowest to Highest)
                    const sortedBids = [...outputData.orderbook.bids].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                    const sortedAsks = [...outputData.orderbook.asks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                    
                    if (sortedBids.length === 0 || sortedAsks.length === 0) { 
                        shouldContinue = false; break; 
                    }

                    const bestBid = sortedBids[0];
                    const bestAsk = sortedAsks[0];

                    // Calculate volume near the spread (top 5 levels)
                    const bidVol = sortedBids.slice(0, 5).reduce((acc: number, b: any) => acc + parseFloat(b.size), 0);
                    const askVol = sortedAsks.slice(0, 5).reduce((acc: number, a: any) => acc + parseFloat(a.size), 0);

                    const currentRatio = bidVol / (askVol || 1);
                    const threshold = parseFloat(ratio) || 1.5;

                    // Trigger if volume imbalance is high
                    shouldContinue = currentRatio >= threshold;
                    
                    if (shouldContinue) {
                        outputData = { 
                            ...outputData, 
                            currentRatio, 
                            bestAsk: bestAsk.price, 
                            bestBid: bestBid.price 
                        };
                    }
                    break;

                case 'buyAction':
                    const buyQty = node.data.quantity || 5;
                    const obForBuy = this.latestOrderbooks.get(inputData.assetId);
                    const metadataForBuy = this.currentMarketMetadata.get(inputData.assetId);

                    if (obForBuy && metadataForBuy) {
                        // Re-sort to find best ask for simulation logic check
                        const sAsks = [...obForBuy.asks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                        if (sAsks.length === 0) { shouldContinue = false; break; }
                        
                        const bestA = parseFloat(sAsks[0].price);
                        const approxCost = buyQty * bestA;
                        
                        if (this.wallet.getBalance() < approxCost) {
                            this.log(`❌ BUY REJECTED: Insufficient balance ($${this.wallet.getBalance().toFixed(2)} < ~$${approxCost.toFixed(2)})`, 'error');
                            this.emitNodeStatus(nodeId, 'error');
                            shouldContinue = false;
                            break;
                        }

                        const sideLabel = inputData.assetId === this.bull_id ? "UP" : "DOWN";
                        const order = this.wallet.simulateBuy(
                            inputData.assetId,
                            sideLabel,
                            buyQty,
                            metadataForBuy,
                            obForBuy
                        );

                        if (order.status === 'FILLED') {
                            this.log(`💰 BUY FILLED: ${order.filledSize} shares ${sideLabel} @ ${(order.averageFillPrice * 100).toFixed(1)}¢`, 'success');
                            this.emitWalletUpdate();
                        } else {
                            this.log(`❌ BUY FAILED: ${order.status}`, 'error');
                            this.emitNodeStatus(nodeId, 'error');
                            shouldContinue = false;
                        }
                    } else {
                        shouldContinue = false;
                    }
                    break;

                case 'logAction':
                    const msg = node.data.message || 'Log';
                    const bAsk = inputData.bestAsk || '0.0';
                    const cents = (parseFloat(bAsk) * 100).toFixed(1) + '¢';
                    const sideL = inputData.assetId === this.bull_id ? "UP" : "DOWN";
                    this.log(`📝 ${msg} | Side: ${sideL} | Price: ${cents} | Ratio: ${inputData.currentRatio?.toFixed(2) || 'N/A'}`);
                    break;
            }
            
            this.emitNodeStatus(nodeId, 'success');
            
        } catch (err) {
            this.log(`Error in node ${node.type}: ${(err as Error).message}`, 'error');
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
        this.io.to(`strategy:${this.id}`).emit('strategy:node:status', {
            nodeId,
            status
        });
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
            const updatedNodes = nodes.map((n: any) => 
                n.id === nodeId ? { ...n, data: { ...n.data, baseSlug: newUrl } } : n
            );

            await db.update(strategies)
                .set({ 
                    nodes: JSON.stringify(updatedNodes),
                    updatedAt: new Date()
                })
                .where(eq(strategies.id, this.id));

            this.log(`💾 Auto-saved new market URL: ${newUrl.split('/').pop()}`, 'info');
        } catch (error) {
            console.error('Failed to auto-persist market update:', error);
        }
    }
}