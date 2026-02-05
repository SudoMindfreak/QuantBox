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
├── quantbox-server/      # Hono & Socket.io bridge (Strategy Execution)
├── quantbox-ui/          # Next.js Visual Node Editor (React Flow)
├── docs/                 # Shared documentation
└── docker-compose.yml    # Docker orchestration

## 🚀 Quick Start

The easiest way to run QuantBox is using Docker:

```bash
# Start all services (UI on :3000, Server on :3001)
docker compose up --build
```

### Manual Development Setup

If you prefer to run services individually:

```bash
# 1. Install all dependencies at the root
npm install

# 2. Build the core library
npm run build:core

# 3. Start the server (Strategy Runner)
npm run dev:server

# 4. Start the UI (Visual Editor)
npm run dev:ui
```

## ✨ Features

### ✅ Phase 1: Virtual Trading Engine
- **Real-time Orderbook**: WebSocket streaming from Polymarket
- **Paper Trading**: Simulate orders without real money
- **Market Metadata**: Fetch market details via CLOB API

### ✅ Phase 2: URL & Slug Market Discovery
- **Smart Market Resolution**: Use URLs or slugs (e.g., `btc-updown-15m`)
- **Gamma API Integration**: Intelligent market fetching
- **Rolling Market Support**: Automatic discovery of active market instances

### ✅ Phase 2.5: Visual Strategy Framework (Current)
- **Node-Based Editor**: Connect Market Detectors to Logic and Actions
- **Strategy Runner**: Server-side execution of visual graphs
- **Live Logs**: Real-time terminal for strategy monitoring
- **Virtual Wallet**: Track balance and PnL per strategy instance

### 📅 Future Phases
- **Phase 3**: Strategy Backtesting (Time Machine)
- **Phase 4**: Live trading with real capital
- **Phase 5**: Advanced Logic (State Nodes, Loops, Custom Scripts)
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
