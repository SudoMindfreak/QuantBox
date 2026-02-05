'use client';

import { Radio, TrendingUp, ShoppingCart, DollarSign, GitBranch, Calculator } from 'lucide-react';

const nodeCategories = [
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
        name: 'Data',
        icon: TrendingUp,
        color: 'text-purple-400',
        nodes: [
            { type: 'orderbookSnapshot', label: 'Orderbook', icon: '📊' },
            { type: 'priceMonitor', label: 'Price Monitor', icon: '📈' },
            { type: 'smartMoneyDetector', label: 'Smart Money', icon: '🧠' },
        ],
    },
    {
        name: 'Conditions',
        icon: GitBranch,
        color: 'text-yellow-400',
        nodes: [
            { type: 'ifElse', label: 'If/Else', icon: '⚖️' },
            { type: 'meanReversion', label: 'Mean Reversion', icon: '📉' },
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
    {
        name: 'Utilities',
        icon: Calculator,
        color: 'text-slate-400',
        nodes: [
            { type: 'mathOperation', label: 'Math', icon: '🔢' },
            { type: 'delay', label: 'Delay', icon: '⏱️' },
            { type: 'merge', label: 'Merge', icon: '🔀' },
        ],
    },
];

interface NodePaletteProps {
    onAddNode: (type: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
    return (
        <div className="w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto">
            <div className="p-4 border-b border-slate-700">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Node Library</h2>
            </div>

            <div className="p-3 space-y-4">
                {nodeCategories.map((category) => (
                    <div key={category.name}>
                        <div className="flex items-center gap-2 mb-2">
                            <category.icon className={`w-4 h-4 ${category.color}`} />
                            <h3 className="text-xs font-medium text-slate-300 uppercase tracking-wide">
                                {category.name}
                            </h3>
                        </div>
                        <div className="space-y-1">
                            {category.nodes.map((node) => (
                                <button
                                    key={node.type}
                                    onClick={() => onAddNode(node.type)}
                                    className="w-full flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded text-sm transition-colors group relative"
                                >
                                    <span className="text-base">{node.icon}</span>
                                    <span className="group-hover:text-blue-400 transition-colors flex-1 text-left">{node.label}</span>
                                    {(node as any).isStartNode && (
                                        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                            Start
                                        </span>
                                    )}
                                    {(node as any).isEndNode && (
                                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                                            End
                                        </span>
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
