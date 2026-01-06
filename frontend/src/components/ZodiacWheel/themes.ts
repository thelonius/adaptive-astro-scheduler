import type { ColorScheme } from './types';

export const darkTheme: ColorScheme = {
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

export const lightTheme: ColorScheme = {
  background: '#f7fafc',
  zodiacRing: '#e2e8f0',
  zodiacText: '#2d3748',
  degreeMarks: '#cbd5e0',
  planets: {
    Sun: '#DD6B20',
    Moon: '#4A5568',
    Mercury: '#3182CE',
    Venus: '#D53F8C',
    Mars: '#C53030',
    Jupiter: '#DD6B20',
    Saturn: '#744210',
    Uranus: '#00B5D8',
    Neptune: '#3182CE',
    Pluto: '#6B46C1',
  },
  aspects: {
    conjunction: '#DD6B20',
    sextile: '#00B5D8',
    square: '#C53030',
    trine: '#38A169',
    opposition: '#D53F8C',
    quincunx: '#805AD5',
  },
  houses: '#a0aec0',
};

export const cosmicTheme: ColorScheme = {
  background: '#000000',
  zodiacRing: '#1a0033',
  zodiacText: '#b794f4',
  degreeMarks: '#553c9a',
  planets: {
    Sun: '#ffd700',
    Moon: '#e0e0e0',
    Mercury: '#00d4ff',
    Venus: '#ff00ff',
    Mars: '#ff3333',
    Jupiter: '#ff9500',
    Saturn: '#ffcc00',
    Uranus: '#00ffff',
    Neptune: '#0066ff',
    Pluto: '#cc00ff',
  },
  aspects: {
    conjunction: '#ffffff',
    sextile: '#00ffff',
    square: '#ff0000',
    trine: '#00ff00',
    opposition: '#ff00ff',
    quincunx: '#cc00ff',
  },
  houses: '#4a148c',
};

export const solarTheme: ColorScheme = {
  background: '#fffaf0',
  zodiacRing: '#ffeaa7',
  zodiacText: '#d63031',
  degreeMarks: '#fdcb6e',
  planets: {
    Sun: '#e17055',
    Moon: '#74b9ff',
    Mercury: '#a29bfe',
    Venus: '#fd79a8',
    Mars: '#d63031',
    Jupiter: '#e17055',
    Saturn: '#fdcb6e',
    Uranus: '#74b9ff',
    Neptune: '#6c5ce7',
    Pluto: '#a29bfe',
  },
  aspects: {
    conjunction: '#e17055',
    sextile: '#74b9ff',
    square: '#d63031',
    trine: '#00b894',
    opposition: '#fd79a8',
    quincunx: '#a29bfe',
  },
  houses: '#fab1a0',
};

export const lunarTheme: ColorScheme = {
  background: '#0f172a',
  zodiacRing: '#1e293b',
  zodiacText: '#cbd5e1',
  degreeMarks: '#475569',
  planets: {
    Sun: '#fbbf24',
    Moon: '#f8fafc',
    Mercury: '#93c5fd',
    Venus: '#f9a8d4',
    Mars: '#fb7185',
    Jupiter: '#fb923c',
    Saturn: '#fcd34d',
    Uranus: '#67e8f9',
    Neptune: '#60a5fa',
    Pluto: '#c084fc',
  },
  aspects: {
    conjunction: '#fbbf24',
    sextile: '#67e8f9',
    square: '#fb7185',
    trine: '#4ade80',
    opposition: '#f472b6',
    quincunx: '#a78bfa',
  },
  houses: '#334155',
};

export const themes = {
  dark: darkTheme,
  light: lightTheme,
  cosmic: cosmicTheme,
  solar: solarTheme,
  lunar: lunarTheme,
};

export type ThemeName = keyof typeof themes;
