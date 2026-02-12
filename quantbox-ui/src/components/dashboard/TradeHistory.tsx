'use client';

import { Trade } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface TradeHistoryProps {
    trades: Trade[];
}

export function TradeHistory({ trades }: TradeHistoryProps) {
    if (trades.length === 0) {
        return (
            <div className="bg-white/[0.02] border border-white/5 rounded-[24px] p-8 flex flex-col items-center justify-center text-center shadow-xl h-full">
                <Clock className="w-12 h-12 text-slate-700 opacity-50 mb-4" />
                <h3 className="text-white font-black uppercase tracking-tight text-sm mb-2">No trades yet</h3>
                <p className="text-slate-500 text-xs font-medium max-w-xs">
                    Trade history will appear here when your strategy executes buy or sell orders
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-[24px] overflow-hidden shadow-xl h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        Trade History
                    </h3>
                    <div className="px-2 py-1 bg-white/5 rounded-lg text-xs font-black text-slate-300">
                        {trades.length} trades
                    </div>
                </div>
            </div>

            {/* Table */}
            <ScrollArea className="flex-1">
                <div className="min-w-full">
                    {/* Table Header */}
                    <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-black/20 border-b border-white/5 text-xs font-black uppercase tracking-[0.15em] text-slate-500 sticky top-0">
                        <div>Time</div>
                        <div>Action</div>
                        <div>Outcome</div>
                        <div className="text-right">Price</div>
                        <div className="text-right">Qty</div>
                        <div className="text-right">Value</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-white/5">
                        {trades.map((trade) => (
                            <div
                                key={trade.id}
                                className="grid grid-cols-6 gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors text-sm"
                            >
                                {/* Time */}
                                <div className="text-slate-400 font-mono text-xs">
                                    {new Date(trade.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                    })}
                                </div>

                                {/* Action */}
                                <div className="flex items-center gap-2">
                                    {trade.action === 'BUY' ? (
                                        <>
                                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400 font-black text-xs uppercase tracking-wider">
                                                Buy
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <TrendingDown className="w-3 h-3 text-rose-400" />
                                            <span className="text-rose-400 font-black text-xs uppercase tracking-wider">
                                                Sell
                                            </span>
                                        </>
                                    )}
                                </div>

                                {/* Outcome */}
                                <div>
                                    <span
                                        className={`px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-tighter ${trade.outcome === 'UP' || trade.outcome === 'YES'
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-rose-500/20 text-rose-400'
                                            }`}
                                    >
                                        {trade.outcome}
                                    </span>
                                </div>

                                {/* Price */}
                                <div className="text-right font-mono text-white font-bold">
                                    {(trade.price * 100).toFixed(1)}¢
                                </div>

                                {/* Quantity */}
                                <div className="text-right font-mono text-slate-300">
                                    {trade.quantity}
                                </div>

                                {/* Value */}
                                <div className="text-right font-mono text-white font-bold">
                                    ${trade.value.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
