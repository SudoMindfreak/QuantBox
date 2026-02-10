'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, StopCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIAssistantPanelProps {
    onGenerate: (prompt: string) => Promise<void>;
    onClose?: () => void;
}

export function AIAssistantPanel({ onGenerate }: AIAssistantPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'I am ready to code your strategy. Describe what you want the bot to do.' }
    ]);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
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
        
        // Reset height
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        setIsGenerating(true);

        try {
            await onGenerate(userMessage);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'I\'ve updated the strategy logic based on your request. You can run it now to see the results.' 
            }]);
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'I encountered an error while updating the code. Please check your API key or try again.' 
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
        <div className="flex flex-col h-full bg-[#09090b] border-r border-white/5 relative">
            {/* Header */}
            <div className="h-14 flex items-center px-4 border-b border-white/5 shrink-0 bg-[#09090b]/50 backdrop-blur">
                <span className="font-bold text-sm tracking-tight text-slate-200">QuantBox AI</span>
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">BETA</span>
            </div>

            {/* Chat History */}
            <ScrollArea className="flex-1" viewportRef={scrollRef}>
                <div className="flex flex-col gap-6 p-4 pb-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={cn("flex gap-3 text-sm", msg.role === 'user' ? "flex-row-reverse" : "")}>
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
                                msg.role === 'assistant' 
                                    ? "bg-[#18181b] border-white/5 text-blue-400" 
                                    : "bg-blue-600 border-blue-500 text-white"
                            )}>
                                {msg.role === 'assistant' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <div className={cn(
                                "flex-1 leading-relaxed px-3 py-2 rounded-lg max-w-[85%]",
                                msg.role === 'assistant' ? "text-slate-300" : "bg-blue-600/10 text-blue-100 border border-blue-500/20"
                            )}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    
                    {isGenerating && (
                         <div className="flex gap-3 text-sm">
                             <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#18181b] border border-white/5 text-blue-400">
                                 <Sparkles className="w-4 h-4 animate-pulse" />
                             </div>
                             <div className="flex items-center gap-2 text-slate-500 italic">
                                 <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" />
                                 <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce delay-75" />
                                 <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce delay-150" />
                                 Writing Python code...
                             </div>
                         </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 shrink-0 bg-[#09090b]">
                <div className="relative bg-[#18181b] border border-white/10 rounded-xl shadow-lg focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Build a strategy..."
                        className="w-full bg-transparent border-none text-sm text-slate-200 placeholder:text-slate-600 resize-none p-3 pr-12 max-h-[120px] focus:ring-0 focus:outline-none"
                        rows={1}
                        style={{ minHeight: '44px' }}
                    />
                    <div className="absolute right-2 bottom-2">
                         {isGenerating ? (
                             <button disabled className="p-1.5 rounded-lg bg-slate-800 text-slate-500 cursor-not-allowed">
                                 <StopCircle className="w-4 h-4" />
                             </button>
                         ) : (
                             <button 
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                             >
                                 <Send className="w-3.5 h-3.5" />
                             </button>
                         )}
                    </div>
                </div>
                <div className="text-[10px] text-center text-slate-600 mt-2 font-medium">
                    AI updates your hidden Python strategy file directly.
                </div>
            </div>
        </div>
    );
}