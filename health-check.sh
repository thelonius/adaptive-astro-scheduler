#!/bin/bash

# Health Check Script - Validates all services before confirming deployment
# Usage: ./health-check.sh [base_url]
#   ./health-check.sh                                        # локальный стек
#   ./health-check.sh https://astro-31-130-130-11.sslip.io:4443
#
# Раньше скрипт бил по портам 3000/8000/80 отдельно. На проде наружу не
# смотрит ни один порт: всё идёт через один HTTPS-origin, а эфемерида вообще
# доступна только изнутри docker-сети.
BASE_URL="${1:-${ASTRO_BASE_URL:-http://localhost}}"
# Прямая проверка эфемериды имеет смысл только там, где порт опубликован
EPHEMERIS_URL="${EPHEMERIS_URL:-}"
# Пусто — блок со статусом контейнеров пропускается
SSH_TARGET="${SSH_TARGET:-}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_ed25519}"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "🏥 Running Health Checks for $BASE_URL..."

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

# 1. Backend API Health (отдельный location в nginx, иначе SPA-fallback)
check_endpoint "$BASE_URL/health" 200 "Backend API Health" || ((FAILED++))

# 2. Ephemeris Service Health — только если порт опубликован
if [ -n "$EPHEMERIS_URL" ]; then
    check_endpoint "$EPHEMERIS_URL/health" 200 "Ephemeris Service Health" || ((FAILED++))
else
    echo "  Ephemeris Service Health... ⏭  пропущено (EPHEMERIS_URL не задан)"
fi

# 3. Frontend served by nginx
check_endpoint "$BASE_URL" 200 "Frontend (Nginx)" || ((FAILED++))

echo ""
echo "🧪 API Functionality Tests:"

# 4. Planets endpoint
check_endpoint "$BASE_URL/api/ephemeris/planets?date=2026-01-26&time=12:00:00&latitude=55.7558&longitude=37.6173&timezone=Europe/Moscow" 200 "Planets API" || ((FAILED++))

# 5. Aspects endpoint
check_endpoint "$BASE_URL/api/ephemeris/aspects?date=2026-01-26&time=12:00:00&orb=8" 200 "Aspects API" || ((FAILED++))

# 6. Houses endpoint
check_endpoint "$BASE_URL/api/ephemeris/houses?date=2026-01-26&time=12:00:00&latitude=55.7558&longitude=37.6173&system=placidus" 200 "Houses API" || ((FAILED++))

echo ""
echo "📊 Container Status Check:"

if [ -n "$SSH_TARGET" ]; then
    ssh -i "$SSH_KEY" "$SSH_TARGET" "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep astro"
else
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep astro || echo "  (локальных astro-контейнеров нет; для удалённой проверки задай SSH_TARGET=user@host)"
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
    echo "  2. Verify ephemeris service: docker exec astro_backend wget -qO- http://ephemeris:8000/health"
    echo "  3. Check backend config: docker exec astro_backend printenv | grep EPHEMERIS"
    exit 1
fi