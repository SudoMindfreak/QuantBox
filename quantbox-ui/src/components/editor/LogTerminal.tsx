'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Log {
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error';
}

interface LogTerminalProps {
    strategyId: string;
}

export function LogTerminal({ strategyId }: LogTerminalProps) {
    const [logs, setLogs] = useState<Log[]>([]);
    const [isOpen, setIsOpen] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!strategyId || strategyId === 'new') return;

        // Connect logging socket
        const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to log stream');
            socket.emit('subscribe', `strategy:${strategyId}`);
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
                className="absolute bottom-0 left-0 right-0 h-10 bg-slate-900 border-t border-slate-700 flex items-center px-4 cursor-pointer hover:bg-slate-800 transition-colors z-20"
                onClick={() => setIsOpen(true)}
            >
                <span className="text-slate-400 text-sm font-mono mr-2">Logs Terminal</span>
                <div className="flex-1" />
                <span className="text-slate-500">▲</span>
            </div>
        );
    }

    return (
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-slate-950 border-t border-slate-800 flex flex-col z-20 shadow-xl shadow-black/50">
            {/* Header */}
            <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between select-none">
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm font-mono">Strategy Logs</span>
                    <span className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-500 font-mono">Socket: {socketRef.current?.connected ? 'Connected' : 'Disconnected'}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setLogs([])}
                        className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-slate-500 hover:text-slate-300 text-lg leading-none"
                    >
                        ▼
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
