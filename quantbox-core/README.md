# QuantBox Core - Trading Engine

> **Back to:** [QuantBox Root](../README.md) | **Docs:** [Architecture](../docs/ARCHITECTURE.md) | [API Reference](../docs/API.md) | [Contributing](../docs/CONTRIBUTING.md)

The core trading engine for QuantBox. Provides real-time market data, orderbook streaming, and paper trading capabilities for Polymarket.

---

## 🚀 Quick Start (No Authentication Required!)

**Phase 1 & 2** use **public data only** - no API keys or private keys needed!

### 1. Install Dependencies
```bash
cd quantbox-core
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

**Optional settings:**
```bash
INITIAL_VIRTUAL_BALANCE=10000                    # Your starting virtual USDC
MARKET_URL=bitcoin-crosses-100000                # Market to trade (URL, slug, or ID)
```

### 3. Run with Any Market

**✨ Phase 2:** Use URLs or slugs directly - no need to find condition IDs!

```bash
# By market slug
npm run dev bitcoin-crosses-100000

# By full URL
npm run dev https://polymarket.com/event/bitcoin-crosses-100000

# By condition ID (backward compatible)
npm run dev 0xabc123...

# Or set in .env and just run
npm run dev
```
```bash
npm run dev
```

## ✅ Features (No Authentication Required)

### Phase 1: Virtual Trading Engine ✅
- ✅ **WebSocket Orderbook Stream** - Real-time bids/asks
- ✅ **Market Metadata API** - Tick size, fees, token IDs
- ✅ **Virtual Wallet** - Full paper trading simulation
- ✅ **PnL Tracking** - Realistic P&L calculations

### Phase 2: URL-Based Market Discovery ✅
- ✅ **Smart Market Resolution** - Use URLs, slugs, or condition IDs
- ✅ **Gamma API Integration** - Fetch market data from Polymarket's public API
- ✅ **Rolling Market Support** - Detect and handle time-sensitive markets
- ✅ **Flexible Binary Markets** - YES/NO, Up/Down, Higher/Lower support

## 🔒 What Requires Authentication (Phase 4)

- ❌ **Posting Real Orders** - Buying/selling with real USDC
- ❌ **Checking Real Balances** - Your actual Polymarket holdings
- ❌ **Private Account Data** - Order history, fills

---

## 📊 Example Output

```
🔮 QuantBox - Virtual Trading Engine Demo

💡 Phase 1: Paper Trading (No Authentication Required)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Step 1: Initialize Read-Only CLOB Client
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Read-only client initialized
   → No private key required
   → Can access: Market metadata ✓, Orderbooks ✓, WebSocket ✓

... (live orderbook updates)

🛒 Simulating BUY: 10 YES tokens (MARKET)
✅ FILLED: 10.00 tokens @ $0.5234 (avg)
   Cost: $5.23 + Fees: $0.01 = $5.24
   Slippage: 0.0234%
   New balance: $9994.76

═══════════════════════════════════════════════════════════
                    💼 VIRTUAL WALLET SUMMARY
═══════════════════════════════════════════════════════════
💰 USDC Balance: $9994.76
📊 Total PnL: $0.00 (Realized: $0.00, Unrealized: $0.00)
📈 Active Positions: 1

────────────────── POSITIONS ──────────────────
  YES: 10.00 @ $0.5234
    Current: $0.5234 | PnL: $0.00
═══════════════════════════════════════════════════════════
```

## 🏗 Project Structure

```
quantbox-core/
├── src/
│   ├── engine/
│   │   ├── stream.ts         # WebSocket orderbook (PUBLIC)
│   │   └── wallet.ts         # Virtual wallet simulator
│   ├── services/
│   │   ├── MarketResolver.ts # URL-based market discovery (NEW!)
│   │   └── MarketService.ts  # Market metadata (PUBLIC API)
│   ├── types/
│   │   └── polymarket.ts     # TypeScript interfaces
│   └── index.ts              # Main demo (NO AUTH!)
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔧 Troubleshooting

**Q: I'm getting TypeScript errors**  
A: Run `npm install` to ensure all dependencies are installed

**Q: "Market not found for slug" error**  
A: The market may have expired or the slug is incorrect. Verify on [Polymarket](https://polymarket.com)

**Q: WebSocket won't connect**  
A: Check your internet connection. The WebSocket endpoint is public and doesn't require authentication.

**Q: How do I find the right market URL/slug?**  
A: Browse to the market on Polymarket and copy the URL or slug from the address bar

**Q: Which markets are supported?**  
A: All binary markets (2 outcomes) are supported, including YES/NO, Up/Down, Higher/Lower, etc.

## 📚 Documentation

- **[API Reference](../docs/API.md)** - Complete method documentation
- **[Architecture](../docs/ARCHITECTURE.md)** - System design and data flow
- **[Changelog](../docs/CHANGELOG.md)** - Version history
- **[TODO](../docs/TODO.md)** - Roadmap and upcoming features
- **[Contributing](../docs/CONTRIBUTING.md)** - Contribution guidelines

## 🚀 Next Steps

**Phase 3** (In Progress):
- MarketPoller for auto-discovery of rolling markets
- Event-driven architecture for market transitions
- Auto-subscription to newly detected markets

**Phase 4** (Future):
- Live trading with authentication
- Strategy framework
- Visual node editor
- Community marketplace

---

**Need help?** Check the [main documentation](../docs/) or open an issue on GitHub.
