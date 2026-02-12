'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PnLDataPoint } from '@/lib/types';
import { TrendingUp } from 'lucide-react';

interface PnLChartProps {
    data: PnLDataPoint[];
    initialBalance: number;
}

export function PnLChart({ data, initialBalance }: PnLChartProps) {
    const chartData = useMemo(() => {
        if (data.length === 0) {
            return [
                {
                    timestamp: new Date().toISOString(),
                    balance: initialBalance,
                    totalPnL: 0,
                },
            ];
        }

        return data.map((point) => ({
            timestamp: new Date(point.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            }),
            balance: point.balance,
            totalPnL: point.realizedPnL + point.unrealizedPnL,
        }));
    }, [data, initialBalance]);

    const currentPnL = chartData[chartData.length - 1]?.totalPnL || 0;
    const pnlPercent = ((currentPnL / initialBalance) * 100).toFixed(2);

    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-[24px] p-6 shadow-xl h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                        Performance
                    </h3>
                    <div className="flex items-baseline gap-3">
                        <div className="text-2xl font-black text-white font-mono">
                            ${chartData[chartData.length - 1]?.balance.toFixed(2)}
                        </div>
                        <div
                            className={`flex items-center gap-1 text-sm font-bold ${currentPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                        >
                            <TrendingUp className="w-3 h-3" />
                            {currentPnL >= 0 ? '+' : ''}
                            {pnlPercent}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="timestamp"
                            stroke="#64748b"
                            style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="#64748b"
                            style={{ fontSize: '10px', fontWeight: 'bold' }}
                            tickLine={false}
                            tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#171717',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '12px',
                            }}
                            labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                            itemStyle={{ color: '#3ecf8e', fontSize: '12px', fontWeight: 'bold' }}
                            formatter={(value: any) => [`$${value.toFixed(2)}`, '']}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="balance"
                            name="Balance"
                            stroke="#3ecf8e"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: '#3ecf8e' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="totalPnL"
                            name="Total P&L"
                            stroke="#60a5fa"
                            strokeWidth={2}
                            dot={false}
                            strokeDasharray="5 5"
                            activeDot={{ r: 4, fill: '#60a5fa' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
