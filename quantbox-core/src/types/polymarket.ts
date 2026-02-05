/**
 * Polymarket WebSocket Message Types
 */

export interface OrderSummary {
    price: string;
    size: string;
}

export interface OrderBookMessage {
    event_type: 'book' | 'price_change' | 'last_trade_price';
    asset_id: string;
    market: string;
    bids: OrderSummary[];
    asks: OrderSummary[];
    timestamp: string;
    hash: string;
}

export interface MarketToken {
    token_id: string;
    outcome: string;
    price: string;
}

export interface MarketMetadata {
    condition_id: string;
    question: string;
    end_date_iso: string;
    tokens: MarketToken[];
    tick_size: number;
    taker_base_fee: number;
    maker_base_fee: number;
    neg_risk: boolean;
    active: boolean;
}

/**
 * Virtual Trading Types
 */

export enum Side {
    BUY = 'BUY',
    SELL = 'SELL'
}

export enum OrderStatus {
    PENDING = 'PENDING',
    FILLED = 'FILLED',
    REJECTED = 'REJECTED'
}

export interface VirtualOrder {
    id: string;
    tokenId: string;
    side: Side;
    requestedSize: number;
    requestedPrice?: number; // undefined for market orders
    filledSize: number;
    averageFillPrice: number;
    fees: number;
    status: OrderStatus;
    timestamp: number;
    slippage: number;
}

export interface VirtualPosition {
    tokenId: string;
    outcome: string; // "YES" or "NO"
    quantity: number;
    averageEntryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    realizedPnL: number;
}

export interface TransactionRecord {
    id: string;
    type: 'BUY' | 'SELL';
    tokenId: string;
    outcome: string;
    size: number;
    price: number;
    fees: number;
    usdcChange: number; // negative for buys, positive for sells
    timestamp: number;
}

export interface TickSize {
    value: '0.1' | '0.01' | '0.001' | '0.0001';
}

/**
 * Market Discovery Types (Gamma API responses)
 */

export interface GammaToken {
    token_id: string;
    outcome: string;
    price?: string;
}

export interface GammaMarket {
    conditionId: string;
    question: string;
    endDate: string;
    clobTokenIds: string | string[]; // Can be JSON string or array
    outcomes: string | string[]; // Can be JSON string or array  
    outcomePrices?: string | string[];
    tokens: GammaToken[];
    active: boolean;
}

export interface GammaEvent {
    id: string;
    ticker?: string;
    slug: string;
    title: string;
    description: string;
    active: boolean;
    closed: boolean;
    end_date_iso?: string;
    markets: GammaMarket[];
}

export interface MarketSearchParams {
    closed?: boolean;
    active?: boolean;
    limit?: number;
    offset?: number;
}

/**
 * Phase 3: Auto-Discovery Event Types
 */

// Market lifecycle events
export type MarketEvent =
    | 'market:detected'
    | 'market:active'
    | 'market:expiring'
    | 'market:expired'
    | 'error';

// Event payload for market transitions
export interface MarketTransitionEvent {
    previousMarket?: MarketMetadata;
    currentMarket: MarketMetadata;
    timestamp: number;
    timeUntilExpiry?: number;
}

// Error event payload
export interface PollingErrorEvent {
    error: Error;
    consecutiveFailures: number;
    nextRetryIn?: number;
    fatal: boolean;
}

/**
 * Phase 3.5: Market Type Detection
 */

// Market types (simplified - 15min focus)
export enum MarketType {
    ROLLING_15MIN = 'rolling_15min',  // Primary market type
    ONE_OFF = 'one_off'                // Fallback for non-rolling markets
}

// Market pattern detection result
export interface MarketPattern {
    type: MarketType;
    baseSlug: string;
    isDiscoverable: boolean;
}

// Market mode configuration
export type MarketMode = 'rolling' | 'one-off' | 'auto';

