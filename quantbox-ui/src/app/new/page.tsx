'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Rocket, CheckCircle2 } from 'lucide-react';
import { AIChat } from '@/components/chat/AIChat';
import { ValidationResult } from '@/lib/types';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';

const MARKETS = [
    {
        id: 'btc-updown-15m',
        name: 'BTC Up or Down (15m)',
        description: 'Bitcoin price prediction every 15 minutes',
    },
];

export default function NewStrategyPage() {
    const router = useRouter();
    const [selectedMarket, setSelectedMarket] = useState(MARKETS[0]);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [strategyName, setStrategyName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleStrategyGenerated = (code: string, validationResult: ValidationResult) => {
        setGeneratedCode(code);
        setValidation(validationResult);

        // Auto-generate strategy name
        const timestamp = new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        setStrategyName(`AI Strategy - ${timestamp}`);
    };

    const handleSaveAndDeploy = async () => {
        if (!generatedCode || !strategyName) {
            toast.error('Please generate a strategy first');
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: strategyName,
                    description: `AI-generated strategy for ${selectedMarket.name}`,
                    pythonCode: generatedCode,
                    marketSlug: selectedMarket.id,
                    initialBalance: 1000,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save strategy');
            }

            const { id } = await response.json();
            toast.success('Strategy saved successfully!');
            router.push(`/editor/${id}`);
        } catch (error) {
            toast.error('Failed to save strategy');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#1c1c1c] text-slate-200 font-sans">
            {/* Grid Background */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            <Navbar isScrolled={true} onSettingsOpen={() => { }} />

            <div className="container mx-auto px-8 pt-32 pb-20 max-w-7xl relative z-10">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm font-bold uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2 uppercase">
                        Create New Strategy
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">
                        Powered by AI • {selectedMarket.name}
                    </p>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
                    {/* Left: AI Chat */}
                    <div className="lg:col-span-2 h-full">
                        <AIChat
                            onStrategyGenerated={handleStrategyGenerated}
                            marketContext={selectedMarket.id}
                        />
                    </div>

                    {/* Right: Strategy Info & Actions */}
                    <div className="flex flex-col gap-6 h-full">
                        {/* Market Selection */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-[24px] p-6 shadow-xl">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                                Target Market
                            </h3>
                            <div className="bg-white/[0.05] border border-white/10 rounded-xl p-4">
                                <div className="text-sm font-black text-white mb-1 uppercase tracking-tight">
                                    {selectedMarket.name}
                                </div>
                                <div className="text-xs text-slate-400 font-medium">
                                    {selectedMarket.description}
                                </div>
                            </div>
                        </div>

                        {/* Strategy Status */}
                        {generatedCode && validation && (
                            <div className="bg-white/[0.02] border border-white/5 rounded-[24px] p-6 shadow-xl flex-1 flex flex-col">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                                    Strategy Status
                                </h3>

                                <div className="flex-1 space-y-4">
                                    {/* Validation Status */}
                                    <div
                                        className={`p-4 rounded-xl border ${validation.valid
                                                ? 'bg-emerald-500/10 border-emerald-500/20'
                                                : 'bg-amber-500/10 border-amber-500/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle2
                                                className={`w-4 h-4 ${validation.valid ? 'text-emerald-400' : 'text-amber-400'
                                                    }`}
                                            />
                                            <span
                                                className={`text-xs font-black uppercase tracking-widest ${validation.valid ? 'text-emerald-400' : 'text-amber-400'
                                                    }`}
                                            >
                                                {validation.valid ? 'Ready to Deploy' : 'Has Warnings'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 font-medium">
                                            {validation.valid
                                                ? 'Your strategy passed all validation checks'
                                                : `${validation.warnings.length} warning(s) detected - strategy is functional`}
                                        </p>
                                    </div>

                                    {/* Strategy Name */}
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">
                                            Strategy Name
                                        </label>
                                        <input
                                            type="text"
                                            value={strategyName}
                                            onChange={(e) => setStrategyName(e.target.value)}
                                            className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                                            placeholder="Enter strategy name..."
                                        />
                                    </div>

                                    {/* Initial Balance */}
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">
                                            Initial Balance
                                        </label>
                                        <div className="bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5">
                                            <span className="text-sm font-mono text-white font-bold">$1,000.00 USDC</span>
                                            <span className="text-xs text-slate-500 ml-2">(simulated)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Deploy Button */}
                                <button
                                    onClick={handleSaveAndDeploy}
                                    disabled={isSaving || !strategyName.trim()}
                                    className="w-full mt-6 px-6 py-3.5 bg-[#3ecf8e] text-black rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#30b47b] transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2 shadow-xl"
                                >
                                    <Rocket className="w-4 h-4" />
                                    {isSaving ? 'Saving...' : 'Save & Deploy'}
                                </button>
                            </div>
                        )}

                        {/* Instructions */}
                        {!generatedCode && (
                            <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-[24px] p-6">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                                    Quick Tips
                                </h3>
                                <ul className="space-y-2 text-xs text-slate-500 font-medium">
                                    <li className="flex items-start gap-2">
                                        <span className="text-emerald-400 shrink-0">•</span>
                                        <span>Be specific about entry/exit conditions</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-emerald-400 shrink-0">•</span>
                                        <span>Mention risk management preferences</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-emerald-400 shrink-0">•</span>
                                        <span>Reference examples from the landing page</span>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
