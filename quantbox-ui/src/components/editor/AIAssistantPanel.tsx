'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, StopCircle, BrainCircuit, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIAssistantPanelProps {
    onGenerate: (prompt: string) => Promise<void>;
}

export function AIAssistantPanel({ onGenerate }: AIAssistantPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Agent core synchronized. Describe the trading logic you want to deploy.' }
    ]);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isGenerating]);

    const handleSend = async () => {
        if (!input.trim() || isGenerating) return;
        const userMessage = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setIsGenerating(true);
        try {
            await onGenerate(userMessage);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Expert logic updated. You can now launch the agent to test the new parameters.' 
            }]);
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Failed to synchronize logic. Please verify your connection.' 
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#171717] relative font-sans">
            {/* Header */}
            <div className="h-14 flex items-center px-6 border-b border-white/[0.05] shrink-0 bg-black/20 backdrop-blur-xl">
                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-200">
                    <div className="p-1.5 bg-emerald-600/10 rounded-lg text-[#3ecf8e]">
                        <BrainCircuit className="w-4 h-4" />
                    </div>
                    <span>Intelligence</span>
                </div>
            </div>

            {/* Chat History */}
            <ScrollArea className="flex-1" viewportRef={scrollRef}>
                <div className="flex flex-col gap-8 p-6">
                    {messages.map((msg, i) => (
                        <div key={i} className={cn("flex flex-col gap-2 text-xs font-bold uppercase tracking-widest", msg.role === 'user' ? "items-end text-slate-400" : "items-start text-[#3ecf8e]")}>
                            <div className="flex items-center gap-2 mb-1 px-1">
                                {msg.role === 'assistant' ? (
                                    <>
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] shadow-[0_0_8px_rgba(62,207,142,0.8)]" />
                                        <span>System</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Operator</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                    </>
                                )}
                            </div>
                            <div className={cn(
                                "leading-relaxed px-4 py-3 rounded-2xl max-w-[90%] text-sm normal-case tracking-normal transition-all",
                                msg.role === 'assistant' 
                                    ? "text-slate-200 bg-white/[0.03] border border-white/[0.05] rounded-tl-none shadow-sm font-medium" 
                                    : "bg-[#3ecf8e] text-black rounded-tr-none shadow-lg shadow-emerald-900/20 font-semibold"
                            )}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    
                    {isGenerating && (
                         <div className="flex flex-col items-start gap-2 text-xs font-bold uppercase tracking-widest text-[#3ecf8e]">
                             <div className="flex items-center gap-2 mb-1 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
                                <span>Compiling Logic</span>
                             </div>
                             <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] border-dashed text-slate-400 italic normal-case tracking-normal">
                                 <div className="flex gap-1">
                                     <span className="w-1 h-1 bg-[#3ecf8e] rounded-full animate-bounce" />
                                     <span className="w-1 h-1 bg-[#3ecf8e] rounded-full animate-bounce [animation-delay:0.2s]" />
                                     <span className="w-1 h-1 bg-[#3ecf8e] rounded-full animate-bounce [animation-delay:0.4s]" />
                                 </div>
                                 <span>Injecting expert patterns...</span>
                             </div>
                         </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-6 bg-[#171717] border-t border-white/[0.05]">
                <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl transition-all focus-within:border-emerald-500/40 focus-within:bg-white/[0.05] group">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Command your agent..."
                        className="w-full bg-transparent border-none text-sm text-white placeholder:text-slate-600 resize-none p-4 pr-12 focus:ring-0 focus:outline-none min-h-[56px] font-medium"
                        rows={1}
                    />
                    <div className="absolute right-3 bottom-3">
                         {isGenerating ? (
                             <div className="p-2 text-[#3ecf8e]">
                                 <Loader2 className="w-4 h-4 animate-spin" />
                             </div>
                         ) : (
                             <button 
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="p-2 rounded-xl bg-[#3ecf8e] text-black hover:bg-[#30b47b] disabled:opacity-20 transition-all shadow-xl"
                             >
                                 <Send className="w-3.5 h-3.5" />
                             </button>
                         )}
                    </div>
                </div>
                <p className="text-[10px] text-center text-slate-600 mt-4 uppercase tracking-[0.2em] font-black">Secure Core Execution</p>
            </div>
        </div>
    );
}
