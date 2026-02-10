import { db } from './index.js';
import { strategies } from './schema.js';
import { randomUUID } from 'crypto';

const templates = [
    {
        id: randomUUID(),
        name: 'Simple Momentum Strategy',
        description: 'Buys YES when price drops below 0.45, demonstrating the new node flow: Market → Orderbook → Yes Price → Condition → Buy Action',
        nodes: JSON.stringify([
            { id: '1', type: 'marketDetector', position: { x: 0, y: 200 }, data: { baseSlug: 'https://polymarket.com/event/btc-updown-15m-1770311700', category: '15m' } },
            { id: '2', type: 'orderbook', position: { x: 250, y: 200 }, data: {} },
            { id: '3', type: 'price', position: { x: 500, y: 150 }, data: {} },
            { id: '4', type: 'condition', position: { x: 750, y: 150 }, data: { conditionType: 'threshold', threshold: 0.45, operator: '<' } },
            { id: '5', type: 'buyAction', position: { x: 1000, y: 150 }, data: { quantity: 10, outcome: 'UP' } },
        ]),
        edges: JSON.stringify([
            { id: 'e1-2', source: '1', target: '2', animated: true },
            { id: 'e2-3', source: '2', target: '3', animated: true },
            { id: 'e3-4', source: '3', target: '4', sourceHandle: 'yes', animated: true },
            { id: 'e4-5', source: '4', target: '5', sourceHandle: 'true', animated: true },
        ]),
        initialBalance: 1000,
        status: 'draft',
        isTemplate: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
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
