import axios from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface Kline {
    open: number;
    high: number;
    low: number;
    close: number;
    timestamp: number;
}

/**
 * BinanceService - Fetches spot prices and klines for volatility calculations
 */
export class BinanceService extends EventEmitter {
    private readonly restBase = 'https://api.binance.com/api/v3';
    private readonly wsBase = 'wss://stream.binance.com:9443/ws';
    private ws: WebSocket | null = null;
    private currentPrices: Map<string, number> = new Map();
    private connecting: boolean = false;
    private simulationMode: boolean = false;
    private simulationInterval: NodeJS.Timeout | null = null;

    constructor() {
        super();
        // Check for simulation override env var if needed
    }

    /**
     * Fetch the opening price for a specific 15m window
     */
    async getStrikePrice(symbol: string, startTime: number): Promise<number | null> {
        if (this.simulationMode) {
            return 95000 + (Math.random() * 100); // Mock Strike
        }

        try {
            const response = await axios.get(`${this.restBase}/klines`, {
                params: {
                    symbol: symbol.toUpperCase(),
                    interval: '15m',
                    startTime: startTime,
                    limit: 1
                },
                timeout: 3000 // Fast fail
            });

            if (response.data && response.data.length > 0) {
                return parseFloat(response.data[0][1]); // Index 1 is Open price
            }
            return null;
        } catch (error) {
            console.log(`[Binance] API unreachable, using mock Strike Price.`);
            return 95000.00; // Mock fallback
        }
    }

    /**
     * Get the high/low range of the previous candle for volatility calculation
     */
    async getPreviousRange(symbol: string, interval: string = '15m'): Promise<{ range: number } | null> {
        if (this.simulationMode) {
            return { range: 150.00 }; // Mock Range
        }

        try {
            const response = await axios.get(`${this.restBase}/klines`, {
                params: {
                    symbol: symbol.toUpperCase(),
                    interval: interval,
                    limit: 2
                },
                timeout: 3000
            });

            if (response.data && response.data.length >= 2) {
                const prevCandle = response.data[0]; // Previous completed candle
                const high = parseFloat(prevCandle[2]);
                const low = parseFloat(prevCandle[3]);
                return { range: high - low };
            }
            return null;
        } catch (error) {
            console.log(`[Binance] API unreachable, using mock Range.`);
            return { range: 200.00 }; // Mock fallback
        }
    }

    /**
     * Subscribe to real-time trade prices
     */
    subscribePrice(symbol: string) {
        if (this.ws || this.connecting || this.simulationMode) return;

        const streamName = `${symbol.toLowerCase()}@trade`;
        console.log(`[Binance WS] Initializing connection to ${streamName}...`);
        this.connecting = true;

        try {
            this.ws = new WebSocket(`${this.wsBase}/${streamName}`);

            const connectionTimeout = setTimeout(() => {
                if (this.connecting) {
                    console.error(`[Binance WS] Connection timed out. Switching to SIMULATION MODE.`);
                    this.ws?.terminate();
                    this.ws = null;
                    this.connecting = false;
                    this.startSimulation(symbol);
                }
            }, 5000); // 5s timeout

            this.ws.on('open', () => {
                clearTimeout(connectionTimeout);
                this.connecting = false;
                console.log(`[Binance WS] Connected successfully to ${streamName}`);
            });

            this.ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.p) {
                    this.emitPrice(symbol, parseFloat(msg.p));
                }
            });

            this.ws.on('error', (err) => {
                clearTimeout(connectionTimeout);
                console.error(`[Binance WS] Connection failed. Switching to SIMULATION MODE.`);
                this.connecting = false;
                this.startSimulation(symbol);
            });

            this.ws.on('close', () => {
                this.ws = null;
                this.connecting = false;
            });

        } catch (err) {
            this.connecting = false;
            this.startSimulation(symbol);
        }
    }

    private startSimulation(symbol: string) {
        if (this.simulationMode) return;
        this.simulationMode = true;
        console.log(`⚠️ STARTING SIMULATION MODE for ${symbol}`);
        
        let mockPrice = 95000.00;
        
        this.simulationInterval = setInterval(() => {
            // Random walk
            const move = (Math.random() - 0.5) * 10;
            mockPrice += move;
            this.emitPrice(symbol, mockPrice);
        }, 1000); // Update every second
    }

    private emitPrice(symbol: string, price: number) {
        const symbolUpper = symbol.toUpperCase();
        this.currentPrices.set(symbolUpper, price);
        this.emit(`price:${symbolUpper}`, price);
        this.emit('price', { symbol: symbolUpper, price });
    }

    getCurrentPrice(symbol: string): number | null {
        return this.currentPrices.get(symbol.toUpperCase()) || null;
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
    }
}
