# 🌊 QuantBox

**QuantBox** is an AI-powered algorithmic trading platform that allows traders to generate, simulate, and host Python-based trading strategies for Polymarket with simple natural language prompts.

## 🚀 The Pivot
We've moved away from complex node-based visual editors to a streamlined **"Prompt-to-Strategy"** workflow.
- **AI-First**: Describe your strategy in plain English. Our expert AI writes the Python logic for you.
- **Secure Execution**: Strategies run in isolated Python environments on our server. Your logic (IP) remains private and hidden from the client.
- **Real-time Feedback**: Watch live logs, trade executions, and P&L metrics as your strategy competes in the market.

## 🛠 Tech Stack
- **Frontend**: Next.js 15, Tailwind CSS, Framer Motion (Bolt.new-inspired UI)
- **Backend**: Node.js (Hono), Socket.io, Drizzle ORM (SQLite)
- **Engine**: Python 3, WebSockets (Polymarket & Binance)

## 🚦 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Copy `.env.example` in both `quantbox-server` and `quantbox-core` to `.env` and fill in your keys.

3. **Database Setup**:
   ```bash
   npm run db:migrate
   ```

4. **Run Development**:
   ```bash
   npm run dev
   ```

## 📂 Project Structure
- `quantbox-ui/`: The modern dashboard and AI chat interface.
- `quantbox-server/`: The API and Python subprocess runner.
- `quantbox-core/`: Core trading libraries and Python strategy templates.