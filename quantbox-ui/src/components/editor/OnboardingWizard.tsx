'use client';

import React, { useState, useEffect } from 'react';
import { 
    Clock, 
    Bot, 
    Wand2, 
    ArrowRight, 
    Sparkles, 
    Key, 
    Layout, 
    ChevronLeft,
    CheckCircle2,
    X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { MarketContext } from './NodePalette';

interface OnboardingWizardProps {
    onComplete: (config: {
        name: string;
        context: MarketContext;
        prompt?: string;
        useAi: boolean;
    }) => void;
    onClose: () => void;
}

type Step = 'MARKET' | 'AI_SETUP' | 'PROMPT';

export function OnboardingWizard({ onComplete, onClose }: OnboardingWizardProps) {
    const [step, setStep] = useState<Step>('MARKET');
    const [context, setContext] = useState<MarketContext>('15m');
    const [useAi, setUseAi] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [strategyName, setStrategyName] = useState('My Strategy');
    const [prompt, setPrompt] = useState('');

    // Load API Key from local storage
    useEffect(() => {
        const savedKey = localStorage.getItem('QUANTBOX_LLM_KEY');
        if (savedKey) setApiKey(savedKey);
    }, []);

    const saveKey = () => {
        localStorage.setItem('QUANTBOX_LLM_KEY', apiKey);
    };

    const handleMarketSelect = (ctx: MarketContext) => {
        setContext(ctx);
        setStep('AI_SETUP');
    };

    const handleAiToggle = (enable: boolean) => {
        setUseAi(enable);
        if (enable && !apiKey) {
            // Stay here to input key
        } else if (!enable) {
            // Skip to finish
            onComplete({ name: strategyName, context, useAi: false });
        } else {
            setStep('PROMPT');
        }
    };

    const finish = () => {
        if (useAi) saveKey();
        onComplete({ name: strategyName, context, prompt, useAi });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <Card className="w-full max-w-2xl bg-[#0f172a] border-[#1e293b] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                
                {/* Progress Header */}
                <div className="bg-[#1e293b]/50 px-6 py-4 flex items-center justify-between border-b border-[#1e293b]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-white font-bold">Initialize Strategy</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-md transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-8">
                    {step === 'MARKET' && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-white tracking-tight">Select Market Category</h3>
                                <p className="text-slate-400">What type of market will this strategy dominate?</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: '15m', label: '15m Up/Down', desc: 'High-frequency binary outcomes', icon: Clock, enabled: true },
                                    { id: '1h', label: '1h Up/Down', desc: 'Coming Soon', icon: Clock, enabled: false },
                                    { id: '4h', label: '4h Up/Down', desc: 'Coming Soon', icon: Clock, enabled: false },
                                    { id: 'generic', label: 'Generic', desc: 'Coming Soon', icon: Layout, enabled: false },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        disabled={!m.enabled}
                                        onClick={() => handleMarketSelect(m.id as MarketContext)}
                                        className={`p-4 border rounded-xl text-left transition-all ${
                                            m.enabled 
                                            ? 'bg-[#020617] border-[#1e293b] hover:border-blue-500 hover:scale-[1.02] group' 
                                            : 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed'
                                        }`}
                                    >
                                        <m.icon className={`w-6 h-6 mb-3 transition-transform ${m.enabled ? 'text-blue-500 group-hover:scale-110' : 'text-slate-600'}`} />
                                        <div className={`font-bold text-sm uppercase tracking-wider ${m.enabled ? 'text-white' : 'text-slate-500'}`}>{m.label}</div>
                                        <div className="text-slate-500 text-xs mt-1">{m.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'AI_SETUP' && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-white tracking-tight">AI Assistance</h3>
                                <p className="text-slate-400">Do you want the AI to architect your strategy?</p>
                            </div>

                            <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <button
                                        disabled
                                        className="w-full p-6 bg-slate-900 border border-slate-800 rounded-2xl opacity-50 cursor-not-allowed"
                                    >
                                        <Bot className="w-10 h-10 text-slate-600 mx-auto mb-4" />
                                        <div className="font-bold text-slate-500 uppercase tracking-widest text-xs">AI Architect</div>
                                        <div className="text-slate-600 text-xs mt-2">Coming Soon</div>
                                    </button>
                                    <div className="absolute top-2 right-2 bg-purple-600 text-[8px] font-black text-white px-1.5 py-0.5 rounded shadow-lg uppercase">
                                        Soon
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAiToggle(false)}
                                    className="flex-1 p-6 bg-[#020617] border border-[#1e293b] hover:border-blue-500 rounded-2xl transition-all hover:scale-[1.02] group"
                                >
                                    <Layout className="w-10 h-10 text-blue-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                    <div className="font-bold text-white uppercase tracking-widest text-xs">Manual Setup</div>
                                    <div className="text-slate-500 text-xs mt-2">Start with a blank canvas</div>
                                </button>
                            </div>

                            {useAi && (
                                <div className="mt-8 p-6 bg-[#020617] rounded-xl border border-blue-500/20 animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Key className="w-4 h-4 text-yellow-500" />
                                        <h4 className="text-white text-xs font-bold uppercase tracking-widest">OpenAI API Key</h4>
                                    </div>
                                    <input 
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                                    />
                                    <p className="text-slate-500 text-[10px] mt-3">
                                        Your key is stored only in your browser's local storage.
                                    </p>
                                    <button
                                        disabled={!apiKey}
                                        onClick={() => setStep('PROMPT')}
                                        className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                                    >
                                        Next <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'PROMPT' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <button onClick={() => setStep('AI_SETUP')} className="text-slate-500 hover:text-white flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase text-[9px] px-3">AI Context Active</Badge>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Strategy Name</label>
                                    <input 
                                        value={strategyName}
                                        onChange={(e) => setStrategyName(e.target.value)}
                                        className="w-full bg-[#020617] border border-[#1e293b] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Describe your strategy</label>
                                    <textarea 
                                        rows={5}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Example: Buy UP if BTC moves $100 in 5 minutes, and sell if it doesn't move back within 10 minutes..."
                                        className="w-full bg-[#020617] border border-[#1e293b] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={finish}
                                disabled={!prompt || !strategyName}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                <Wand2 className="w-5 h-5" />
                                Generate Workspace
                            </button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
