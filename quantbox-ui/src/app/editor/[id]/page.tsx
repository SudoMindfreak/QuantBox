'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

import { OnboardingWizard } from '@/components/editor/OnboardingWizard';
import { AIAssistantPanel } from '@/components/editor/AIAssistantPanel';
import { SimulationDashboard } from '@/components/dashboard/SimulationDashboard';
import { generateStrategy } from '@/lib/llm';

export type MarketContext = '15m' | '1h' | '4h' | 'generic';

export default function EditorPage() {
  const [pythonCode, setPythonCode] = useState<string | null>(null);
  const [strategyName, setStrategyName] = useState('My Strategy');
  const [initialBalance, setInitialBalance] = useState(1000);
  const [isRunning, setIsRunning] = useState(false);
  
  // Wallet / Portfolio State
  const [walletBalance, setWalletBalance] = useState(1000);
  const [positions, setPositions] = useState<any[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [context, setContext] = useState<MarketContext>('15m');
  const [marketTitle, setMarketTitle] = useState<string>('');
  const [showWizard, setShowWizard] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  // 1. Initial State & Wizard Trigger
  useEffect(() => {
    if (id === 'new') {
      setShowWizard(true);
    } else if (id) {
      setShowWizard(false);
      fetchStrategyData(id);
    }
  }, [id]);

  // 2. Strategy Data Fetching
  const fetchStrategyData = async (strategyId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${strategyId}`);
      if (!response.ok) throw new Error('Failed to fetch strategy');

      const data = await response.json();
      setStrategyName(data.name || 'My Strategy');
      setInitialBalance(data.initialBalance || 1000);
      setPythonCode(data.pythonCode || null);

      // Fetch market title if available (from legacy node or python meta?)
      // For now, hardcode or try to parse
      setMarketTitle('Bitcoin > $100k by 2026?'); // Placeholder
    } catch (error) {
      console.error('Error loading strategy:', error);
      toast.error('Failed to load strategy details');
    }
  };

  // 3. Socket.io for Real-time Updates
  useEffect(() => {
    if (!id || id === 'new') return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(socketUrl, { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe:strategy', id);
    });

    socket.on('strategy:wallet', (data: any) => {
      setWalletBalance(data.balance);
      setPositions(data.positions);
      setTotalPnL(data.pnl.total);
    });

    socket.on('strategy:market:changed', ({ market }: { market: any }) => {
      setMarketTitle(market.question);
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  // 4. AI & Wizard Handlers
  const handleWizardComplete = async (config: any) => {
    setStrategyName(config.name);
    setContext(config.context);
    setShowWizard(false);

    let code = null;

    if (config.useAi && config.prompt) {
      const loadingToast = toast.loading('AI is building your strategy...');
      try {
        const apiKey = localStorage.getItem('QUANTBOX_LLM_KEY') || '';
        const result = await generateStrategy(config.prompt, apiKey);
        if (typeof result === 'string') {
            code = result;
            toast.success('Strategy built successfully!');
        }
        toast.dismiss(loadingToast);
      } catch (error) {
        toast.dismiss(loadingToast);
        toast.error('AI generation failed.');
      }
    }

    const payload = {
      name: config.name,
      initialBalance: 1000,
      pythonCode: code,
      status: 'draft'
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.id) {
        router.replace(`/editor/${data.id}`);
      }
    } catch (error) {
      toast.error('Failed to initialize strategy');
    }
  };

  const handleAIGenerate = async (prompt: string) => {
    const apiKey = localStorage.getItem('QUANTBOX_LLM_KEY');
    if (!apiKey) {
      toast.error('AI API Key not found.');
      return;
    }

    try {
      const aiContext = pythonCode ? `CURRENT_CODE:\n${pythonCode}\n\nMARKET_CONTEXT: ${context}` : context;
      const result = await generateStrategy(prompt, aiContext);
      if (typeof result === 'string') {
        setPythonCode(result);
        // Auto-save the update
        await handleSave(result);
        toast.success('Strategy updated');
      }
    } catch (error: any) {
      toast.error(`AI Error: ${error.message}`);
      throw error;
    }
  };

  // 5. Actions
  const handleRun = async () => {
    if (!id || id === 'new') return;
    try {
      // Ensure latest code is saved before running
      await handleSave(pythonCode); 
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}/start`, { method: 'POST' });
      if (res.ok) {
        setIsRunning(true);
        toast.success('Simulation started');
      }
    } catch (err) {
      toast.error('Failed to start strategy');
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}/stop`, { method: 'POST' });
      if (res.ok) {
        setIsRunning(false);
        toast.info('Simulation stopped');
      }
    } catch (err) {
      toast.error('Failed to stop strategy');
    }
  };

  const handleSave = async (codeOverride?: string | null) => {
    const payload = {
      name: strategyName,
      initialBalance,
      pythonCode: codeOverride !== undefined ? codeOverride : pythonCode,
    };

    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}`;
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      toast.error('Save failed');
    }
  };

  return (
    <div className="h-screen flex bg-[#09090b] text-slate-200 overflow-hidden font-sans">
      
      {/* Left Sidebar: AI Builder */}
      <aside className="w-[400px] shrink-0 z-20 shadow-2xl">
        <AIAssistantPanel onGenerate={handleAIGenerate} />
      </aside>

      {/* Main Content: Simulation Dashboard */}
      <div className="flex-1 flex flex-col min-w-0 bg-black">
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

      {showWizard && <OnboardingWizard onComplete={handleWizardComplete} onClose={() => router.push('/')} />}
    </div>
  );
}
