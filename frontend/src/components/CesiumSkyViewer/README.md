# Cesium Sky Viewer Component

3D visualization of celestial bodies and sky events using Cesium.js.

## Features

- **3D Globe Rendering**: Interactive Earth globe with planetary overlays
- **Real-time Planet Positions**: Displays planets based on ephemeris data
- **Interactive Controls**: Time animation, camera presets, and speed control
- **Event Visualization**: Shows celestial events as markers (future enhancement)
- **Synchronized Data**: Integrates with existing ZodiacWheel data

## Setup

### 1. Get Cesium Ion Token

1. Create a free account at [https://ion.cesium.com/](https://ion.cesium.com/)
2. Navigate to "Access Tokens"
3. Create a new token or copy the default token
4. Add to your `.env.local` file:

```bash
VITE_CESIUM_ION_TOKEN=your_token_here
```

### 2. Install Dependencies

Already installed:
- `cesium` - Core 3D globe library
- `resium` - React wrapper for Cesium
- `vite-plugin-cesium` - Vite plugin for asset handling

## Usage

```tsx
import { CesiumSkyViewer } from '../components/CesiumSkyViewer';

<CesiumSkyViewer
  planetData={zodiacWheelData}
  currentTime={new Date()}
  height={600}
  autoRotate={false}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `planetData` | `ZodiacWheelData` | `undefined` | Planet positions and aspects data |
| `currentTime` | `Date` | `new Date()` | Current time to display |
| `onTimeChange` | `(date: Date) => void` | `undefined` | Callback when time changes |
| `height` | `number` | `600` | Viewer height in pixels |
| `autoRotate` | `boolean` | `false` | Enable automatic camera rotation |

## Controls

### Time Controls
- **Play/Pause**: Start/stop time animation
- **Speed**: Adjust time multiplier (1x to 1 day/sec)

### Camera Presets
- **🌍 Earth View**: Standard view from space
- **☀️ Solar System View**: Wider view showing more context
- **⬆️ Top View**: Direct overhead view

### Interactive Features
- **Click planets**: View detailed information
- **Mouse drag**: Rotate camera
- **Scroll**: Zoom in/out
- **Right-click drag**: Pan camera

## Technical Details

### Coordinate System

Planets are positioned on a celestial sphere using ecliptic longitude:
- 0° = Aries (Spring Equinox) = positive X axis
- Longitude increases counter-clockwise
- Simplified: all planets on ecliptic plane (z=0)

### Planet Colors

Matches the ZodiacWheel color scheme:
- Sun: Gold
- Moon: Silver
- Mercury: Sky Blue
- Venus: Hot Pink
- Mars: Orange Red
- Jupiter: Orange
- Saturn: Goldenrod
- Uranus: Cyan
- Neptune: Royal Blue
- Pluto: Purple

## Future Enhancements

- [ ] Celestial event markers (eclipses, alignments)
- [ ] Orbital paths visualization
- [ ] Aspect lines in 3D
- [ ] Time range selector
- [ ] Export camera views
- [ ] VR/AR support

## Troubleshooting

### "Cesium Ion Token Required" Error

Make sure you've:
1. Created a Cesium Ion account
2. Generated an access token
3. Added it to `.env.local` (not `.env.example`)
4. Restarted the development server

### Planets Not Showing

Check that:
1. `planetData` prop is being passed
2. Planet data has valid longitude values (0-360)
3. Browser console for any errors

### Performance Issues

- Reduce `height` prop for smaller viewport
- Disable `autoRotate` if not needed
- Check browser GPU acceleration is enabled

## Resources

- [Cesium Documentation](https://cesium.com/learn/)
- [Resium GitHub](https://github.com/reearth/resium)
- [Cesium Ion](https://ion.cesium.com/)
