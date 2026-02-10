import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { Server } from 'socket.io';
import { OrderbookStream } from 'quantbox-core/dist/engine/stream.js';
import { MarketService } from 'quantbox-core/dist/services/MarketService.js';
import { MarketResolver } from 'quantbox-core/dist/services/MarketResolver.js';
import { BinanceService } from 'quantbox-core/dist/services/BinanceService.js';
import { ClobClient } from '@polymarket/clob-client';
import 'dotenv/config';

const app = new Hono();

// Initialize Polymarket Services
const POLYMARKET_HOST = 'https://clob.polymarket.com';
const POLYGON_CHAIN_ID = 137;

const clobClient = new ClobClient(
    POLYMARKET_HOST,
    POLYGON_CHAIN_ID,
    undefined,
    { key: '', secret: '', passphrase: '' }
);

const marketService = new MarketService(clobClient);
const marketResolver = new MarketResolver(clobClient);
const binanceService = new BinanceService();

// CORS middleware
app.use('/*', cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));

// Health check
app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api/markets/resolve', async (c) => {
    try {
        const input = c.req.query('input');
        if (!input) {
            return c.json({ error: 'Missing input parameter' }, 400);
        }

        console.log(`[API] Resolving market: ${input}`);
        const metadata = await marketResolver.resolve(input);
        const fullMarket = await marketService.getMarketByConditionId(metadata.condition_id);
        const tokenIds = marketService.extractTokenIds(fullMarket);

        console.log(`[API] Resolved to: ${metadata.question} (${tokenIds.yes})`);

        return c.json({
            ...metadata,
            tokens: fullMarket.tokens,
            tokenIds
        });
    } catch (error) {
        console.error('Error resolving market:', error);
        return c.json({ error: 'Failed to resolve market' }, 500);
    }
});

app.get('/api/strategies', async (c) => {
    try {
        const { db } = await import('./db/index.js');
        const { strategies } = await import('./db/schema.js');
        const { desc } = await import('drizzle-orm');

        const allStrategies = await db.select().from(strategies).orderBy(desc(strategies.updatedAt));
        
        return c.json(allStrategies.map(s => ({
            ...s,
            pythonCode: s.pythonCode,
        })));
    } catch (error) {
        console.error('Error fetching strategies:', error);
        return c.json({ error: 'Failed to fetch strategies' }, 500);
    }
});

app.post('/api/strategies', async (c) => {
    try {
        const body = await c.req.json();
        const { db } = await import('./db/index.js');
        const { strategies } = await import('./db/schema.js');
        const { randomUUID } = await import('crypto');

        const strategy = {
            id: randomUUID(),
            name: body.name || 'Untitled Strategy',
            description: body.description || null,
            pythonCode: body.pythonCode || null,
            initialBalance: body.initialBalance || 100,
            currentBalance: body.initialBalance || 100,
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastExecutedAt: null,
        };

        await db.insert(strategies).values(strategy);
        return c.json(strategy);
    } catch (error) {
        console.error('Error creating strategy:', error);
        return c.json({ error: 'Failed to create strategy' }, 500);
    }
});

app.get('/api/strategies/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const { db } = await import('./db/index.js');
        const { strategies } = await import('./db/schema.js');
        const { eq } = await import('drizzle-orm');

        const strategy = await db.select().from(strategies).where(eq(strategies.id, id)).get();

        if (!strategy) {
            return c.json({ error: 'Strategy not found' }, 404);
        }

        return c.json({
            ...strategy,
            pythonCode: strategy.pythonCode,
        });
    } catch (error) {
        console.error('Error fetching strategy:', error);
        return c.json({ error: 'Failed to fetch strategy' }, 500);
    }
});

app.put('/api/strategies/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { db } = await import('./db/index.js');
        const { strategies } = await import('./db/schema.js');
        const { eq } = await import('drizzle-orm');

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (body.name) updateData.name = body.name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.pythonCode !== undefined) updateData.pythonCode = body.pythonCode;
        if (body.initialBalance !== undefined) updateData.initialBalance = body.initialBalance;
        if (body.status) updateData.status = body.status;

        await db.update(strategies).set(updateData).where(eq(strategies.id, id));

        return c.json({ success: true, id });
    } catch (error) {
        console.error('Error updating strategy:', error);
        return c.json({ error: 'Failed to update strategy' }, 500);
    }
});

app.delete('/api/strategies/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const { db } = await import('./db/index.js');
        const { strategies } = await import('./db/schema.js');
        const { eq } = await import('drizzle-orm');

        await db.delete(strategies).where(eq(strategies.id, id));

        return c.json({ success: true, id });
    } catch (error) {
        console.error('Error deleting strategy:', error);
        return c.json({ error: 'Failed to delete strategy' }, 500);
    }
});

app.post('/api/ai/generate', async (c) => {
    try {
        const { prompt, context } = await c.req.json();
        const userKey = c.req.header('x-ai-key');
        const provider = c.req.header('x-ai-provider') || 'openai';
        
        const { generateStrategy } = await import('./services/AIService.js');
        const result = await generateStrategy(prompt, context, provider, userKey);
        
        return c.json(result);
    } catch (error) {
        console.error('AI Generation Error:', error);
        return c.json({ error: 'Failed to generate strategy' }, 500);
    }
});

// Active strategy runners
const activeRunners = new Map<string, any>();

app.post('/api/strategies/:id/start', async (c) => {
    const id = c.req.param('id');

    if (activeRunners.has(id)) {
        return c.json({ id, status: 'active', message: 'Strategy already running' });
    }

    try {
        const { db } = await import('./db/index.js');
        const { strategies } = await import('./db/schema.js');
        const { eq } = await import('drizzle-orm');

        const strategy = await db.select().from(strategies).where(eq(strategies.id, id)).get();

        if (!strategy) {
            return c.json({ error: 'Strategy not found' }, 404);
        }

        if (!strategy.pythonCode) {
            return c.json({ error: 'Strategy has no logic to run' }, 400);
        }

        const { PythonStrategyRunner } = await import('./engine/PythonStrategyRunner.js');
        const runner = new PythonStrategyRunner(id, strategy, io);
        
        await runner.start();
        activeRunners.set(id, runner);

        return c.json({ id, status: 'active' });
    } catch (error) {
        console.error('Failed to start strategy:', error);
        return c.json({ error: 'Failed to start strategy' }, 500);
    }
});

app.post('/api/strategies/:id/stop', async (c) => {
    const id = c.req.param('id');

    const runner = activeRunners.get(id);
    if (runner) {
        runner.stop();
        activeRunners.delete(id);
        return c.json({ id, status: 'stopped' });
    }

    return c.json({ id, status: 'stopped', message: 'Strategy was not running' });
});

const port = parseInt(process.env.PORT || '3001');

// Initialize Hono Server with standard node-server
const server = serve({
    fetch: app.fetch,
    port
}, (info) => {
    console.log(`✅ Server running on http://localhost:${info.port}`);
});

// Attach WebSocket server to the HTTP server
const io = new Server(server as any, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    },
});

// Initialize Orderbook Stream
const stream = new OrderbookStream();

// Connect to Polymarket WebSocket
stream.connect().catch(err => {
    console.error('Failed to connect to Polymarket WebSocket:', err);
});

// Forward Orderbook events to Socket.io clients
stream.on('orderbook', (data: any) => {
    // Broadcast to specific room for this asset
    if (data.asset_id) {
        io.to(`market:${data.asset_id}`).emit('market:data', data);
    }
});

io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    socket.on('subscribe:strategy', (strategyId: string) => {
        console.log(`[WebSocket] Client ${socket.id} subscribed to strategy: ${strategyId}`);
        socket.join(`strategy:${strategyId}`);
    });

    socket.on('unsubscribe:strategy', (strategyId: string) => {
        console.log(`[WebSocket] Client ${socket.id} unsubscribed from strategy: ${strategyId}`);
        socket.leave(`strategy:${strategyId}`);
    });

    // Handle market data subscriptions
    socket.on('subscribe:market', (assetIds: string | string[]) => {
        const ids = Array.isArray(assetIds) ? assetIds : [assetIds];
        console.log(`[WebSocket] Client ${socket.id} subscribed to markets: ${ids.join(', ')}`);
        
        ids.forEach(id => socket.join(`market:${id}`));

        // Tell the stream to subscribe to these assets
        stream.subscribe(ids);
    });

    socket.on('unsubscribe:market', (assetIds: string | string[]) => {
        const ids = Array.isArray(assetIds) ? assetIds : [assetIds];
        console.log(`[WebSocket] Client ${socket.id} unsubscribed from markets: ${ids.join(', ')}`);
        
        ids.forEach(id => socket.leave(`market:${id}`));
    });

    socket.on('disconnect', () => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
});

// Graceful shutdown
const shutdown = () => {
    console.log('\n🛑 Shutting down gracefully...');
    io.close(() => {
        console.log('✅ WebSocket server closed');
        server.close(() => {
            console.log('✅ HTTP server closed');
            process.exit(0);
        });
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { io };