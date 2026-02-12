'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Square, Trash2, AlertCircle } from 'lucide-react';
import { SimulationDashboard } from '@/components/dashboard/SimulationDashboard';
import { Navbar } from '@/components/Navbar';
import { Strategy, Position, Trade } from '@/lib/types';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const strategyId = params.id as string;

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [balance, setBalance] = useState(1000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Load strategy
  useEffect(() => {
    const loadStrategy = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${strategyId}`
        );
        if (!response.ok) throw new Error('Failed to load strategy');
        const data = await response.json();
        setStrategy(data);
        setBalance(data.initialBalance);
      } catch (error) {
        toast.error('Failed to load strategy');
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (strategyId) loadStrategy();
  }, [strategyId, router]);

  // WebSocket connection
  useEffect(() => {
    if (!strategyId || !isRunning) return;

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

    newSocket.on('connect', () => {
      newSocket.emit('subscribe:strategy', strategyId);
      console.log('WebSocket connected for strategy:', strategyId);
    });

    newSocket.on('strategy:wallet', (wallet: any) => {
      setBalance(wallet.balance);
      setPositions(wallet.positions || []);
      setTotalPnL(wallet.realizedPnL + wallet.unrealizedPnL);
    });

    newSocket.on('strategy:trade', (trade: any) => {
      setTrades((prev) => [{ ...trade, id: Date.now().toString() }, ...prev]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('unsubscribe:strategy', strategyId);
      newSocket.disconnect();
    };
  }, [strategyId, isRunning]);

  const handleRun = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${strategyId}/start`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Failed to start');
      setIsRunning(true);
      toast.success('Strategy started!');
    } catch (error) {
      toast.error('Failed to start strategy');
    }
  };

  const handleStop = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${strategyId}/stop`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Failed to stop');
      setIsRunning(false);
      toast.success('Strategy stopped');
    } catch (error) {
      toast.error('Failed to stop strategy');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this strategy? This cannot be undone.')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${strategyId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        toast.success('Strategy deleted');
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error('Failed to delete strategy');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1c1c1c] flex items-center justify-center">
        <div className="text-slate-400 text-sm font-black uppercase tracking-widest animate-pulse">
          Loading strategy...
        </div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="min-h-screen bg-[#1c1c1c] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <p className="text-white font-bold mb-2">Strategy not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[#3ecf8e] text-sm font-bold uppercase tracking-widest hover:text-[#30b47b]"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-slate-200 font-sans">
      {/* Grid Background */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <Navbar isScrolled={true} onSettingsOpen={() => { }} />

      <div className="container mx-auto px-8 pt-32 pb-20 max-w-7xl relative z-10">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm font-bold uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2 uppercase">
                {strategy.name}
              </h1>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">
                {strategy.description || 'AI-powered trading strategy'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Simulation Dashboard */}
        <div className="h-[calc(100vh-280px)]">
          <SimulationDashboard
            strategyId={strategyId}
            isRunning={isRunning}
            onRun={handleRun}
            onStop={handleStop}
            marketTitle={strategy.marketSlug.toUpperCase().replace(/-/g, ' ')}
            balance={balance}
            positions={positions}
            totalPnL={totalPnL}
          />
        </div>
      </div>
    </div>
  );
}