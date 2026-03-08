# Lunar Calendar Firefox Extension

This Firefox extension displays daily lunar calendar color palettes with astronomical accuracy by connecting to the local Lunar Calendar API.

## Features

- **Real-time Lunar Data**: Shows current lunar day, moon phase, and illumination percentage
- **Color Palettes**: Displays beautiful color palettes based on lunar calculations
- **Astronomical Accuracy**: Uses Skyfield library for precise moon phase calculations
- **Progress Tracking**: Shows daily progress through the current lunar day
- **Click to Copy**: Click any color to copy its hex value to clipboard

## Installation

### 1. Start the API Server

First, make sure the Lunar Calendar API is running:

```bash
cd /Users/eddubnitsky/lunar-calendar-api
python run.py
```

The API should be accessible at `http://localhost:8000`

### 2. Install Firefox Extension

1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to the `firefox-extension` folder
6. Select `manifest.json`

### 3. Using the Extension

1. Click the lunar calendar icon in your Firefox toolbar
2. The extension will automatically fetch today's lunar data
3. View the current lunar day, moon phase, and color palette
4. Click any color to copy its hex value to clipboard

## Technical Details

### API Integration

The extension connects to your local Lunar Calendar API running on port 8000. It makes requests to:

- `GET /api/v1/lunar-day` - Fetches current lunar day information

### CORS Configuration

The API has been configured to accept requests from Firefox extensions by adding `moz-extension://*` to the CORS origins.

### Caching

The extension caches lunar data for 10 minutes to reduce API calls while keeping information current.

## Troubleshooting

### Extension Shows "Unable to connect to lunar calendar API"

1. **Check API Status**: Verify the API is running at `http://localhost:8000`
   ```bash
   curl http://localhost:8000/api/v1/lunar-day
   ```

2. **Check CORS**: Ensure the API config includes extension origins:
   ```python
   CORS_ORIGINS = [
       "http://localhost:3000",
       "http://localhost:8000",
       "http://127.0.0.1:3000",
       "http://127.0.0.1:8000",
       "moz-extension://*",  # Firefox extension support
       "chrome-extension://*",  # Chrome extension support
   ]
   ```

3. **Check Browser Console**: Open Firefox Developer Tools and check for any error messages

### API Connection Issues

- Ensure no firewall is blocking localhost:8000
- Verify Python dependencies are installed: `pip install -r requirements.txt`
- Check that port 8000 is not in use by another application

## Development

To modify the extension:

1. Edit files in the `firefox-extension` folder
2. Use "Reload" button in `about:debugging` to update the extension
3. Changes to `manifest.json` require a full reinstall

### File Structure

```
firefox-extension/
├── manifest.json          # Extension configuration
├── background.js          # Background script for API communication
├── icons/                 # Extension icons (16, 32, 48, 128px)
└── popup/
    ├── popup.html         # Extension popup interface
    ├── popup.css          # Styling for popup
    └── popup.js           # Popup functionality
```

## Current Data Example

As of the current test, the extension displays:

- **Lunar Day**: 6
- **Moon Phase**: Waxing Crescent (29.3% illuminated)
- **Base Colors**: Light sky blue (#87CEEB) to steel blue (#4682B4)
- **Progress**: 34.9% through the current lunar day

The color palette automatically updates as the lunar day progresses and changes.