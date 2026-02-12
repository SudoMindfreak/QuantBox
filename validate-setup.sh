#!/usr/bin/env bash
# Quick validation script for Polymarket 15-min market flow

echo "═══════════════════════════════════════════════════════════"
echo "     🔍 QuantBox Flow Validation - Quick Check"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check 1: Environment files
echo "[1/7] Checking environment configuration..."
if [ ! -f "quantbox-server/.env" ]; then
    echo "⚠️  quantbox-server/.env not found (using .env.example as fallback)"
else
    echo "✓ quantbox-server/.env exists"
fi

if [ ! -f "quantbox-core/.env" ]; then
    echo "⚠️  quantbox-core/.env not found (using .env.example as fallback)"
else
    echo "✓ quantbox-core/.env exists"
fi

# Check 2: Python availability
echo ""
echo "[2/7] Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✓ $PYTHON_VERSION"
else
    echo "❌ Python3 not found"
    exit 1
fi

# Check 3: Node modules
echo ""
echo "[3/7] Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✓ Root dependencies installed"
else
    echo "⚠️  Root node_modules missing - run: npm install"
fi

# Check 4: Database
echo ""
echo "[4/7] Checking database..."
if [ -f "quantbox-server/quantbox.db" ]; then
    DB_SIZE=$(ls -lh quantbox-server/quantbox.db | awk '{print $5}')
    echo "✓ Database exists ($DB_SIZE)"
else
    echo "⚠️  Database not found - run: npm run db:migrate"
fi

# Check 5: Python library
echo ""
echo "[5/7] Checking quantbox.py library..."
if [ -f "quantbox-core/python/quantbox.py" ]; then
    LINES=$(wc -l < quantbox-core/python/quantbox.py)
    echo "✓ quantbox.py found ($LINES lines)"
else
    echo "❌ quantbox.py library missing"
    exit 1
fi

# Check 6: Example strategies
echo ""
echo "[6/7] Checking example strategies..."
EXAMPLES=$(ls quantbox-core/examples/*.py 2>/dev/null | wc -l)
echo "✓ Found $EXAMPLES example strategies"

# Check 7: Server process
echo ""
echo "[7/7] Checking server status..."
if lsof -i:3001 &> /dev/null; then
    echo "✓ Server running on port 3001"
else
    echo "⚠️  Server not running (start with: npm run dev:server)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "                   ✅ Validation Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Start server: npm run dev:server"
echo "  2. Run E2E tests: tsx test-e2e-flow.ts"
echo "  3. Start UI: npm run dev:ui"
echo ""
