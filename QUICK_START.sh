#!/bin/bash

# Zodiac Wheel Test Page - Quick Start Script
# This script helps you start the application quickly

echo "🌟 Adaptive Astro-Scheduler - Zodiac Wheel Test Page"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   cd /path/to/adaptive-astro-scheduler"
    exit 1
fi

echo "📋 Checking dependencies..."
echo ""

# Check if node_modules exist
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "✅ Dependencies ready!"
echo ""
echo "🚀 Starting services..."
echo ""
echo "This will open 2 terminal tabs:"
echo "  1. Backend server (port 3001)"
echo "  2. Frontend dev server (port 5173)"
echo ""

# Detect OS and open terminals accordingly
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "Starting on macOS..."

    # Start backend
    osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'/backend\" && npm run dev"'

    # Start frontend
    osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'/frontend\" && npm run dev"'

    echo ""
    echo "✅ Servers starting in new terminal tabs!"

elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "Starting on Linux..."

    # Try different terminal emulators
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd backend && npm run dev; exec bash"
        gnome-terminal -- bash -c "cd frontend && npm run dev; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd backend && npm run dev" &
        xterm -e "cd frontend && npm run dev" &
    else
        echo "⚠️  Could not detect terminal. Please run manually:"
        echo "   Terminal 1: cd backend && npm run dev"
        echo "   Terminal 2: cd frontend && npm run dev"
    fi

else
    echo "⚠️  Unknown OS. Please run manually:"
    echo "   Terminal 1: cd backend && npm run dev"
    echo "   Terminal 2: cd frontend && npm run dev"
fi

echo ""
echo "⏳ Waiting for servers to start (10 seconds)..."
sleep 10

echo ""
echo "🎉 Ready! Open your browser to:"
echo ""
echo "   🧪 Test Page:  http://localhost:5173/zodiac-wheel-test"
echo "   🎨 Demo Page:  http://localhost:5173/zodiac-wheel-demo"
echo "   🏠 Home:       http://localhost:5173/"
echo ""
echo "Quick Test (2 minutes):"
echo "  1. Open: http://localhost:5173/zodiac-wheel-test"
echo "  2. Click 'Automated Tests' tab"
echo "  3. Click 'Run Tests' button"
echo "  4. Verify all tests pass ✅"
echo ""
echo "Troubleshooting:"
echo "  • Backend logs: Check Terminal tab 1"
echo "  • Frontend logs: Check Terminal tab 2"
echo "  • Browser errors: Press F12 > Console"
echo "  • Full guide: See RUN_TEST_PAGE.md"
echo ""
