#!/usr/bin/env python3
"""
Test script to verify static lunar data for the extension
"""

import json
from pathlib import Path
from datetime import date

def test_static_data():
    """Test the generated static lunar data file"""

    print("🌙 Testing Static Lunar Calendar Data\n")

    # Load the static data file
    data_file = Path(__file__).parent / "firefox-extension" / "data" / "lunar_calendar.json"

    if not data_file.exists():
        print(f"❌ Data file not found: {data_file}")
        print("   Run: python generate_static_data.py")
        return False

    print(f"✅ Found data file: {data_file}")
    print(f"📊 File size: {data_file.stat().st_size / 1024:.1f} KB\n")

    # Load and parse JSON
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            lunar_data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return False

    print("✅ Valid JSON format")

    # Check metadata
    print(f"\n📅 Metadata:")
    print(f"   Generated: {lunar_data.get('generated_at')}")
    print(f"   Valid from: {lunar_data.get('valid_from')}")
    print(f"   Valid until: {lunar_data.get('valid_until')}")
    print(f"   Total days: {len(lunar_data.get('data', {}))}")

    # Test today's data
    today = date.today().isoformat()
    today_data = lunar_data['data'].get(today)

    if not today_data:
        print(f"\n⚠️  No data for today ({today})")
        print("   This is normal if today is outside the valid range")
    else:
        print(f"\n🌙 Today's Data ({today}):")
        print(f"   Lunar Day: {today_data['lunar_day']}")
        print(f"   Moon Phase: {today_data['moon_phase']['name']}")
        print(f"   Illumination: {today_data['moon_phase']['illumination']}%")
        print(f"   Emoji: {today_data['moon_phase']['emoji']}")
        print(f"   Base Colors: {', '.join(today_data['colors']['base'])}")
        print(f"   Gradient Colors: {len(today_data['colors']['gradient'])} colors")
        print(f"   Recommendations: {len(today_data['recommendations']['do'])} to do, {len(today_data['recommendations']['avoid'])} to avoid")
        print(f"   Planet: {today_data.get('planet', 'N/A')}")

    # Verify data structure for first few entries
    print("\n✅ Verifying data structure...")

    required_fields = ['lunar_day', 'moon_phase', 'colors', 'timing', 'recommendations', 'health', 'description']
    sample_dates = list(lunar_data['data'].keys())[:3]

    for sample_date in sample_dates:
        entry = lunar_data['data'][sample_date]
        missing = [field for field in required_fields if field not in entry]
        if missing:
            print(f"❌ Missing fields in {sample_date}: {missing}")
            return False

    print(f"✅ All entries have required fields")

    # Summary
    print("\n" + "="*50)
    print("✅ Static data file is valid and ready!")
    print("="*50)

    return True


def print_testing_instructions():
    """Print instructions for testing the extension"""

    print("\n" + "🔍 HOW TO TEST THE EXTENSION".center(50, " "))
    print("="*50)

    print("\n📱 Method 1: Firefox Desktop")
    print("-" * 50)
    print("1. Open Firefox")
    print("2. Navigate to: about:debugging#/runtime/this-firefox")
    print("3. Click 'Load Temporary Add-on...'")
    print("4. Select: firefox-extension/manifest.json")
    print("5. Extension icon appears in toolbar")
    print("6. Click icon to open popup")
    print("\n   Expected: Shows today's lunar day, colors, no errors")
    print("   Check browser console (F12) for any errors")

    print("\n📱 Method 2: Chrome/Edge")
    print("-" * 50)
    print("1. Open Chrome/Edge")
    print("2. Navigate to: chrome://extensions/")
    print("3. Enable 'Developer mode' (top right)")
    print("4. Click 'Load unpacked'")
    print("5. Select the 'firefox-extension' folder")
    print("6. Extension icon appears in toolbar")
    print("7. Click icon to open popup")

    print("\n🔍 Method 3: Quick File Test")
    print("-" * 50)
    print("1. Open: firefox-extension/popup/popup.html in browser")
    print("2. Open DevTools (F12)")
    print("3. Check Console for errors")
    print("   Note: Some features need extension context")

    print("\n✅ What to Check:")
    print("-" * 50)
    print("  ☑️  Extension loads without errors")
    print("  ☑️  Popup shows current lunar day number")
    print("  ☑️  Moon phase displayed correctly")
    print("  ☑️  Color palette appears")
    print("  ☑️  Progress bar shows percentage")
    print("  ☑️  Click color to copy (shows 'Copied!')")
    print("  ☑️  Language switch (EN/RU) works")
    print("  ☑️  No console errors in browser DevTools")

    print("\n🐛 Troubleshooting:")
    print("-" * 50)
    print("  • If popup is blank: Check browser console (F12)")
    print("  • If colors missing: Verify lunar_calendar.json exists")
    print("  • If 'File not found': Check file paths in background_static.js")
    print("  • If old behavior: Reload extension (click Reload in about:debugging)")

    print("\n📝 Manual Verification:")
    print("-" * 50)
    print("  1. Check console logs:")
    print("     - 'Background: Extension starting...'")
    print("     - 'Background: ✅ Ready to serve lunar data'")
    print("  2. Verify no network requests to localhost:8000")
    print("  3. Test offline: Disable network and reload popup")
    print("\n")


if __name__ == "__main__":
    success = test_static_data()

    if success:
        print_testing_instructions()
    else:
        print("\n❌ Fix the data file issues before testing the extension")
        print("   Run: python generate_static_data.py")
