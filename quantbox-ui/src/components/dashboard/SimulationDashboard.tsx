'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Terminal, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  Play, 
  Square,
  Maximize2,
  Minimize2,
  Trash2
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
  const activePositions = positions.filter(p => p.quantity > 0);

  // Socket Connection for Logs
  useEffect(() => {
    if (!strategyId) return;
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
    
    socket.on('connect', () => {
      socket.emit('subscribe:strategy', strategyId);
    });

    socket.on('strategy:log', (log: Log) => {
      setLogs(prev => [...prev, log]);
      if (scrollRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [strategyId]);

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-slate-200 overflow-hidden relative font-sans">
      
      {/* 1. Top Header: Market & Controls */}
      <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-[#09090b]/50 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">{marketTitle || 'Loading Market...'}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="border-white/10 text-[10px] text-slate-500 h-5 px-1.5 font-mono">
                BTC-15m
              </Badge>
              {isRunning ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  IDLE
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-6 px-6 border-r border-white/5 mr-2">
             <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Balance</div>
                <div className="text-sm font-mono font-bold text-white">${balance.toFixed(2)}</div>
             </div>
             <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PnL</div>
                <div className={`text-sm font-mono font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
                </div>
             </div>
          </div>

          {!isRunning ? (
            <button
              onClick={onRun}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Simulation
            </button>
          ) : (
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-lg text-xs font-bold transition-all active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Dashboard Grid */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
        
        {/* Top Row: Chart Placeholder + Positions */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
          
          {/* Left: Chart/Visualizer (Placeholder) */}
          <div className="lg:col-span-2 bg-[#121214] border border-white/5 rounded-2xl p-1 relative overflow-hidden flex flex-col">
             <div className="absolute inset-0 opacity-20 pointer-events-none" 
                  style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
             />
             <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-slate-600 gap-3">
                 <div className="p-3 rounded-full bg-white/5">
                    <Activity className="w-8 h-8 opacity-50" />
                 </div>
                 <p className="text-xs font-bold uppercase tracking-widest">Market Feed Visualization</p>
                 <p className="text-[10px] opacity-50">Waiting for next tick...</p>
             </div>
          </div>

          {/* Right: Active Positions */}
          <div className="bg-[#121214] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
             <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    Positions
                </span>
                <Badge className="bg-white/5 text-slate-400 border-transparent text-[10px]">{activePositions.length}</Badge>
             </div>
             <ScrollArea className="flex-1 bg-black/20">
                <div className="p-3 space-y-2">
                   {activePositions.length === 0 ? (
                       <div className="text-center py-10 opacity-30 text-xs uppercase font-bold">No Active Trades</div>
                   ) : (
                       activePositions.map((pos) => (
                         <div key={pos.tokenId} className="bg-[#18181b] p-3 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${pos.outcome === 'UP' || pos.outcome === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                    {pos.outcome}
                                </span>
                                <span className={`text-xs font-bold font-mono ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {pos.unrealizedPnL >= 0 ? '+' : ''}{pos.unrealizedPnL.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
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

        {/* Bottom Row: Terminal */}
        <motion.div 
            initial={false}
            animate={{ height: expandedLog ? '80%' : '35%' }}
            className="bg-[#121214] border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative"
        >
            <div className="h-9 border-b border-white/5 flex items-center justify-between px-4 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Logs</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setLogs([])} className="p-1 hover:text-white text-slate-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => setExpandedLog(!expandedLog)} className="p-1 hover:text-white text-slate-500 transition-colors">
                        {expandedLog ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    </button>
                </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-1 bg-[#09090b]">
                {logs.length === 0 && (
                    <div className="text-slate-700 select-none italic">Waiting for strategy output...</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-3 group">
                        <span className="text-slate-700 shrink-0 select-none w-16 opacity-50">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
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

      </main>
    </div>
  );
}
