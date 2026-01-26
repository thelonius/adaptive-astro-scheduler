#!/bin/bash

echo "🌟 Adaptive Astro-Scheduler Docker Environment"
echo "============================================="
echo ""
echo "Choose your environment:"
echo "1) Development (with volume mounts for live development)"
echo "2) Production (optimized for deployment)"
echo ""
read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        echo "🔧 Starting development environment..."
        ./start-dev-docker.sh
        ;;
    2)
        echo "🚀 Starting production environment..."
        ./start-prod-docker.sh
        ;;
    *)
        echo "❌ Invalid choice. Please run again and select 1 or 2."
        exit 1
        ;;
esac