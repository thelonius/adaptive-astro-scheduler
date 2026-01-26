# Zodiac Wheel Component

## Overview

The Zodiac Wheel component is a fully functional and extensible visualization tool that displays the positions of celestial bodies in relation to the zodiac signs. It provides real-time updates and supports various customization options, making it suitable for both casual users and astrology enthusiasts.

## Installation

To use the Zodiac Wheel component, ensure you have the necessary dependencies installed. You can include it in your project by following these steps:

1. Install the required packages:
   ```
   npm install
   ```

2. Import the component in your application:
   ```tsx
   import { ZodiacWheel } from './components/ZodiacWheel';
   ```

## Usage

The Zodiac Wheel component can be used with various configurations. Here’s a basic example:

```tsx
<ZodiacWheel />
```

### Configuration Options

You can customize the Zodiac Wheel by passing a configuration object:

```tsx
<ZodiacWheel
  config={{
    size: 600,
    showAspects: true,
    showHouses: false,
    refreshInterval: 5 * 60 * 1000,
  }}
  latitude={55.7558}
  longitude={37.6173}
  timezone="Europe/Moscow"
  useAdaptiveRefresh={true}
/>
```

### Themes

The component supports multiple themes. You can choose a theme by importing the themes module:

```tsx
import { themes } from './components/ZodiacWheel/themes';

<ZodiacWheel
  config={{ colorScheme: themes.cosmic }}
/>
```

## Features

- Real-time planetary positions and aspects
- Customizable size and themes
- Interactive tooltips with detailed information
- Adaptive refresh rates based on celestial body speeds
- Support for various astrological systems (e.g., Placidus)

## Documentation

For detailed documentation on each sub-component, refer to the following files:

- **AspectLines.tsx**: Visualizes astrological aspects.
- **HousesOverlay.tsx**: Displays astrological houses.
- **PlanetMarkers.tsx**: Positions planets on the wheel.
- **Tooltip.tsx**: Shows detailed information on hover.
- **ZodiacCircle.tsx**: Renders the zodiac circle.

## Performance

For performance optimization details, refer to the `performance.md` file located in the same directory.

## Contributing

If you would like to contribute to the Zodiac Wheel component, please follow the standard contribution guidelines and submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.