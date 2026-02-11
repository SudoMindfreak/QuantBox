'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

import { AIAssistantPanel } from '@/components/editor/AIAssistantPanel';
import { SimulationDashboard } from '@/components/dashboard/SimulationDashboard';
import { Navbar } from '@/components/Navbar';
import { SettingsModal } from '@/components/editor/SettingsModal';
import { generateStrategy } from '@/lib/llm';

export default function EditorPage() {
  const [pythonCode, setPythonCode] = useState<string | null>(null);
  const [marketSlug, setMarketSlug] = useState<string>('btc-updown-15m-1770311700');
  const [strategyName, setStrategyName] = useState('New Agent');
  const [isRunning, setIsRunning] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Wallet / Portfolio State
  const [walletBalance, setWalletBalance] = useState(1000);
  const [positions, setPositions] = useState<any[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [marketTitle, setMarketTitle] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);

  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    if (id && id !== 'new') {
      fetchStrategyData(id);
    }
  }, [id]);

  const fetchStrategyData = async (strategyId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${strategyId}`);
      if (!response.ok) throw new Error('Failed to fetch agent');

      const data = await response.json();
      setStrategyName(data.name || 'Agent');
      setPythonCode(data.pythonCode || null);
      setMarketSlug(data.marketSlug || 'btc-updown-15m-1770311700');

      if (data.marketSlug) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/markets/resolve?input=${data.marketSlug}`)
          .then(res => res.json())
          .then(marketData => {
            if (marketData.question) setMarketTitle(marketData.question);
          })
          .catch(() => setMarketTitle(data.marketSlug));
      }
    } catch (error) {
      toast.error('Failed to load agent');
    }
  };

  useEffect(() => {
    if (!id || id === 'new') return;
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('subscribe:strategy', id));
    socket.on('strategy:wallet', (data: any) => {
      setWalletBalance(data.balance);
      setPositions(data.positions);
      setTotalPnL(data.pnl.total);
    });
    return () => { socket.disconnect(); };
  }, [id]);

  const handleAIGenerate = async (prompt: string) => {
    try {
      const aiContext = pythonCode ? `CURRENT_CODE:\n${pythonCode}` : "New Strategy";
      const result = await generateStrategy(prompt, aiContext);
      if (typeof result === 'string') {
        setPythonCode(result);
        await handleSave(result);
        toast.success('Agent logic updated');
      }
    } catch (error: any) {
      toast.error(`AI Error: ${error.message}`);
      throw error;
    }
  };

  const handleRun = async () => {
    if (!id) return;
    try {
      await handleSave(pythonCode); 
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}/start`, { method: 'POST' });
      if (res.ok) setIsRunning(true);
    } catch (err) {
      toast.error('Engine error');
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}/stop`, { method: 'POST' });
      if (res.ok) setIsRunning(false);
    } catch (err) {
      toast.error('Shutdown failed');
    }
  };

  const handleSave = async (codeOverride?: string | null) => {
    const payload = {
      name: strategyName,
      pythonCode: codeOverride !== undefined ? codeOverride : pythonCode,
      marketSlug,
    };
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {}
  };

  return (
    <div className="h-screen flex flex-col bg-[#030303] text-slate-200 overflow-hidden font-sans selection:bg-[#3ecf8e]/20">
      
      <Navbar isScrolled={true} onSettingsOpen={() => setIsSettingsOpen(true)} />

      {/* 2. Main Workspace */}
      <main className="flex-1 flex pt-14 relative overflow-hidden">
        
        {/* Left: AI Intelligence */}
        <aside className="w-[380px] shrink-0 border-r border-white/[0.05] bg-[#171717] z-20">
            <AIAssistantPanel onGenerate={handleAIGenerate} />
        </aside>

        {/* Right: The Surface (Dashboard) */}
        <div className="flex-1 bg-[#030303] relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e293b_0%,transparent_50%)] opacity-20 pointer-events-none" />
            <div className="flex-1 p-8 min-h-0">
                <SimulationDashboard 
                    strategyId={id}
                    isRunning={isRunning}
                    onRun={handleRun}
                    onStop={handleStop}
                    marketTitle={marketTitle}
                    balance={walletBalance}
                    positions={positions}
                    totalPnL={totalPnL}
                />
            </div>
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}