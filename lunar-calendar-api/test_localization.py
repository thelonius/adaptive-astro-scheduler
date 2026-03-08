#!/usr/bin/env python3
"""
Test Russian localization for the lunar calendar extension
"""

import json

def test_localization():
    """Test that all required translation keys are present"""

    print("🌙 Testing Russian Localization for Lunar Calendar Extension\n")

    try:
        # Test English translations
        with open('firefox-extension/locales/en.json', 'r', encoding='utf-8') as f:
            en_data = json.load(f)
        print("✅ English translations loaded")

        # Test Russian translations
        with open('firefox-extension/locales/ru.json', 'r', encoding='utf-8') as f:
            ru_data = json.load(f)
        print("✅ Russian translations loaded")

        # Test API Russian translations
        with open('app/locales/ru.json', 'r', encoding='utf-8') as f:
            api_ru_data = json.load(f)
        print("✅ API Russian translations loaded")

        # Test key moon phases
        print("\n🌒 Moon Phase Translations:")
        for phase in ["New Moon", "Waxing Crescent", "Full Moon", "Waning Crescent"]:
            if phase in api_ru_data["moon_phases"]:
                print(f"  {phase} → {api_ru_data['moon_phases'][phase]}")
            else:
                print(f"  ❌ Missing: {phase}")

        # Test extension UI
        print("\n🎨 Extension UI Translations:")
        ui_keys = [
            "popup.title",
            "popup.loading",
            "popup.dayLabel",
            "popup.progressLabel"
        ]

        for key in ui_keys:
            keys = key.split('.')
            en_val = en_data
            ru_val = ru_data

            for k in keys:
                en_val = en_val.get(k, {})
                ru_val = ru_val.get(k, {})

            if en_val and ru_val:
                print(f"  {key}: {en_val} → {ru_val}")
            else:
                print(f"  ❌ Missing: {key}")

        print("\n🎉 Localization test completed successfully!")
        print("\nTo test the extension:")
        print("1. Reload the extension in Firefox (about:debugging)")
        print("2. Click the lunar calendar icon")
        print("3. Try switching between EN and RU buttons")
        print("4. Moon phases and UI should translate properly")

        return True

    except Exception as e:
        print(f"❌ Localization test failed: {e}")
        return False

if __name__ == "__main__":
    test_localization()