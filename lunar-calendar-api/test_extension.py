#!/usr/bin/env python3
"""
Test script to verify the lunar calendar API and Firefox extension CORS
"""

import requests
import json

def test_api():
    """Test the lunar calendar API endpoint"""
    print("🌙 Testing Lunar Calendar API...")

    try:
        # Test basic API call
        response = requests.get('http://localhost:8000/api/v1/lunar-day')

        if response.status_code == 200:
            data = response.json()
            print("✅ API is working!")
            print(f"📅 Current Lunar Day: {data['lunar_day']}")
            print(f"🌒 Moon Phase: {data['moon_phase']['name']} ({data['moon_phase']['illumination']:.1f}% illuminated)")
            print(f"🎨 Color Palette: {len(data['color_palette']['base_colors'])} base colors, {len(data['color_palette']['gradient'])} gradient colors")
            print(f"⏱️  Progress: {data['timing']['progress_percentage']:.1f}% through lunar day")

            # Test CORS headers with Firefox extension origin
            cors_response = requests.get(
                'http://localhost:8000/api/v1/lunar-day',
                headers={'Origin': 'moz-extension://test-extension-id'}
            )

            if 'access-control-allow-credentials' in cors_response.headers:
                print("✅ CORS configured for extensions")
            else:
                print("⚠️  CORS may need configuration for extensions")

            return True
        else:
            print(f"❌ API error: {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Make sure it's running on localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def print_extension_instructions():
    """Print instructions for installing the Firefox extension"""
    print("\n🦊 Firefox Extension Installation:")
    print("1. Open Firefox")
    print("2. Navigate to: about:debugging")
    print("3. Click 'This Firefox' in left sidebar")
    print("4. Click 'Load Temporary Add-on...'")
    print("5. Navigate to: /Users/eddubnitsky/lunar-calendar-api/firefox-extension/")
    print("6. Select: manifest.json")
    print("7. Click the lunar calendar icon in your toolbar!")

if __name__ == "__main__":
    print("🚀 Lunar Calendar API & Extension Test\n")

    if test_api():
        print_extension_instructions()
        print("\n🎉 Everything looks ready! Your Firefox extension should work perfectly.")
    else:
        print("\n❌ Please start the API first:")
        print("   cd /Users/eddubnitsky/lunar-calendar-api")
        print("   source venv/bin/activate")
        print("   python run.py")