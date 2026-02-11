'use client';

import React, { useState, useEffect } from 'react';
import { 
    Clock, 
    Wand2, 
    ChevronLeft,
    X,
    Code2,
    Sparkles,
    Layout
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface OnboardingWizardProps {
    onComplete: (config: {
        name: string;
        context: string;
        marketSlug: string;
        prompt?: string;
        useAi: boolean;
    }) => void;
    onClose: () => void;
}

type Step = 'MARKET' | 'PROMPT';

export function OnboardingWizard({ onComplete, onClose }: OnboardingWizardProps) {
    const [step, setStep] = useState<Step>('MARKET');
    const [context, setContext] = useState('15m');
    const [marketSlug, setMarketSlug] = useState('btc-updown-15m-1770311700');
    const [strategyName, setStrategyName] = useState('My Strategy');
    const [prompt, setPrompt] = useState('');

    useEffect(() => {
        const savedPrompt = localStorage.getItem('QB_INITIAL_PROMPT');
        if (savedPrompt) {
            setPrompt(savedPrompt);
            localStorage.removeItem('QB_INITIAL_PROMPT');
        }
    }, []);

    const finish = () => {
        onComplete({ name: strategyName, context, marketSlug, prompt, useAi: true });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <Card className="w-full max-w-2xl bg-[#1c1c1c] border-white/5 shadow-[0_0_50px_-12px_rgba(62,207,142,0.2)] overflow-hidden animate-in fade-in zoom-in duration-300">
                
                {/* Header */}
                <div className="bg-white/[0.02] px-6 py-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-white">
                        <div className="w-8 h-8 bg-[#3ecf8e] rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Sparkles className="w-4 h-4 text-black" />
                        </div>
                        <h2>Initialize AI Simulation</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-md transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-8">
                    {step === 'MARKET' && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2 mb-8">
                                <h3 className="text-2xl font-bold text-white tracking-tight uppercase">What are we trading?</h3>
                                <p className="text-slate-400 text-sm">Select a market context for your AI agent.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: '15m', slug: 'btc-updown-15m-1770311700', label: 'BTC 15m Up/Down', desc: 'Binary prediction on short-term volatility.', icon: Clock, enabled: true },
                                    { id: 'generic', slug: 'custom', label: 'Custom Market', desc: 'Input any Polymarket event URL.', icon: Layout, enabled: true },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => {
                                            setContext(m.id);
                                            setMarketSlug(m.slug);
                                            setStep('PROMPT');
                                        }}
                                        className="p-5 border border-white/5 bg-white/[0.02] rounded-2xl text-left transition-all hover:border-[#3ecf8e]/50 hover:bg-white/[0.04] group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <m.icon className="w-5 h-5 text-[#3ecf8e]" />
                                        </div>
                                        <div className="font-bold text-white tracking-tight text-sm uppercase">{m.label}</div>
                                        <div className="text-slate-500 text-xs mt-1 leading-relaxed">{m.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'PROMPT' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between">
                                <button onClick={() => setStep('MARKET')} className="text-slate-500 hover:text-white flex items-center gap-1 text-xs font-bold uppercase tracking-widest transition-colors">
                                    <ChevronLeft className="w-4 h-4" /> Change Market
                                </button>
                                <Badge className="bg-emerald-500/10 text-[#3ecf8e] border-emerald-500/20 text-xs px-2 py-0.5 font-bold tracking-widest uppercase">AI Engine Ready</Badge>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Strategy Identity</label>
                                    <input 
                                        autoFocus
                                        value={strategyName}
                                        onChange={(e) => setStrategyName(e.target.value)}
                                        placeholder="e.g. Volatility Hunter V1"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3ecf8e]/50 transition-colors text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">The Strategy Prompt</label>
                                    <textarea 
                                        rows={4}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Describe your trading logic..."
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3ecf8e]/50 resize-none transition-colors text-sm leading-relaxed"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={finish}
                                disabled={!prompt || !strategyName}
                                className="w-full py-4 bg-[#3ecf8e] hover:bg-[#30b47b] text-black font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                <Code2 className="w-5 h-5" />
                                Generate & Initialize
                            </button>
                            <p className="text-center text-xs text-slate-600 font-medium">
                                Our AI will write the Python code and host it on a dedicated container.
                            </p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
