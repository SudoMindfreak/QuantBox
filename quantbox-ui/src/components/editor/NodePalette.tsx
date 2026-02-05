'use client';

import { Radio, TrendingUp, ShoppingCart, DollarSign, GitBranch, Calculator, Zap, Bitcoin, ChevronDown, Clock } from 'lucide-react';

export type MarketContext = 'generic' | '15m' | '1h' | '4h';

const commonCategories = [
    {
        name: 'Triggers',
        icon: Radio,
        color: 'text-blue-400',
        nodes: [
            { type: 'marketDetector', label: 'Market Detector', icon: '📡', isStartNode: true },
            { type: 'scheduleTrigger', label: 'Schedule', icon: '⏱️', isStartNode: true },
        ],
    },
    {
        name: 'Conditions',
        icon: GitBranch,
        color: 'text-yellow-400',
        nodes: [
            { type: 'ifElse', label: 'If/Else', icon: '⚖️' },
            { type: 'orderbookImbalance', label: 'Imbalance Check', icon: '⚡' },
        ],
    },
    {
        name: 'Actions',
        icon: ShoppingCart,
        color: 'text-green-400',
        nodes: [
            { type: 'buyAction', label: 'Buy', icon: '💰', isEndNode: true },
            { type: 'sellAction', label: 'Sell', icon: '💸', isEndNode: true },
            { type: 'logEvent', label: 'Log', icon: '📝', isEndNode: true },
        ],
    },
];

const getSpecializedNodes = (context: MarketContext) => {
    if (context === 'generic') return null;
    
    return {
        name: `${context} Up/Down Special`,
        icon: Clock,
        color: 'text-orange-400',
        nodes: [
            { type: 'upDownClock', label: `${context} Clock`, icon: '⏰' },
            { type: 'upDownStrike', label: 'Strike Price', icon: '🎯' },
            { type: 'binaryArbitrage', label: 'Arb Detector', icon: '⚖️' },
        ],
    };
};

interface NodePaletteProps {
    onAddNode: (type: string) => void;
    context: MarketContext;
    onContextChange: (context: MarketContext) => void;
}

export function NodePalette({ onAddNode, context, onContextChange }: NodePaletteProps) {
    const specialNodes = getSpecializedNodes(context);
    const categories = specialNodes 
        ? [specialNodes, ...commonCategories]
        : commonCategories;

    return (
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
            {/* Market Context Selector */}
            <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    Market Category
                </label>
                <div className="relative group">
                    <select 
                        value={context}
                        onChange={(e) => onContextChange(e.target.value as MarketContext)}
                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded px-3 py-2 appearance-none cursor-pointer hover:border-blue-500 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="15m">15m Up/Down (BTC, ETH, ...)</option>
                        <option value="1h">1h Up/Down</option>
                        <option value="4h">4h Up/Down</option>
                        <option value="generic">Generic Markets</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-blue-400 transition-colors" />
                </div>
            </div>

            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-white uppercase tracking-wide">Node Library</h2>
                <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                {categories.map((category) => (
                    <div key={category.name}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <category.icon className={`w-3.5 h-3.5 ${category.color}`} />
                            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                {category.name}
                            </h3>
                        </div>
                        <div className="space-y-1">
                            {category.nodes.map((node) => (
                                <button
                                    key={node.type}
                                    onClick={() => onAddNode(node.type)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-900/80 hover:bg-slate-700 border border-transparent hover:border-slate-600 text-white rounded-lg text-sm transition-all group relative"
                                >
                                    <span className="text-base grayscale group-hover:grayscale-0 transition-all">{node.icon}</span>
                                    <span className="group-hover:text-blue-400 transition-colors flex-1 text-left font-medium">{node.label}</span>
                                    {(node as any).isStartNode && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" title="Entry Node" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}