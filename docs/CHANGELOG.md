# QuantBox Core - Changelog

All notable changes to the QuantBox Core engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Phase 3 (Planned)
- MarketPoller service for continuous rolling market detection
- Auto-subscription to newly detected markets
- Event-driven architecture for market transitions
- Enhanced error handling and retry logic

## [0.2.0] - 2026-02-04

### Added - Phase 2: URL-Based Market Discovery

#### MarketResolver Service
- URL parsing to extract market slugs from Polymarket URLs
- Gamma API integration for fetching event and market data
- Intelligent handling of JSON-serialized API response fields
- Rollover detection logic for time-sensitive markets
- Support for multiple input formats (URL, slug, condition ID)

#### Type Definitions
- `GammaEvent` interface for Gamma API event responses
- `GammaMarket` interface for Gamma API market responses
- `GammaToken` interface for token metadata
- Updated `MarketMetadata` to simplified core structure

#### Enhancements
- Made `MarketService.extractTokenIds()` flexible for any binary market
- Support for non-YES/NO outcomes (Up/Down, Higher/Lower, etc.)
- CLI argument support for market input
- Environment variable configuration via `MARKET_URL`

#### Documentation
- Updated README with Phase 2 usage examples
- Created comprehensive walkthrough documentation
- Added .env.example with Phase 2 configuration

### Dependencies
- Added `axios` for HTTP requests to Gamma API

## [0.1.0] - 2026-02-02

### Added - Phase 1: Virtual Trading Engine

#### Core Services
- `MarketService`: Fetch and cache market metadata from CLOB API
- `OrderbookStream`: WebSocket connection to live orderbook feed
- `VirtualWallet`: Paper trading simulation engine

#### Virtual Trading Features
- Real-time orderbook monitoring via WebSocket
- Market order simulation (BUY/SELL)
- Fee calculation (taker/maker fees)
- Slippage tracking
- Position tracking and PnL calculation
- Transaction history logging
- Wallet summary reports

#### Type System
- Complete TypeScript type definitions for Polymarket data
- WebSocket message types
- Market metadata types
- Virtual trading types (orders, positions, transactions)

#### Infrastructure
- Read-only CLOB client (no authentication required for Phase 1)
- Keep-alive mechanism for WebSocket connection
- Automatic reconnection logic
- Market metadata caching

#### Documentation
- Initial README with setup instructions
- .env.example template
- Code documentation and comments

### Dependencies
- `@polymarket/clob-client`: Official Polymarket SDK
- `ws`: WebSocket client for orderbook streaming
- `dotenv`: Environment variable management

## Release Notes

### Breaking Changes in 0.2.0
- `MarketMetadata` interface simplified (removed some fields like `description`, `market_slug`)
- `extractTokenIds()` now returns tokens by position rather than by label

### Migration Guide: 0.1.0 → 0.2.0

If you were using condition IDs directly:
```typescript
// Before (0.1.0)
const CONDITION_ID = '0xabc123...';
const market = await marketService.getMarketByConditionId(CONDITION_ID);

// After (0.2.0) - Still works!
const market = await marketService.getMarketByConditionId(CONDITION_ID);

// OR use new resolver
const resolver = new MarketResolver(clobClient);
const market = await resolver.resolve('bitcoin-crosses-100000'); // slug
const market = await resolver.resolve('https://polymarket.com/event/...'); // URL
```

If you were checking for YES/NO tokens:
```typescript
// Before (0.1.0)
const { yes, no } = marketService.extractTokenIds(market);
// Assumed 'yes' was always YES outcome

// After (0.2.0)
const { yes: firstToken, no: secondToken } = marketService.extractTokenIds(market);
// 'yes'/'no' are just variable names, could be Up/Down, Higher/Lower, etc.
// Check market.tokens[0].outcome and market.tokens[1].outcome for actual labels
```
