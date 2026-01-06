# Zodiac Wheel - Quick Start Guide

Get the zodiac wheel component running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Backend server running on port 3000
- Basic React knowledge

## Step 1: Install Dependencies

```bash
cd frontend
npm install
```

The component uses:
- React 18
- Framer Motion (animations)
- Chakra UI (tooltips)
- Axios (API calls)

## Step 2: Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Edit with your settings (or use defaults)
nano .env
```

Default configuration (Moscow):
```bash
VITE_API_URL=http://localhost:3000
VITE_DEFAULT_LATITUDE=55.7558
VITE_DEFAULT_LONGITUDE=37.6173
VITE_DEFAULT_TIMEZONE=Europe/Moscow
```

## Step 3: Start Backend

Make sure your backend server is running:

```bash
cd backend
npm run dev
```

Verify it's working:
```bash
curl http://localhost:3000/api/ephemeris/planets
```

## Step 4: Start Frontend

```bash
cd frontend
npm run dev
```

## Step 5: Use the Component

### Option A: View the Demo

Navigate to: `http://localhost:5173/zodiac-wheel-demo`

This shows:
- Live zodiac wheel
- All configuration options
- Theme switcher
- Interactive controls

### Option B: Add to Your App

```tsx
// In your component
import { ZodiacWheel } from './components/ZodiacWheel';

function MyPage() {
  return (
    <div>
      <h1>Astrological Chart</h1>
      <ZodiacWheel />
    </div>
  );
}
```

That's it! The wheel will:
- Load current planetary positions
- Display all aspects
- Auto-refresh every 5 minutes
- Show interactive tooltips

## Common Customizations

### Change Size

```tsx
<ZodiacWheel config={{ size: 800 }} />
```

### Show Houses

```tsx
<ZodiacWheel
  config={{ showHouses: true }}
  latitude={40.7128}
  longitude={-74.0060}
/>
```

### Change Theme

```tsx
import { themes } from './components/ZodiacWheel/themes';

<ZodiacWheel config={{ colorScheme: themes.cosmic }} />
```

### Adjust Refresh Rate

```tsx
<ZodiacWheel
  config={{
    refreshInterval: 10 * 60 * 1000, // 10 minutes
  }}
  useAdaptiveRefresh={false}
/>
```

### Get Data Updates

```tsx
<ZodiacWheel
  onDataUpdate={(data) => {
    console.log('Got update:', data);
  }}
/>
```

## Verify It's Working

You should see:
- ✅ Circular zodiac wheel with 12 signs
- ✅ Planets positioned on the wheel
- ✅ Colored lines showing aspects
- ✅ Tooltips when hovering planets
- ✅ "Live" badge at bottom
- ✅ Last update time
- ✅ Refresh button

## Troubleshooting

### Wheel shows "Loading..." forever

**Problem**: Can't reach backend API

**Solution**:
```bash
# Check backend is running
curl http://localhost:3000/health

# Check .env has correct URL
cat frontend/.env | grep VITE_API_URL
```

### No planets showing

**Problem**: API returns empty data

**Solution**:
```bash
# Test the endpoint directly
curl "http://localhost:3000/api/ephemeris/planets?date=2024-01-03"

# Check browser console for errors
# Open DevTools > Console
```

### Aspect lines missing

**Problem**: No aspects within orb, or showAspects is off

**Solution**:
```tsx
// Increase orb tolerance
<ZodiacWheel config={{ aspectOrb: 10, showAspects: true }} />
```

### Slow performance

**Problem**: Too frequent updates or large wheel

**Solution**:
```tsx
// Use adaptive refresh
<ZodiacWheel useAdaptiveRefresh={true} />

// Or reduce size
<ZodiacWheel config={{ size: 500 }} />
```

## Next Steps

1. **Read the docs**: Check `frontend/src/components/ZodiacWheel/README.md`
2. **Explore themes**: Try all 5 built-in themes
3. **Customize**: Adjust colors, sizes, features
4. **Integrate**: Add to your main app
5. **Optimize**: See performance.md for tips

## Full Example

Here's a complete working example:

```tsx
import React from 'react';
import { ZodiacWheel } from './components/ZodiacWheel';
import { themes } from './components/ZodiacWheel/themes';

function AstroChart() {
  const handleUpdate = (data) => {
    console.log(`Updated with ${data.planets.length} planets`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Current Sky</h1>

      <ZodiacWheel
        config={{
          size: 600,
          showAspects: true,
          showHouses: false,
          showDegrees: true,
          showRetrogrades: true,
          aspectOrb: 8,
          colorScheme: themes.dark,
        }}
        latitude={55.7558}
        longitude={37.6173}
        timezone="Europe/Moscow"
        useAdaptiveRefresh={true}
        onDataUpdate={handleUpdate}
      />

      <p>
        Hover over planets to see details.
        Click refresh to update manually.
      </p>
    </div>
  );
}

export default AstroChart;
```

## Configuration Cheat Sheet

```tsx
// All available options
<ZodiacWheel
  // Component config
  config={{
    size: 600,                    // 300-800 recommended
    showAspects: true,            // Display aspect lines
    showHouses: false,            // Display houses
    showDegrees: true,            // Degree markings
    showRetrogrades: true,        // ℞ indicators
    aspectOrb: 8,                 // 1-15 degrees
    refreshInterval: 300000,      // 5 min in ms
    colorScheme: themes.dark,     // dark|light|cosmic|solar|lunar
  }}

  // Location
  latitude={55.7558}              // -90 to 90
  longitude={37.6173}             // -180 to 180
  timezone="Europe/Moscow"        // IANA timezone

  // Features
  useAdaptiveRefresh={true}       // Auto-adjust refresh
  onDataUpdate={(data) => {}}     // Data callback
/>
```

## Resources

- **Component Docs**: `frontend/src/components/ZodiacWheel/README.md`
- **Performance**: `frontend/src/components/ZodiacWheel/performance.md`
- **Full Guide**: `ZODIAC_WHEEL_COMPONENT.md`
- **Demo Page**: `frontend/src/pages/ZodiacWheelDemo.tsx`

## Support

If you have issues:

1. Check browser console for errors
2. Verify backend is running
3. Test API endpoints directly
4. Review configuration
5. Check the documentation

## License

Part of Adaptive Astro-Scheduler project.

---

**Quick Links**:
- [Full Documentation](./ZODIAC_WHEEL_COMPONENT.md)
- [Implementation Details](./IMPLEMENTATION_SUMMARY.md)
- [API Reference](./API_REQUIREMENTS.md)

**Time to first render**: ~5 minutes following this guide!
