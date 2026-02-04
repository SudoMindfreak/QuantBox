# QuantBox Core - TODO & Roadmap

## 🚀 Phase 3: Auto-Discovery & Continuous Monitoring (Next)

### MarketPoller Service
- [ ] Create `MarketPoller` service class
- [ ] Implement scheduled polling of Gamma API for rolling markets
- [ ] Add configurable polling intervals (env: `POLLING_INTERVAL_MS`)
- [ ] Handle rate limiting and backoff strategies
- [ ] Add health check and error recovery

### Event-Driven Architecture
- [ ] Event emitter for market lifecycle events
  - `market:detected` - New market instance found
  - `market:active` - Market becomes active
  - `market:expiring` - Market approaching end time
  - `market:expired` - Market has ended
- [ ] Subscriber pattern for market updates
- [ ] Clean shutdown and cleanup logic

### Auto-Subscription
- [ ] Automatic WebSocket subscription switching
- [ ] Graceful unsubscribe from expired markets
- [ ] Position migration logic (optional feature)
- [ ] Market transition notifications

### Testing & Validation
- [ ] Unit tests for MarketPoller
- [ ] Integration tests with live rolling markets
- [ ] Mock Gamma API for testing
- [ ] Test market transition edge cases

## 📚 Documentation Updates

### README
- [ ] Add Phase 2 usage examples with URLs
- [ ] Add CLI usage patterns
- [ ] Add troubleshooting section
- [ ] Add API reference links

### New Docs
- [ ] API.md - Document all public methods and types
- [ ] ARCHITECTURE.md - System design and data flow
- [ ] CONTRIBUTING.md - Guidelines for contributors
- [ ] Examples directory with sample scripts

## 🔧 Technical Debt & Improvements

### Code Quality
- [ ] Add logging framework (replace console.log)
- [ ] Implement proper error classes
- [ ] Add input validation and sanitization
- [ ] Add rate limiting for API calls

### Performance
- [ ] Implement response caching with TTL
- [ ] Add connection pooling for HTTP requests
- [ ] Optimize WebSocket reconnection logic
- [ ] Monitor and optimize memory usage

### Developer Experience
- [ ] Add CLI tool with commands (init, trade, monitor)
- [ ] Interactive mode for testing markets
- [ ] Pretty-print orderbook in terminal
- [ ] Add debug mode with verbose logging

## 🎯 Phase 4: Live Trading (Future)

### Authentication & Security
- [ ] Wallet integration (private key management)
- [ ] Signature generation for orders
- [ ] API key management
- [ ] Secure credential storage

### Order Execution
- [ ] Place real limit orders via CLOB API
- [ ] Order status tracking and updates
- [ ] Order cancellation
- [ ] Fill notifications

### Risk Management
- [ ] Position size limits
- [ ] Maximum drawdown protection
- [ ] Stop-loss integration
- [ ] Balance monitoring and alerts

### Strategy Framework
- [ ] Strategy interface and base class
- [ ] Backtesting framework
- [ ] Paper trading mode toggle
- [ ] Strategy performance metrics

## 🌟 Advanced Features (Ideas)

### Multi-Market Trading
- [ ] Portfolio tracking across multiple markets
- [ ] Correlation analysis between markets
- [ ] Hedging strategies
- [ ] Cross-market arbitrage detection

### Analytics & Reporting
- [ ] Trade history export (CSV, JSON)
- [ ] Performance dashboards
- [ ] PnL charts and visualization
- [ ] Market analysis tools

### Integration
- [ ] Webhook support for external systems
- [ ] REST API server for remote control
- [ ] Database integration for persistence
- [ ] Telegram/Discord bot integration

### AI/ML Features
- [ ] Price prediction models
- [ ] Sentiment analysis integration
- [ ] Smart order routing
- [ ] Automated market making

## 🐛 Known Issues

### Minor Issues
- Debug logging still present in MarketResolver (line 190)
- Variable names `yes`/`no` in extractTokenIds don't match all market types
- No retry logic for failed Gamma API requests
- EPIPE error when piping output (cosmetic)

### Enhancement Opportunities
- Market metadata could include more Gamma API fields (volume, liquidity)
- Rolling market detection could support different time windows (not just 15min)
- WebSocket could handle multiple asset subscriptions more efficiently

## 📊 Metrics & Monitoring (Future)

- [ ] Add performance metrics collection
- [ ] API response time tracking
- [ ] WebSocket connection health monitoring
- [ ] Trade execution latency measurement
- [ ] Error rate tracking

---

**Priority Legend:**
- 🔴 High Priority - Blocking or critical features
- 🟡 Medium Priority - Important but not blocking
- 🟢 Low Priority - Nice to have

**Current Focus:** Phase 3 - Auto-Discovery & Continuous Monitoring
