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
        <div className={`px-4 py-3 rounded-lg border-2 transition-all duration-300 bg-gradient-to-br ${colorClasses[color]} ${statusClasses[status]}`}>
            {children}
        </div>
    );
}

export function MarketDetectorNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="blue">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📡</span>
                <div>
                    <div className="text-white font-semibold text-sm">Market Detector</div>
                    <div className="text-blue-300 text-xs truncate max-w-[150px]" title={(data as any).baseSlug || 'btc-updown-15m'}>
                        {((data as any).baseSlug || 'btc-updown-15m').replace('https://polymarket.com/event/', '')}
                    </div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 border-2 border-blue-300" />
        </BaseNode>
    );
}

export function OrderbookSnapshotNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="purple">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500 border-2 border-purple-300" />
            <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <div>
                    <div className="text-white font-semibold text-sm">Orderbook</div>
                    <div className="text-purple-300 text-xs">Fetch current prices</div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500 border-2 border-purple-300" />
        </BaseNode>
    );
}

export function ImbalanceCheckNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="orange">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-orange-500 border-2 border-orange-300" />
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚖️</span>
                <div>
                    <div className="text-white font-semibold text-sm">Imbalance</div>
                    <div className="text-orange-300 text-xs">{(data as any).ratio || 1.5}x / {(data as any).window || '30s'}</div>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <Handle type="source" position={Position.Right} id="buy" className="w-3 h-3 bg-green-500 border-2 border-green-300" style={{ top: '60%' }} />
                <Handle type="source" position={Position.Right} id="sell" className="w-3 h-3 bg-red-500 border-2 border-red-300" style={{ top: '80%' }} />
            </div>
        </BaseNode>
    );
}

export function BuyActionNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="green">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-green-500 border-2 border-green-300" />
            <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <div>
                    <div className="text-white font-semibold text-sm">Buy</div>
                    <div className="text-green-300 text-xs">Qty: {(data as any).quantity || 100}</div>
                </div>
            </div>
        </BaseNode>
    );
}

export function LogActionNode({ data, selected }: NodeProps) {
    const status = (data as any).executionStatus || 'idle';
    return (
        <BaseNode selected={selected} status={status} color="slate">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-500 border-2 border-slate-300" />
            <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <div>
                    <div className="text-white font-semibold text-sm">Log</div>
                    <div className="text-slate-300 text-xs truncate max-w-[150px]">{(data as any).message || 'Log data...'}</div>
                </div>
            </div>
        </BaseNode>
    );
}

export const nodeTypes = {
    marketDetector: MarketDetectorNode,
    orderbookSnapshot: OrderbookSnapshotNode,
    imbalanceCheck: ImbalanceCheckNode,
    buyAction: BuyActionNode,
    logAction: LogActionNode,
};