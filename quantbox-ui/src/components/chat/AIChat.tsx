'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import { ChatMessage, ValidationResult } from '@/lib/types';
import { toast } from 'sonner';

interface AIChatProps {
    onStrategyGenerated: (code: string, validation: ValidationResult) => void;
    marketContext: string;
}

export function AIChat({ onStrategyGenerated, marketContext }: AIChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '0',
            role: 'assistant',
            content: 'Welcome to QuantBox! Describe your trading strategy and I\'ll generate expert-level code for you. Examples:\n\n• "Create a momentum strategy that buys UP when price is rising"\n• "Build a mean reversion strategy with stop-loss"\n• "Make an aggressive value hunter strategy"',
            timestamp: new Date().toISOString(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isGenerating) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsGenerating(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ai/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userMessage.content,
                    marketContext,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Generation failed');
            }

            const { code, validation } = await response.json();

            // Success message with validation status
            const successMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: validation.valid
                    ? '✅ **Strategy generated successfully!**\n\nYour strategy has been validated and is ready to deploy. Click "Save & Deploy" to start trading.'
                    : '⚠️ **Strategy generated with warnings**\n\nYour strategy works but has some recommended improvements. You can still deploy it or refine your prompt.',
                timestamp: new Date().toISOString(),
                validation,
            };

            setMessages((prev) => [...prev, successMessage]);
            onStrategyGenerated(code, validation);
            toast.success('Strategy ready!');
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ **Generation failed**\n\n${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date().toISOString(),
                isError: true,
            };
            setMessages((prev) => [...prev, errorMessage]);
            toast.error('Failed to generate strategy');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1c1c1c] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-tight">AI Strategy Creator</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Powered by Gemini 2.0</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Online</span>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/20">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-5 py-3 ${msg.role === 'user'
                                    ? 'bg-[#3ecf8e] text-black'
                                    : msg.isError
                                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                                        : 'bg-white/[0.05] text-slate-200'
                                }`}
                        >
                            <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                                {msg.content}
                            </div>

                            {/* Validation Display */}
                            {msg.validation && (
                                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                                    {msg.validation.errors.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose-400">
                                                <XCircle className="w-3 h-3" />
                                                Errors
                                            </div>
                                            {msg.validation.errors.map((err, i) => (
                                                <div key={i} className="text-xs text-rose-300 pl-5">
                                                    • {err}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {msg.validation.warnings.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400">
                                                <AlertTriangle className="w-3 h-3" />
                                                Warnings ({msg.validation.warnings.length})
                                            </div>
                                            {msg.validation.warnings.map((warn, i) => (
                                                <div key={i} className="text-xs text-amber-200 pl-5">
                                                    • {warn}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {msg.validation.valid && msg.validation.warnings.length === 0 && (
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400">
                                            <CheckCircle2 className="w-3 h-3" />
                                            No issues detected
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="text-xs text-black/40 text-right mt-2 font-mono">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}

                {isGenerating && (
                    <div className="flex justify-start">
                        <div className="bg-white/[0.05] rounded-2xl px-5 py-3 flex items-center gap-3">
                            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                            <span className="text-sm font-medium text-slate-300">Generating strategy...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-white/5 p-4 bg-white/[0.02]">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Describe your trading strategy..."
                        disabled={isGenerating}
                        className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 font-medium"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isGenerating}
                        className="px-6 py-3 bg-[#3ecf8e] text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#30b47b] transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2 shadow-xl"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Send
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
