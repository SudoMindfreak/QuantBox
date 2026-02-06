import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const strategies = sqliteTable('strategies', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),

    // Node graph (stored as JSON strings)
    nodes: text('nodes').notNull(),
    edges: text('edges').notNull(),

    // Balance & Risk
    initialBalance: real('initial_balance').notNull().default(100),
    currentBalance: real('current_balance').notNull().default(100),

    // Status
    status: text('status').notNull().default('draft'), // draft | active | paused | stopped
    isTemplate: integer('is_template', { mode: 'boolean' }).notNull().default(false),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    lastExecutedAt: integer('last_executed_at', { mode: 'timestamp' }),
});

export const strategyExecutions = sqliteTable('strategy_executions', {
    id: text('id').primaryKey(),
    strategyId: text('strategy_id').notNull().references(() => strategies.id),

    // Execution details
    triggeredBy: text('triggered_by').notNull(),
    executedNodes: text('executed_nodes', { mode: 'json' }).notNull().$type<string[]>(),

    // Results
    action: text('action'),
    market: text('market'),
    amount: real('amount'),
    price: real('price'),

    // P&L
    balanceBefore: real('balance_before').notNull(),
    balanceAfter: real('balance_after').notNull(),
    pnl: real('pnl').notNull(),

    // Timestamps
    executedAt: integer('executed_at', { mode: 'timestamp' }).notNull(),
});

export const strategyPositions = sqliteTable('strategy_positions', {
    id: text('id').primaryKey(),
    strategyId: text('strategy_id').notNull().references(() => strategies.id),

    // Position details
    market: text('market').notNull(),
    side: text('side').notNull(),
    quantity: real('quantity').notNull(),
    entryPrice: real('entry_price').notNull(),
    currentPrice: real('current_price').notNull(),

    // P&L
    unrealizedPnl: real('unrealized_pnl').notNull(),

    // Timestamps
    openedAt: integer('opened_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
