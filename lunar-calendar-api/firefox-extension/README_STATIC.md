# 🌙 Lunar Calendar Extension - Static Version

## ✅ Now Running Without Backend!

Your extension has been switched to **static data mode** - no server needed!

## What Changed

### Before (Backend Required)
- ❌ Required FastAPI server running on localhost:8000
- ❌ Needed Python, virtualenv, dependencies
- ❌ No offline support
- ❌ CORS configuration

### Now (Standalone)
- ✅ Works completely offline
- ✅ No server, no setup, no dependencies
- ✅ Just install and use
- ✅ Fast instant lookups

## How It Works

1. **Data Generation**: `generate_static_data.py` computed 3 years of lunar data
2. **Static File**: `data/lunar_calendar.json` (1.4 MB, 1095 days)
3. **Background Script**: `background_static.js` reads from JSON (no API calls)
4. **Popup**: Same UI, but data comes from local file

## Installation

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to `firefox-extension/` and select `manifest.json`
4. Done! Extension works immediately

### Chrome/Edge
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `firefox-extension/` folder
5. Done!

## Data Validity

- **Generated**: November 8, 2025
- **Valid until**: November 6, 2028
- **Days covered**: 1,095 days (3 years)

## Features Included

All original features work:
- ✅ Daily lunar day number (1-30)
- ✅ Moon phase with illumination %
- ✅ Beautiful color palettes (base + gradient)
- ✅ Activity recommendations
- ✅ Health aspects and organs
- ✅ Progress through current lunar day
- ✅ Russian/English localization
- ✅ Click-to-copy color codes

## Maintenance

### When to Regenerate Data

Regenerate the data file when:
- Current date approaches Nov 6, 2028
- You want to extend the date range
- You update lunar day data or colors

### How to Regenerate

```bash
cd /Users/eddubnitsky/lunar-calendar-api
source venv/bin/activate
python generate_static_data.py
```

This creates a fresh `firefox-extension/data/lunar_calendar.json` with new dates.

## File Structure

```
firefox-extension/
├── manifest.json                    # Updated to use background_static.js
├── background_static.js             # Loads data from local JSON
├── data/
│   └── lunar_calendar.json         # 3 years of precomputed data (1.4 MB)
├── popup/
│   ├── popup.html
│   ├── popup.js                     # No changes needed
│   └── popup.css
├── locales/
│   ├── en.json
│   └── ru.json
└── icons/
    └── ...
```

## Switching Back to API Mode (Optional)

If you ever want to use the backend API again:

1. **Update manifest.json**:
```json
{
  "background": {
    "scripts": ["background.js"]  // Change from background_static.js
  },
  "permissions": [
    "activeTab",
    "http://localhost:8000/*"
  ]
}
```

2. **Start the server**:
```bash
source venv/bin/activate
python run.py
```

## Benefits of Static Mode

### For You
- 🎯 **Simple deployment** - just zip and share
- 💰 **Zero hosting costs**
- 🔧 **No maintenance** - regenerate once per year
- 📦 **Ready for Firefox Add-ons store**

### For Users
- ⚡ **Instant loading** - no network delay
- 🛡️ **Privacy** - no external connections
- ✈️ **Offline capable** - works anywhere
- 🎁 **Zero setup** - install and go

## Publishing to Firefox Add-ons

Your extension is now ready to publish:

1. **Create account**: https://addons.mozilla.org/developers/
2. **Zip the extension**:
```bash
cd firefox-extension
zip -r lunar-calendar-extension.zip * -x "*.DS_Store" -x "*.backup"
```
3. **Upload** to Firefox Add-ons
4. **Submit** for review

## Support & Updates

- **Current version**: 1.0.0
- **Data version**: Nov 2025 - Nov 2028
- **Next update needed**: Before November 2028

## Notes

- Extension uses ~1.5 MB total (data + code + icons)
- All timings in UTC, converted to local time in UI
- Russian is the default language (can switch to English)
- Works in Firefox, Chrome, Edge, and other Chromium browsers

---

🎉 **Congratulations!** Your extension is now completely standalone and ready for production use!
