'use client';

import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, Wand2, X, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIAssistantPanelProps {
    onGenerate: (prompt: string) => Promise<void>;
    onClose: () => void;
}

export function AIAssistantPanel({ onGenerate, onClose }: AIAssistantPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I am your QuantBox Strategy Architect. Describe your trading idea, and I will build the node graph for you.' }
    ]);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || isGenerating) return;

        const userMessage = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setIsGenerating(true);

        try {
            await onGenerate(userMessage);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'I have updated your workspace with the new strategy logic. You can now tweak the nodes or hit Run to test it!' 
            }]);
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'I encountered an error while generating the strategy. Please check your API key in settings.' 
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-600/20 rounded-lg">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-widest">AI Architect</h2>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-500">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`mt-1 p-1.5 rounded-lg shrink-0 ${msg.role === 'assistant' ? 'bg-purple-600/20' : 'bg-blue-600/20'}`}>
                                {msg.role === 'assistant' ? <Bot className="w-3.5 h-3.5 text-purple-400" /> : <User className="w-3.5 h-3.5 text-blue-400" />}
                            </div>
                            <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                msg.role === 'assistant' 
                                ? 'bg-slate-800 text-slate-200 rounded-tl-none' 
                                : 'bg-blue-600 text-white rounded-tr-none'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isGenerating && (
                        <div className="flex gap-3">
                            <div className="mt-1 p-1.5 rounded-lg bg-purple-600/20 shrink-0">
                                <Bot className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                            </div>
                            <div className="p-3 bg-slate-800 text-slate-400 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                                <div className="flex gap-1">
                                    <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" />
                                    <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                                Architecting Nodes...
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Describe your strategy..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors resize-none placeholder:text-slate-600"
                        rows={3}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isGenerating}
                        className="absolute right-2 bottom-2 p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white rounded-lg transition-all active:scale-95 shadow-lg"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 bg-slate-950/50 p-2 rounded-lg border border-white/5">
                    <AlertCircle className="w-3 h-3 text-slate-600" />
                    <span>AI updates the current workspace directly.</span>
                </div>
            </div>
        </div>
    );
}
