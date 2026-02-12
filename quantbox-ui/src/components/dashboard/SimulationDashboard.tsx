'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Terminal,
    Activity,
    TrendingUp,
    Clock,
    Play,
    Square,
    Layers,
    BarChart3
} from 'lucide-react';
import { io } from 'socket.io-client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TradeHistory } from './TradeHistory';
import { PnLChart } from './PnLChart';
import { Log, Position, Trade, PnLDataPoint } from '@/lib/types';

interface SimulationDashboardProps {
    strategyId: string;
    isRunning: boolean;
    onRun: () => void;
    onStop: () => void;
    marketTitle?: string;
    balance: number;
    positions: Position[];
    totalPnL: number;
}

export function SimulationDashboard({
    strategyId,
    isRunning,
    onRun,
    onStop,
    marketTitle,
    balance,
    positions,
    totalPnL
}: SimulationDashboardProps) {
    const [logs, setLogs] = useState<Log[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [pnlData, setPnlData] = useState<PnLDataPoint[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isEngineReady, setIsEngineReady] = useState(false);
    const activePositions = positions.filter(p => p.quantity > 0);

    // WebSocket connection for logs and trades
    useEffect(() => {
        if (!strategyId) return;
        const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

        socket.on('connect', () => {
            socket.emit('subscribe:strategy', strategyId);
        });

        socket.on('strategy:log', (log: Log) => {
            setLogs(prev => [...prev, log]);
            if (log.message.includes("Market Strike Price")) setIsEngineReady(true);
            if (scrollRef.current) {
                setTimeout(() => {
                    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                }, 100);
            }
        });

        socket.on('strategy:trade', (trade: any) => {
            const newTrade: Trade = {
                id: Date.now().toString(),
                strategyId,
                timestamp: trade.timestamp || new Date().toISOString(),
                action: trade.action,
                outcome: trade.outcome,
                price: trade.price,
                quantity: trade.quantity,
                value: trade.value,
            };
            setTrades(prev => [newTrade, ...prev]);
        });

        socket.on('strategy:wallet', (wallet: any) => {
            // Add PnL data point
            const dataPoint: PnLDataPoint = {
                timestamp: new Date().toISOString(),
                balance: wallet.balance,
                realizedPnL: wallet.realizedPnL || 0,
                unrealizedPnL: wallet.unrealizedPnL || 0,
            };
            setPnlData(prev => [...prev, dataPoint]);
        });

        return () => {
            socket.emit('unsubscribe:strategy', strategyId);
            socket.disconnect();
        };
    }, [strategyId]);

    useEffect(() => {
        if (!isRunning) {
            setIsEngineReady(false);
            setLogs([]);
            setTrades([]);
            setPnlData([]);
        }
    }, [isRunning]);

    return (
        <div className="flex flex-col h-full gap-6 font-sans">

            {/* Main Grid Layout */}
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">

                {/* LEFT COLUMN: Market Status + Balance */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
                    {/* Market Status */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-6 flex flex-col shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-emerald-600/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white tracking-tight uppercase">{marketTitle || 'Market'}</h2>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">15m Rolling</p>
                            </div>
                        </div>

                        {/* Engine Status */}
                        <div className="flex flex-col items-center gap-4 py-6">
                            <div className="relative">
                                <div className={`absolute inset-0 blur-[40px] rounded-full ${isRunning ? 'bg-emerald-500/20 animate-pulse' : 'bg-slate-500/10'}`} />
                                <div className="w-16 h-16 rounded-full bg-black border border-white/5 flex items-center justify-center relative shadow-xl">
                                    <Layers className={`w-7 h-7 ${isRunning ? 'text-[#3ecf8e] animate-spin-slow' : 'text-slate-700'}`} />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 mb-1">
                                    {isRunning ? (isEngineReady ? 'Operational' : 'Syncing...') : 'Standby'}
                                </p>
                                <p className="text-[10px] font-medium text-slate-500">
                                    {isRunning ? 'Live Trading' : 'Ready to Start'}
                                </p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="mt-2">
                            {!isRunning ? (
                                <button onClick={onRun} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3ecf8e] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#30b47b] transition-all shadow-lg active:scale-95">
                                    <Play className="w-3 h-3 fill-current" />
                                    Launch
                                </button>
                            ) : (
                                <button onClick={onStop} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all active:scale-95">
                                    <Square className="w-3 h-3 fill-current" />
                                    Stop
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Balance */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-6 flex flex-col justify-between shadow-xl">
                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                            <span>Balance</span>
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                                <TrendingUp className="w-3 h-3" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white font-mono tracking-tighter mb-2">
                                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                                <Badge className={`${totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'} border-none`}>
                                    {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
                                </Badge>
                                <span className="text-slate-400">Total P&L</span>
                            </div>
                        </div>
                    </div>

                    {/* Active Positions */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] flex flex-col overflow-hidden shadow-xl flex-1">
                        <div className="p-4 border-b border-white/[0.05] bg-white/[0.01] flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                            <span>Positions</span>
                            <Badge className="bg-white/5 text-slate-200 border-none px-2 font-black text-xs">{activePositions.length}</Badge>
                        </div>
                        <ScrollArea className="flex-1 bg-black/20">
                            <div className="p-3 space-y-2">
                                {activePositions.length === 0 ? (
                                    <div className="py-8 flex flex-col items-center gap-2 opacity-20">
                                        <BarChart3 className="w-6 h-6 text-slate-400" />
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">No Positions</span>
                                    </div>
                                ) : (
                                    activePositions.map((pos) => (
                                        <div key={pos.tokenId} className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl hover:border-emerald-500/30 transition-all">
                                            <div className="flex justify-between items-start mb-1.5">
                                                <span className={`text-xs font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${pos.outcome === 'UP' || pos.outcome === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                    {pos.outcome}
                                                </span>
                                                <span className={`text-sm font-black font-mono ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {pos.unrealizedPnL >= 0 ? '+' : ''}{pos.unrealizedPnL.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
                                                <span>{pos.quantity} units</span>
                                                <span>@ {(pos.currentPrice * 100).toFixed(1)}¢</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                {/* CENTER COLUMN: PnL Chart + Trade History */}
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
                    {/* PnL Chart */}
                    <div className="h-[350px]">
                        <PnLChart data={pnlData} initialBalance={balance} />
                    </div>

                    {/* Trade History */}
                    <div className="flex-1 min-h-[300px]">
                        <TradeHistory trades={trades} />
                    </div>
                </div>

                {/* RIGHT COLUMN: System Logs */}
                <div className="col-span-12 lg:col-span-3">
                    <motion.div
                        initial={false}
                        animate={{ height: '100%' }}
                        className="h-full bg-[#171717] border border-white/[0.05] rounded-[24px] flex flex-col overflow-hidden shadow-inner"
                    >
                        <div className="h-12 border-b border-white/[0.05] flex items-center justify-between px-4 bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-3 h-3 text-slate-500" />
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Logs</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live</span>
                            </div>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed space-y-0.5 bg-black/40">
                            {logs.length === 0 && (
                                <div className="text-slate-700 italic uppercase tracking-widest text-[10px] pt-4">Waiting...</div>
                            )}
                            {logs.map((log, i) => (
                                <div key={i} className="flex gap-3 hover:bg-white/[0.02] -mx-1 px-1 py-0.5 rounded transition-colors">
                                    <span className="text-slate-600 shrink-0 w-16 text-[9px]">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                                    <span className={`${log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'} break-all text-[10px]`}>
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

            </div>
        </div>
    );
}
