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
import { ConfigPanel } from '@/components/editor/ConfigPanel';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { HelpPanel } from '@/components/editor/HelpPanel';
import { LiveOrderbook } from '@/components/editor/LiveOrderbook';
import { nodeTypes } from '@/components/nodes';

// Example Strategy: Bitcoin Momentum
const initialNodes: Node[] = [
    {
        id: '1',
        type: 'marketDetector',
        position: { x: 100, y: 200 },
        data: { baseSlug: 'btc-updown-15m' },
    },
    {
        id: '2',
        type: 'orderbookSnapshot',
        position: { x: 450, y: 200 },
        data: { label: 'Fetch Prices' },
    },
    {
        id: '3',
        type: 'imbalanceCheck',
        position: { x: 800, y: 200 },
        data: { ratio: 1.5, window: '30s' },
    },
    {
        id: '4',
        type: 'buyAction',
        position: { x: 1200, y: 100 },
        data: { quantity: 100, priceLimit: 0.95 },
    },
    {
        id: '5',
        type: 'logAction',
        position: { x: 1200, y: 300 },
        data: { message: 'Trade Executed: Buy Pressure Detected' },
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
    { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
    {
        id: 'e3-4',
        source: '3',
        target: '4',
        sourceHandle: 'buy',
        animated: true,
        label: 'Buy Signal',
        labelStyle: { fill: '#ffffff', fontWeight: 700 },
        labelBgStyle: { fill: '#166534', fillOpacity: 0.9, rx: 5, ry: 5 },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 4,
        style: { stroke: '#22c55e', strokeWidth: 2 },
    },
    { id: 'e3-5', source: '3', target: '5', sourceHandle: 'buy', style: { stroke: '#22c55e', strokeDasharray: '5,5' } },
];

export default function EditorPage() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [strategyName, setStrategyName] = useState('My Strategy');
    const [initialBalance, setInitialBalance] = useState(100);
    const [isOrderbookOpen, setIsOrderbookOpen] = useState(false);

    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

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
                data: { label: type },
            };
            setNodes((nds: Node[]) => [...nds, newNode]);
        },
        [setNodes]
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
        <div className="h-screen flex flex-col bg-slate-900">
            <EditorHeader
                strategyName={strategyName}
                initialBalance={initialBalance}
                onNameChange={setStrategyName}
                onBalanceChange={setInitialBalance}
                onSave={handleSave}
                onToggleOrderbook={() => setIsOrderbookOpen(!isOrderbookOpen)}
                isOrderbookOpen={isOrderbookOpen}
            />

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Node Palette */}
                <NodePalette onAddNode={handleAddNode} />

                {/* Center: Canvas */}
                <div className="flex-1 relative">
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
                    >
                        <Background color="#334155" gap={16} />
                        <Controls
                            className="bg-slate-800 border-slate-700 [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!fill-slate-300 [&>button:hover]:!bg-slate-700"
                        />
                        <MiniMap
                            className="bg-slate-800 border-slate-700"
                            nodeColor="#3b82f6"
                            maskColor="rgba(0, 0, 0, 0.6)"
                        />
                    </ReactFlow>

                    {/* Live Orderbook Overlay */}
                    {isOrderbookOpen && (
                        <div className="absolute top-4 right-4 w-80 h-[500px] z-10 pointer-events-none flex flex-col items-end">
                            <div className="pointer-events-auto h-full w-full shadow-xl rounded-lg overflow-hidden border border-slate-700">
                                <LiveOrderbook assetId={selectedNode?.type === 'marketDetector' ? (selectedNode?.data as any)?.baseSlug : "btc-updown-15m"} />
                            </div>
                        </div>
                    )}
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

            {/* Help Panel */}
            <HelpPanel />
        </div>
    );
}
