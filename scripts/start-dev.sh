#!/bin/bash

# Adaptive Astro Scheduler - Unified Development Startup Script
# This script starts Docker infrastructure, builds shared assets, 
# and runs backend/frontend concurrently.

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Adaptive Astro Scheduler in Development Mode...${NC}"

# Function to handle cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down processes...${NC}"
    # Kill all background processes started by this script
    pkill -P $$ || true
    echo -e "${GREEN}✅ All local processes stopped.${NC}"
    echo -e "${BLUE}💡 Note: Docker containers are still running. Use 'npm run stop' to stop them.${NC}"
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# 1. Check for Docker
echo -e "${BLUE}📦 Checking Docker infrastructure...${NC}"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker is running.${NC}"
    echo -e "${YELLOW}⏳ Starting containers (PostgreSQL, Redis, Ephemeris)...${NC}"
    docker-compose -f docker/docker-compose.dev.yml up -d
else
    echo -e "${RED}⚠️  Docker is NOT running or NOT installed.${NC}"
    echo -e "${YELLOW}⚠️  Backend will likely fail to connect to Database/Redis.${NC}"
    echo -e "${YELLOW}⚠️  Please start Docker Desktop or set up services manually.${NC}"
    echo -e ""
    read -p "Do you want to continue starting local servers anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 2. Build Shared Package
echo -e "${BLUE}🔨 Building shared package...${NC}"
npm run build --workspace=shared

# 3. Start Backend and Frontend concurrently
echo -e "${BLUE}📡 Starting Backend and Frontend servers...${NC}"

# Start Backend
(
  echo -e "${BLUE}[Backend] Starting...${NC}"
  cd backend && npm run dev
) &

# Start Frontend
(
  echo -e "${BLUE}[Frontend] Starting...${NC}"
  cd frontend && npm run dev
) &

echo -e ""
echo -e "${GREEN}✨ Both servers are starting!${NC}"
echo -e "  • Frontend: http://localhost:5173"
echo -e "  • Backend:  http://localhost:3001"
echo -e ""
echo -e "${YELLOW}⌨️  Press Ctrl+C to stop local servers (Docker will keep running)${NC}"
echo -e ""

# Wait for background processes
wait
