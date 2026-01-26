#!/bin/bash

echo "🚀 Setting up Polyglot Monorepo..."

# 1. Consolidate Git History
if [ -d "lunar-calendar-api/.git" ]; then
    echo "📦 Detected nested git repository in lunar-calendar-api. Removing isolation..."
    # We remove the .git folder so it becomes part of the main repo
    rm -rf lunar-calendar-api/.git
    echo "✅ lunar-calendar-api is now part of the main repository."
else
    echo "ℹ️ lunar-calendar-api is already part of the main repository (or no .git found)."
fi

# 2. Setup Python Environment
echo "🐍 Setting up Python Virtual Environment..."
cd lunar-calendar-api

if [ ! -d "venv" ]; then
    echo "Creating venv..."
    python3 -m venv venv
else 
    echo "venv already exists."
fi

echo "Activating venv..."
source venv/bin/activate

echo "📦 Installing Python dependencies..."
pip install -r requirements.txt
echo "✅ Python dependencies installed"

cd ..

# 3. Setup Node Environments
echo "📦 Installing Node dependencies..."
npm install

echo "🎉 Monorepo setup complete!"
echo "👉 Run './dev-start.sh' to start all services."
