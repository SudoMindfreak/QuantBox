# QuantBox Core - Architecture

## Overview

QuantBox Core is a TypeScript-based virtual trading engine for Polymarket. It provides a foundation for algorithmic trading by offering real-time market data, orderbook streaming, and paper trading capabilities—all without requiring authentication or API keys.

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     QuantBox Core Engine                     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│   Services   │      │    Engine    │     │    Types     │
│              │      │              │     │              │
│ • Market     │      │ • Stream     │     │ • Polymarket │
│   Resolver   │      │ • Wallet     │     │ • Orders     │
│ • Market     │      │              │     │ • Positions  │
│   Service    │      │              │     │              │
└──────────────┘      └──────────────┘     └──────────────┘
        │                     │                     
        └─────────┬───────────┘                     
                  ▼                                 
        ┌──────────────────┐                       
        │  External APIs   │                       
        │                  │                       
        │ • Polymarket     │                       
        │   CLOB API       │                       
        │ • Gamma API      │                       
        │ • WebSocket      │                       
        └──────────────────┘                       
```

## Core Components

### 1. Services Layer

#### MarketResolver
**Purpose:** Intelligent market discovery and resolution

**Responsibilities:**
- Parse Polymarket URLs to extract market slugs
- Fetch market data from Gamma API
- Handle rolling market detection and rollover
- Convert between API formats

**Key Features:**
- Supports multiple input formats (URL, slug, condition ID)
- Detects time-sensitive rolling markets
- Smart rollover to active market windows
- Backward compatible with direct condition IDs

**Dependencies:**
- `axios` for HTTP requests
- `ClobClient` for CLOB API fallback

#### MarketService
**Purpose:** Market metadata management and caching

**Responsibilities:**
- Fetch market metadata from CLOB API
- Cache market data to reduce API calls
- Extract token IDs from markets
- Validate and round prices to tick size

**Design Pattern:** Singleton-like caching

**Key Features:**
- Automatic caching with Map-based storage
- Tick size validation
- Binary market token extraction

### 2. Engine Layer

#### OrderbookStream
**Purpose:** WebSocket connection to live orderbook feed

**Responsibilities:**
- Establish and maintain WebSocket connection
- Subscribe to token orderbook updates
- Parse and emit orderbook messages
- Handle reconnection and keep-alive

**Design Pattern:** Event emitter pattern

**Key Features:**
- Automatic reconnection on disconnect
- Keep-alive ping mechanism
- Multiple token subscription support
- Event-based message handling

**Events:**
- `orderbook`: New orderbook snapshot/update
- `error`: Connection or parsing errors

#### VirtualWallet
**Purpose:** Paper trading simulation engine

**Responsibilities:**
- Simulate order execution against orderbook
- Track positions and balances
- Calculate fees and slippage
- Compute realized and unrealized PnL

**Design Pattern:** State management

**Key Features:**
- Market order simulation (matching against best available prices)
- Fee calculation (taker/maker fees)
- Position tracking per token
- Transaction history
- PnL calculation (realized + unrealized)

### 3. Type System

Comprehensive TypeScript types for:
- Polymarket API responses
- WebSocket messages
- Virtual trading state
- Gamma API responses

## Data Flow

### Market Resolution Flow

```
User Input (URL/Slug/ID)
         │
         ▼
   MarketResolver.parseInput()
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Slug/URL   Condition ID
    │         │
    ▼         └──────────────┐
Gamma API                    │
    │                        ▼
    ▼                   CLOB API
GammaEvent                   │
    │                        │
    ▼                        │
ensureActiveMarket()         │
    │                        │
    ▼                        │
GammaMarket ────────┐        │
                    │        │
                    ▼        ▼
              gammaToMarketMetadata()
                    │
                    ▼
              MarketMetadata
```

### Trading Flow

```
Main Script
    │
    ├──> MarketResolver ──> Get Market Metadata
    │
    ├──> MarketService ──> Get Full Market Data
    │
    ├──> VirtualWallet ──> Initialize with Balance
    │
    └──> OrderbookStream ──> Connect & Subscribe
              │
              ▼
       WebSocket Events
              │
              ├──> Parse OrderBookMessage
              │
              ├──> Update Wallet Position Prices
              │
              └──> Execute Virtual Orders
                        │
                        ▼
                   VirtualOrder
                        │
                        ├──> Update Balance
                        ├──> Update Position
                        └──> Record Transaction
```

## API Integration

### Gamma API
**Endpoint:** `https://gamma-api.polymarket.com`

**Usage:**
- Fetch events by slug: `GET /events?slug=<slug>`
- Returns event data with markets array

**Response Format:**
- Fields may be JSON-serialized strings (e.g., `outcomes`, `clobTokenIds`)
- MarketResolver handles parsing automatically

### CLOB API
**Endpoint:** `https://clob.polymarket.com`

**Usage:**
- Get market metadata: `getMarket(conditionId)`
- Get tick size: `getTickSize(tokenId)`

**Access:** Public (no authentication required for read operations)

### WebSocket Feed
**Endpoint:** `wss://ws-subscriptions-clob.polymarket.com/ws/market`

**Protocol:**
- Subscribe: `{"auth": {}, "markets": [], "assets_ids": [<token_id>]}`
- Keep-alive: Ping every 10 seconds
- Receives orderbook snapshots and updates

## Design Decisions

### Why Read-Only for Phase 1 & 2?
- Focus on data ingestion and analysis first
- No need for private keys or API authentication
- Reduces complexity and security risks
- Enables paper trading without financial risk

### Why Gamma API + CLOB API?
- **Gamma API**: Better for discovery (slugs, rolling markets)
- **CLOB API**: More detailed market metadata (fees, tick size)
- Complementary data sources

### Why Cache Market Metadata?
- Reduces API load
- Improves performance
- Market metadata rarely changes during trading

### Why Event Emitter for WebSocket?
- Decouples data reception from processing
- Allows multiple listeners
- Standard Node.js pattern

## Extensibility Points

### Custom Strategies
Future strategy interface could extend:
```typescript
interface Strategy {
  onOrderbookUpdate(message: OrderBookMessage): void;
  onMarketTransition(oldMarket: string, newMarket: string): void;
  shouldExecuteTrade(): boolean;
  calculateOrderSize(): number;
}
```

### Custom Data Sources
Additional data can be integrated:
```typescript
// Example: Price feeds
interface PriceFeed {
  subscribe(callback: (price: number) => void): void;
}

// Example: News feeds
interface NewsFeed {
  onNews(callback: (news: NewsItem) => void): void;
}
```

### Persistence Layer
Future database integration:
```typescript
interface PersistenceAdapter {
  saveOrder(order: VirtualOrder): Promise<void>;
  getWalletState(): Promise<WalletState>;
}
```

## Performance Considerations

### Memory
- Market cache grows with usage (could implement LRU cache)
- Transaction history unbounded (could implement rolling window)
- WebSocket messages processed in real-time

### Network
- WebSocket: Single persistent connection
- HTTP: Polling can be rate-limited (future: exponential backoff)
- Caching reduces redundant API calls

### Latency
- WebSocket: Real-time (~100ms)
- Market resolution: Single HTTP request (~200-500ms)
- Order simulation: In-memory (~1ms)

## Security

### Current (Read-Only)
- No sensitive data stored
- No authentication required
- All APIs are public

### Future (Live Trading)
- Private keys in secure storage (not in .env)
- API credentials in environment variables
- Signature generation for orders
- Rate limiting to prevent abuse

## Testing Strategy

### Unit Tests
- Service methods (market resolution, parsing)
- Wallet calculations (fees, PnL, slippage)
- Type conversions

### Integration Tests
- Live API calls (with mocking option)
- WebSocket connection and reconnection
- End-to-end market resolution

### Manual Testing
- Different market types (YES/NO, Up/Down)
- Rolling market transitions
- Edge cases (expired markets, invalid inputs)

## Future Enhancements

### Phase 3: Auto-Discovery
- MarketPoller service for continuous monitoring
- Event-driven market transitions
- Automatic subscription management

### Phase 4: Live Trading
- Wallet integration
- Order placement via CLOB API
- Position management
- Risk controls

### Phase 5: Strategy Framework
- Pluggable strategy system
- Backtesting engine
- Performance analytics
- Multi-market trading

---

## Diagrams

### Class Diagram

```
┌─────────────────┐
│ MarketResolver  │
├─────────────────┤
│ - clobClient    │
│ - gammaApiBase  │
├─────────────────┤
│ + resolve()     │
│ + parseInput()  │
│ + fetchEvent()  │
└─────────────────┘
         │
         │ uses
         ▼
┌─────────────────┐
│ MarketService   │
├─────────────────┤
│ - marketCache   │
│ - tickSizeCache │
├─────────────────┤
│ + getMarket()   │
│ + extractIds()  │
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│ OrderbookStream │◄──────┤ VirtualWallet   │
├─────────────────┤       ├─────────────────┤
│ - ws            │       │ - balance       │
│ - subscriptions │       │ - positions     │
├─────────────────┤       │ - transactions  │
│ + connect()     │       ├─────────────────┤
│ + subscribe()   │       │ + simulateBuy() │
│ + on()          │       │ + simulateSell()│
└─────────────────┘       └─────────────────┘
```

---

**Last Updated:** 2026-02-05  
**Version:** 0.2.0
