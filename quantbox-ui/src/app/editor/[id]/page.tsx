'use client';

import { useCallback, useState, useEffect } from 'react';
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
import { nodeTypes } from '@/components/nodes';
import { io, Socket } from 'socket.io-client';
import { useRef } from 'react';

// Example Strategy: Empty Initial State
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];
export default function EditorPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [strategyName, setStrategyName] = useState('My Strategy');
  const [initialBalance, setInitialBalance] = useState(100);
  const [isOrderbookOpen, setIsOrderbookOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [context, setContext] = useState<MarketContext>('15m'); const [marketTitle, setMarketTitle] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);

  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  // Socket initialization for real-time node status
  useEffect(() => {
    if (!id || id === 'new') return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(socketUrl, { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe:strategy', id);
    });

    socket.on('strategy:node:status', ({ nodeId, status }: { nodeId: string, status: any }) => {
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, executionStatus: status } }
            : node
        )
      );
    });

    socket.on('strategy:market:changed', ({ nodeId, market, fullUrl }: { nodeId: string, market: any, fullUrl: string }) => {
      console.log(`[Market Rollover] Node ${nodeId} moved to ${market.slug}`);
      setMarketTitle(market.question);
      setNodes((nds: any) =>
        nds.map((node: any) =>
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

  // Initial title fetch
  useEffect(() => {
    const activeMarketNode = nodes.find(n => n.type === 'marketDetector');
    if (activeMarketNode && (activeMarketNode.data as any)?.baseSlug && !marketTitle) {
      const slug = (activeMarketNode.data as any).baseSlug;
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/markets/resolve?input=${slug}`)
        .then(res => res.json())
        .then(data => {
          if (data.question) setMarketTitle(data.question);
        })
        .catch(() => { });
    }
  }, [nodes, marketTitle]);

  const handleRun = async () => {
    if (!id || id === 'new') {
      toast.error('Please save the strategy first');
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}/start`, {
        method: 'POST'
      });
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}/stop`, {
        method: 'POST'
      });
      if (res.ok) {
        setIsRunning(false);
        // Reset node statuses
        setNodes((nds: any) => nds.map((n: any) => ({ ...n, data: { ...n.data, executionStatus: 'idle' } })));
        toast.info('Strategy stopped');
      }
    } catch (err) {
      toast.error('Failed to stop strategy');
    }
  };

  // Fetch strategy data when editing an existing strategy
  useEffect(() => {
    if (!id || id === 'new') return;

    const fetchStrategy = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}`);
        if (!response.ok) throw new Error('Failed to fetch strategy');

        const data = await response.json();
        console.log('[Frontend] Fetched strategy:', data);

        setStrategyName(data.name || 'My Strategy');
        setInitialBalance(data.initialBalance || 100);

        // Parse nodes and edges if necessary (backend might send them as strings or objects)
        let loadedNodes = typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes;
        let loadedEdges = typeof data.edges === 'string' ? JSON.parse(data.edges) : data.edges;

        setNodes(loadedNodes || []);
        setEdges(loadedEdges || []);
      } catch (error) {
        console.error('Error loading strategy:', error);
        toast.error('Failed to load strategy details');
      }
    };

    fetchStrategy();
  }, [id, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds: Edge[]) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleAddNode = useCallback(
    (type: string) => {
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: { x: 100, y: 100 },
        data: {
          label: type,
          // If it's a marketDetector, we should pass the current context
          ...(type === 'marketDetector' ? { category: context } : {})
        },
      };
      setNodes((nds: Node[]) => [...nds, newNode]);
    },
    [setNodes, context]
  );
  const handleUpdateNode = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds: Node[]) =>
        nds.map((node: Node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node))
      );
    },
    [setNodes]
  );

  const handleSave = async () => {
    const payload = {
      name: strategyName,
      initialBalance,
      nodes: nodes.map(n => ({ ...n, selected: false })),
      edges,
    };

    const isNew = !id || id === 'new';
    const url = isNew
      ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies`
      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/strategies/${id}`;

    const savePromise = fetch(url, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(error.error || 'Save failed');
      }
      return res.json();
    });

    toast.promise(savePromise, {
      loading: 'Saving strategy...',
      success: (data: any) => {
        if (isNew && data.id) {
          router.replace(`/editor/${data.id}`);
        }
        return 'Strategy saved successfully!';
      },
      error: (err: any) => `Failed to save: ${err.message}`,
    });
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      <EditorHeader
        strategyName={strategyName}
        initialBalance={initialBalance}
        onNameChange={setStrategyName}
        onBalanceChange={setInitialBalance}
        onSave={handleSave}
        onToggleOrderbook={() => setIsOrderbookOpen(!isOrderbookOpen)}
        isOrderbookOpen={isOrderbookOpen}
        isRunning={isRunning}
        onRun={handleRun}
        onStop={handleStop}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Node Palette */}
        <NodePalette
          onAddNode={handleAddNode}
          context={context}
          onContextChange={setContext}
        />

        {/* Main Workspace Area (Canvas + Terminal) */}
        <div className="flex-1 flex flex-col min-w-0 relative">

          {/* Canvas Area */}
          <div className="flex-1 relative overflow-hidden">

            {/* Market Title Overlay (Top Left) */}
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
              <Controls
                className="bg-slate-800 border-slate-700 [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!fill-slate-300 [&>button:hover]:!bg-slate-700"
              />
              <MiniMap
                className="bg-slate-800 border-slate-700"
                nodeColor="#3b82f6"
                maskColor="rgba(0, 0, 0, 0.6)"
                style={{ marginRight: 80 }}
              />            </ReactFlow>

            {/* Live Orderbook Overlay (Top Right) */}
            {isOrderbookOpen && (
              <div className="absolute top-4 right-4 w-80 h-[500px] z-10 pointer-events-none flex flex-col items-end">
                <div className="pointer-events-auto h-full w-full">
                  <LiveOrderbook
                    marketSlug={
                      (() => {
                        const activeNode = selectedNode
                          ? nodes.find(n => n.id === selectedNode.id)
                          : nodes.find(n => n.type === 'marketDetector');
                        return activeNode?.type === 'marketDetector'
                          ? (activeNode.data as any)?.baseSlug
                          : undefined;
                      })()
                    }
                  />
                </div>
              </div>
            )}

            {/* Help Panel Overlay (Bottom Right of Canvas) */}
            <div className="absolute bottom-4 right-4 z-20 pointer-events-none flex flex-col items-end">
              <div className="pointer-events-auto">
                <HelpPanel
                  isOpen={isHelpOpen}
                  onToggle={setIsHelpOpen}
                />
              </div>
            </div>
          </div>

          {/* Logs Terminal (Bottom) */}
          <LogTerminal
            strategyId={id}
            isOpen={isTerminalOpen}
            onToggle={setIsTerminalOpen}
          />
        </div>

        {/* Right: Config Panel */}
        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onUpdate={handleUpdateNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
