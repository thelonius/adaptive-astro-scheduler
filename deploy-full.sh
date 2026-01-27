#!/bin/bash

# Deployment script for the full Adaptive Astro Scheduler stack
# Usage: ./deploy-full.sh

SERVER_IP="176.123.166.252"
USER="user1"
REMOTE_DIR="/home/user1/apps/adaptive-astro-scheduler"
SSH_KEY="${SSH_KEY:-~/.ssh/id_ed25519}" # Default or from env

echo "🚀 Deploying to $SERVER_IP..."

# 1. Upload files
echo "📦 Uploading files..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'venv' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '__pycache__' \
    -e "ssh -i $SSH_KEY" \
    ./ $USER@$SERVER_IP:$REMOTE_DIR/

# 2. Rebuild and restart
echo "🔄 Rebuilding and restarting containers..."
ssh -i $SSH_KEY $USER@$SERVER_IP << EOF
    cd $REMOTE_DIR

    # Create necessary directories on server if missing
    mkdir -p docker/postgres-data
    mkdir -p docker/redis-data

    # Stop existing containers
    docker-compose -f docker/docker-compose.yml down

    # Build and start with forced recreation
    docker-compose -f docker/docker-compose.yml up -d --build --force-recreate

    # Prune old images to save space
    docker image prune -f
EOF

echo "✅ Deployment complete!"
