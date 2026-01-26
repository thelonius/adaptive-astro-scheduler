#!/bin/bash

# Health Check Script - Validates all services before confirming deployment
# Usage: ./health-check.sh [server_ip]

SERVER_IP="${1:-176.123.166.252}"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "🏥 Running Health Checks for $SERVER_IP..."

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=$3

    echo -n "  Checking $description... "

    for i in $(seq 1 $MAX_RETRIES); do
        response=$(curl -s -w "%{http_code}" -o /dev/null "$endpoint" 2>/dev/null)

        if [ "$response" = "$expected_status" ]; then
            echo "✅ OK ($response)"
            return 0
        fi

        if [ $i -lt $MAX_RETRIES ]; then
            sleep $RETRY_INTERVAL
        fi
    done

    echo "❌ FAILED (Status: $response)"
    return 1
}

# Health checks
FAILED=0

echo "📋 Service Health Checks:"

# 1. Backend API Health
check_endpoint "http://$SERVER_IP:3000/health" 200 "Backend API Health" || ((FAILED++))

# 2. Ephemeris Service Health
check_endpoint "http://$SERVER_IP:8000/health" 200 "Ephemeris Service Health" || ((FAILED++))

# 3. Frontend served by nginx
check_endpoint "http://$SERVER_IP" 200 "Frontend (Nginx)" || ((FAILED++))

echo ""
echo "🧪 API Functionality Tests:"

# 4. Planets endpoint
check_endpoint "http://$SERVER_IP:3000/api/ephemeris/planets?date=2026-01-26&time=12:00:00&latitude=55.7558&longitude=37.6173&timezone=Europe/Moscow" 200 "Planets API" || ((FAILED++))

# 5. Aspects endpoint
check_endpoint "http://$SERVER_IP:3000/api/ephemeris/aspects?date=2026-01-26&time=12:00:00&orb=8" 200 "Aspects API" || ((FAILED++))

# 6. Houses endpoint
check_endpoint "http://$SERVER_IP:3000/api/ephemeris/houses?date=2026-01-26&time=12:00:00&latitude=55.7558&longitude=37.6173&system=placidus" 200 "Houses API" || ((FAILED++))

echo ""
echo "📊 Container Status Check:"

# Check if running on remote server
if [ "$SERVER_IP" != "localhost" ] && [ "$SERVER_IP" != "127.0.0.1" ]; then
    ssh -i ~/.ssh/id_ed25519 user1@$SERVER_IP "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep astro"
else
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep astro
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo "🎉 All health checks passed! Deployment is healthy."
    exit 0
else
    echo "❌ $FAILED health checks failed! Deployment has issues."
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "  1. Check container logs: docker logs astro_backend"
    echo "  2. Verify ephemeris service: curl http://$SERVER_IP:8000/health"
    echo "  3. Check backend config: docker exec astro_backend printenv | grep EPHEMERIS"
    exit 1
fi