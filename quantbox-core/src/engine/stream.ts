import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { OrderBookMessage } from '../types/polymarket';

/**
 * OrderbookStream - Real-time WebSocket connection to Polymarket orderbook feed
 */
export class OrderbookStream extends EventEmitter {
    private ws: WebSocket | null = null;
    private readonly wsUrl = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
    private subscribedTokens: Set<string> = new Set();
    private keepAliveInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isConnecting = false;

    /**
     * Connect to the WebSocket feed
     */
    async connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('⚠️  Already connected to WebSocket');
            return;
        }

        if (this.isConnecting) {
            console.log('⚠️  Connection already in progress');
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

                // Re-subscribe to any previously subscribed tokens
                if (this.subscribedTokens.size > 0) {
                    const tokens = Array.from(this.subscribedTokens);
                    console.log(`♻️  Re-subscribing to ${tokens.length} token(s)...`);
                    this.sendSubscription(tokens);
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
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ Cannot subscribe: WebSocket not connected');
            return;
        }

        // Add to subscribed set for reconnection handling
        tokenIds.forEach(id => this.subscribedTokens.add(id));

        this.sendSubscription(tokenIds);
    }

    /**
     * Send subscription message to WebSocket
     */
    private sendSubscription(tokenIds: string[]): void {
        const subscriptionMessage = {
            type: 'market',
            assets_ids: tokenIds,
        };

        this.ws?.send(JSON.stringify(subscriptionMessage));
        console.log(`📡 Subscribed to ${tokenIds.length} token(s)`);
        tokenIds.forEach(id => {
            console.log(`   - ${id.substring(0, 12)}...`);
        });
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(data: WebSocket.Data): void {
        try {
            const msgString = data.toString();
            if (msgString.includes('INVALID') || !msgString.startsWith('{') && !msgString.startsWith('[')) {
                console.warn(`[Polymarket WS] Ignored non-JSON message: ${msgString}`);
                return;
            }
            const message: OrderBookMessage = JSON.parse(msgString);

            // Emit different events based on message type
            if (message.event_type === 'book') {
                this.emit('orderbook', message);

                // Also emit token-specific event for easier filtering
                this.emit(`orderbook:${message.asset_id}`, message);
            } else if (message.event_type === 'price_change') {
                this.emit('price_change', message);
            } else if (message.event_type === 'last_trade_price') {
                this.emit('last_trade', message);
            }
        } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
        }
    }

    /**
     * Start keep-alive ping every 30 seconds to prevent disconnection
     */
    private startKeepAlive(): void {
        this.keepAliveInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.ping();
                // console.log('💓 Keep-alive ping sent');
            }
        }, 30000); // 30 seconds
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
        tokenIds.forEach(id => this.subscribedTokens.delete(id));

        // Note: Polymarket WebSocket API doesn't have explicit unsubscribe
        // So we just remove from our tracking set
        console.log(`🔕 Unsubscribed from ${tokenIds.length} token(s)`);
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
