# 🏗️ Architecture Options for Lunar Calendar Extension

## Overview

Your extension can work in **three different modes**. Choose based on your needs:

---

## 🎯 Option 1: Static Data (RECOMMENDED) ✨

**No backend server needed!** Extension uses precomputed data.

### How It Works
```
Python Script → Generate lunar_calendar.json → Bundle with Extension → Works Offline
```

### Pros
- ✅ **Zero setup** - users just install extension
- ✅ **Works offline** - no internet needed
- ✅ **Perfect accuracy** - uses your Python calculations
- ✅ **Fast** - instant data lookup
- ✅ **No hosting costs**

### Cons
- ⚠️ File size: ~1.4 MB (3 years of data)
- ⚠️ Need to regenerate annually

### Files Generated
- `firefox-extension/data/lunar_calendar.json` - 3 years of precomputed data
- `firefox-extension/background_static.js` - No-API version of background script

### How to Use

1. **Generate data** (once per year):
```bash
source venv/bin/activate
python generate_static_data.py
```

2. **Update manifest.json** to use static background:
```json
{
  "background": {
    "scripts": ["background_static.js"]
  }
}
```

3. **Install extension** - that's it!

### Maintenance
- Regenerate data once per year (or when extending date range)
- File valid for 3 years: 2025-11-08 to 2028-11-06

---

## 🔄 Option 2: Local API Server (Current)

**Backend + Frontend** - Extension fetches from local FastAPI server

### How It Works
```
Extension → HTTP Request → FastAPI Server → Skyfield Calculations → Response
```

### Pros
- ✅ **Real-time calculations** - always accurate
- ✅ **Small extension size** - logic in backend
- ✅ **Easy to update** - just restart server

### Cons
- ❌ **Requires running server** - must start before using extension
- ❌ **No offline support**
- ❌ **CORS configuration** needed

### Files
- `app/` - FastAPI backend
- `firefox-extension/background.js` - Fetches from localhost:8000

### How to Use

1. **Start server**:
```bash
source venv/bin/activate
python run.py
```

2. **Install extension** with current `background.js`

### Best For
- Development and testing
- When you need real-time calculations
- If hosting the API for multiple users

---

## 🌐 Option 3: GitHub Pages + Actions

**Best of both worlds** - Automatic data generation + free hosting

### How It Works
```
GitHub Action (nightly) → Generate JSON → Commit to gh-pages → Extension fetches
```

### Pros
- ✅ **No backend server** to maintain
- ✅ **Auto-updates** via GitHub Actions
- ✅ **Free hosting** (GitHub Pages)
- ✅ **Perfect accuracy** (Python calculations)

### Cons
- ⚠️ Requires GitHub setup
- ⚠️ Data updates periodically (not real-time)

### Setup Required
1. Create `.github/workflows/generate-data.yml`
2. Enable GitHub Pages
3. Extension fetches from `https://yourusername.github.io/lunar-data/current.json`

### Best For
- Production with multiple users
- Want auto-updates without manual regeneration
- Need data accessible from anywhere

---

## 📊 Comparison

| Feature | Static Data | Local API | GitHub Pages |
|---------|-------------|-----------|--------------|
| **Backend Server** | ❌ No | ✅ Required | ❌ No |
| **Offline Support** | ✅ Yes | ❌ No | ⚠️ Cached |
| **Setup Complexity** | 🟢 Low | 🔴 High | 🟡 Medium |
| **File Size** | 1.4 MB | Small | Small |
| **Accuracy** | Perfect | Perfect | Perfect |
| **Updates** | Manual | Real-time | Automated |
| **Best For** | Personal use | Development | Production |

---

## 🎬 Quick Start Guide

### For Personal Use (Recommended)

```bash
# 1. Generate static data
source venv/bin/activate
python generate_static_data.py

# 2. Update manifest.json
# Change "background.js" → "background_static.js"

# 3. Load extension in Firefox
# Go to about:debugging → Load Temporary Add-on → select manifest.json
```

**Done!** No server needed. Works for 3 years.

### For Development

```bash
# 1. Start API server
source venv/bin/activate
python run.py

# 2. Keep manifest.json using "background.js"

# 3. Load extension in Firefox
```

**Server must run** whenever you use the extension.

---

## 🔮 Future Improvements

### Option 4: Pure JavaScript (Advanced)

Port calculations to JavaScript using **Astronomy Engine**:

```javascript
import Astronomy from 'astronomy-engine';

// Calculate moon phase in browser
const phase = Astronomy.MoonPhase(date);
const illumination = Astronomy.Illumination('Moon', date).mag;
```

**Pros:**
- Smallest file size
- Real-time calculations
- No data generation needed

**Cons:**
- Requires rewriting all lunar logic in JavaScript
- Need to handle lunar day data (colors, recommendations) differently

---

## 💡 Recommendation

**For your Firefox extension**: Use **Option 1 (Static Data)**

Why?
1. Users want **zero setup** - just install and it works
2. **1.4 MB** is acceptable for a 3-year extension
3. No hosting, no server, no dependencies
4. Perfect for personal calendars and daily color palettes

The data file is already generated at:
```
firefox-extension/data/lunar_calendar.json
```

Just update your manifest to use `background_static.js` and you're done! 🎉

---

## 📝 Notes

- Current data valid until: **2028-11-06**
- Regenerate anytime: `python generate_static_data.py`
- File includes: lunar days, moon phases, colors, recommendations, health tips
- All timings in UTC (extension can convert to local time)
