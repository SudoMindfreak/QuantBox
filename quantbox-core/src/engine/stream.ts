import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { OrderBookMessage } from '../types/polymarket';

/**
 * OrderbookStream - Real-time WebSocket connection to Polymarket orderbook feed
 */
export class OrderbookStream extends EventEmitter {
    private ws: WebSocket | null = null;
    private readonly wsUrl = 'wss://ws-subscriptions-clob.polymarket.com/ws';
    private subscribedTokens: Set<string> = new Set();
    private keepAliveInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
        private isConnecting = false;
        private subscriptionTimeout: NodeJS.Timeout | null = null;
    
        /**
         * Connect to the WebSocket feed
         */
        async connect(): Promise<void> {
            if (this.ws?.readyState === WebSocket.OPEN) {
                return;
            }
    
            if (this.isConnecting) {
                return;
            }
    
            this.isConnecting = true;
            console.log('🔌 Connecting to Polymarket WebSocket...');
    
            return new Promise((resolve, reject) => {
                this.ws = new WebSocket(this.wsUrl);
    
                this.ws.on('open', () => {
                    console.log('✅ WebSocket connected!');
                    this.isConnecting = false;
                    this.startKeepAlive();
    
                    // Re-subscribe to all tokens
                    if (this.subscribedTokens.size > 0) {
                        this.sendSubscription();
                    }
    
                    resolve();
                });
    
                this.ws.on('message', (data: WebSocket.Data) => {
                    this.handleMessage(data);
                });
    
                this.ws.on('error', (error) => {
                    console.error('❌ WebSocket error:', error.message);
                    this.isConnecting = false;
                    reject(error);
                });
    
                this.ws.on('close', () => {
                    console.log('🔌 WebSocket disconnected');
                    this.isConnecting = false;
                    this.stopKeepAlive();
    
                    // Attempt to reconnect after 5 seconds
                    console.log('⏳ Reconnecting in 5 seconds...');
                    this.reconnectTimeout = setTimeout(() => {
                        this.connect().catch(err => {
                            console.error('Reconnection failed:', err.message);
                        });
                    }, 5000);
                });
            });
        }
    
        /**
         * Subscribe to orderbook updates for specific token IDs
         */
        subscribe(tokenIds: string[]): void {
            // Add to subscribed set
            let added = false;
            tokenIds.forEach(id => {
                if (!this.subscribedTokens.has(id)) {
                    this.subscribedTokens.add(id);
                    added = true;
                }
            });
    
            if (added) {
                this.sendSubscription();
            }
        }
    
        /**
         * Send subscription message to WebSocket (Full list)
         */
        private sendSubscription(): void {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
            // Debounce to avoid "INVALID OPERATION" from rapid calls
            if (this.subscriptionTimeout) clearTimeout(this.subscriptionTimeout);
    
            this.subscriptionTimeout = setTimeout(() => {
                const allTokens = Array.from(this.subscribedTokens);
                if (allTokens.length === 0) return;
    
                const subscriptionMessage = {
                    type: 'market',
                    assets_ids: allTokens,
                    initial_dump: true,
                    auth: {}
                };
    
                this.ws?.send(JSON.stringify(subscriptionMessage));
                console.log(`📡 [WS] Subscribed to ${allTokens.length} total tokens`);
            }, 100);
        }
    
        /**
         * Handle incoming WebSocket messages
         */
        private handleMessage(data: WebSocket.Data): void {
            try {
                const msgString = data.toString();
                
                // Handle PONG/Keep-alive
                if (msgString === 'PONG') return;
    
                if (msgString.includes('INVALID') || (!msgString.startsWith('{') && !msgString.startsWith('['))) {
                    console.warn(`[Polymarket WS] Ignored message: ${msgString}`);
                    return;
                }
                
                const message: any = JSON.parse(msgString);
                const messages = Array.isArray(message) ? message : [message];
    
                for (const msg of messages) {
                    // Emit different events based on message type
                    if (msg.event_type === 'book') {
                        this.emit('orderbook', msg);
                        this.emit(`orderbook:${msg.asset_id}`, msg);
                    } else if (msg.event_type === 'price_change') {
                        this.emit('price_change', msg);
                    } else if (msg.event_type === 'last_trade_price') {
                        this.emit('last_trade', msg);
                    }
                }
            } catch (error) {
                console.error('❌ Error parsing WebSocket message:', error);
            }
        }
    
        /**
         * Start keep-alive ping every 20 seconds
         */
        private startKeepAlive(): void {
            this.keepAliveInterval = setInterval(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    this.ws.send('PING');
                }
            }, 20000); // 20 seconds
        }
    
        /**
         * Stop keep-alive interval
         */
        private stopKeepAlive(): void {
            if (this.keepAliveInterval) {
                clearInterval(this.keepAliveInterval);
                this.keepAliveInterval = null;
            }
        }
    
        /**
         * Unsubscribe from specific tokens
         */
        unsubscribe(tokenIds: string[]): void {
            let removed = false;
            tokenIds.forEach(id => {
                if (this.subscribedTokens.delete(id)) {
                    removed = true;
                }
            });
    
            if (removed) {
                this.sendSubscription();
            }
            console.log(`🔕 Unsubscribed from ${tokenIds.length} tokens`);
        }

    /**
     * Switch subscription from old tokens to new tokens
     * Convenience method for market transitions
     */
    switchSubscription(oldTokenIds: string[], newTokenIds: string[]): void {
        console.log(`🔄 Switching subscriptions...`);
        this.unsubscribe(oldTokenIds);
        this.subscribe(newTokenIds);
    }

    /**
     * Disconnect and cleanup
     */
    disconnect(): void {
        console.log('🔌 Disconnecting WebSocket...');

        this.stopKeepAlive();

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.subscribedTokens.clear();
        this.removeAllListeners();
    }

    /**
     * Get connection status
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Get list of subscribed token IDs
     */
    getSubscribedTokens(): string[] {
        return Array.from(this.subscribedTokens);
    }
}
