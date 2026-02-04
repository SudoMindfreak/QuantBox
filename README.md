# QuantBox

> **Visual, Node-Based Execution Engine for Algorithmic Trading**

QuantBox is an open-source algorithmic trading platform focused on Polymarket, designed to make trading strategies accessible through a visual, node-based interface. Build, backtest, and execute complex trading logic without writing code.

🚀 **Status:** Early Development - Phase 2 Complete (URL-Based Market Discovery)

---

## 🎯 Mission

Create a powerful yet accessible trading platform where users can:
- Build strategies visually using a node-based editor
- Backtest strategies on historical data
- Execute trades automatically on Polymarket
- Share and remix strategies with the community

## 📦 Project Structure

```
QuantBox/
├── quantbox-core/        # Core trading engine (TypeScript)
│   ├── src/
│   │   ├── services/     # Market resolution & metadata
│   │   ├── engine/       # Orderbook streaming & virtual wallet
│   │   └── types/        # TypeScript type definitions
│   └── README.md         # Core engine documentation
│
├── quantbox-ui/          # Visual node editor (Coming Soon)
├── quantbox-strategies/  # Community strategies (Coming Soon)
└── docs/                 # Shared documentation
    ├── PROJECT.md        # Vision & roadmap
    ├── ARCHITECTURE.md   # Technical architecture
    ├── API.md           # API reference
    ├── CHANGELOG.md     # Version history
    ├── TODO.md          # Development roadmap
    └── CONTRIBUTING.md  # Contribution guidelines
```

## 🚀 Quick Start

### QuantBox Core (Trading Engine)

The core engine provides real-time market data and paper trading capabilities:

```bash
# Navigate to core
cd quantbox-core

# Install dependencies
npm install

# Run the demo
npm run dev bitcoin-crosses-100000
```

**No authentication required for Phase 1 & 2!** The engine uses public APIs for market data and orderbook streaming.

See [`quantbox-core/README.md`](quantbox-core/README.md) for detailed usage.

## ✨ Features

### ✅ Phase 1: Virtual Trading Engine (Complete)
- **Real-time Orderbook**: WebSocket streaming from Polymarket
- **Paper Trading**: Simulate orders without real money
- **Market Metadata**: Fetch market details via CLOB API
- **PnL Tracking**: Calculate realized and unrealized profits

### ✅ Phase 2: URL-Based Market Discovery (Complete)
- **Smart Market Resolution**: Use URLs or slugs instead of condition IDs
- **Gamma API Integration**: Fetch market data from Polymarket's public API
- **Rolling Market Support**: Detect and handle time-sensitive markets
- **Flexible Binary Markets**: Support for YES/NO, Up/Down, Higher/Lower

### 🔄 Phase 3: Auto-Discovery (In Progress)
- Market polling for rolling markets
- Auto-subscription to new market instances
- Event-driven architecture

### 📅 Future Phases
- **Phase 4**: Live trading with real capital
- **Phase 5**: Visual node editor & strategy framework
- **Phase 6**: Community strategy marketplace

## 🛠️ Technology Stack

- **Core Engine**: TypeScript, Node.js
- **APIs**: Polymarket CLOB API, Gamma API, WebSocket
- **Future UI**: React, Node-based editor library
- **Future Backend**: PostgreSQL, Redis

## 📖 Documentation

- **[PROJECT.md](docs/PROJECT.md)** - Vision, mission, and high-level roadmap
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design and technical decisions
- **[API.md](docs/API.md)** - Complete API reference
- **[CHANGELOG.md](docs/CHANGELOG.md)** - Version history and changes
- **[TODO.md](docs/TODO.md)** - Development roadmap and tasks
- **[CONTRIBUTING.md](docs/CONTRIBUTING.md)** - How to contribute

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](docs/CONTRIBUTING.md) before submitting PRs.

Quick ways to contribute:
- 🐛 Report bugs via GitHub Issues
- 💡 Suggest features or improvements
- 📝 Improve documentation
- 🔧 Submit bug fixes or enhancements
- 🧪 Write tests

## 📊 Current Status

**Core Engine Progress:**
- ✅ WebSocket orderbook streaming
- ✅ Virtual wallet & paper trading
- ✅ Market metadata service
- ✅ URL-based market discovery
- ✅ Gamma API integration
- 🔄 Auto-discovery for rolling markets (next)

**Overall Project:**
- ✅ Core trading engine (quantbox-core)
- ⏳ Visual node editor (quantbox-ui)
- ⏳ Strategy framework
- ⏳ Community marketplace

## 🔐 Security & Risk

**Current (Read-Only Mode):**
- No authentication required
- No real money involved
- All APIs are public

**Future (Live Trading):**
- Optional: Private key for signing transactions
- Optional: API credentials for live trading
- Risk management controls
- Position size limits

⚠️ **Disclaimer:** This software is in early development. Use at your own risk. Never risk more than you can afford to lose.

## 📜 License

MIT License - see [LICENSE](LICENSE) for details

## 🌟 Acknowledgments

- Built on top of [@polymarket/clob-client](https://github.com/Polymarket/clob-client)
- Inspired by visual programming platforms like Node-RED and Unreal Blueprints
- Community feedback and contributions

---

## 🔗 Links

- **Documentation**: [docs/](docs/)
- **Core Engine**: [quantbox-core/](quantbox-core/)
- **GitHub Issues**: Report bugs or request features
- **Polymarket**: [https://polymarket.com](https://polymarket.com)

---

<p align="center">
  Made with ❤️ by the QuantBox community
</p>
