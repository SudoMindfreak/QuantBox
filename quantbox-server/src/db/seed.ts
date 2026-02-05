import { db } from './index.js';
import { strategies } from './schema.js';
import { randomUUID } from 'crypto';

const bitcoinMomentum = {
    id: randomUUID(),
    name: 'Bitcoin 15m Momentum',
    description: 'A strategy that watches for orderbook imbalance in the BTC 15m Up/Down market.',
    nodes: JSON.stringify([
        {
            id: '1',
            type: 'marketDetector',
            position: { x: 100, y: 200 },
            data: { baseSlug: 'https://polymarket.com/event/btc-updown-15m-1770303600' },
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
            data: { message: 'Momentum Trade Detected' },
        },
    ]),
    edges: JSON.stringify([
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
    ]),
    initialBalance: 1000,
    currentBalance: 1000,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
};

async function seed() {
    console.log('🌱 Seeding database...');
    await db.insert(strategies).values(bitcoinMomentum);
    console.log('✅ Strategy "Bitcoin 15m Momentum" seeded!');
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
