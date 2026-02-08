#!/bin/bash

# Development Mode Startup Script
# Runs infrastructure in Docker, backend and frontend locally

set -e

echo "🚀 Starting Adaptive Astro Scheduler - Development Mode"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Start Docker infrastructure
echo -e "${BLUE}📦 Starting Docker infrastructure (Ephemeris + PostgreSQL + Redis)...${NC}"
docker-compose -f docker/docker-compose.dev.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 5

# Check if services are running
if docker ps | grep -q astro_ephemeris_dev && \
   docker ps | grep -q astro_postgres_dev && \
   docker ps | grep -q astro_redis_dev; then
    echo -e "${GREEN}✅ Docker services are running${NC}"
else
    echo -e "${YELLOW}⚠️  Some Docker services may not be running yet. Check with: docker ps${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Infrastructure is ready!${NC}"
echo ""
echo "Next steps:"
echo -e "${BLUE}1. Backend:${NC}  cd backend && npm run dev"
echo -e "${BLUE}2. Frontend:${NC} cd frontend && npm run dev"
echo ""
echo "Services:"
echo "  • Ephemeris API: http://localhost:8000"
echo "  • PostgreSQL:    localhost:5432"
echo "  • Redis:         localhost:6379"
echo "  • Backend API:   http://localhost:3001 (after npm run dev)"
echo "  • Frontend:      http://localhost:5173 (after npm run dev)"
echo ""
echo "To stop infrastructure: docker-compose -f docker/docker-compose.dev.yml down"
