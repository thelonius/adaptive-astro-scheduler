#!/bin/bash

# Quick development server starter - minimal version
# Usage: ./quick-dev.sh

echo "🚀 Quick Dev Start"

# Kill any existing processes on our ports
lsof -ti :3000 | xargs -r kill 2>/dev/null
lsof -ti :3001 | xargs -r kill 2>/dev/null

# Start backend
echo "🔧 Backend starting..."
cd backend && PORT=3001 npm run dev &

# Start frontend  
echo "🌐 Frontend starting..."
cd frontend && npm run dev &

echo "✅ Servers starting..."
echo "📡 Backend: http://localhost:3001"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"

# Wait for processes
wait