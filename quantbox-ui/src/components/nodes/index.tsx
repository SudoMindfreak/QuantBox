'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Radio } from 'lucide-react';

export function MarketDetectorNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`px-4 py-3 rounded-lg border-2 transition-all ${selected
                ? 'border-blue-500 shadow-lg shadow-blue-500/50'
                : 'border-blue-600 shadow-md'
                } bg-gradient-to-br from-blue-900 to-blue-800`}
        >
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📡</span>
                <div>
                    <div className="text-white font-semibold text-sm">Market Detector</div>
                    <div className="text-blue-300 text-xs truncate max-w-[150px]" title={(data as any).baseSlug || 'https://polymarket.com/event/...'}>
                        {((data as any).baseSlug || 'btc-updown-15m').replace('https://polymarket.com/event/', '')}
                    </div>
                </div>
            </div>
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-blue-500 border-2 border-blue-300"
            />
        </div>
    );
}

export function OrderbookSnapshotNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`px-4 py-3 rounded-lg border-2 transition-all ${selected
                ? 'border-purple-500 shadow-lg shadow-purple-500/50'
                : 'border-purple-600 shadow-md'
                } bg-gradient-to-br from-purple-900 to-purple-800`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-purple-500 border-2 border-purple-300"
            />
            <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <div>
                    <div className="text-white font-semibold text-sm">Orderbook Snapshot</div>
                    <div className="text-purple-300 text-xs">Fetch current prices</div>
                </div>
            </div>
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-purple-500 border-2 border-purple-300"
            />
        </div>
    );
}

export function MeanReversionNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`px-4 py-3 rounded-lg border-2 transition-all ${selected
                ? 'border-yellow-500 shadow-lg shadow-yellow-500/50'
                : 'border-yellow-600 shadow-md'
                } bg-gradient-to-br from-yellow-900 to-yellow-800`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-yellow-500 border-2 border-yellow-300"
            />
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📉</span>
                <div>
                    <div className="text-white font-semibold text-sm">Mean Reversion</div>
                    <div className="text-yellow-300 text-xs">
                        {(data as any).threshold || 5}% / {(data as any).window || '30min'}
                    </div>          </div>
            </div>
            <div className="flex gap-2">
                <Handle
                    type="source"
                    position={Position.Right}
                    id="buy"
                    className="w-3 h-3 bg-green-500 border-2 border-green-300"
                    style={{ top: '60%' }}
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    id="sell"
                    className="w-3 h-3 bg-red-500 border-2 border-red-300"
                    style={{ top: '80%' }}
                />
            </div>
        </div>
    );
}

export function BuyActionNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`px-4 py-3 rounded-lg border-2 transition-all ${selected
                ? 'border-green-500 shadow-lg shadow-green-500/50'
                : 'border-green-600 shadow-md'
                } bg-gradient-to-br from-green-900 to-green-800`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-green-500 border-2 border-green-300"
            />
            <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <div>
                    <div className="text-white font-semibold text-sm">Buy Shares</div>
                    <div className="text-green-300 text-xs">Qty: {(data as any).quantity || 100}</div>
                </div>
            </div>
        </div>
    );
}

export function SellActionNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`px-4 py-3 rounded-lg border-2 transition-all ${selected
                ? 'border-red-500 shadow-lg shadow-red-500/50'
                : 'border-red-600 shadow-md'
                } bg-gradient-to-br from-red-900 to-red-800`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-red-500 border-2 border-red-300"
            />
            <div className="flex items-center gap-2">
                <span className="text-xl">💸</span>
                <div>
                    <div className="text-white font-semibold text-sm">Sell Shares</div>
                    <div className="text-red-300 text-xs">Qty: {(data as any).quantity || 100}</div>
                </div>
            </div>
        </div>
    );
}

// Export node types for React Flow
export function ImbalanceCheckNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`px-4 py-3 rounded-lg border-2 transition-all ${selected
                ? 'border-orange-500 shadow-lg shadow-orange-500/50'
                : 'border-orange-600 shadow-md'
                } bg-gradient-to-br from-orange-900 to-orange-800`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-orange-500 border-2 border-orange-300"
            />
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚖️</span>
                <div>
                    <div className="text-white font-semibold text-sm">Imbalance Check</div>
                    <div className="text-orange-300 text-xs">
                        {(data as any).ratio || 1.5}x / {(data as any).window || '30s'}
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                <Handle
                    type="source"
                    position={Position.Right}
                    id="buy"
                    className="w-3 h-3 bg-green-500 border-2 border-green-300"
                    style={{ top: '60%' }}
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    id="sell"
                    className="w-3 h-3 bg-red-500 border-2 border-red-300"
                    style={{ top: '80%' }}
                />
            </div>
        </div>
    );
}

export function LogActionNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`px-4 py-3 rounded-lg border-2 transition-all ${selected
                ? 'border-slate-500 shadow-lg shadow-slate-500/50'
                : 'border-slate-600 shadow-md'
                } bg-gradient-to-br from-slate-800 to-slate-700`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-slate-500 border-2 border-slate-300"
            />
            <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <div>
                    <div className="text-white font-semibold text-sm">Log</div>
                    <div className="text-slate-300 text-xs truncate max-w-[150px]">
                        {(data as any).message || 'Log data...'}
                    </div>
                </div>
            </div>
        </div>
    );
}
export const nodeTypes = {
    marketDetector: MarketDetectorNode,
    orderbookSnapshot: OrderbookSnapshotNode,
    meanReversion: MeanReversionNode,
    buyAction: BuyActionNode,
    sellAction: SellActionNode,
    imbalanceCheck: ImbalanceCheckNode,
    logAction: LogActionNode,
    // Add more node types as needed
};
