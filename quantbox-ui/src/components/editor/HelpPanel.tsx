'use client';

import { useState } from 'react';
import { HelpCircle, X, Search } from 'lucide-react';
import { nodeDocumentation, canvasControls, type NodeDocumentation } from '@/lib/nodeDocumentation';

interface HelpPanelProps {
    isOpen: boolean;
    onToggle: (open: boolean) => void;
}

export function HelpPanel({ isOpen, onToggle }: HelpPanelProps) {
    const [activeTab, setActiveTab] = useState<'canvas' | 'nodes'>('canvas');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredNodes = Object.entries(nodeDocumentation).filter(([_key, doc]) =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) {
        return (
            <button
                onClick={() => onToggle(true)}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xl transition-all active:scale-95 border border-blue-400/30 ring-1 ring-blue-900/20 group"
                title="Show help"
            >
                <HelpCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </button>
        );
    }

    return (
        <div className="w-96 bg-[#0f172a] rounded-2xl shadow-2xl border border-[#1e293b] overflow-hidden flex flex-col max-h-[600px]">
            {/* Header */}
            <div className="bg-[#1e293b]/50 px-4 py-3.5 flex items-center justify-between border-b border-[#1e293b]">
                <h3 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-400" />
                    Quick Guide
                </h3>
                <button
                    onClick={() => onToggle(false)}
                    className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('canvas')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'canvas'
                            ? 'bg-slate-900 text-white border-b-2 border-blue-500'
                            : 'text-slate-400 hover:bg-slate-700'
                        }`}
                >
                    Canvas Controls
                </button>
                <button
                    onClick={() => setActiveTab('nodes')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'nodes'
                            ? 'bg-slate-900 text-white border-b-2 border-blue-500'
                            : 'text-slate-400 hover:bg-slate-700'
                        }`}
                >
                    Node Guide
                </button>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto p-4">
                {activeTab === 'canvas' ? (
                    <CanvasGuide />
                ) : (
                    <>
                        {/* Search */}
                        <div className="mb-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search nodes..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-sm"
                                />
                            </div>
                        </div>

                        {/* Node Documentation */}
                        <NodeGuide nodes={filteredNodes} />
                    </>
                )}
            </div>
        </div>
    );
}

function CanvasGuide() {
    return (
        <div className="space-y-4">
            {canvasControls.sections.map((section) => (
                <div key={section.category}>
                    <h4 className="text-white font-semibold text-sm mb-2">{section.category}</h4>
                    <div className="space-y-2">
                        {section.controls.map((control, idx) => (
                            <div key={idx} className="flex justify-between items-start text-xs">
                                <span className="text-slate-300">{control.action}</span>
                                <span className="text-slate-500 font-mono text-right ml-2">{control.keys}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function NodeGuide({ nodes }: { nodes: [string, NodeDocumentation][] }) {
    const [expandedNode, setExpandedNode] = useState<string | null>(null);

    return (
        <div className="space-y-2">
            {nodes.map(([key, doc]) => (
                <div key={key} className="bg-slate-900 rounded border border-slate-700 overflow-hidden">
                    <button
                        onClick={() => setExpandedNode(expandedNode === key ? null : key)}
                        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-800 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-white font-medium text-sm">{doc.name}</span>
                            {doc.isStartNode && (
                                <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                    Start
                                </span>
                            )}
                            {doc.isEndNode && (
                                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                                    End
                                </span>
                            )}
                        </div>
                        <span className="text-slate-500 text-xs">{doc.category}</span>
                    </button>

                    {expandedNode === key && (
                        <div className="px-3 pb-3 space-y-2 border-t border-slate-700 pt-2">
                            <p className="text-slate-300 text-xs">{doc.description}</p>

                            {doc.inputs.length > 0 && (
                                <div>
                                    <h5 className="text-slate-400 text-xs font-semibold mb-1">Inputs:</h5>
                                    <ul className="space-y-1">
                                        {doc.inputs.map((input, idx) => (
                                            <li key={idx} className="text-slate-500 text-xs flex items-center gap-2">
                                                <span className="text-blue-400">→</span>
                                                {input.name} <span className="text-slate-600">({input.type})</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {doc.outputs.length > 0 && (
                                <div>
                                    <h5 className="text-slate-400 text-xs font-semibold mb-1">Outputs:</h5>
                                    <ul className="space-y-1">
                                        {doc.outputs.map((output, idx) => (
                                            <li key={idx} className="text-slate-500 text-xs flex items-center gap-2">
                                                <span className="text-green-400">→</span>
                                                {output.name} <span className="text-slate-600">({output.type})</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {Object.keys(doc.config).length > 0 && (
                                <div>
                                    <h5 className="text-slate-400 text-xs font-semibold mb-1">Configuration:</h5>
                                    <ul className="space-y-1">
                                        {Object.entries(doc.config).map(([key, desc]) => (
                                            <li key={key} className="text-slate-500 text-xs">
                                                <span className="text-yellow-400 font-mono">{key}:</span> {desc}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="pt-2 mt-2 border-t border-slate-700">
                                <p className="text-slate-500 text-xs italic">💡 {doc.example}</p>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {nodes.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No nodes found matching your search.</p>
            )}
        </div>
    );
}
