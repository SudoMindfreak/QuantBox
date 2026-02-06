'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Key, Cpu, Globe, Save, X, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [provider, setProvider] = useState('openai');
    const [openAIKey, setOpenAIKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [anthropicKey, setAnthropicKey] = useState('');
    const [grokKey, setGrokKey] = useState('');
    const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');

    useEffect(() => {
        setProvider(localStorage.getItem('QB_AI_PROVIDER') || 'openai');
        setOpenAIKey(localStorage.getItem('QB_OPENAI_KEY') || '');
        setGeminiKey(localStorage.getItem('QB_GEMINI_KEY') || '');
        setAnthropicKey(localStorage.getItem('QB_ANTHROPIC_KEY') || '');
        setGrokKey(localStorage.getItem('QB_GROK_KEY') || '');
        setOllamaUrl(localStorage.getItem('QB_OLLAMA_URL') || 'http://localhost:11434');
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('QB_AI_PROVIDER', provider);
        localStorage.setItem('QB_OPENAI_KEY', openAIKey);
        localStorage.setItem('QB_GEMINI_KEY', geminiKey);
        localStorage.setItem('QB_ANTHROPIC_KEY', anthropicKey);
        localStorage.setItem('QB_GROK_KEY', grokKey);
        localStorage.setItem('QB_OLLAMA_URL', ollamaUrl);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg bg-[#0f172a] border-[#1e293b] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-[#1e293b]/50 px-6 py-4 flex items-center justify-between border-b border-[#1e293b]">
                    <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-blue-400" />
                        <h2 className="text-white font-bold uppercase tracking-widest text-sm">System Settings</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-md transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        {/* Preferred Provider */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                Preferred AI Architect
                            </label>
                            <select 
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            >
                                <option value="openai">OpenAI (GPT-4o Mini)</option>
                                <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                                <option value="gemini">Google Gemini (Flash 1.5)</option>
                                <option value="grok">xAI Grok</option>
                                <option value="ollama">Local Ollama (Free)</option>
                            </select>
                        </div>

                        <div className="h-px bg-slate-800 my-2" />

                        {/* OpenAI */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                <Globe className="w-3 h-3" /> OpenAI API Key
                            </label>
                            <input 
                                type="password"
                                value={openAIKey}
                                onChange={(e) => setOpenAIKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* Anthropic */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                <Globe className="w-3 h-3 text-orange-500" /> Anthropic API Key
                            </label>
                            <input 
                                type="password"
                                value={anthropicKey}
                                onChange={(e) => setAnthropicKey(e.target.value)}
                                placeholder="sk-ant-..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* Gemini */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                <Globe className="w-3 h-3 text-emerald-500" /> Gemini API Key
                            </label>
                            <input 
                                type="password"
                                value={geminiKey}
                                onChange={(e) => setGeminiKey(e.target.value)}
                                placeholder="AIza..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* Grok */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                <Globe className="w-3 h-3 text-purple-500" /> Grok API Key
                            </label>
                            <input 
                                type="password"
                                value={grokKey}
                                onChange={(e) => setGrokKey(e.target.value)}
                                placeholder="xai-..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* Ollama */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                <Cpu className="w-3 h-3" /> Ollama Endpoint
                            </label>
                            <input 
                                type="text"
                                value={ollamaUrl}
                                onChange={(e) => setOllamaUrl(e.target.value)}
                                placeholder="http://localhost:11434"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/40 active:scale-[0.98]"
                    >
                        <Save className="w-4 h-4" />
                        Update Infrastructure
                    </button>
                </div>
            </Card>
        </div>
    );
}