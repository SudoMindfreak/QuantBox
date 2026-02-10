'use client';

import { Radio, TrendingUp, ShoppingCart, DollarSign, GitBranch, Zap } from 'lucide-react';

const nodeCategories = [
    {
        name: 'Triggers',
        icon: Radio,
        color: 'text-blue-400',
        nodes: [
            { type: 'marketDetector', label: 'Market Detector', icon: '📡', isStartNode: true },
        ],
    },
    {
        name: 'Data Flow',
        icon: TrendingUp,
        color: 'text-purple-400',
        nodes: [
            { type: 'orderbook', label: 'Orderbook', icon: '📖' },
            { type: 'price', label: 'Price', icon: '💲' },
        ],
    },
    {
        name: 'Logic',
        icon: GitBranch,
        color: 'text-yellow-400',
        nodes: [
            { type: 'condition', label: 'Condition', icon: '⚡' },
            { type: 'timer', label: 'Timer', icon: '⏱️' },
        ],
    },
    {
        name: 'Actions',
        icon: ShoppingCart,
        color: 'text-green-400',
        nodes: [
            { type: 'buyAction', label: 'Buy', icon: '💰', isEndNode: true },
            { type: 'sellAction', label: 'Sell', icon: '💸', isEndNode: true },
        ],
    },
    {
        name: 'Portfolio',
        icon: DollarSign,
        color: 'text-slate-400',
        nodes: [
            { type: 'portfolio', label: 'Portfolio', icon: '💼', isEndNode: true },
        ],
    },
];

interface NodePaletteProps {
    onAddNode: (type: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
    return (
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-white uppercase tracking-wide">Node Library</h2>
                <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                {nodeCategories.map((category) => (
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