// Base types
export type Degrees = number; // 0-360

export type AspectType =
  | 'conjunction'   // 0°
  | 'sextile'       // 60°
  | 'square'        // 90°
  | 'trine'         // 120°
  | 'opposition'    // 180°
  | 'quincunx';     // 150°

export type ElementType = 'Огонь' | 'Земля' | 'Воздух' | 'Вода';
export type QualityType = 'Кардинальный' | 'Фиксированный' | 'Мутабельный';
export type LunarPhaseType = 'New' | 'Waxing' | 'Full' | 'Waning';
export type LunarEnergyType = 'Light' | 'Dark' | 'Neutral';

export type PlanetName =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto';

export type ZodiacSignName =
  | 'Овен' | 'Телец' | 'Близнецы' | 'Рак'
  | 'Лев' | 'Дева' | 'Весы' | 'Скорпион'
  | 'Стрелец' | 'Козерог' | 'Водолей' | 'Рыбы';

// DateTime with location
export interface DateTime {
  date: Date;
  timezone: string; // IANA timezone: 'Europe/Moscow', 'UTC', etc.
  location: {
    latitude: number;
    longitude: number;
  };
}

// Celestial Body
export interface CelestialBody {
  name: PlanetName;
  longitude: Degrees;         // Position on zodiac (0-360)
  latitude: Degrees;          // Declination
  zodiacSign: ZodiacSign;
  speed: number;              // Degrees per day
  isRetrograde: boolean;
  distanceAU: number;         // Distance in Astronomical Units
}

// Zodiac Sign
export interface ZodiacSign {
  id: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  name: ZodiacSignName;
  element: ElementType;
  quality: QualityType;
  rulingPlanet: PlanetName;
  symbol: string;             // ♈, ♉, ♊, etc.
  dateRange: [number, number]; // Approximate day range
}

// Lunar Day (1-30)
export interface LunarDay {
  number: number;             // 1-30
  symbol: string;
  energy: LunarEnergyType;
  lunarPhase: LunarPhaseType;
  characteristics: {
    spiritual: string;
    practical: string;
    avoided: string[];
  };
}

// Aspect between two bodies
export interface Aspect {
  body1: CelestialBody;
  body2: CelestialBody;
  type: AspectType;
  angle: Degrees;             // Exact angle
  orb: Degrees;               // Orb (tolerance)
  isExact: boolean;           // Within orb?
  interpretation: string;
}

// Transit (current planet to natal)
export interface Transit {
  transitPlanet: CelestialBody;
  natalPlanet: CelestialBody;
  transitDate: DateTime;
  aspect: Aspect;
  phase: 'Approaching' | 'Exact' | 'Separating';
  strength: number;           // 0.0 - 1.0
  interpretation: string;
}

// Void of Course Moon
export interface VoidOfCourseMoon {
  startTime: DateTime;
  endTime: DateTime;
  sign: ZodiacSign;
  duration: number;           // Hours
  isActive: (at: DateTime) => boolean;
}

// House
export interface House {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  cusp: Degrees;
  sign: ZodiacSign;
}

// Planetary Hour
export interface PlanetaryHour {
  hour: number;               // 0-23
  ruler: PlanetName;
  startTime: DateTime;
  endTime: DateTime;
}
