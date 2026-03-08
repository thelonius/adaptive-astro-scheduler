#!/bin/bash

# Make all shell scripts executable

echo "Making shell scripts executable..."

chmod +x setup.sh
chmod +x start.sh

echo "✓ setup.sh is now executable"
echo "✓ start.sh is now executable"
echo ""
echo "You can now run:"
echo "  ./setup.sh  - to set up the project"
echo "  ./start.sh  - to start the server"
