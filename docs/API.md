# QuantBox Core - API Reference

> **Note:** This is a living document. API may change as the project evolves.

## Table of Contents

- [Services](#services)
  - [MarketResolver](#marketresolver)
  - [MarketService](#marketservice)
  - [OrderbookStream](#orderbookstream)
  - [VirtualWallet](#virtualwallet)
- [Types](#types)
- [Environment Variables](#environment-variables)

---

## Services

### MarketResolver

Intelligent market fetching and rollover service.

```typescript
import { MarketResolver } from './services/MarketResolver';
```

#### Constructor

```typescript
constructor(clobClient: ClobClient)
```

**Parameters:**
- `clobClient`: Instance of Polymarket CLOB client

#### Methods

##### `resolve(input: string): Promise<MarketMetadata>`

Main entry point to resolve markets from various input formats.

**Parameters:**
- `input`: Market identifier (URL, slug, or condition ID)

**Returns:** Promise resolving to `MarketMetadata`

**Examples:**
```typescript
// URL
await resolver.resolve('https://polymarket.com/event/bitcoin-crosses-100000');

// Slug
await resolver.resolve('bitcoin-crosses-100000');

// Condition ID
await resolver.resolve('0xabc123...');
```

##### `parseInput(input: string): { type: string; value: string }`

Determines input type and extracts relevant data.

**Returns:**
- `type`: One of `'url'`, `'slug'`, or `'condition_id'`
- `value`: Extracted slug or condition ID

##### `fetchEventBySlug(slug: string): Promise<GammaEvent | null>`

Fetches event data from Gamma API.

**Parameters:**
- `slug`: Market slug (e.g., `'bitcoin-crosses-100000'`)

**Returns:** Promise resolving to `GammaEvent` or `null` if not found

---

### MarketService

Fetch and cache market metadata from Polymarket CLOB API.

```typescript
import { MarketService } from './services/MarketService';
```

#### Constructor

```typescript
constructor(clobClient: ClobClient)
```

#### Methods

##### `getMarketByConditionId(conditionId: string): Promise<MarketMetadata>`

Fetch market metadata with automatic caching.

**Parameters:**
- `conditionId`: Market condition ID (hex string starting with `0x`)

**Returns:** Promise resolving to `MarketMetadata`

##### `extractTokenIds(market: MarketMetadata): { yes: string; no: string }`

Extract token IDs from a binary market.

**Parameters:**
- `market`: Market metadata object

**Returns:**
- `yes`: First outcome token ID
- `no`: Second outcome token ID

**Note:** Variable names `yes`/`no` are for backward compatibility. Actual outcomes may be Up/Down, Higher/Lower, etc.

##### `getTickSize(tokenId: string): Promise<TickSize>`

Get tick size for a specific token (with caching).

##### `validatePrice(price: number, tickSize: number): boolean`

Validate that a price aligns with the market's tick size.

##### `roundToTickSize(price: number, tickSize: number): number`

Round price to nearest valid tick.

##### `clearCache(): void`

Clear all cached data.

---

### OrderbookStream

WebSocket connection to Polymarket's live orderbook feed.

```typescript
import { OrderbookStream } from './engine/stream';
```

#### Constructor

```typescript
constructor()
```

#### Methods

##### `connect(): Promise<void>`

Establish WebSocket connection.

**Returns:** Promise that resolves when connection is established

##### `subscribe(tokenIds: string[]): void`

Subscribe to orderbook updates for specific tokens.

**Parameters:**
- `tokenIds`: Array of token IDs to monitor

##### `disconnect(): void`

Close WebSocket connection.

#### Events

Listen to events using `.on()`:

```typescript
stream.on('orderbook', (message: OrderBookMessage) => {
  // Handle orderbook update
});

stream.on('error', (error: Error) => {
  // Handle error
});
```

**Event Types:**
- `'orderbook'`: New orderbook snapshot or update
- `'error'`: Connection or parsing error

---

### VirtualWallet

Paper trading simulation engine.

```typescript
import { VirtualWallet } from './engine/wallet';
```

#### Constructor

```typescript
constructor(initialBalance: number)
```

**Parameters:**
- `initialBalance`: Starting USDC balance

#### Methods

##### `simulateBuy(...): VirtualOrder`

Simulate a BUY order.

**Parameters:**
```typescript
{
  tokenId: string;          // Token to buy
  outcome: string;          // Outcome label (e.g., 'YES', 'Up')
  size: number;             // Quantity to buy
  marketMetadata: MarketMetadata;
  orderbook: {
    bids: OrderSummary[];
    asks: OrderSummary[];
  };
  limitPrice?: number;      // Optional limit price
}
```

**Returns:** `VirtualOrder` with execution details

##### `simulateSell(...): VirtualOrder`

Simulate a SELL order (same parameters as `simulateBuy`).

##### `updatePositionPrices(tokenId: string, currentPrice: number): void`

Update position mark prices for PnL calculation.

##### `getPosition(tokenId: string): VirtualPosition | undefined`

Get current position for a token.

##### `getSummary(): string`

Get formatted wallet summary with positions and PnL.

---

## Types

### MarketMetadata

```typescript
interface MarketMetadata {
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
```

### GammaEvent

```typescript
interface GammaEvent {
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
```

### GammaMarket

```typescript
interface GammaMarket {
  conditionId: string;
  question: string;
  endDate: string;
  clobTokenIds: string | string[];
  outcomes: string | string[];
  outcomePrices?: string | string[];
  tokens: GammaToken[];
  active: boolean;
}
```

### OrderBookMessage

```typescript
interface OrderBookMessage {
  asset_id: string;
  market: string;
  timestamp: string;
  bids: OrderSummary[];
  asks: OrderSummary[];
}
```

### VirtualOrder

```typescript
interface VirtualOrder {
  id: string;
  timestamp: number;
  side: Side;  // 'BUY' | 'SELL'
  tokenId: string;
  outcome: string;
  size: number;
  avgPrice: number;
  totalCost: number;
  fees: number;
  status: OrderStatus;
  slippage?: number;
  error?: string;
}
```

---

## Environment Variables

### Phase 2: Market Discovery

```bash
# Market input (URL, slug, or condition ID)
MARKET_URL=bitcoin-crosses-100000
```

### Phase 1: Virtual Trading

```bash
# Initial balance for paper trading
INITIAL_VIRTUAL_BALANCE=10000

# WebSocket endpoint
WS_ENDPOINT=wss://ws-subscriptions-clob.polymarket.com/ws/market
```

### Future: Authentication (Phase 4)

```bash
# API credentials (for live trading)
POLYMARKET_API_KEY=your_api_key
POLYMARKET_SECRET=your_secret
POLYMARKET_PASSPHRASE=your_passphrase

# Private key (for signing transactions)
POLYMARKET_PRIVATE_KEY=0x...
POLYMARKET_FUNDER_ADDRESS=0x...
```

---

## Usage Examples

### Basic Market Resolution

```typescript
import { ClobClient } from '@polymarket/clob-client';
import { MarketResolver } from './services/MarketResolver';

const client = new ClobClient(
  'https://clob.polymarket.com',
  137,
  undefined,
  { key: '', secret: '', passphrase: '' }
);

const resolver = new MarketResolver(client);
const market = await resolver.resolve('bitcoin-crosses-100000');

console.log(market.question);
console.log(market.tokens); // [{ outcome: 'Yes', ... }, { outcome: 'No', ... }]
```

### Virtual Trading Workflow

```typescript
// 1. Connect to orderbook stream
const stream = new OrderbookStream();
await stream.connect();
stream.subscribe([tokenId]);

// 2. Initialize wallet
const wallet = new VirtualWallet(10000);

// 3. Listen for orderbook updates
stream.on('orderbook', (msg) => {
  // 4. Execute virtual trade
  const order = wallet.simulateBuy(
    tokenId,
    'YES',
    10,
    market,
    { bids: msg.bids, asks: msg.asks }
  );
  
  // 5. Check results
  console.log(wallet.getSummary());
});
```

---

## Error Handling

All async methods may throw errors. Always use try-catch:

```typescript
try {
  const market = await resolver.resolve('invalid-slug');
} catch (error) {
  console.error('Market not found:', error.message);
}
```

Common errors:
- `Market not found for slug: ...` - Invalid or expired market
- `Could not find active rolling market` - No active instance for rolling market
- `Market must have exactly 2 tokens` - Not a binary market
- `Insufficient balance` - Virtual wallet has insufficient funds
