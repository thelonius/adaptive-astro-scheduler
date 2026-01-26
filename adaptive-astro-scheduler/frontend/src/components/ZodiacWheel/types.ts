// TypeScript interfaces for the Zodiac Wheel component

export interface ZodiacConfig {
  size: number; // Size of the zodiac wheel in pixels
  showAspects: boolean; // Flag to show/hide aspects
  showHouses: boolean; // Flag to show/hide houses
  refreshInterval: number; // Refresh interval in milliseconds
  colorScheme?: ColorScheme; // Optional color scheme
}

export interface ColorScheme {
  background: string; // Background color
  zodiacRing: string; // Zodiac ring color
  text: string; // Text color
  degreeMarks: string; // Degree marks color
  planetColors: string[]; // Array of colors for planets
  aspectColors: AspectColors; // Color mapping for aspects
}

export interface AspectColors {
  conjunction: string; // Color for conjunction aspect
  sextile: string; // Color for sextile aspect
  square: string; // Color for square aspect
  trine: string; // Color for trine aspect
  quincunx: string; // Color for quincunx aspect
  opposition: string; // Color for opposition aspect
}

export interface Planet {
  name: string; // Name of the planet
  symbol: string; // Symbol representation of the planet
  position: number; // Position in degrees on the zodiac wheel
  retrograde: boolean; // Flag indicating if the planet is in retrograde
}

export interface Aspect {
  type: string; // Type of aspect (e.g., conjunction, trine)
  strength: number; // Strength of the aspect
  planets: [string, string]; // Pair of planets involved in the aspect
}

export interface House {
  number: number; // House number (1-12)
  boundary: number; // Boundary position in degrees
}