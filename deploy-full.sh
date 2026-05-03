#!/bin/bash
set -e

# Deployment script for the full Adaptive Astro Scheduler stack
# Strategy:
#   - ephemeris: built on server (Python + gcc, native x86_64)
#   - backend + frontend: built locally (--platform linux/amd64), pushed via SSH pipe

SERVER_IP="176.123.166.252"
USER="user1"
REMOTE_DIR="/home/user1/apps/adaptive-astro-scheduler"
SSH_KEY="${SSH_KEY:-~/.ssh/id_ed25519}"
SSH="ssh -i $SSH_KEY $USER@$SERVER_IP"

echo "🚀 Deploying to $SERVER_IP..."

# ── 1. Server cleanup ─────────────────────────────────────────
echo "🧹 Cleaning server disk before deploy..."
$SSH bash -s << 'CLEANUP'
    echo "=== Disk before cleanup ==="
    df -h /
    docker system prune -a -f --volumes 2>/dev/null || true
    docker builder prune -a -f 2>/dev/null || true
    rm -rf /tmp/tmp* 2>/dev/null || true
    rm -rf /home/user1/apps/adaptive-astro-scheduler/.claude 2>/dev/null || true
    rm -rf /home/user1/apps/adaptive-astro-scheduler/zet/chroma_db 2>/dev/null || true
    rm -rf /home/user1/apps/adaptive-astro-scheduler/lunar-calendar-api/swisseph_data/*.se1 2>/dev/null || true
    rm -rf /home/user1/apps/adaptive-astro-scheduler/lunar-calendar-api/venv 2>/dev/null || true
    echo "=== Disk after cleanup ==="
    df -h /
CLEANUP

# ── 2. Upload files ───────────────────────────────────────────
echo "📦 Uploading files..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'venv' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '__pycache__' \
    --exclude '.claude' \
    --exclude 'zet' \
    --exclude 'AstroClock' \
    --exclude 'vscode-extension' \
    --exclude 'writer_reviewer_workflow' \
    --exclude 'k8s' \
    --exclude '*.sqlite3' \
    --exclude '*.bsp' \
    --exclude 'chroma_db' \
    --exclude 'de421.bsp' \
    --exclude 'swisseph_data' \
    -e "ssh -i $SSH_KEY" \
    ./ $USER@$SERVER_IP:$REMOTE_DIR/

# ── 3. Build ephemeris on server (native x86_64) ──────────────
echo "🐍 Building ephemeris on server..."
$SSH << EOF
    set -e
    cd $REMOTE_DIR
    mkdir -p docker/postgres-data docker/redis-data
    docker-compose -f docker/docker-compose.yml down || true
    docker-compose -f docker/docker-compose.yml build ephemeris
    docker builder prune -f
    echo "✓ Ephemeris image ready: \$(docker images astro/ephemeris:latest --format '{{.Size}}')"
EOF

# ── 4. Build backend locally (cross-compile for linux/amd64) ──
echo "🟢 Building backend locally (linux/amd64)..."
docker build \
    --platform linux/amd64 \
    -t astro/backend:latest \
    -f docker/Dockerfile.backend \
    .

echo "📤 Pushing backend to server..."
docker save astro/backend:latest | gzip | \
    ssh -i $SSH_KEY $USER@$SERVER_IP 'gunzip | docker load'

# ── 5. Build frontend locally ─────────────────────────────────
echo "🎨 Building frontend locally (linux/amd64)..."
docker build \
    --platform linux/amd64 \
    -t astro/frontend:latest \
    --build-arg VITE_API_URL=http://176.123.166.252:3000 \
    -f docker/Dockerfile.frontend \
    .

echo "📤 Pushing frontend to server..."
docker save astro/frontend:latest | gzip | \
    ssh -i $SSH_KEY $USER@$SERVER_IP 'gunzip | docker load'

# ── 6. Start everything ───────────────────────────────────────
echo "🔄 Starting all containers..."
$SSH << EOF
    set -e
    cd $REMOTE_DIR
    docker-compose -f docker/docker-compose.yml up -d --force-recreate
    docker image prune -f
    echo ""
    echo "=== Container status ==="
    docker-compose -f docker/docker-compose.yml ps
    echo ""
    echo "=== Disk ==="
    df -h /
EOF

echo "✅ Deployment complete! Backend: http://$SERVER_IP:3000  Frontend: http://$SERVER_IP"
