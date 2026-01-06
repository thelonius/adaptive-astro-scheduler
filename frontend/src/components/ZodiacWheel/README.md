# Zodiac Wheel Component

A real-time, extensible zodiac wheel component for visualizing planetary positions, aspects, and astrological data.

## Features

- **Real-time Updates**: Automatic data refresh with configurable intervals
- **Adaptive Refresh Rates**: Smart refresh based on celestial body speed
  - Fast-moving (Moon): 5 minutes
  - Medium (Inner planets): 15 minutes
  - Slow (Outer planets): 60 minutes
- **Full Aspect Visualization**: All major aspects with color-coded lines
  - Conjunction (☌) - Gold
  - Sextile (⚹) - Cyan
  - Square (□) - Red
  - Trine (△) - Green
  - Opposition (☍) - Pink
  - Quincunx (⚻) - Purple
- **Interactive Tooltips**: Hover over planets for detailed information
- **Retrograde Indicators**: Special markers (℞) for retrograde planets
- **Houses Overlay**: Optional astrological houses display
- **Smooth Animations**: Framer Motion powered transitions
- **Multiple Themes**: Dark, Light, Cosmic, Solar, Lunar
- **Fully Customizable**: Colors, sizes, visibility options

## Basic Usage

```tsx
import { ZodiacWheel } from './components/ZodiacWheel';

function App() {
  return (
    <ZodiacWheel
      config={{
        size: 600,
        showAspects: true,
        showHouses: false,
        refreshInterval: 5 * 60 * 1000, // 5 minutes
      }}
      latitude={55.7558}
      longitude={37.6173}
      timezone="Europe/Moscow"
      useAdaptiveRefresh={true}
    />
  );
}
```

## Configuration Options

```tsx
interface ZodiacWheelConfig {
  size: number;                  // SVG size in pixels (default: 600)
  showHouses: boolean;           // Display astrological houses (default: false)
  showAspects: boolean;          // Display aspect lines (default: true)
  showDegrees: boolean;          // Display degree markings (default: true)
  showRetrogrades: boolean;      // Show retrograde indicators (default: true)
  aspectOrb: number;             // Aspect orb tolerance (default: 8)
  refreshInterval: number;       // Update interval in ms (default: 5 min)
  colorScheme: ColorScheme;      // Color theme
}
```

## Using Themes

```tsx
import { ZodiacWheel } from './components/ZodiacWheel';
import { themes } from './components/ZodiacWheel/themes';

<ZodiacWheel
  config={{
    colorScheme: themes.cosmic, // or 'dark', 'light', 'solar', 'lunar'
  }}
/>
```

## Custom Color Scheme

```tsx
const customColors = {
  background: '#000',
  zodiacRing: '#333',
  zodiacText: '#fff',
  degreeMarks: '#666',
  planets: {
    Sun: '#FFD700',
    Moon: '#C0C0C0',
    // ... other planets
  },
  aspects: {
    conjunction: '#FFD700',
    trine: '#32CD32',
    // ... other aspects
  },
  houses: '#444',
};

<ZodiacWheel config={{ colorScheme: customColors }} />
```

## Adaptive Refresh Rates

The component can automatically adjust its refresh rate based on the speed of celestial bodies:

```tsx
<ZodiacWheel useAdaptiveRefresh={true} />
```

This optimizes performance by:
- Updating frequently when the Moon is moving fast
- Reducing updates when only slow-moving outer planets are significant
- Minimizing API calls while maintaining accuracy

## Data Callback

Get notified when new data is loaded:

```tsx
<ZodiacWheel
  onDataUpdate={(data) => {
    console.log('Planets:', data.planets);
    console.log('Aspects:', data.aspects);
    console.log('Houses:', data.houses);
  }}
/>
```

## Component Structure

```
ZodiacWheel/
├── index.tsx              # Main component
├── types.ts               # TypeScript types
├── utils.ts               # Calculation utilities
├── themes.ts              # Color themes
├── ZodiacCircle.tsx       # Zodiac signs and degrees
├── PlanetMarkers.tsx      # Planet positions
├── AspectLines.tsx        # Aspect visualizations
├── HousesOverlay.tsx      # Houses display
├── Tooltip.tsx            # Interactive tooltips
└── README.md              # This file
```

## Performance Optimization

- **Smart Caching**: Backend caches ephemeris data
- **Parallel Requests**: Fetches planets, aspects, and houses simultaneously
- **Conditional Rendering**: Only renders enabled features
- **Animation Optimization**: Uses Framer Motion's optimized rendering
- **Memoization**: Calculations cached with useMemo

## Aspect Line Styles

- **Conjunction**: Solid line
- **Opposition**: Solid line
- **Trine**: Solid line
- **Square**: Dashed line
- **Sextile**: Dotted line
- **Quincunx**: Light dotted line

Line opacity varies with aspect strength (exact aspects are more opaque).

## Tooltip Information

When hovering over a planet, the tooltip displays:
- Planet name and symbol
- Current position (degree and sign)
- Movement speed (°/day)
- Distance from Earth (AU)
- Retrograde status
- Active aspects to other planets
- Sign element and quality

## Browser Support

- Modern browsers with SVG support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers supported

## Dependencies

- React 18+
- Framer Motion 10+
- Chakra UI 2+
- Axios for API calls

## API Endpoints Used

- `GET /api/ephemeris/planets` - Planetary positions
- `GET /api/ephemeris/aspects` - Planetary aspects
- `GET /api/ephemeris/houses` - Astrological houses

## Future Enhancements

- [ ] Transits overlay (natal chart + current positions)
- [ ] Time travel (view past/future positions)
- [ ] Aspect grid view
- [ ] Export as image/SVG
- [ ] Custom aspect orbs per aspect type
- [ ] Midpoints display
- [ ] Arabic parts
- [ ] Fixed stars
- [ ] Asteroid support

## License

Part of the Adaptive Astro-Scheduler project.
