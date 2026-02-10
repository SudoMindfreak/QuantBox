// Type definitions for Strategy Node System

export interface NodeInput {
    type: string;
    assetId?: string;
    fromSpot?: boolean;
    [key: string]: any;
}

export interface OrderbookData {
    yes: PriceSide;
    no: PriceSide;
    spread: number;
    yesSpread: number;
    noSpread: number;
    assetId: string;
}

export interface PriceSide {
    bestAsk: number;
    bestBid: number;
    midPrice: number;
    volume: number;
}

export interface ConditionResult {
    triggered: boolean;
    value?: number;
    reason?: string;
    metadata?: Record<string, any>;
}

export interface TradeResult {
    orderId?: string;
    filled: boolean;
    avgPrice: number;
    quantity: number;
    side: 'YES' | 'NO';
}

export interface PortfolioSnapshot {
    balance: number;
    positions: Map<string, any>;
    totalPnL: number;
    trades: number;
}

// Node executor function signature
export type NodeExecutor = (node: any, inputData: NodeInput) => Promise<{
    shouldContinue: boolean;
    outputData: any;
}>;
