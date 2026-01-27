#!/bin/bash

echo "🐳 Starting Adaptive Astro Scheduler - Full Local Mode"
echo "======================================================="
echo "This includes the local ephemeris backend (no external API required)"
echo ""

# Navigate to docker directory
cd "$(dirname "$0")/docker"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Build and start services
echo "📦 Building Docker images (this may take a few minutes for first run)..."
docker-compose -f docker-compose.local.yml build

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose -f docker-compose.local.yml down 2>/dev/null

# Start services
echo "🚀 Starting all services..."
docker-compose -f docker-compose.local.yml up -d

# Show status
echo ""
echo "✅ Services starting! Status:"
docker-compose -f docker-compose.local.yml ps

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."
echo "   (Ephemeris service downloads ~17MB data on first run)"

# Check health status
for i in {1..60}; do
    HEALTHY=$(docker-compose -f docker-compose.local.yml ps --format json 2>/dev/null | grep -c '"healthy"' || echo "0")
    TOTAL=$(docker-compose -f docker-compose.local.yml ps --format json 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$HEALTHY" -ge 3 ]; then
        break
    fi
    
    if [ $((i % 10)) -eq 0 ]; then
        echo "   Still waiting... ($i seconds)"
    fi
    sleep 1
done

echo ""
echo "🎉 Full local development environment ready!"
echo ""
echo "📡 Services:"
echo "   • Ephemeris API:  http://localhost:8000"
echo "   • Backend API:    http://localhost:3001"
echo "   • Frontend:       http://localhost:5173"
echo "   • PostgreSQL:     localhost:5432"
echo "   • Redis:          localhost:6379"
echo ""
echo "🏥 Health checks:"
echo "   curl http://localhost:8000/health  # Ephemeris"
echo "   curl http://localhost:3001/health  # Backend"
echo ""
echo "📋 View logs:    docker-compose -f docker/docker-compose.local.yml logs -f"
echo "🛑 Stop:         docker-compose -f docker/docker-compose.local.yml down"
echo ""
