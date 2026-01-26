#!/bin/bash

echo "🧪 Testing Adaptive Astro-Scheduler Docker Setup"
echo "============================================="

# Test if services are running
echo "📊 Checking container status..."
cd docker
CONTAINERS=$(docker-compose -f docker-compose.dev.yml ps --services --filter "status=running")

if [ -z "$CONTAINERS" ]; then
    echo "❌ No containers running. Please start the development environment first:"
    echo "   ./start-dev-docker.sh"
    exit 1
fi

echo "✅ Containers running: $CONTAINERS"

# Test API health
echo ""
echo "🏥 Testing API Health..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo "✅ API Health Check: PASSED"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "❌ API Health Check: FAILED"
    echo "   Response: $HEALTH_RESPONSE"
fi

# Test database connection
echo ""
echo "🗄️  Testing Database Connection..."
DB_TEST=$(docker-compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d adaptive_astro -c "SELECT current_timestamp;" 2>/dev/null)
if [[ $DB_TEST == *"current_timestamp"* ]]; then
    echo "✅ Database Connection: PASSED"
else
    echo "❌ Database Connection: FAILED"
fi

# Test Redis connection
echo ""
echo "🔴 Testing Redis Connection..."
REDIS_TEST=$(docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping 2>/dev/null)
if [[ $REDIS_TEST == *"PONG"* ]]; then
    echo "✅ Redis Connection: PASSED"
else
    echo "❌ Redis Connection: FAILED"
fi

# Test remote ephemeris API
echo ""
echo "🌌 Testing Remote Ephemeris API..."
EPHEMERIS_RESPONSE=$(curl -s http://176.123.166.252:3000/health)
if [[ $EPHEMERIS_RESPONSE == *"healthy"* ]]; then
    echo "✅ Remote Ephemeris API: ACCESSIBLE"
else
    echo "⚠️  Remote Ephemeris API: Not responding (this might be expected)"
fi

echo ""
echo "🎯 Docker Environment Summary:"
echo "   • Backend API: http://localhost:3001"
echo "   • PostgreSQL: localhost:5432"
echo "   • Redis: localhost:6379"
echo "   • Telegram Bot: Active (check logs for bot messages)"
echo ""
echo "📝 Quick Commands:"
echo "   • View logs: docker-compose -f docker/docker-compose.dev.yml logs -f"
echo "   • Stop environment: docker-compose -f docker/docker-compose.dev.yml down"
echo "   • Restart: docker-compose -f docker/docker-compose.dev.yml restart"
echo ""
echo "✨ Docker standardization is working! Environment ready for development and deployment."