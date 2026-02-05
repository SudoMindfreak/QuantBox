'use client';

import { X } from 'lucide-react';
import type { Node } from '@xyflow/react';

interface ConfigPanelProps {
    node: Node;
    onUpdate: (nodeId: string, data: any) => void;
    onClose: () => void;
}

export function ConfigPanel({ node, onUpdate, onClose }: ConfigPanelProps) {
    return (
        <div className="w-80 bg-slate-800 border-l border-slate-700 overflow-y-auto">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Node Configuration</h2>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Node Type</label>
                    <div className="px-3 py-2 bg-slate-900 text-white rounded text-sm border border-slate-700">
                        {node.type}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Node ID</label>
                    <div className="px-3 py-2 bg-slate-900 text-slate-500 rounded text-xs font-mono border border-slate-700">
                        {node.id}
                    </div>
                </div>

                {/* Dynamic configuration based on node type */}
                {node.type === 'marketDetector' && (
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            Polymarket Event URL
                        </label>
                        <input
                            type="text"
                            defaultValue={(node.data as any)?.baseSlug || 'https://polymarket.com/event/btc-updown-15m-1770283800'}
                            onChange={(e) => onUpdate(node.id, { baseSlug: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 text-white rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-sm"
                            placeholder="e.g., https://polymarket.com/event/..."
                        />
                    </div>
                )}

                {node.type === 'buyAction' && (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Quantity
                            </label>
                            <input
                                type="number"
                                defaultValue={(node.data as any)?.quantity || 100}
                                onChange={(e) => onUpdate(node.id, { quantity: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-slate-900 text-white rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Price Limit (optional)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                defaultValue={(node.data as any)?.priceLimit}
                                onChange={(e) => onUpdate(node.id, { priceLimit: e.target.value ? Number(e.target.value) : null })}
                                className="w-full px-3 py-2 bg-slate-900 text-white rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-sm"
                                placeholder="Leave empty for market price"
                            />
                        </div>
                    </>
                )}

                {node.type === 'sellAction' && (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Quantity
                            </label>
                            <input
                                type="number"
                                defaultValue={(node.data as any)?.quantity || 100}
                                onChange={(e) => onUpdate(node.id, { quantity: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-slate-900 text-white rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Price Limit (optional)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                defaultValue={(node.data as any)?.priceLimit}
                                onChange={(e) => onUpdate(node.id, { priceLimit: e.target.value ? Number(e.target.value) : null })}
                                className="w-full px-3 py-2 bg-slate-900 text-white rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-sm"
                                placeholder="Leave empty for market price"
                            />
                        </div>
                    </>
                )}

                {node.type === 'meanReversion' && (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Threshold Deviation (%)
                            </label>
                            <input
                                type="number"
                                defaultValue={(node.data as any)?.threshold || 5}
                                onChange={(e) => onUpdate(node.id, { threshold: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-slate-900 text-white rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Historical Window
                            </label>
                            <select
                                defaultValue={(node.data as any)?.window || '30min'}
                                onChange={(e) => onUpdate(node.id, { window: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-900 text-white rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-sm"
                            >
                                <option value="15min">15 minutes</option>
                                <option value="30min">30 minutes</option>
                                <option value="1hour">1 hour</option>
                            </select>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
