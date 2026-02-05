import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { OrderbookStream } from 'quantbox-core/dist/engine/stream.js';
import 'dotenv/config';

const app = new Hono();

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
app.get('/api/strategies', async (c) => {
    // TODO: Fetch all strategies from database
    return c.json([]);
});

app.post('/api/strategies', async (c) => {
    try {
        console.log('[POST /api/strategies] Request received');
        console.log('[POST /api/strategies] Content-Type:', c.req.header('Content-Type'));


        const rawBody = await c.req.text();
        console.log('[POST /api/strategies] Raw body:', rawBody);
        const body = JSON.parse(rawBody);
        console.log('[POST /api/strategies] Parsed body:', JSON.stringify(body, null, 2));

        const { db } = await import('./db/index.js');
        const { strategies } = await import('./db/schema.js');
        const { randomUUID } = await import('crypto');

        const strategy = {
            id: randomUUID(),
            name: body.name || 'Untitled Strategy',
            description: body.description || null,
            nodes: JSON.stringify(body.nodes || []),
            edges: JSON.stringify(body.edges || []),
            initialBalance: body.initialBalance || 100,
            currentBalance: body.initialBalance || 100,
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastExecutedAt: null,
        };

        console.log('[POST /api/strategies] Inserting strategy:', strategy.id);
        await db.insert(strategies).values(strategy);
        console.log('[POST /api/strategies] Strategy created successfully');

        return c.json(strategy);
    } catch (error) {
        console.error('[POST /api/strategies] Error creating strategy:', error);
        console.error('[POST /api/strategies] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return c.json({ error: 'Failed to create strategy', details: error instanceof Error ? error.message : String(error) }, 500);
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
            nodes: JSON.parse(strategy.nodes as string),
            edges: JSON.parse(strategy.edges as string),
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
        if (body.nodes) updateData.nodes = JSON.stringify(body.nodes);
        if (body.edges) updateData.edges = JSON.stringify(body.edges);
        if (body.initialBalance !== undefined) updateData.initialBalance = body.initialBalance;
        if (body.status) updateData.status = body.status;

        await db.update(strategies).set(updateData).where(eq(strategies.id, id));

        return c.json({ success: true, id });
    } catch (error) {
        console.error('Error updating strategy:', error);
        return c.json({ error: 'Failed to update strategy' }, 500);
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
        const { StrategyRunner } = await import('./engine/StrategyRunner.js');

        const strategy = await db.select().from(strategies).where(eq(strategies.id, id)).get();

        if (!strategy) {
            return c.json({ error: 'Strategy not found' }, 404);
        }

        const strategyData = {
            nodes: JSON.parse(strategy.nodes as string),
            edges: JSON.parse(strategy.edges as string),
        };

        const runner = new StrategyRunner(id, strategyData, io, stream);
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

// Create HTTP server for Socket.io
const server = createServer(async (req, res) => {
    // Read request body for POST/PUT/PATCH
    let body: string | undefined;
    if (req.method && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        body = Buffer.concat(chunks).toString('utf-8');
    }

    // Handle Hono app requests
    const response = await app.fetch(new Request(`http://localhost:${port}${req.url}`, {
        method: req.method,
        headers: req.headers as any,
        body: body,
    }));

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
        res.setHeader(key, value);
    });

    if (response.body) {
        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
    }
    res.end();
});

// WebSocket server
const io = new Server(server, {
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
stream.on('data', (data: any) => {
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
    socket.on('subscribe:market', (assetId: string) => {
        console.log(`[WebSocket] Client ${socket.id} subscribed to market: ${assetId}`);
        socket.join(`market:${assetId}`);

        // Tell the stream to subscribe to this asset if not already
        stream.subscribe([assetId]);
    });

    socket.on('unsubscribe:market', (assetId: string) => {
        console.log(`[WebSocket] Client ${socket.id} unsubscribed from market: ${assetId}`);
        socket.leave(`market:${assetId}`);
        // Note: We don't unsubscribe the stream itself because other clients might be listening
    });

    socket.on('disconnect', () => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
});

server.listen(port, () => {
    console.log(`✅ Server running on http://localhost:${port}`);
    console.log(`✅ WebSocket server ready`);
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
