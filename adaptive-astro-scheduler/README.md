# Adaptive Astro Scheduler

## Overview

The Adaptive Astro Scheduler is a web application designed to visualize astrological data through an interactive Zodiac Wheel component. This project provides real-time updates on planetary positions, aspects, and astrological houses, allowing users to explore celestial events and their implications.

## Features

- **Zodiac Wheel Visualization**: A dynamic representation of the zodiac signs, planets, and aspects.
- **Real-time Data**: Automatic updates with configurable refresh rates based on celestial body movements.
- **Interactive Tooltips**: Hover over planets and aspects to get detailed information.
- **Customizable Themes**: Choose from multiple themes or create your own color schemes.
- **Performance Optimized**: Efficient data fetching and rendering for a smooth user experience.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (Node package manager)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/adaptive-astro-scheduler.git
   ```

2. Navigate to the project directory:
   ```
   cd adaptive-astro-scheduler/frontend
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Create a `.env` file based on the `.env.example` template and configure your environment variables.

### Running the Application

To start the development server, run:
```
npm run dev
```
Open your browser and navigate to `http://localhost:3000` to view the application.

### Demo

The Zodiac Wheel component can be accessed through the demo page located at `src/apps/ZodiacWheelDemo.tsx`. This page showcases all features and allows for live configuration.

## File Structure

```
adaptive-astro-scheduler
├── frontend
│   ├── src
│   │   ├── apps
│   │   │   └── ZodiacWheelDemo.tsx
│   │   ├── components
│   │   │   └── ZodiacWheel
│   │   │       ├── AspectLines.tsx
│   │   │       ├── HousesOverlay.tsx
│   │   │       ├── PlanetMarkers.tsx
│   │   │       ├── README.md
│   │   │       ├── Tooltip.tsx
│   │   │       ├── ZodiacCircle.tsx
│   │   │       ├── index.tsx
│   │   │       ├── performance.md
│   │   │       ├── themes.ts
│   │   │       ├── types.ts
│   │   │       └── utils.ts
│   │   └── hooks
│   │       ├── useAdaptiveZodiacData.ts
│   │       └── useZodiacData.ts
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── IMPLEMENTATION_SUMMARY.md
└── README.md
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.