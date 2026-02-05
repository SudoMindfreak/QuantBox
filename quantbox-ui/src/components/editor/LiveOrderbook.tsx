import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

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
    marketSlug?: string; // The Polymarket slug to track
}

export function LiveOrderbook({ marketSlug }: LiveOrderbookProps) {
    const [tokenIds, setTokenIds] = useState<{ yes: string; no: string } | null>(null);
    const tokenIdsRef = useRef<{ yes: string; no: string } | null>(null);
    const [outcomes, setOutcomes] = useState<{ yes: string; no: string }>({ yes: 'UP', no: 'DOWN' });
    const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');
    const [orderbooks, setOrderbooks] = useState<Record<string, OrderBookData>>({});
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    // Sync ref with state
    useEffect(() => {
        tokenIdsRef.current = tokenIds;
    }, [tokenIds]);

    // 1. Resolve marketSlug to Token IDs
    useEffect(() => {
        if (!marketSlug) return;

        setOrderbooks({});
        setTokenIds(null);

        const resolveMarket = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/markets/resolve?input=${marketSlug}`);
                if (!response.ok) throw new Error('Failed to resolve market');
                const data = await response.json();
                
                console.log(`[Orderbook] Resolved market:`, data.tokenIds);
                setTokenIds(data.tokenIds);
                
                // Identify outcomes (Standardize to UP/DOWN for display)
                const tokens = data.tokens || [];
                let upLabel = 'UP';
                let downLabel = 'DOWN';
                
                tokens.forEach((t: any) => {
                    const out = t.outcome.toLowerCase();
                    if (out === 'up' || out === 'yes') upLabel = t.outcome;
                    if (out === 'down' || out === 'no') downLabel = t.outcome;
                });

                setOutcomes({ yes: upLabel, no: downLabel });
            } catch (error) {
                console.error('Error resolving market for orderbook:', error);
            } finally {
                setIsLoading(false);
            }
        };

        resolveMarket();
    }, [marketSlug]);

    // 2. Manage Socket.io connection
    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const socket = io(socketUrl, { withCredentials: true });
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            if (tokenIdsRef.current) {
                const ids = [tokenIdsRef.current.yes, tokenIdsRef.current.no];
                socket.emit('subscribe:market', ids);
            }
        });

        socket.on('disconnect', () => setIsConnected(false));

        socket.on('market:data', (data: OrderBookData) => {
            const currentIds = tokenIdsRef.current;
            if (currentIds && (data.asset_id === currentIds.yes || data.asset_id === currentIds.no)) {
                setOrderbooks(prev => ({
                    ...prev,
                    [data.asset_id]: { ...data }
                }));
                setLastUpdated(new Date());
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // 3. Handle Token Subscriptions on ID change
    useEffect(() => {
        if (!socketRef.current || !isConnected || !tokenIds) return;
        const ids = [tokenIds.yes, tokenIds.no];
        socketRef.current.emit('subscribe:market', ids);
    }, [tokenIds, isConnected]);

    const formatPrice = (price: string) => {
        const val = parseFloat(price) * 100;
        return `${val.toFixed(1)}¢`;
    };

    const formatSize = (size: string) => {
        const num = parseFloat(size);
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return num.toFixed(0);
    };

    // Current Market State
    const currentTokenId = selectedOutcome === 'yes' ? tokenIds?.yes : tokenIds?.no;
    const book = currentTokenId ? orderbooks[currentTokenId] : null;

    // MANDATORY: Sort based on price to identify best levels
    const sortedAsks = book?.asks ? [...book.asks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price)) : [];
    const sortedBids = book?.bids ? [...book.bids].sort((a, b) => parseFloat(b.price) - parseFloat(a.price)) : [];

    const bestAsk = sortedAsks[0]?.price;
    const bestBid = sortedBids[0]?.price;

    // Display Logic: 
    // ASKS: High to Low (Best Ask at bottom of the list)
    // BIDS: High to Low (Best Bid at top of the list)
    const displayAsks = sortedAsks.slice(0, 8).reverse();
    const displayBids = sortedBids.slice(0, 8);

    const getBestPriceLabel = (side: 'yes' | 'no') => {
        const id = side === 'yes' ? tokenIds?.yes : tokenIds?.no;
        if (!id || !orderbooks[id]) return '--.-¢';
        const b = orderbooks[id];
        const asks = [...(b.asks || [])].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        return asks[0] ? formatPrice(asks[0].price) : '--.-¢';
    };

    return (
        <Card className="h-full w-full bg-[#0f172a] border-[#1e293b] flex flex-col shadow-2xl overflow-hidden rounded-xl">
            <CardHeader className="py-3 px-4 border-b border-[#1e293b] bg-[#0f172a]">
                <div className="flex items-center justify-between mb-3">
                    <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                        Live Orderbook
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span className="text-[10px] font-mono text-slate-500">
                            {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour12: false }) : 'SYNCING'}
                        </span>
                    </div>
                </div>

                <div className="flex p-1 bg-[#020617] rounded-lg border border-[#1e293b] gap-1">
                    <button
                        onClick={() => setSelectedOutcome('yes')}
                        className={`flex-1 py-2 text-[10px] font-black rounded-md transition-all flex flex-col items-center leading-tight ${
                            selectedOutcome === 'yes' 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <span className="uppercase">{outcomes.yes}</span>
                        <span className="text-[9px] opacity-70 font-mono mt-0.5">{getBestPriceLabel('yes')}</span>
                    </button>
                    <button
                        onClick={() => setSelectedOutcome('no')}
                        className={`flex-1 py-2 text-[10px] font-black rounded-md transition-all flex flex-col items-center leading-tight ${
                            selectedOutcome === 'no' 
                            ? 'bg-slate-800 text-white shadow-lg' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <span className="uppercase">{outcomes.no}</span>
                        <span className="text-[9px] opacity-70 font-mono mt-0.5">{getBestPriceLabel('no')}</span>
                    </button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col min-h-0 bg-[#020617]">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                        Resolving...
                    </div>
                ) : !marketSlug ? (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-[10px] uppercase p-4 text-center leading-relaxed">
                        Select a Market Node
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 text-[9px] font-black text-slate-600 py-2 px-4 border-b border-[#0f172a] bg-[#0f172a]/30">
                            <div className="tracking-widest">SIZE</div>
                            <div className="text-right tracking-widest">PRICE</div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="flex flex-col">
                                {/* ASKS */}
                                {displayAsks.map((ask, i) => (
                                    <div key={`ask-${i}`} className="grid grid-cols-2 text-[11px] py-1 px-4 hover:bg-rose-500/5 transition-colors relative font-mono">
                                        <div className="absolute inset-y-0 right-0 bg-rose-500/[0.03] transition-all" style={{ width: `${Math.min(parseFloat(ask.size) / 1000, 100)}%` }} />
                                        <div className="text-slate-500 z-10">{formatSize(ask.size)}</div>
                                        <div className="text-rose-400 text-right z-10 font-bold">{formatPrice(ask.price)}</div>
                                    </div>
                                ))}

                                {/* SPREAD */}
                                <div className="py-1.5 bg-[#0f172a] border-y border-[#1e293b] flex justify-between px-4 items-center">
                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Spread</span>
                                    <span className="text-[10px] font-mono text-slate-200 font-bold">
                                        {bestAsk && bestBid ? ((parseFloat(bestAsk) - parseFloat(bestBid)) * 100).toFixed(1) : '0.0'}¢
                                    </span>
                                </div>

                                {/* BIDS */}
                                {displayBids.map((bid, i) => (
                                    <div key={`bid-${i}`} className="grid grid-cols-2 text-[11px] py-1 px-4 hover:bg-emerald-500/5 transition-colors relative font-mono">
                                        <div className="absolute inset-y-0 right-0 bg-emerald-500/[0.03] transition-all" style={{ width: `${Math.min(parseFloat(bid.size) / 1000, 100)}%` }} />
                                        <div className="text-slate-500 z-10">{formatSize(bid.size)}</div>
                                        <div className="text-emerald-400 text-right z-10 font-bold">{formatPrice(bid.price)}</div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
