#!/bin/bash

# Lunar Calendar API - Setup Script for macOS/Linux

echo "========================================="
echo "Lunar Calendar API - Setup"
echo "========================================="

# Check Python version
echo "Checking Python version..."
python3 --version

# Create virtual environment
echo ""
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo ""
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cp .env.example .env
    echo ".env file created. You can modify it as needed."
fi

# Display completion message
echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "To run the server:"
echo "  1. Activate virtual environment: source venv/bin/activate"
echo "  2. Run: python run.py"
echo "  3. Visit: http://localhost:8000/docs"
echo ""
echo "To run examples:"
echo "  python examples.py"
echo ""
echo "========================================="
