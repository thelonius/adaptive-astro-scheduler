#!/bin/bash

# Quick fix script for "Unable to connect" error
# This ensures the extension uses the static data version

echo "🔧 Fixing Extension - Switching to Static Data Mode"
echo "=================================================="
echo ""

# 1. Verify files exist
echo "1️⃣  Verifying files..."

if [ ! -f "firefox-extension/manifest.json" ]; then
    echo "❌ manifest.json not found!"
    exit 1
fi

if [ ! -f "firefox-extension/background_static.js" ]; then
    echo "❌ background_static.js not found!"
    exit 1
fi

if [ ! -f "firefox-extension/data/lunar_calendar.json" ]; then
    echo "❌ lunar_calendar.json not found!"
    echo "   Run: python generate_static_data.py"
    exit 1
fi

echo "✅ All required files exist"
echo ""

# 2. Check manifest configuration
echo "2️⃣  Checking manifest.json..."
if grep -q '"background_static.js"' firefox-extension/manifest.json; then
    echo "✅ Manifest correctly references background_static.js"
else
    echo "❌ Manifest still using old background.js"
    echo "   Updating manifest..."

    # Backup original
    cp firefox-extension/manifest.json firefox-extension/manifest.json.backup

    # Replace background.js with background_static.js
    sed -i '' 's/"background\.js"/"background_static.js"/' firefox-extension/manifest.json
    echo "✅ Manifest updated"
fi
echo ""

# 3. Check data file size
echo "3️⃣  Checking data file..."
DATA_SIZE=$(du -h firefox-extension/data/lunar_calendar.json | cut -f1)
echo "✅ Data file size: $DATA_SIZE"
echo ""

# 4. Print reload instructions
echo "=================================================="
echo "🎯 NOW DO THIS TO FIX THE EXTENSION:"
echo "=================================================="
echo ""
echo "Firefox Users:"
echo "-------------"
echo "1. Open Firefox"
echo "2. Go to: about:debugging#/runtime/this-firefox"
echo "3. Find 'Lunar Calendar Color Palette'"
echo "4. Click 'Reload' button (⟳)"
echo "5. Click 'Inspect' to see console logs"
echo ""
echo "Chrome/Edge Users:"
echo "----------------"
echo "1. Go to: chrome://extensions/"
echo "2. Find 'Lunar Calendar Color Palette'"
echo "3. Click the reload icon (⟳)"
echo "4. Click 'service worker' or 'background page' to see logs"
echo ""
echo "Expected Console Output:"
echo "----------------------"
echo "  Background: Extension starting..."
echo "  Background: Loading static lunar calendar data..."
echo "  Background: Loaded lunar data from 2025-11-08 to 2028-11-06"
echo "  Background: ✅ Ready to serve lunar data (no backend needed!)"
echo ""
echo "If you still see 'Unable to connect':"
echo "-----------------------------------"
echo "1. Remove the extension completely"
echo "2. Close and reopen browser"
echo "3. Load extension again (Load Temporary Add-on)"
echo ""
echo "✅ Fix complete! Now reload your extension."
