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

export function ScheduleTriggerNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="blue">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⏱️</span>
                <div>
                    <div className="text-white font-bold text-sm">Schedule</div>
                    <div className="text-blue-300 text-[10px]">Interval: {(data as any).interval || '1m'}</div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-400 !border-2 !border-blue-200" />
        </BaseNode>
    );
}

// --- Data Nodes ---

export function OrderbookSnapshotNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="purple">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-purple-400 !border-2 !border-purple-200" />
            <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <div>
                    <div className="text-white font-bold text-sm">Orderbook</div>
                    <div className="text-purple-300 text-[10px]">Fetch Prices</div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-purple-400 !border-2 !border-purple-200" />
        </BaseNode>
    );
}

export function UpDownStrikeNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="orange">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-orange-400 !border-2 !border-orange-200" />
            <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <div>
                    <div className="text-white font-bold text-sm">Strike Price</div>
                    <div className="text-orange-300 text-[10px]">Fetch Open Price</div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-orange-400 !border-2 !border-orange-200" />
        </BaseNode>
    );
}

// --- Condition Nodes ---

export function ImbalanceCheckNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    const outcome = (data as any).outcome || 'UP';
    return (
        <BaseNode selected={selected} status={status} color="orange">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-orange-400 !border-2 !border-orange-200" />
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚖️</span>
                <div>
                    <div className="text-white font-bold text-sm">Imbalance Check</div>
                    <div className="text-orange-300 text-[10px]">{(data as any).ratio || 1.5}x ({outcome})</div>
                </div>
            </div>
            <div className="flex flex-col gap-4 mt-2">
                <div className="relative flex justify-end items-center h-4">
                    <span className="text-[9px] font-black text-green-400 uppercase mr-4">Trigger</span>
                    <Handle type="source" position={Position.Right} id="buy" className="w-3 h-3 !bg-green-500 !border-2 !border-green-200" />
                </div>
            </div>
        </BaseNode>
    );
}

export function StrikeMomentumNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    const liveSpot = (data as any).liveSpot;
    const threshold = (data as any).threshold;
    const diff = (data as any).diff;

    return (
        <BaseNode selected={selected} status={status} color="blue">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-blue-400 !border-2 !border-blue-200" />
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🌊</span>
                <div>
                    <div className="text-white font-bold text-sm">Strike Momentum</div>
                    <div className="text-blue-300 text-[10px]">K: {(data as any).volatilityK || 0.6}</div>
                </div>
            </div>

            {liveSpot && (
                <div className="mt-2 mb-3 bg-slate-950/50 rounded-lg p-2 border border-blue-500/20">
                    <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-slate-500 font-bold uppercase">Spot Gap</span>
                        <span className={`font-mono ${Math.abs(diff) > threshold ? 'text-emerald-400' : 'text-blue-400'}`}>
                            {diff > 0 ? '+' : '-'}${Math.abs(diff).toFixed(2)}
                        </span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-500" 
                            style={{ width: `${Math.min(100, (Math.abs(diff) / threshold) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-4">
                <div className="relative flex justify-end items-center h-4">
                    <span className="text-[9px] font-black text-green-400 uppercase mr-4">Bullish (UP)</span>
                    <Handle type="source" position={Position.Right} id="bullish" className="w-3 h-3 !bg-green-500 !border-2 !border-green-200" />
                </div>
                <div className="relative flex justify-end items-center h-4">
                    <span className="text-[9px] font-black text-rose-400 uppercase mr-4">Bearish (DOWN)</span>
                    <Handle type="source" position={Position.Right} id="bearish" className="w-3 h-3 !bg-rose-500 !border-2 !border-rose-200" />
                </div>
            </div>
        </BaseNode>
    );
}

// --- Action Nodes ---

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

export function LogActionNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="slate">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-slate-400 !border-2 !border-slate-200" />
            <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <div>
                    <div className="text-white font-bold text-sm">Log Output</div>
                    <div className="text-slate-300 text-[10px] truncate max-w-[140px]">{(data as any).message || 'Log message...'}</div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-slate-400 !border-2 !border-slate-200" />
        </BaseNode>
    );
}

// --- Utility Nodes ---

export function PositionManagerNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    const outcome = (data as any).outcome || 'UP';
    return (
        <BaseNode selected={selected} status={status} color="yellow">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-yellow-400 !border-2 !border-yellow-200" />
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🛡️</span>
                <div>
                    <div className="text-white font-bold text-sm">Position Shield</div>
                    <div className="text-yellow-300 text-[10px]">Monitoring: {outcome}</div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} id="exit" className="w-3 h-3 !bg-rose-500 !border-2 !border-rose-200" />
        </BaseNode>
    );
}

export function MemoryNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="slate">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🧠</span>
                    <div>
                        <div className="text-white font-bold text-sm">Value Memory</div>
                        <div className="text-slate-400 text-[10px]">Stored: {(data as any).storedValue || '---'}</div>
                    </div>
                </div>
            </div>
            <Handle type="target" position={Position.Left} id="value" style={{ top: '30%' }} className="w-2.5 h-2.5 !bg-blue-400 !border-2" />
            <Handle type="target" position={Position.Left} id="trigger" style={{ top: '70%' }} className="w-2.5 h-2.5 !bg-yellow-400 !border-2" />
            <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-500 !border-2" />
        </BaseNode>
    );
}

export function PriceChangeNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="purple">
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-purple-400 !border-2 !border-purple-200" />
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📊</span>
                <div className="text-white font-bold text-sm">Change %</div>
            </div>
            <div className="flex flex-col gap-4 mt-2">
                <div className="relative flex justify-start items-center h-4 ml-4">
                    <Handle type="target" position={Position.Left} id="a" className="w-2.5 h-2.5 !bg-slate-400" style={{ left: -20, top: '50%' }} />
                    <span className="text-[9px] font-black text-slate-500 uppercase">Val A</span>
                </div>
                <div className="relative flex justify-start items-center h-4 ml-4">
                    <Handle type="target" position={Position.Left} id="b" className="w-2.5 h-2.5 !bg-slate-400" style={{ left: -20, top: '50%' }} />
                    <span className="text-[9px] font-black text-slate-500 uppercase">Val B</span>
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-purple-500 !border-2" />
        </BaseNode>
    );
}

// --- Export Type Mapping ---

export const nodeTypes = {
    marketDetector: MarketDetectorNode,
    schedule: ScheduleTriggerNode,
    scheduleTrigger: ScheduleTriggerNode,
    orderbookSnapshot: OrderbookSnapshotNode,
    upDownStrike: UpDownStrikeNode,
    imbalanceCheck: ImbalanceCheckNode,
    strikeMomentum: StrikeMomentumNode,
    buyAction: BuyActionNode,
    sellAction: SellActionNode,
    logAction: LogActionNode,
    logEvent: LogActionNode,
    positionManager: PositionManagerNode,
    memory: MemoryNode,
    priceChange: PriceChangeNode,
};
