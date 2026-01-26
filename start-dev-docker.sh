#!/bin/bash

echo "🐳 Starting Adaptive Astro Scheduler - Development Mode"
echo "========================================="

# Navigate to docker directory
cd "$(dirname "$0")/docker"

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose -f docker-compose.dev.yml pull

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.dev.yml up -d

# Show status
echo ""
echo "✅ Services started! Status:"
docker-compose -f docker-compose.dev.yml ps

# Wait for database to be ready
echo ""
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run database migrations (if needed)
echo "🗃️  Running database migrations..."
docker-compose -f docker-compose.dev.yml exec backend npm run migrate 2>/dev/null || echo "No migrations to run (expected for first run)"

echo ""
echo "🎉 Development environment ready!"
echo "🌐 Backend API: http://localhost:3001"
echo "🏥 Health check: http://localhost:3001/health"
echo "🤖 Telegram Bot is running in polling mode"
echo ""
echo "To view logs: docker-compose -f docker/docker-compose.dev.yml logs -f backend"
echo "To stop: docker-compose -f docker/docker-compose.dev.yml down"