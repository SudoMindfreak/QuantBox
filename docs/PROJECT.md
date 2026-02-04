🔮 QuantBox: Open Source Visual Trading Sandbox

The "n8n" for Algorithmic Trading.
A visual, node-based execution engine for Polymarket (and beyond).

1. 🎯 The Mission

QuantBox bridges the gap between manual trading and high-frequency algorithmic execution.

The Problem: Professional traders have alpha strategies but struggle to code, test, and deploy bots. AI-generated scripts are often buggy and hard to debug.

The Solution: A Visual Sandbox where users execute logic by connecting nodes (e.g., [Price Input] → [Logic] → [Buy Order]).

The Focus: Phase 1 is strictly focused on Polymarket (Prediction Markets), exploiting the niche of "Binary Outcomes" and "Merge/Split Arbitrage."

2. 🏗 Architecture & Stack

The Stack

Runtime: Node.js (v20+) / TypeScript

Frontend: React + React Flow (Visual Canvas)

Database: TimescaleDB (for tick-level historical data & backtesting)

Blockchain: ethers.js (v5 recommended for Polymarket SDK compatibility)

Execution: @polymarket/clob-client

System Data Flow

graph TD
    A[Polymarket WebSocket] -->|Live Orderbook Data| B(Ingestor Engine)
    B --> C{Strategy Router}
    
    C -->|Strategy 1| D[Visual Logic Graph]
    C -->|Strategy 2| E[Visual Logic Graph]

    D -->|Buy Signal| F{Execution Mode}
    
    F -->|Live| G[Polymarket CLOB API]
    F -->|Sandbox| H[Virtual Ledger (Paper Trading)]


3. 🗺 Roadmap & Sprint Plan

Phase 1: The "Invisible" Engine (Current Phase)

Focus: Backend stability, data ingestion, and "Paper Trading" logic.

[x] Repo Initialization: Setup TypeScript & Git environment.

[x] Market Fetcher: Script to resolve Slugs to Condition/Token IDs (fetchMarket.ts).

[ ] Websocket Stream: Connect to wss://ws-subscriptions-clob.polymarket.com/ws/.

[ ] Virtual Wallet: A class to simulate balance, slippage, and PNL without real money.

[ ] Split/Merge Logic: Backend function to calculate if Minting > Buying.

Phase 2: The Visual Canvas

Focus: React Flow integration and User Interface.

[ ] Setup React frontend with TailwindCSS.

[ ] Create Custom Nodes: TriggerNode, ConditionNode, ActionNode.

[ ] Build the "JSON Translator": Convert Visual Graph → Backend Logic.

Phase 3: Launch & Growth

Focus: Open Source community and documentation.

[ ] "Time Machine" Backtesting (Replay historical data).

[ ] Documentation (Docusaurus).

[ ] Public Launch on X & GitHub.

4. 📂 Repository Structure

quantbox-core/
├── src/
│   ├── engine/           # The core trading logic
│   │   ├── stream.ts     # Websocket connections
│   │   ├── wallet.ts     # Virtual & Real wallet logic
│   │   └── executor.ts   # Order placement logic
│   ├── scripts/          # Utility scripts (fetchMarket, testAuth)
│   ├── types/            # TypeScript interfaces
│   └── index.ts          # Main entry point
├── dist/                 # Compiled JS
├── .env                  # Private Keys & API Config (GitIgnored)
└── PROJECT.md            # You are here


5. 🛠 Development Guide

Getting Started

Clone & Install:

git clone [https://github.com/](https://github.com/)[YOUR_USERNAME]/quantbox-core.git
cd quantbox-core
npm install


Environment Setup:
Create a .env file:

PRIVATE_KEY=your_polygon_private_key
POLYMARKET_API_KEY=your_api_key
POLYMARKET_SECRET=your_secret
POLYMARKET_PASSPHRASE=your_passphrase


Run the Market Fetcher (Test):

npx ts-node src/scripts/fetchMarket.ts


Git Workflow

main: Production-ready code only.

develop: Integration branch for new features.

feat/feature-name: Working branches for specific tasks.

6. 📝 Contributor Notes

"Antigravity" / Hand-off Context: * We have successfully fetched Market IDs via REST API.

NEXT TASK: Implement the WebSocket connection in src/engine/stream.ts.

Constraint: Ensure we handle the keep-alive ping every 30s to avoid disconnection.
