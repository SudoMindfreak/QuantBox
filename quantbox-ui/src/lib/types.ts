// Shared TypeScript types for QuantBox UI

export interface Strategy {
    id: string;
    name: string;
    description: string | null;
    pythonCode: string;
    marketSlug: string;
    initialBalance: number;
    status: 'draft' | 'active' | 'stopped';
    createdAt: string;
    updatedAt: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface AIGenerateRequest {
    prompt: string;
    marketContext: string;
}

export interface AIGenerateResponse {
    code: string;
    validation: ValidationResult;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    isError?: boolean;
    validation?: ValidationResult;
}

export interface Trade {
    id: string;
    strategyId: string;
    timestamp: string;
    action: 'BUY' | 'SELL';
    outcome: 'UP' | 'DOWN' | 'YES' | 'NO';
    price: number;
    quantity: number;
    value: number;
}

export interface Position {
    tokenId: string;
    outcome: string;
    quantity: number;
    averageEntryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
}

export interface WalletState {
    balance: number;
    positions: Position[];
    unrealizedPnL: number;
    realizedPnL: number;
}

export interface Log {
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error';
}

export interface PnLDataPoint {
    timestamp: string;
    balance: number;
    realizedPnL: number;
    unrealizedPnL: number;
}
