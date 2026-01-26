#!/bin/bash

# Trap Ctrl+C to kill all background processes
trap "kill 0" EXIT

echo "🚀 Starting Adaptive Astro Scheduler (Monorepo Mode)..."

# 1. Start Python Ephemeris Service (Port 8000)
echo "🐍 Starting Ephemeris Service (Python)..."
cd lunar-calendar-api
source venv/bin/activate
# Using uvicorn to run the app
uvicorn app.main:app --reload --port 8000 &
cd ..

# Wait a moment for python to spin up
sleep 5

# 2. Start Backend API (Port 3001)
echo "⚙️ Starting Backend API..."
cd backend
npm run dev &
cd ..

# 3. Start Frontend (Port 3000)
echo "✨ Starting Frontend..."
cd frontend
npm run dev &
cd ..

# Keep script running
wait
