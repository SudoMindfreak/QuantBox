import { db } from './index.js';
import { strategies } from './schema.js';
import { randomUUID } from 'crypto';

const templates = [
    {
        id: randomUUID(),
        name: 'Bitcoin 15m Momentum',
        description: 'Enters when buy pressure exceeds sell pressure by 1.5x in the active BTC 15m market.',
        nodes: JSON.stringify([
            { id: '1', type: 'marketDetector', position: { x: 0, y: 200 }, data: { baseSlug: 'https://polymarket.com/event/btc-updown-15m-1770311700', category: '15m' } },
            { id: '2', type: 'orderbookSnapshot', position: { x: 250, y: 200 }, data: {} },
            { id: '3', type: 'imbalanceCheck', position: { x: 500, y: 200 }, data: { ratio: 1.5 } },
            { id: '4', type: 'buyAction', position: { x: 800, y: 150 }, data: { quantity: 10 } },
            { id: '5', type: 'logAction', position: { x: 800, y: 300 }, data: { message: 'Momentum Trade' } },
        ]),
        edges: JSON.stringify([
            { id: 'e1-2', source: '1', target: '2', animated: true },
            { id: 'e2-3', source: '2', target: '3', animated: true },
            { id: 'e3-4', source: '3', target: '4', sourceHandle: 'buy', animated: true },
            { id: 'e3-5', source: '3', target: '5', sourceHandle: 'buy' },
        ]),
        initialBalance: 1000,
        status: 'draft',
        isTemplate: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: randomUUID(),
        name: 'Volatility Hunter (15m)',
        description: 'High-sensitivity volatility tracker. Enters on small moves relative to strike price.',
        nodes: JSON.stringify([
            { id: '1', type: 'marketDetector', position: { x: 0, y: 200 }, data: { baseSlug: 'https://polymarket.com/event/btc-updown-15m-1770311700', category: '15m' } },
            { id: '2', type: 'strikeMomentum', position: { x: 300, y: 200 }, data: { volatilityK: 0.2, minDiff: 1.0 } },
            { id: '3', type: 'buyAction', position: { x: 650, y: 100 }, data: { quantity: 20, outcome: 'UP' } },
            { id: '4', type: 'buyAction', position: { x: 650, y: 300 }, data: { quantity: 20, outcome: 'DOWN' } },
            { id: '5', type: 'logAction', position: { x: 900, y: 200 }, data: { message: 'Volatility Entry' } },
        ]),
        edges: JSON.stringify([
            { id: 'e1-2', source: '1', target: '2', animated: true },
            { id: 'e2-3', source: '2', target: '3', sourceHandle: 'bullish', animated: true },
            { id: 'e2-4', source: '2', target: '4', sourceHandle: 'bearish', animated: true },
            { id: 'e3-5', source: '3', target: '5' },
            { id: 'e4-5', source: '4', target: '5' },
        ]),
        initialBalance: 2000,
        status: 'draft',
        isTemplate: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: randomUUID(),
        name: 'Arb Shield',
        description: 'Monitors price for YES+NO arbitrage opportunities and manages risk automatically.',
        nodes: JSON.stringify([
            { id: '1', type: 'marketDetector', position: { x: 0, y: 200 }, data: { baseSlug: 'https://polymarket.com/event/btc-updown-15m-1770311700', category: '15m' } },
            { id: '2', type: 'binaryArbitrage', position: { x: 250, y: 150 }, data: { threshold: 0.02 } },
            { id: '3', type: 'positionManager', position: { x: 250, y: 350 }, data: { takeProfit: 15, stopLoss: 5 } },
            { id: '4', type: 'buyAction', position: { x: 550, y: 150 }, data: { quantity: 50 } },
            { id: '5', type: 'sellAction', position: { x: 550, y: 350 }, data: { quantity: 50 } },
        ]),
        edges: JSON.stringify([
            { id: 'e1-2', source: '1', target: '2', animated: true },
            { id: 'e1-3', source: '1', target: '3', animated: true },
            { id: 'e2-4', source: '2', target: '4', sourceHandle: 'arb', animated: true },
            { id: 'e3-5', source: '3', target: '5', sourceHandle: 'exit', animated: true },
        ]),
        initialBalance: 5000,
        status: 'draft',
        isTemplate: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    }
];

async function seed() {
    console.log('🌱 Seeding database with strategy templates...');
    for (const template of templates) {
        await db.insert(strategies).values(template);
        console.log(`✅ Template "${template.name}" seeded!`);
    }
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
