import type { CelestialBody, Aspect, House, ZodiacSign } from '@adaptive-astro/shared/types';

export interface ZodiacWheelData {
  planets: CelestialBody[];
  aspects: Aspect[];
  houses?: House[];
  timestamp: Date;
}

export interface ZodiacWheelConfig {
  size: number;
  showHouses: boolean;
  showAspects: boolean;
  showDegrees: boolean;
  showRetrogrades: boolean;
  aspectOrb: number;
  refreshInterval: number; // milliseconds
  colorScheme: ColorScheme;
}

export interface ColorScheme {
  background: string;
  zodiacRing: string;
  zodiacText: string;
  degreeMarks: string;
  planets: Record<string, string>;
  aspects: Record<string, string>;
  houses: string;
}

export interface PlanetPosition {
  planet: CelestialBody;
  x: number;
  y: number;
  angle: number;
}

export interface AspectLine {
  aspect: Aspect;
  from: PlanetPosition;
  to: PlanetPosition;
  color: string;
  strength: number;
}

export const DEFAULT_COLORS: ColorScheme = {
  background: '#0a0e27',
  zodiacRing: '#1a1f3a',
  zodiacText: '#8b9dc3',
  degreeMarks: '#4a5568',
  planets: {
    Sun: '#FFD700',
    Moon: '#C0C0C0',
    Mercury: '#87CEEB',
    Venus: '#FF69B4',
    Mars: '#FF4500',
    Jupiter: '#FFA500',
    Saturn: '#DAA520',
    Uranus: '#00CED1',
    Neptune: '#4169E1',
    Pluto: '#8B008B',
  },
  aspects: {
    conjunction: '#FFD700',
    sextile: '#00CED1',
    square: '#FF4500',
    trine: '#32CD32',
    opposition: '#FF1493',
    quincunx: '#9370DB',
  },
  houses: '#2d3748',
};

export const DEFAULT_CONFIG: ZodiacWheelConfig = {
  size: 600,
  showHouses: false,
  showAspects: true,
  showDegrees: true,
  showRetrogrades: true,
  aspectOrb: 8,
  refreshInterval: 5 * 60 * 1000, // 5 minutes default
  colorScheme: DEFAULT_COLORS,
};
