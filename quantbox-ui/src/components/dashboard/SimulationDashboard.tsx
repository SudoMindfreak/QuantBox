'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Terminal, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Play, 
  Square,
  Maximize2,
  Minimize2,
  Trash2,
  BrainCircuit,
  Workflow,
  BarChart3,
  Cpu,
  Layers
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Log {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface Position {
  tokenId: string;
  outcome: string;
  quantity: number;
  averageEntryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
}

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedLog, setExpandedLog] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const activePositions = positions.filter(p => p.quantity > 0);

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

    return () => { socket.disconnect(); };
  }, [strategyId]);

  useEffect(() => { if (!isRunning) setIsEngineReady(false); }, [isRunning]);

  return (
    <div className="flex flex-col h-full gap-6 font-sans">
      
      {/* 1. Main Bento Grid */}
      <div className="flex-1 grid grid-cols-12 grid-rows-12 gap-6 min-h-0">
        
        {/* HERO: Market Visualization */}
        <div className="col-span-12 lg:col-span-8 row-span-8 bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-8 flex flex-col relative overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.4))] pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600/0 via-emerald-600/20 to-emerald-600/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center justify-between relative z-10 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-600/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white tracking-tight uppercase">{marketTitle || 'Initializing feed...'}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Live Prediction Stream</span>
                            <div className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="text-xs font-bold text-[#3ecf8e] uppercase tracking-widest">BTC-15m-Rolling</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Badge className="hidden lg:flex bg-emerald-500/10 text-[#3ecf8e] border-none text-xs py-1 px-3 font-bold uppercase tracking-widest mr-4">
                        Managed Expert AI Active
                    </Badge>
                    {!isRunning ? (
                        <button onClick={onRun} className="flex items-center gap-2 px-6 py-2.5 bg-[#3ecf8e] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#30b47b] transition-all shadow-xl active:scale-95">
                            <Play className="w-3 h-3 fill-current" />
                            Launch Agent
                        </button>
                    ) : (
                        <button onClick={onStop} className="flex items-center gap-2 px-6 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all active:scale-95">
                            <Square className="w-3 h-3 fill-current" />
                            Shutdown
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative">
                <div className="absolute inset-0 opacity-10" 
                     style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
                />
                
                <div className="relative z-10 flex flex-col items-center text-center gap-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full animate-pulse" />
                        <div className="w-24 h-24 rounded-full bg-black border border-white/5 flex items-center justify-center relative shadow-2xl">
                            <Layers className={`w-10 h-10 ${isRunning ? 'text-[#3ecf8e] animate-spin-slow' : 'text-slate-700'}`} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-300">
                            {isRunning ? (isEngineReady ? 'Engine Operational' : 'Synchronizing Data...') : 'Engine Standby'}
                        </p>
                        <p className="text-xs font-medium italic text-slate-500">
                            {isRunning ? 'Connected to Polymarket CLOB via QuantBox Managed Core' : 'Select logic parameters to begin simulation'}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* METRICS: Account Balance */}
        <div className="col-span-12 md:col-span-4 row-span-4 bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-8 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                <span>Available USDC</span>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                    <TrendingUp className="w-4 h-4" />
                </div>
            </div>
            <div>
                <div className="text-4xl font-black text-white font-mono tracking-tighter mb-1">
                    ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none">+0.00%</Badge>
                    <span className="text-slate-400">Global PnL</span>
                </div>
            </div>
        </div>

        {/* METRICS: Positions */}
        <div className="col-span-12 md:col-span-4 row-span-4 bg-white/[0.02] border border-white/[0.05] rounded-[32px] flex flex-col overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01] text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                <span>Active Trades</span>
                <Badge className="bg-white/5 text-slate-200 border-none px-2 font-black tracking-normal text-xs">{activePositions.length}</Badge>
            </div>
            <ScrollArea className="flex-1 bg-black/20">
                <div className="p-4 space-y-3">
                    {activePositions.length === 0 ? (
                        <div className="py-12 flex flex-col items-center gap-3 opacity-20 text-xs font-black uppercase tracking-widest text-slate-400">
                            <BarChart3 className="w-8 h-8" />
                            <span>No Positions</span>
                        </div>
                    ) : (
                        activePositions.map((pos) => (
                            <div key={pos.tokenId} className="bg-white/[0.03] border border-white/[0.05] p-4 rounded-2xl hover:border-emerald-500/30 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-xs font-black px-2 py-0.5 rounded uppercase tracking-tighter ${pos.outcome === 'UP' || pos.outcome === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {pos.outcome}
                                    </span>
                                    <span className={`text-sm font-black font-mono ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {pos.unrealizedPnL >= 0 ? '+' : ''}{pos.unrealizedPnL.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 font-mono pt-1">
                                    <span>{pos.quantity} units</span>
                                    <span>@ {(pos.currentPrice * 100).toFixed(1)}¢</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>

        {/* LOGS: integrated */}
        <motion.div 
            initial={false}
            animate={{ height: '100%' }}
            className="col-span-12 row-span-4 bg-[#171717] border border-white/[0.05] rounded-[32px] flex flex-col overflow-hidden shadow-inner"
        >
            <div className="h-12 border-b border-white/[0.05] flex items-center justify-between px-8 bg-white/[0.01] text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-slate-500" />
                    <span>System Trace</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                    <button onClick={() => setLogs([])} className="text-slate-500 hover:text-white transition-colors">Clear</button>
                    <div className="w-px h-3 bg-white/10" />
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-slate-300">Stream Active</span>
                    </div>
                </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 font-mono text-xs leading-relaxed space-y-1 bg-black/40">
                {logs.length === 0 && (
                    <div className="text-slate-700 italic uppercase tracking-widest text-xs pt-4">Waiting for engine execution data...</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-6 group hover:bg-white/[0.02] -mx-2 px-2 py-0.5 rounded transition-colors font-medium">
                        <span className="text-slate-600 shrink-0 select-none w-20 opacity-50">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 1 })}</span>
                        <span className={`${
                            log.type === 'error' ? 'text-rose-400' : 
                            log.type === 'success' ? 'text-emerald-400' : 
                            'text-slate-300'
                        } break-all`}>
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </motion.div>

      </div>
    </div>
  );
}
