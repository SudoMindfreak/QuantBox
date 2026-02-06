'use client';

import React from 'react';
import { 
    Wallet, 
    TrendingUp, 
    TrendingDown, 
    History, 
    Briefcase,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    CircleDot
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Position {
    tokenId: string;
    outcome: string;
    quantity: number;
    averageEntryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
}

interface Trade {
    id: string;
    type: 'BUY' | 'SELL';
    outcome: string;
    size: number;
    price: number;
    timestamp: number;
}

interface PortfolioPanelProps {
    balance: number;
    positions: Position[];
    history: Trade[];
    totalPnL: number;
}

export function PortfolioPanel({ balance, positions, history, totalPnL }: PortfolioPanelProps) {
    const activePositions = positions.filter(p => p.quantity > 0);

    return (
        <div className="w-80 bg-[#0f172a]/95 backdrop-blur-xl border-l border-[#1e293b] flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header / Summary */}
            <div className="p-6 border-b border-[#1e293b] bg-gradient-to-b from-slate-900/50 to-transparent">
                <div className="flex items-center gap-2 mb-6">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Live Portfolio</h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 shadow-inner">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Available Capital</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-[10px] font-bold text-slate-600">USDC</span>
                        </div>
                    </div>

                    <div className={`border rounded-2xl p-4 shadow-inner ${totalPnL >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Session PnL</div>
                        <div className="flex items-center justify-between">
                            <div className={`text-xl font-black flex items-baseline gap-1 ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totalPnL >= 0 ? '+' : '-'}${Math.abs(totalPnL).toFixed(2)}
                            </div>
                            {totalPnL !== 0 && (
                                <div className={`p-1 rounded-full ${totalPnL >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                    {totalPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">
                    {/* Active Positions */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <CircleDot className="w-3 h-3 text-blue-500" />
                                Active Positions
                            </div>
                            <Badge variant="outline" className="text-[9px] bg-blue-500/5 text-blue-400 border-blue-500/20">
                                {activePositions.length}
                            </Badge>
                        </div>

                        {activePositions.length > 0 ? (
                            <div className="space-y-3">
                                {activePositions.map((pos) => (
                                    <div key={pos.tokenId} className="bg-slate-900/50 border border-white/5 rounded-xl p-3 hover:border-blue-500/30 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-[10px] font-black text-white uppercase tracking-tighter mb-0.5">{pos.outcome} Shares</div>
                                                <div className="text-xs font-mono font-bold text-slate-400">{pos.quantity.toFixed(2)} units</div>
                                            </div>
                                            <div className={`text-xs font-black ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {pos.unrealizedPnL >= 0 ? '+' : '-'}${Math.abs(pos.unrealizedPnL).toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                                            <div>
                                                <div className="text-[8px] font-bold text-slate-600 uppercase">Avg Entry</div>
                                                <div className="text-[10px] font-mono text-slate-300">{(pos.averageEntryPrice * 100).toFixed(1)}¢</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[8px] font-bold text-slate-600 uppercase">Current</div>
                                                <div className="text-[10px] font-mono text-slate-300">{(pos.currentPrice * 100).toFixed(1)}¢</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center border border-dashed border-slate-800 rounded-2xl">
                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No Open Positions</p>
                            </div>
                        )}
                    </section>

                    {/* Trade History */}
                    <section>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                            <History className="w-3 h-3 text-purple-500" />
                            Recent Activity
                        </div>

                        <div className="space-y-3">
                            {history.length > 0 ? (
                                history.slice(0, 10).map((trade) => (
                                    <div key={trade.id} className="flex items-center gap-3 group">
                                        <div className={`p-1.5 rounded-lg ${trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {trade.type === 'BUY' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline">
                                                <div className="text-[10px] font-bold text-white truncate">
                                                    {trade.type} {trade.outcome}
                                                </div>
                                                <div className="text-[9px] font-mono text-slate-500">
                                                    {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-slate-500">
                                                {trade.size.toFixed(0)} units @ {(trade.price * 100).toFixed(1)}¢
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[10px] text-slate-600 font-bold uppercase text-center py-4">No trade history</p>
                            )}
                        </div>
                    </section>
                </div>
            </ScrollArea>

            <div className="p-4 border-t border-[#1e293b] bg-slate-900/30 text-center">
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Virtual Paper Trading Active</span>
            </div>
        </div>
    );
}
