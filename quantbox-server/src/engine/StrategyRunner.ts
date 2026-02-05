import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { OrderbookStream } from 'quantbox-core/dist/engine/stream.js';
import { OrderBookMessage } from 'quantbox-core/dist/types/polymarket.js';

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
    private subscribedAssets: Set<string> = new Set();
    private latestOrderbooks: Map<string, OrderBookMessage> = new Map();

    constructor(id: string, strategyData: StrategyData, io: Server, stream: OrderbookStream) {
        super();
        this.id = id;
        this.nodes = new Map(strategyData.nodes.map(n => [n.id, n]));
        this.edges = strategyData.edges;
        this.io = io;
        this.stream = stream;
    }

    public async start() {
        if (this.active) return;
        this.active = true;
        this.log('Strategy started');

        // Find entry nodes (Market Detector)
        const entryNodes = Array.from(this.nodes.values()).filter(n => n.type === 'marketDetector');

        for (const node of entryNodes) {
            this.initializeMarketDetector(node);
        }

        // Listen to global stream data
        this.stream.on('data', this.handleMarketData);
    }

    public stop() {
        this.active = false;
        this.log('Strategy stopped');
        this.stream.off('data', this.handleMarketData);
        // Clean up subscriptions if needed (though stream might be shared)
    }

    private handleMarketData = (data: any) => {
        if (!this.active) return;
        // Check if this data belongs to a market we are interested in depends on the detector
        // For this MVP, we indiscriminately process matched assets

        if (data.asset_id && this.subscribedAssets.has(data.asset_id)) {
            this.latestOrderbooks.set(data.asset_id, data);

            // Trigger flow from Market Detector nodes that match this asset
            // In a real app, we'd map assets to specific detector nodes. 
            // Here, we just trigger all detectors for simplicity or assume 1 detector.
            const detectors = Array.from(this.nodes.values()).filter(n => n.type === 'marketDetector');
            for (const detector of detectors) {
                // TODO: Check if asset matches detector slug pattern
                this.executeNode(detector.id, { assetId: data.asset_id, data });
            }
        }
    }

    private initializeMarketDetector(node: Node) {
        const input = node.data.baseSlug || 'btc-updown-15m';
        this.log(`Initializing Market Detector for: ${input}`);

        // TODO: content resolver for: ${input}

        // MVP: Hardcode or dynamic fetch. 
        // For the example "btc-updown-15m", we should subscribe to a real asset if possible.
        // Or assume the user has subscribed via the UI for now?
        // Let's assume we want to listen to *any* traffic for now, or specific known tokens.
        // For the demo to work without real discovery, let's just log.
        // Real implementation: Call API to find active markets matching slug, then subscribe.

        // Mocking a subscription to a common asset for testing if 'btc-updown-15m' is used
        // This is a simplification.
    }

    private async executeNode(nodeId: string, inputData: any) {
        if (!this.active) return;
        const node = this.nodes.get(nodeId);
        if (!node) return;

        let outputData = inputData;
        let shouldContinue = true;

        try {
            switch (node.type) {
                case 'marketDetector':
                    // Pass through
                    break;

                case 'orderbookSnapshot':
                    // Get latest OB
                    const ob = this.latestOrderbooks.get(inputData.assetId);
                    if (!ob) {
                        shouldContinue = false;
                    } else {
                        outputData = { ...inputData, orderbook: ob };
                    }
                    break;

                case 'imbalanceCheck':
                    if (!outputData.orderbook) { shouldContinue = false; break; }
                    const { ratio, window } = node.data; // e.g. 1.5
                    const bids = outputData.orderbook.bids.slice(0, 5).reduce((acc: number, b: any) => acc + parseFloat(b.size), 0);
                    const asks = outputData.orderbook.asks.slice(0, 5).reduce((acc: number, a: any) => acc + parseFloat(a.size), 0);

                    const currentRatio = bids / (asks || 1);
                    const threshold = parseFloat(ratio) || 1.5;

                    this.log(`Imbalance Check: Buy/Sell Ratio = ${currentRatio.toFixed(2)} (Threshold: ${threshold})`);

                    if (currentRatio >= threshold) {
                        // Buy Signal
                        // We need to follow "buy" handle edges
                    } else {
                        // Sell Signal or nothing
                        shouldContinue = false; // Only handling buy for now
                        // Or we could branch?
                    }
                    break;

                case 'buyAction':
                    const quantity = node.data.quantity || 100;
                    this.log(`💰 EXECUTING BUY: ${quantity} shares`, 'success');
                    // In real engine, place trade
                    break;

                case 'logAction':
                    const msg = node.data.message || 'Log';
                    this.log(`📝 ${msg}: ${JSON.stringify(inputData.data?.price || 'Data')}`);
                    break;
            }
        } catch (err) {
            this.log(`Error in node ${node.type}: ${(err as Error).message}`, 'error');
            shouldContinue = false;
        }

        if (shouldContinue) {
            // Find next nodes
            const outgoingEdges = this.edges.filter(e => e.source === nodeId);
            for (const edge of outgoingEdges) {
                // Filter by handle if needed (e.g. imbalance check 'buy' vs 'sell')
                if (node.type === 'imbalanceCheck') {
                    // Logic for handles
                    const { ratio } = node.data;
                    const ob = outputData.orderbook;
                    const bids = ob.bids.slice(0, 5).reduce((acc: number, b: any) => acc + parseFloat(b.size), 0);
                    const asks = ob.asks.slice(0, 5).reduce((acc: number, a: any) => acc + parseFloat(a.size), 0);
                    const currentRatio = bids / (asks || 1);
                    const threshold = parseFloat(ratio) || 1.5;

                    if (edge.sourceHandle === 'buy' && currentRatio >= threshold) {
                        this.executeNode(edge.target, outputData);
                    } else if (edge.sourceHandle === 'sell' && currentRatio < (1 / threshold)) {
                        this.executeNode(edge.target, outputData);
                    }
                } else {
                    this.executeNode(edge.target, outputData);
                }
            }
        }
    }

    private log(message: string, type: 'info' | 'success' | 'error' = 'info') {
        this.io.to(`strategy:${this.id}`).emit('strategy:log', {
            timestamp: new Date().toISOString(),
            message,
            type
        });
        console.log(`[Strategy ${this.id}] ${message}`);
    }
}
