'use client';

import { useState } from 'react';
import { ArrowLeft, Save, Play, Square, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EditorHeaderProps {
    strategyName: string;
    strategyDescription: string;
    initialBalance: number;
    isRunning: boolean;
    onNameChange: (name: string) => void;
    onDescriptionChange: (desc: string) => void;
    onBalanceChange: (balance: number) => void;
    onSave: () => Promise<void>;
    onRun: () => Promise<void>;
    onStop: () => Promise<void>;
    onToggleOrderbook: () => void;
    isOrderbookOpen: boolean;
    onTogglePortfolio: () => void;
    isPortfolioOpen: boolean;
    onToggleAI: () => void;
    isAIOpen: boolean;
}

export function EditorHeader({
    strategyName,
    strategyDescription,
    initialBalance,
    isRunning,
    onNameChange,
    onDescriptionChange,
    onBalanceChange,
    onSave,
    onRun,
    onStop,
    onToggleOrderbook,
    isOrderbookOpen,
    onTogglePortfolio,
    isPortfolioOpen,
    onToggleAI,
    isAIOpen
}: EditorHeaderProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [showDesc, setShowDesc] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave();
        } finally {
            setIsSaving(false);
        }
    };

    const handleRunClick = async () => {
        setIsStarting(true);
        try {
            if (isRunning) {
                await onStop();
            } else {
                await onRun();
            }
        } finally {
            setIsStarting(false);
        }
    };

    return (
        <div className="h-16 bg-slate-800 border-b border-slate-700 px-6 flex items-center justify-between shadow-md z-30">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push('/')}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Back to dashboard"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-300" />
                </button>

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-inner">
                        <span className="text-white font-bold text-sm">Q</span>
                    </div>
                    <span className="text-white font-semibold text-lg hidden md:block">QuantBox</span>
                </div>

                <div className="mx-4 h-6 w-px bg-slate-700" />

                <div className="flex flex-col relative group">
                    <input
                        type="text"
                        value={strategyName}
                        onChange={(e) => onNameChange(e.target.value)}
                        onFocus={() => setShowDesc(true)}
                        className="px-3 py-1.5 bg-slate-950 text-white rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-sm min-w-[240px] font-medium"
                        placeholder="Strategy name"
                    />
                    {showDesc && (
                        <div className="absolute top-full left-0 mt-2 w-[350px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Strategy Description</label>
                            <textarea 
                                value={strategyDescription}
                                onChange={(e) => onDescriptionChange(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 resize-none h-24"
                                placeholder="Describe your logic..."
                            />
                            <div className="flex justify-end mt-2">
                                <button 
                                    onClick={() => setShowDesc(false)}
                                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative group">
                    <button
                        disabled
                        className="p-2 rounded-lg transition-all border bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed opacity-50"
                        title="AI Assistant (Coming Soon)"
                    >
                        <Sparkles className="w-5 h-5" />
                    </button>
                    <div className="absolute -top-2 -right-2 bg-purple-600 text-[8px] font-black text-white px-1 rounded-sm shadow-lg pointer-events-none">
                        SOON
                    </div>
                </div>

                <div className="h-6 w-px bg-slate-700 mx-1" />

                <div className="hidden lg:flex items-center gap-2 mr-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Initial Balance:</label>
                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1.5 rounded border border-slate-700">
                        <span className="text-slate-500 text-xs">$</span>
                        <input
                            type="number"
                            value={initialBalance}
                            onChange={(e) => onBalanceChange(Number(e.target.value))}
                            className="w-20 bg-transparent text-white focus:outline-none text-sm font-mono"
                        />
                        <span className="text-slate-500 text-[10px] font-bold">USDC</span>
                    </div>
                </div>

                <button
                    onClick={onToggleOrderbook}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium border ${isOrderbookOpen
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                >
                    <span className="text-lg">📊</span>
                    <span className="hidden sm:inline">Orderbook</span>
                </button>

                <button
                    onClick={onTogglePortfolio}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium border ${isPortfolioOpen
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                >
                    <span className="text-lg">💼</span>
                    <span className="hidden sm:inline">Portfolio</span>
                </button>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-all text-sm font-medium border border-slate-600 shadow-sm"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span className="hidden sm:inline">Save</span>
                </button>

                <div className="h-6 w-px bg-slate-700 mx-2" />

                <button
                    onClick={handleRunClick}
                    disabled={isStarting}
                    className={`px-5 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-bold shadow-lg ${isRunning
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                        : 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20'
                        } disabled:opacity-50`}
                >
                    {isStarting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isRunning ? (
                        <Square className="w-4 h-4 fill-current" />
                    ) : (
                        <Play className="w-4 h-4 fill-current" />
                    )}
                    {isRunning ? 'Stop' : 'Run'}
                </button>
            </div>
        </div>
    );
}