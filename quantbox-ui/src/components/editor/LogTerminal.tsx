'use client';

import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Log {
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error';
}

interface LogTerminalProps {
    strategyId: string;
    isOpen: boolean;
    onToggle: (open: boolean) => void;
}

export function LogTerminal({ strategyId, isOpen, onToggle }: LogTerminalProps) {
    const [logs, setLogs] = useState<Log[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!strategyId || strategyId === 'new') return;

        // Connect logging socket
        const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to log stream');
            socket.emit('subscribe:strategy', strategyId);
        });

        socket.on('strategy:log', (log: Log) => {
            setLogs(prev => [...prev, log]);
            // Auto scroll
            if (isOpen && scrollRef.current) {
                setTimeout(() => {
                    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                }, 100);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [strategyId, isOpen]);

    if (!isOpen) {
        return (
            <div
                className="h-10 bg-slate-900 border-t border-slate-700 flex items-center px-4 cursor-pointer hover:bg-slate-800 transition-colors z-20 shrink-0"
                onClick={() => onToggle(true)}
            >
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Logs Terminal</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="flex-1" />
                <span className="text-slate-500 text-xs">▲ EXPAND</span>
            </div>
        );
    }

    return (
        <div className="h-64 bg-[#020617] border-t border-slate-800 flex flex-col z-20 shadow-2xl shrink-0">
            {/* Header */}
            <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between select-none">
                <div className="flex items-center gap-3">
                    <span className="text-slate-200 text-[10px] font-black uppercase tracking-widest">Strategy Logs</span>
                    <Badge variant="outline" className="bg-slate-950 text-[9px] text-slate-500 border-slate-800 h-5">
                        {socketRef.current?.connected ? 'CONNECTED' : 'OFFLINE'}
                    </Badge>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setLogs([])}
                        className="text-slate-500 hover:text-slate-300 text-[10px] font-bold uppercase transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => onToggle(false)}
                        className="text-slate-500 hover:text-slate-300 p-1"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Logs Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1"
            >
                {logs.length === 0 && (
                    <div className="text-slate-600 italic">No logs yet. Run the strategy to see output.</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-3 animate-in fade-in duration-300">
                        <span className="text-slate-600 shrink-0 select-none">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className={`${log.type === 'error' ? 'text-red-400' :
                                log.type === 'success' ? 'text-green-400' :
                                    'text-slate-300'
                            } break-all`}>
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
