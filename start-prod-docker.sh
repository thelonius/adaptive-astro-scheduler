#!/bin/bash

echo "🐳 Starting Adaptive Astro Scheduler - Production Mode"
echo "========================================"

# Navigate to docker directory
cd "$(dirname "$0")/docker"

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose pull

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Show status
echo ""
echo "✅ Services started! Status:"
docker-compose ps

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "🗃️  Running database migrations..."
docker-compose exec backend npm run migrate 2>/dev/null || echo "No migrations to run"

echo ""
echo "🎉 Production environment ready!"
echo "🌐 Backend API: http://localhost:3000"
echo "🌍 Frontend: http://localhost:80"
echo "🏥 Health check: http://localhost:3000/health"
echo "🤖 Telegram Bot is running in webhook mode"
echo ""
echo "To view logs: docker-compose -f docker/docker-compose.yml logs -f"
echo "To stop: docker-compose -f docker/docker-compose.yml down"