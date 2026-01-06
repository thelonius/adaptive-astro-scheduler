#!/bin/bash

# Adaptive Astro-Scheduler - Development Server Starter
# Starts both backend and frontend in development mode

set -e

echo "🚀 Starting Adaptive Astro-Scheduler Development Environment"
echo "============================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping development servers...${NC}"
    jobs -p | xargs -r kill
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Check if node_modules exist
echo -e "${BLUE}📦 Checking dependencies...${NC}"

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Start backend server
echo -e "${GREEN}🔧 Starting backend server (port 3001)...${NC}"
cd backend
PORT=3001 npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo -e "${GREEN}🌐 Starting frontend server (port 3000)...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}✅ Development servers started successfully!${NC}"
echo ""
echo -e "${BLUE}📡 Backend API:${NC} http://localhost:3001"
echo -e "${BLUE}🌐 Frontend App:${NC} http://localhost:3000" 
echo -e "${BLUE}🏥 Health Check:${NC} http://localhost:3001/health"
echo -e "${BLUE}📊 Ephemeris API:${NC} http://localhost:3001/api/ephemeris/planets"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for background processes
wait