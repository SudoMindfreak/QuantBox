'use client';

import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EditorHeaderProps {
    strategyName: string;
    initialBalance: number;
    onNameChange: (name: string) => void;
    onBalanceChange: (balance: number) => void;
    onSave: () => Promise<void>;
    onToggleOrderbook: () => void;
    isOrderbookOpen: boolean;
}

export function EditorHeader({ strategyName, initialBalance, onNameChange, onBalanceChange, onSave, onToggleOrderbook, isOrderbookOpen }: EditorHeaderProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="h-16 bg-slate-800 border-b border-slate-700 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push('/')}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Back to dashboard"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-300" />
                </button>

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">Q</span>
                    </div>
                    <span className="text-white font-semibold text-lg">QuantBox</span>
                </div>

                <div className="mx-4 h-6 w-px bg-slate-700" />

                <input
                    type="text"
                    value={strategyName}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-sm min-w-[200px]"
                    placeholder="Strategy name"
                />
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">Initial Balance:</label>
                    <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">$</span>
                        <input
                            type="number"
                            value={initialBalance}
                            onChange={(e) => onBalanceChange(Number(e.target.value))}
                            className="w-24 px-2 py-1.5 bg-slate-900 text-white rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-sm"
                        />
                        <span className="text-slate-400 text-sm">USDC</span>
                    </div>
                </div>

                <button
                    onClick={onToggleOrderbook}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium border ${isOrderbookOpen
                        ? 'bg-slate-700 text-blue-400 border-blue-500/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                >
                    <span className="text-lg">📊</span>
                    Orderbook
                </button>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                </button>

                <div className="h-6 w-px bg-slate-700 mx-2" />

                <button
                    onClick={async () => {
                        // Optimistic UI/Action
                        const id = window.location.pathname.split('/').pop();
                        if (id && id !== 'new') {
                            try {
                                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/strategies/${id}/start`, {
                                    method: 'POST'
                                });
                                if (res.ok) {
                                    console.log('Strategy started');
                                    // We rely on socket logs for feedback
                                }
                            } catch (err) {
                                console.error('Failed to run', err);
                            }
                        }
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-lg shadow-green-900/20"
                >
                    <span className="text-lg">▶</span>
                    Run
                </button>
            </div>
        </div>
    );
}
