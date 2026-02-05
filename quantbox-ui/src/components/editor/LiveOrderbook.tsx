import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { io, Socket } from 'socket.io-client';
import { Badge } from '@/components/ui/badge';

interface OrderBookLevel {
    price: string;
    size: string;
}

interface OrderBookData {
    asset_id: string;
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    timestamp: string;
}

interface LiveOrderbookProps {
    assetId?: string; // The Polymarket asset ID to track
}

export function LiveOrderbook({ assetId }: LiveOrderbookProps) {
    const [bids, setBids] = useState<OrderBookLevel[]>([]);
    const [asks, setAsks] = useState<OrderBookLevel[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Initialize socket connection
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        socketRef.current = io(socketUrl, {
            withCredentials: true,
        });

        socketRef.current.on('connect', () => {
            console.log('[LiveOrderbook] Connected to WebSocket');
            setIsConnected(true);

            if (assetId) {
                socketRef.current?.emit('subscribe:market', assetId);
            }
        });

        socketRef.current.on('disconnect', () => {
            console.log('[LiveOrderbook] Disconnected');
            setIsConnected(false);
        });

        socketRef.current.on('market:data', (data: OrderBookData) => {
            if (data.asset_id === assetId) {
                // Initial snapshot or update
                // Note: Real implementation might need to handle incremental updates (price_change) vs snapshots
                // For now assuming full book or merging logic handled by backend/simple replacement
                if (data.bids && data.bids.length > 0) setBids(data.bids.slice(0, 15)); // Top 15
                if (data.asks && data.asks.length > 0) setAsks(data.asks.slice(0, 15)); // Top 15
                setLastUpdated(new Date());
            }
        });

        return () => {
            if (assetId) {
                socketRef.current?.emit('unsubscribe:market', assetId);
            }
            socketRef.current?.disconnect();
        };
    }, [assetId]);

    // Handle assetId changes
    useEffect(() => {
        if (!socketRef.current || !isConnected || !assetId) return;

        console.log(`[LiveOrderbook] Switching to asset: ${assetId}`);
        socketRef.current.emit('subscribe:market', assetId);

        return () => {
            socketRef.current?.emit('unsubscribe:market', assetId);
            setBids([]);
            setAsks([]);
        };
    }, [assetId, isConnected]);

    const formatPrice = (price: string) => {
        const num = parseFloat(price);
        return num.toFixed(2); // Polymarket prices are usually 0.00-1.00 or similar
    };

    const formatSize = (size: string) => {
        const num = parseFloat(size);
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    return (
        <Card className="h-full w-full bg-slate-900 border-slate-800 flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-200">
                    Live Orderbook
                </CardTitle>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs text-slate-500">
                        {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Waiting...'}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col min-h-0">
                {!assetId ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-xs p-4">
                        Select a market node to view orderbook
                    </div>
                ) : (
                    <>
                        {/* Headers */}
                        <div className="grid grid-cols-2 text-xs font-semibold text-slate-500 py-2 px-4 bg-slate-900/50">
                            <div>BID SIZE</div>
                            <div className="text-right">PRICE</div>
                            {/* Combined header row for Asks below or split view? 
                                Typically: Bid Size | Price | Ask Size 
                                Or simpler: Bids Table / Asks Table 
                                Let's do Bids (Green) / Asks (Red) vertically
                            */}
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="flex flex-col">
                                {/* ASKS (Red, Sell orders) - Usually displayed top-down descending price or bottom-up ascending?
                                    Standard vertical orderbook: 
                                    ASKS (High -> Low) 
                                    --- SPREAD ---
                                    BIDS (High -> Low)
                                */}
                                <div className="flex flex-col-reverse">
                                    {asks.map((ask, i) => (
                                        <div key={i} className="grid grid-cols-3 text-xs py-1 px-4 hover:bg-slate-800/50 group">
                                            {/* Standard Crypto View: Price | Size | Total? Let's stick to simple Price/Size */}
                                            <div className="text-slate-400 text-right col-span-1">{formatSize(ask.size)}</div>
                                            <div className="text-red-400 font-mono text-right col-span-1 mr-4">{formatPrice(ask.price)}</div>
                                            {/* Spacer */}
                                        </div>
                                    ))}
                                </div>

                                {/* Spread Indicator */}
                                {asks.length > 0 && bids.length > 0 && (
                                    <div className="py-1 bg-slate-800 text-center text-xs text-slate-400 font-mono">
                                        Spread: {(parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(3)}
                                    </div>
                                )}

                                {/* BIDS (Green, Buy orders) */}
                                <div className="flex flex-col">
                                    {bids.map((bid, i) => (
                                        <div key={i} className="grid grid-cols-3 text-xs py-1 px-4 hover:bg-slate-800/50 group">
                                            <div className="text-slate-400 text-right col-span-1">{formatSize(bid.size)}</div>
                                            <div className="text-green-400 font-mono text-right col-span-1 mr-4">{formatPrice(bid.price)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ScrollArea>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
