'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NodePalette } from '@/components/editor/NodePalette';
import type { MarketContext } from '@/components/editor/NodePalette';
import { ConfigPanel } from '@/components/editor/ConfigPanel';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { HelpPanel } from '@/components/editor/HelpPanel';
import { LiveOrderbook } from '@/components/editor/LiveOrderbook';
import { LogTerminal } from '@/components/editor/LogTerminal';
import { OnboardingWizard } from '@/components/editor/OnboardingWizard';
import { AIAssistantPanel } from '@/components/editor/AIAssistantPanel';
import { PortfolioPanel } from '@/components/editor/PortfolioPanel';
import { nodeTypes } from '@/components/nodes';
import { io, Socket } from 'socket.io-client';
import { Sparkles } from 'lucide-react';
import { generateStrategy } from '@/lib/llm';

export default function EditorPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [strategyName, setStrategyName] = useState('My Strategy');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [initialBalance, setInitialBalance] = useState(1000);
  const [isOrderbookOpen, setIsOrderbookOpen] = useState(false);
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  // Wallet / Portfolio State
  const [walletBalance, setWalletBalance] = useState(1000);
  const [positions, setPositions] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [context, setContext] = useState<MarketContext>('15m');
  const [marketTitle, setMarketTitle] = useState<string>('');
  const [activeMarketSlug, setActiveMarketSlug] = useState<string | undefined>();
  const [showWizard, setShowWizard] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Track the active market for the Orderbook (Sticky)
  useEffect(() => {
    const detector = nodes.find(n => n.type === 'marketDetector');
    if (selectedNode?.type === 'marketDetector') {
      setActiveMarketSlug((selectedNode.data as any).baseSlug);
    } else if (detector && !activeMarketSlug) {
      setActiveMarketSlug((detector.data as any).baseSlug);
    }
  }, [nodes, selectedNode, activeMarketSlug]);

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
      setStrategyDescription(data.description || '');
      setInitialBalance(data.initialBalance || 1000);

      const loadedNodes = typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes;
      const loadedEdges = typeof data.edges === 'string' ? JSON.parse(data.edges) : data.edges;

      setNodes(loadedNodes || []);
      setEdges(loadedEdges || []);

      // Fetch market title if a marketDetector exists
      const detector = (loadedNodes as any[]).find(n => n.type === 'marketDetector');
      if (detector && detector.data?.baseSlug) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/markets/resolve?input=${detector.data.baseSlug}`)
          .then(res => res.json())
          .then(data => {
            if (data.question) setMarketTitle(data.question);
          })
          .catch(() => {});
      }
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

    socket.on('strategy:node:status', ({ nodeId, status }: { nodeId: string, status: any }) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, executionStatus: status } }
            : node
        )
      );
    });

    socket.on('strategy:node:data', ({ nodeId, data }: { nodeId: string, data: any }) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      );
    });

    socket.on('strategy:wallet', (data: any) => {
      setWalletBalance(data.balance);
      setPositions(data.positions);
      setTotalPnL(data.pnl.total);
    });

    socket.on('strategy:log', (log: any) => {
      // If the log contains trade info (we could emit a specific event, but this works too)
      if (log.message.includes('FILLED')) {
        // Refresh strategy data to get latest history or just prepend
        // For simplicity, let's just trigger a re-fetch of history if we had a separate API, 
        // but here we can just wait for the next wallet update.
      }
    });

    socket.on('strategy:market:changed', ({ nodeId, market, fullUrl }: { nodeId: string, market: any, fullUrl: string }) => {
      setMarketTitle(market.question);
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, baseSlug: fullUrl } }
            : node
        )
      );
      toast.info(`Market Rollover: ${market.question.split(' - ')[0]}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [id, setNodes]);

  // 4. AI & Wizard Handlers
  const handleWizardComplete = async (config: any) => {
    setStrategyName(config.name);
    setContext(config.context);
    setShowWizard(false);

    let finalNodes = [];
    let finalEdges = [];

    if (config.useAi && config.prompt) {
      const loadingToast = toast.loading('AI is architecting your strategy...');
      try {
        const apiKey = localStorage.getItem('QUANTBOX_LLM_KEY') || '';
        const result = await generateStrategy(config.prompt, apiKey);
        finalNodes = result.nodes;
        finalEdges = result.edges;
        toast.dismiss(loadingToast);
        toast.success('AI generation complete!');
      } catch (error) {
        toast.dismiss(loadingToast);
        toast.error('AI generation failed. Starting with template.');
      }
    }

    if (finalNodes.length === 0) {
      finalNodes = [
        {
          id: 'node-1',
          type: 'marketDetector',
          position: { x: 100, y: 200 },
          data: { baseSlug: 'https://polymarket.com/event/btc-updown-15m-1770311700', category: config.context },
        }
      ];
    }

    const payload = {
      name: config.name,
      initialBalance: 1000,
      nodes: finalNodes,
      edges: finalEdges,
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
      toast.error('AI API Key not found. Please open AI panel to set it.');
      return;
    }

    try {
      const result = await generateStrategy(prompt, apiKey);
      if (result.nodes.length > 0) {
        setNodes(result.nodes);
        setEdges(result.edges);
        toast.success('Strategy architected successfully');
      }
    } catch (error: any) {
      toast.error(`AI Error: ${error.message}`);
      throw error;
    }
  };

  // 5. Editor Actions
  const handleRun = async () => {
    if (!id || id === 'new') return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}/start`, { method: 'POST' });
      if (res.ok) {
        setIsRunning(true);
        setIsTerminalOpen(true);
        toast.success('Strategy started');
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
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, executionStatus: 'idle' } })));
        toast.info('Strategy stopped');
      }
    } catch (err) {
      toast.error('Failed to stop strategy');
    }
  };

  const handleSave = async () => {
    const payload = {
      name: strategyName,
      description: strategyDescription,
      initialBalance,
      nodes: nodes.map(n => ({ ...n, selected: false })),
      edges,
    };

    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) toast.success('Strategy saved');
    } catch (err) {
      toast.error('Save failed');
    }
  };

  const handleAddNode = useCallback((type: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 100, y: 100 },
      data: { 
        label: type,
        ...(type === 'marketDetector' ? { category: context } : {})
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, context]);

  const handleUpdateNode = useCallback((nodeId: string, data: any) => {
    setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node)));
  }, [setNodes]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => setSelectedNode(node), []);
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden text-slate-200">
      <EditorHeader
        strategyName={strategyName}
        strategyDescription={strategyDescription}
        initialBalance={initialBalance}
        onNameChange={setStrategyName}
        onDescriptionChange={setStrategyDescription}
        onBalanceChange={setInitialBalance}
        onSave={handleSave}
        onToggleOrderbook={() => setIsOrderbookOpen(!isOrderbookOpen)}
        isOrderbookOpen={isOrderbookOpen}
        onTogglePortfolio={() => setIsPortfolioOpen(!isPortfolioOpen)}
        isPortfolioOpen={isPortfolioOpen}
        isRunning={isRunning}
        onRun={handleRun}
        onStop={handleStop}
        onToggleAI={() => setIsAIOpen(!isAIOpen)}
        isAIOpen={isAIOpen}
      />

      <div className="flex-1 flex overflow-hidden">
        <NodePalette 
          onAddNode={handleAddNode} 
          context={context} 
          onContextChange={setContext} 
        />

        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 relative overflow-hidden">
            {marketTitle && (
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 ring-1 ring-white/5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-slate-200 text-xs font-black uppercase tracking-widest leading-none">
                    {marketTitle}
                  </span>
                </div>
              </div>
            )}

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-slate-950"
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#334155" gap={16} />
              <Controls className="bg-slate-800 border-slate-700 [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!fill-slate-300 [&>button:hover]:!bg-slate-700" />
              <MiniMap className="bg-slate-800 border-slate-700" nodeColor="#3b82f6" maskColor="rgba(0, 0, 0, 0.6)" style={{ marginRight: 80 }} />
            </ReactFlow>

            {isOrderbookOpen && (
              <div className="absolute top-4 right-4 w-80 h-[750px] z-10 pointer-events-none flex flex-col items-end">
                <div className="pointer-events-auto h-full w-full">
                  <LiveOrderbook 
                    marketSlug={activeMarketSlug} 
                  />
                </div>
              </div>
            )}

            {isPortfolioOpen && (
              <div className="absolute top-4 right-4 w-80 h-[750px] z-10 pointer-events-none flex flex-col items-end">
                <div className="pointer-events-auto h-full w-full">
                  <PortfolioPanel 
                    balance={walletBalance}
                    positions={positions}
                    history={tradeHistory}
                    totalPnL={totalPnL}
                  />
                </div>
              </div>
            )}

            <div className="absolute bottom-4 right-4 z-20 pointer-events-none flex flex-col items-end">
              <div className="pointer-events-auto">
                <HelpPanel isOpen={isHelpOpen} onToggle={setIsHelpOpen} />
              </div>
            </div>
          </div>

          <LogTerminal strategyId={id} isOpen={isTerminalOpen} onToggle={setIsTerminalOpen} />
        </div>

        <div className="flex flex-col border-l border-slate-800">
          {isAIOpen && <AIAssistantPanel onGenerate={handleAIGenerate} onClose={() => setIsAIOpen(false)} />}
          {selectedNode && !isAIOpen && (
            <ConfigPanel 
              node={nodes.find(n => n.id === selectedNode.id) || selectedNode} 
              onUpdate={handleUpdateNode} 
              onClose={() => setSelectedNode(null)} 
            />
          )}
        </div>
      </div>

      {showWizard && <OnboardingWizard onComplete={handleWizardComplete} onClose={() => router.push('/')} />}
    </div>
  );
}