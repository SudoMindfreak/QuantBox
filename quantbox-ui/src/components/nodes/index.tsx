'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import React from 'react';

/**
 * Execution Status Types
 */
export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * BaseNode Wrapper for common visual feedback (n8n style)
 */
function BaseNode({
    children,
    selected,
    status = 'idle',
    color = 'blue'
}: {
    children: React.ReactNode;
    selected?: boolean;
    status?: ExecutionStatus;
    color?: 'blue' | 'purple' | 'yellow' | 'green' | 'red' | 'orange' | 'slate';
}) {
    const colorClasses = {
        blue: 'from-blue-900 to-blue-800 border-blue-600',
        purple: 'from-purple-900 to-purple-800 border-purple-600',
        yellow: 'from-yellow-900 to-yellow-800 border-yellow-600',
        green: 'from-green-900 to-green-800 border-green-600',
        red: 'from-red-900 to-red-800 border-red-600',
        orange: 'from-orange-900 to-orange-800 border-orange-600',
        slate: 'from-slate-800 to-slate-700 border-slate-600',
    };

    const statusClasses = {
        idle: selected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 shadow-lg' : 'shadow-md',
        running: 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse',
        success: 'ring-2 ring-green-500 ring-offset-2 ring-offset-slate-900 shadow-[0_0_10px_rgba(34,197,94,0.3)]',
        error: 'ring-2 ring-red-500 ring-offset-2 ring-offset-slate-900 shadow-[0_0_15px_rgba(239,68,68,0.5)]',
    };

    return (
        <div className={`px-4 py-3 rounded-lg border-2 transition-all duration-300 bg-gradient-to-br min-w-[180px] ${colorClasses[color]} ${statusClasses[status]} text-white`}>
            {children}
        </div>
    );
}

// --- Trigger Nodes ---

export function MarketDetectorNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="blue">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📡</span>
                <div>
                    <div className="text-white font-bold text-sm">Market Detector</div>
                    <div className="text-blue-300 text-[10px] truncate max-w-[140px]">
                        {(data as any).baseSlug?.split('/').pop() || 'Select Market...'}
                    </div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-400 !border-2 !border-blue-200" />
        </BaseNode>
    );
}

// --- New Architecture Nodes ---

export function OrderbookNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    const { spread, yesSpread, noSpread } = data as any;

    return (
        <BaseNode selected={selected} status={status} color="purple">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-purple-400 !border-2 !border-purple-200" />
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📖</span>
                <div>
                    <div className="text-white font-bold text-sm">Orderbook</div>
                    <div className="text-purple-300 text-[10px]">Split Yes/No</div>
                </div>
            </div>
            {yesSpread !== undefined && (
                <div className="bg-green-950/30 px-2 py-1 rounded text-[10px] border border-green-800/30 flex justify-between gap-2 mb-1">
                    <span className="text-green-300/80">Yes Spread</span>
                    <span className="font-mono text-white">{(yesSpread * 100).toFixed(1)}¢</span>
                </div>
            )}
            {noSpread !== undefined && (
                <div className="bg-red-950/30 px-2 py-1 rounded text-[10px] border border-red-800/30 flex justify-between gap-2">
                    <span className="text-red-300/80">No Spread</span>
                    <span className="font-mono text-white">{(noSpread * 100).toFixed(1)}¢</span>
                </div>
            )}
            {/* Fallback for legacy spread if needed, but prioritize new ones */}
            {spread !== undefined && yesSpread === undefined && (
                <div className="bg-purple-950/50 px-2 py-1 rounded text-[10px] border border-purple-800/50 flex justify-between gap-2">
                    <span className="text-purple-300">Diff</span>
                    <span className="font-mono text-white">{(spread * 100).toFixed(1)}¢</span>
                </div>
            )}
            <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-purple-400 !border-2 !border-purple-200" />
        </BaseNode>
    );
}

export function PriceNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    const { yes, no } = data as any;

    const yesBid = yes?.bestBid !== undefined ? yes.bestBid.toFixed(2) : '-';
    const yesAsk = yes?.bestAsk !== undefined ? yes.bestAsk.toFixed(2) : '-';
    const noBid = no?.bestBid !== undefined ? no.bestBid.toFixed(2) : '-';
    const noAsk = no?.bestAsk !== undefined ? no.bestAsk.toFixed(2) : '-';

    return (
        <BaseNode selected={selected} status={status} color="blue">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-blue-400 !border-2 !border-blue-200" />
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💲</span>
                <div>
                    <div className="text-white font-bold text-sm">Price</div>
                    <div className="text-blue-300 text-[10px]">Yes/No Feed</div>
                </div>
            </div>

            {(yes || no) && (
                <div className="space-y-1.5 mt-2 mb-1">
                    <div className="bg-green-950/40 p-1.5 rounded border border-green-800/30 flex justify-between items-center">
                        <span className="text-[10px] text-green-400 font-bold">YES</span>
                        <div className="font-mono text-[10px] text-white space-x-1">
                            <span>{yesAsk}</span>
                        </div>
                    </div>

                    <div className="bg-red-950/40 p-1.5 rounded border border-red-800/30 flex justify-between items-center">
                        <span className="text-[10px] text-red-400 font-bold">NO</span>
                        <div className="font-mono text-[10px] text-white space-x-1">
                            <span>{noAsk}</span>
                        </div>
                    </div>
                </div>
            )}

            <Handle
                type="source"
                position={Position.Right}
                id="yes"
                style={{ top: '35%' }}
                className="w-3 h-3 !bg-green-500 !border-2 !border-green-200"
            />
            <Handle
                type="source"
                position={Position.Right}
                id="no"
                style={{ top: '65%' }}
                className="w-3 h-3 !bg-red-500 !border-2 !border-red-200"
            />
        </BaseNode>
    );
}

export function ConditionNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    const conditionType = data?.conditionType || 'threshold';

    return (
        <BaseNode selected={selected} status={status} color="yellow">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-yellow-400 !border-2 !border-yellow-200" />
            <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div>
                    <div className="text-white font-bold text-sm">Condition</div>
                    <div className="text-yellow-300 text-[10px] capitalize">{String(conditionType)}</div>
                </div>
            </div>
            {/* Multiple output handles for true/false paths */}
            <Handle
                type="source"
                position={Position.Right}
                id="true"
                style={{ top: '30%' }}
                className="w-3 h-3 !bg-green-400 !border-2 !border-green-200"
            />
            <Handle
                type="source"
                position={Position.Right}
                id="false"
                style={{ top: '70%' }}
                className="w-3 h-3 !bg-red-400 !border-2 !border-red-200"
            />
        </BaseNode>
    );
}

export function PortfolioNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="slate">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-slate-400 !border-2 !border-slate-200" />
            <div className="flex items-center gap-2">
                <span className="text-xl">💼</span>
                <div>
                    <div className="text-white font-bold text-sm">Portfolio</div>
                    <div className="text-slate-300 text-[10px]">Track P&L</div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-slate-400 !border-2 !border-slate-200" />
        </BaseNode>
    );
}

// --- Logic Nodes ---
export function TimerNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    const seconds = (data as any).seconds || 5;

    return (
        <BaseNode selected={selected} status={status} color="orange">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-orange-400 !border-2 !border-orange-200" />
            <div className="flex items-center gap-2">
                <span className="text-xl">⏱️</span>
                <div>
                    <div className="text-white font-bold text-sm">Timer</div>
                    <div className="text-orange-300 text-[10px]">Wait {seconds}s</div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-orange-400 !border-2 !border-orange-200" />
        </BaseNode>
    );
}


export function BuyActionNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    const outcome = (data as any).outcome || 'UP';
    return (
        <BaseNode selected={selected} status={status} color="green">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-green-500 !border-2 !border-green-200" />
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💰</span>
                <div>
                    <div className="text-white font-bold text-sm">Buy {outcome}</div>
                    <div className="text-green-300 text-[10px]">Qty: {(data as any).quantity || 5}</div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} id="success" className="w-3 h-3 !bg-emerald-400 !border-2 !border-emerald-200" />
        </BaseNode>
    );
}

export function SellActionNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    const outcome = (data as any).outcome || 'UP';
    return (
        <BaseNode selected={selected} status={status} color="red">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-red-500 !border-2 !border-red-200" />
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💸</span>
                <div>
                    <div className="text-white font-bold text-sm">Sell {outcome}</div>
                    <div className="text-red-300 text-[10px]">Qty: {(data as any).quantity || 5}</div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} id="success" className="w-3 h-3 !bg-rose-400 !border-2 !border-rose-200" />
        </BaseNode>
    );
}

// --- Export Type Mapping ---

export const nodeTypes = {
    // Trigger nodes
    marketDetector: MarketDetectorNode,

    // Data Flow nodes
    orderbook: OrderbookNode,
    price: PriceNode,

    // Logic nodes
    condition: ConditionNode,
    timer: TimerNode,
    portfolio: PortfolioNode,

    // Action nodes
    buyAction: BuyActionNode,
    sellAction: SellActionNode,
};
