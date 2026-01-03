#!/bin/bash

# Adaptive Astro Scheduler - Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up Adaptive Astro Scheduler..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current version: $(node -v)"
  exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install workspace dependencies
echo "📦 Installing workspace dependencies..."
npm install --workspaces

# Build shared types
echo "🔨 Building shared types..."
npm run build --workspace=shared

# Copy .env.example to .env if not exists
if [ ! -f backend/.env ]; then
  echo "📝 Creating backend/.env from .env.example..."
  cp backend/.env.example backend/.env
  echo "⚠️  Please update backend/.env with your configuration"
fi

# Check if Docker is installed
if command -v docker &> /dev/null; then
  echo "🐳 Docker detected"

  # Start Docker services
  read -p "Start Docker services (PostgreSQL, Redis)? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🐳 Starting Docker services..."
    docker-compose -f docker/docker-compose.yml up -d postgres redis

    # Wait for services to be ready
    echo "⏳ Waiting for services to be ready..."
    sleep 5

    echo "✅ Docker services started"
  fi
else
  echo "⚠️  Docker not found. You'll need to set up PostgreSQL and Redis manually."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update backend/.env with your configuration"
echo "  2. Run 'npm run dev' to start development servers"
echo "  3. Visit http://localhost:5173 for frontend"
echo "  4. API will be available at http://localhost:3000"
echo ""
