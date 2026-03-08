#!/bin/bash

echo "🔍 Extension Debug Helper"
echo "========================"
echo ""

# Check if data file exists
if [ ! -f "firefox-extension/data/lunar_calendar.json" ]; then
    echo "❌ DATA FILE MISSING!"
    echo "   Run: python generate_static_data.py"
    exit 1
fi

echo "✅ Data file exists"

# Check file size
SIZE=$(du -h firefox-extension/data/lunar_calendar.json | cut -f1)
echo "   Size: $SIZE"

# Verify it's valid JSON
if python3 -c "import json; json.load(open('firefox-extension/data/lunar_calendar.json'))" 2>/dev/null; then
    echo "✅ Valid JSON format"
else
    echo "❌ INVALID JSON!"
    exit 1
fi

# Check today's date in the data
TODAY=$(date +%Y-%m-%d)
HAS_TODAY=$(python3 -c "import json; data=json.load(open('firefox-extension/data/lunar_calendar.json')); print('$TODAY' in data['data'])")

if [ "$HAS_TODAY" = "True" ]; then
    echo "✅ Has data for today ($TODAY)"
    LUNAR_DAY=$(python3 -c "import json; data=json.load(open('firefox-extension/data/lunar_calendar.json')); print(data['data']['$TODAY']['lunar_day'])")
    echo "   Lunar Day: $LUNAR_DAY"
else
    echo "⚠️  No data for today ($TODAY)"
    echo "   The extension might show errors"
fi

echo ""
echo "📝 Manifest Check:"
if grep -q "background_static.js" firefox-extension/manifest.json; then
    echo "✅ Using background_static.js"
else
    echo "❌ Still using old background.js!"
    echo "   Need to update manifest.json"
    exit 1
fi

echo ""
echo "🎯 To fix 'Unable to connect':"
echo "   1. Go to: about:debugging#/runtime/this-firefox"
echo "   2. Find: Lunar Calendar Color Palette"
echo "   3. Click: Remove"
echo "   4. Click: Load Temporary Add-on"
echo "   5. Select: firefox-extension/manifest.json"
echo ""
echo "   Then check background console (click Inspect) for:"
echo "   - 'Background: Extension starting...'"
echo "   - 'Background: Loaded lunar data from...'"
echo "   - 'Background: ✅ Ready to serve lunar data'"
echo ""
echo "If still failing, check browser console (F12) for errors"
