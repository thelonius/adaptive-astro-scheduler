#!/bin/bash

# Lunar Calendar API Startup Script
# This script activates the virtual environment and starts the API server

echo "🌙 Starting Lunar Calendar API..."

# Navigate to project directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup.sh first."
    exit 1
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
python -c "import fastapi, skyfield, numpy" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Dependencies not found. Installing..."
    pip install -r requirements.txt
fi

# Start the API server
echo "🚀 Starting API server on localhost:8000..."
echo "📍 API Documentation: http://localhost:8000/docs"
echo "🌙 Lunar Day Endpoint: http://localhost:8000/api/v1/lunar-day"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python run.py