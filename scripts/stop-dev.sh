#!/bin/bash

# Adaptive Astro Scheduler - Cleanup Script
# This script stops Docker infrastructure and ensures no node processes are leaking.

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🛑 Stopping Adaptive Astro Scheduler Infrastructure...${NC}"

# 1. Stop Docker containers
if command -v docker-compose >/dev/null 2>&1; then
    echo -e "${YELLOW}🐳 Stopping Docker containers...${NC}"
    docker-compose -f docker/docker-compose.dev.yml down
    echo -e "${GREEN}✅ Docker containers stopped.${NC}"
else
    echo -e "${YELLOW}⚠️  docker-compose not found, skipping Docker cleanup.${NC}"
fi

# 2. Cleanup leaked node processes (optional but helpful)
echo -e "${YELLOW}🔍 Checking for leaked Node.js processes on dev ports...${NC}"

# Backend port 3001
BE_PID=$(lsof -t -i:3001 || true)
if [ ! -z "$BE_PID" ]; then
    echo -e "Stopping process on port 3001..."
    kill -9 $BE_PID 2>/dev/null || true
fi

# Frontend port 5173
FE_PID=$(lsof -t -i:5173 || true)
if [ ! -z "$FE_PID" ]; then
    echo -e "Stopping process on port 5173..."
    kill -9 $FE_PID 2>/dev/null || true
fi

echo -e "${GREEN}✨ Cleanup complete!${NC}"
