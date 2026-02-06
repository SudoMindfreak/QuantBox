'use client';

import { X, Info, Settings2, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import type { Node } from '@xyflow/react';
import { nodeDocumentation } from '@/lib/nodeDocumentation';

interface ConfigPanelProps {
    node: Node;
    onUpdate: (nodeId: string, data: any) => void;
    onClose: () => void;
}

export function ConfigPanel({ node, onUpdate, onClose }: ConfigPanelProps) {
    const [showHelp, setShowHelp] = useState(false);
    const doc = nodeDocumentation[node.type as string];

    const handleChange = (key: string, value: any) => {
        onUpdate(node.id, { [key]: value });
    };

    return (
        <div className="w-80 bg-[#0f172a] border-l border-[#1e293b] flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#1e293b] bg-[#0f172a]/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-blue-400" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-widest">Configure Node</h2>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setShowHelp(!showHelp)}
                        className={`p-1 rounded-md transition-colors ${showHelp ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                        title="Help"
                    >
                        <HelpCircle className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-500">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar relative">
                {/* Help Overlay */}
                {showHelp && (
                    <div className="absolute inset-0 z-10 bg-[#0f172a] p-5 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 mb-4 text-blue-400">
                            <HelpCircle className="w-4 h-4" />
                            <h3 className="text-xs font-black uppercase tracking-widest">How it works</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-300 uppercase mb-1">Function</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">{doc?.description}</p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-300 uppercase mb-1">Example Use Case</h4>
                                <p className="text-xs text-slate-500 italic">"{doc?.example}"</p>
                            </div>
                            {node.type === 'strikeMomentum' && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                    <h4 className="text-[10px] font-bold text-blue-300 uppercase mb-1">Math Behind It</h4>
                                    <p className="text-[10px] text-blue-200/70 leading-relaxed">
                                        Calculates the opening price (Strike) of the timeframe candle. 
                                        Threshold = Previous Range × K. 
                                        Triggers when Spot moves more than Threshold away from Strike.
                                    </p>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => setShowHelp(false)}
                            className="w-full mt-8 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold uppercase rounded-lg transition-colors"
                        >
                            Back to Config
                        </button>
                    </div>
                )}

                {/* Info Section */}
                {!showHelp && (
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-1.5 text-blue-400">
                            <Info className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">{doc?.name || node.type}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed italic">
                            {doc?.description || 'No description available for this node.'}
                        </p>
                    </div>
                )}

                {/* Fields Section */}
                {!showHelp && (
                    <div className="space-y-4">
                        {/* Market Detector */}
                        {node.type === 'marketDetector' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Polymarket URL</label>
                                <input 
                                    type="text"
                                    value={(node.data as any)?.baseSlug || ''}
                                    onChange={(e) => handleChange('baseSlug', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                                    placeholder="https://polymarket.com/event/..."
                                />
                            </div>
                        )}

                        {/* Schedule */}
                        {node.type === 'scheduleTrigger' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interval</label>
                                <select 
                                    value={(node.data as any)?.interval || '1m'}
                                    onChange={(e) => handleChange('interval', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="15s">15 Seconds</option>
                                    <option value="1m">1 Minute</option>
                                    <option value="5m">5 Minutes</option>
                                    <option value="15m">15 Minutes</option>
                                </select>
                            </div>
                        )}

                        {/* Imbalance Check */}
                        {node.type === 'imbalanceCheck' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Outcome</label>
                                    <select 
                                        value={(node.data as any)?.outcome || 'UP'}
                                        onChange={(e) => handleChange('outcome', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="UP">UP Token</option>
                                        <option value="DOWN">DOWN Token</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ratio Threshold</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        value={(node.data as any)?.ratio || 1.5}
                                        onChange={(e) => handleChange('ratio', parseFloat(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </>
                        )}

                        {/* Strike Momentum */}
                        {node.type === 'strikeMomentum' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Volatility K</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        value={(node.data as any)?.volatilityK || 0.6}
                                        onChange={(e) => handleChange('volatilityK', parseFloat(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                    <p className="text-[9px] text-slate-600 italic">Multiplier for historical range. Lower = more sensitive.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Min Difference ($)</label>
                                    <input 
                                        type="number"
                                        value={(node.data as any)?.minDiff || 2.0}
                                        onChange={(e) => handleChange('minDiff', parseFloat(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </>
                        )}

                        {/* Position Manager */}
                        {node.type === 'positionManager' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monitor Position</label>
                                    <select 
                                        value={(node.data as any)?.outcome || 'UP'}
                                        onChange={(e) => handleChange('outcome', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="UP">UP Position</option>
                                        <option value="DOWN">DOWN Position</option>
                                        <option value="BOTH">Both (Aggregated)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Take Profit (%)</label>
                                    <input 
                                        type="number"
                                        value={(node.data as any)?.takeProfit || 20}
                                        onChange={(e) => handleChange('takeProfit', parseInt(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stop Loss (%)</label>
                                    <input 
                                        type="number"
                                        value={(node.data as any)?.stopLoss || 10}
                                        onChange={(e) => handleChange('stopLoss', parseInt(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                                    />
                                </div>
                            </>
                        )}

                        {/* Trading Actions */}
                        {(node.type === 'buyAction' || node.type === 'sellAction') && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Outcome</label>
                                    <select 
                                        value={(node.data as any)?.outcome || 'UP'}
                                        onChange={(e) => handleChange('outcome', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="UP">UP</option>
                                        <option value="DOWN">DOWN</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Order Quantity (Shares)</label>
                                    <input 
                                        type="number"
                                        value={(node.data as any)?.quantity || 5}
                                        onChange={(e) => handleChange('quantity', parseInt(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                                    />
                                    <p className="text-[9px] text-slate-600">Total number of outcome shares to trade.</p>
                                </div>
                            </>
                        )}

                        {/* Log */}
                        {node.type === 'logAction' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Terminal Message</label>
                                <input 
                                    type="text"
                                    value={(node.data as any)?.message || ''}
                                    onChange={(e) => handleChange('message', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    placeholder="Momentum Triggered..."
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-[#1e293b] bg-slate-900/30 text-center">
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Changes are auto-applied to local state</span>
            </div>
        </div>
    );
}
