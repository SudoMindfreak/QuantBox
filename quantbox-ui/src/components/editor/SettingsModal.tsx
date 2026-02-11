'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Globe, Save, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [provider, setProvider] = useState('gemini');

    useEffect(() => {
        setProvider(localStorage.getItem('QB_AI_PROVIDER') || 'gemini');
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('QB_AI_PROVIDER', provider);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <Card className="w-full max-w-lg bg-[#1c1c1c] border-white/5 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-white/[0.02] px-6 py-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Settings className="w-4 h-4 text-[#3ecf8e]" />
                        <h2 className="text-white font-bold tracking-tight text-sm uppercase">Engine Settings</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-md transition-colors text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="p-3 bg-emerald-500/10 rounded-xl">
                                    <Globe className="w-6 h-6 text-[#3ecf8e]" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-2 uppercase">QuantBox AI Engine v2.5</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed max-w-[280px]">
                                        Your strategies are optimized using high-performance master nodes. 
                                        Logic generation and research tools are fully managed.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                        <div className="flex justify-between items-center px-2 text-xs font-bold uppercase tracking-widest">
                            <span className="text-slate-500">Network Status</span>
                            <span className="flex items-center gap-1.5 text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
                                OPERATIONAL
                            </span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}