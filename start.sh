#!/bin/bash

echo "🧬 HelixVault Startup Script"
echo "=============================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "   Copy .env.example to .env and add your API keys"
    echo ""
    read -p "Press Enter to continue anyway or Ctrl+C to exit..."
fi

# Check if node_modules exists in frontend
if [ ! -d frontend/node_modules ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Check if ethers is installed
if ! grep -q '"ethers"' frontend/package.json; then
    echo "📦 Installing ethers.js..."
    cd frontend && npm install ethers@6 && cd ..
fi

echo ""
echo "🚀 Starting services..."
echo ""
echo "This will open 2 terminal windows:"
echo "  1. Python API Server (port 8000)"
echo "  2. Next.js Frontend (port 3000)"
echo ""

# Start API server in new terminal
echo "Starting API server..."
gnome-terminal -- bash -c "cd ai-agent && echo '🐍 Starting Python API Server' && echo '==============================' && echo '' && uvicorn api.main:app --reload --port 8000; exec bash" 2>/dev/null || \
xterm -e "cd ai-agent && echo '🐍 Starting Python API Server' && echo '==============================' && echo '' && uvicorn api.main:app --reload --port 8000; bash" 2>/dev/null || \
konsole -e "cd ai-agent && echo '🐍 Starting Python API Server' && echo '==============================' && echo '' && uvicorn api.main:app --reload --port 8000; bash" 2>/dev/null || \
echo "⚠️  Could not open new terminal. Run this manually:"
echo "   cd ai-agent && uvicorn api.main:app --reload --port 8000"

sleep 2

# Start frontend in new terminal
echo "Starting frontend..."
gnome-terminal -- bash -c "cd frontend && echo '⚛️  Starting Next.js Frontend' && echo '=============================' && echo '' && npm run dev; exec bash" 2>/dev/null || \
xterm -e "cd frontend && echo '⚛️  Starting Next.js Frontend' && echo '=============================' && echo '' && npm run dev; bash" 2>/dev/null || \
konsole -e "cd frontend && echo '⚛️  Starting Next.js Frontend' && echo '=============================' && echo '' && npm run dev; bash" 2>/dev/null || \
echo "⚠️  Could not open new terminal. Run this manually:"
echo "   cd frontend && npm run dev"

echo ""
echo "✅ Services started!"
echo ""
echo "📋 Next steps:"
echo "   1. Wait for both servers to start (may take 10-30 seconds)"
echo "   2. Open http://localhost:3000 in your browser"
echo "   3. Make sure MetaMask is on Sepolia testnet"
echo "   4. Start minting! 🧬"
echo ""
echo "📚 Need help? Check TROUBLESHOOTING.md"
echo ""
