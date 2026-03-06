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

// Moon Phase Details
export interface MoonPhase {
  phase: string;
  illumination: number; // 0.0 - 1.0
  age: number;          // days
}

// Lunar Day (1-30)
export interface LunarDay {
  number: number;             // 1-30
  symbol: string;
  energy: LunarEnergyType;
  lunarPhase: LunarPhaseType;
  moonPhase?: MoonPhase;      // Additional phase details
  colorPalette?: {
    base_colors: string[];
    gradient: string[];
  };
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

// API Response Types
// These match the actual API responses from the ephemeris service

export interface PlanetsApiResponse {
  date: string;               // ISO string
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  planets: PlanetApiData[];
}

export interface PlanetApiData {
  name: string;
  longitude: number;          // 0-360 degrees
  latitude: number;
  zodiacSign: string;
  degree: number;             // Degree within sign (0-30)
  speed: number;              // Degrees per day
  isRetrograde: boolean;
  distanceAU: number;
}

export interface AspectsApiResponse {
  date: string;
  aspects: AspectApiData[];
}

export interface AspectApiData {
  planet1: string;
  planet2: string;
  // Python API uses snake_case; camelCase kept for backwards-compat
  aspect_type?: string;       // Raw from Python API
  type?: AspectType;          // Normalised camelCase alias
  angle: number;              // Actual angle
  orb: number;                // Distance from exact
  is_exact?: boolean;         // Python API field
  is_applying?: boolean;      // Python API field
  isApplying?: boolean;       // camelCase alias
  interpretation: string;
}

export interface HousesApiResponse {
  date: string;
  location: {
    latitude: number;
    longitude: number;
  };
  system: string;             // "placidus", "whole-sign", "equal"
  houses: HouseApiData[];
}

export interface HouseApiData {
  number: number;             // 1-12
  cusp: number;               // Degrees
  zodiacSign: string;
  degree: number;
}

export interface VoidMoonApiResponse {
  date: string;
  isVoidOfCourse: boolean;
  voidPeriod?: {
    startTime: string;
    endTime: string;
    currentSign: string;
    nextSign: string;
    durationHours: number;
  };
  nextVoid?: {
    startTime: string;
    sign: string;
  };
}

export interface PlanetaryHoursApiResponse {
  date: string;
  sunrise: string;            // Time string
  sunset: string;             // Time string
  hours: PlanetaryHourApiData[];
}

export interface PlanetaryHourApiData {
  hour: number;               // 0-23
  planet: string;
  startTime: string;          // Time string
  endTime: string;            // Time string
}

export interface RetrogradesApiResponse {
  date: string;
  retrogradePlanets: RetrogradeApiData[];
}

export interface RetrogradeApiData {
  name: string;
  retrogradeStart: string;    // Date string
  retrogradeEnd: string;      // Date string
  currentSign: string;
}

// ============================================================================
// Dispositor Chain Types
// ============================================================================

/** Карта «планета → знак → управитель» */
export interface DispositorMap {
  [planet: string]: {
    sign: string;
    ruler: string;
  };
}

/** Цепочка управителей для одной планеты */
export interface DispositorChainEntry {
  /** Последовательность планет в цепочке */
  chain: string[];
  /** Знаки, через которые проходит цепочка */
  signs: string[];
  /** 'linear' — заканчивается у финального управителя; 'cycle' — зацикленная */
  status: 'linear' | 'cycle';
  /** Финальный управитель (null если цикл) */
  final_dispositor: string | null;
  /** Узлы цикла (если status='cycle') */
  cycle_nodes: string[];
}

/** Ответ API /planning/dispositors */
export interface DispositorChainsResponse {
  datetime_utc: string;
  system: 'traditional' | 'modern';
  full_map: DispositorMap;
  /** Планеты, которые управляют своим знаком (конечные управители) */
  final_dispositors: string[];
  /** Взаимные рецепции */
  mutual_receptions: string[][];
  /** Цепочки управителей по каждой планете */
  chains: Record<string, DispositorChainEntry>;
}


// ============================================================================
// Aspect Strength & Analysis Types
// ============================================================================

/**
 * Aspect Strength Weights
 * Individual components that contribute to overall aspect strength
 */
export interface StrengthWeights {
  orbTightness: number;      // 0-1: How close to exact (1° = 1.0, 8° = 0.25)
  planetImportance: number;  // 0-1: Significance of planets involved
  aspectPower: number;       // 0-1: Inherent power of aspect type
  applyingBonus: number;     // 0-0.1: Bonus if aspect is applying (building)
}

/**
 * Scored Aspect with Strength Analysis
 * Extends basic aspect data with calculated strength metrics
 */
export interface ScoredAspect {
  // Original aspect data
  planet1: string;
  planet2: string;
  type: AspectType;
  angle: number;
  orb: number;
  isApplying: boolean;
  interpretation: string;

  // Strength analysis
  strength: number;          // 0-1 composite score
  weights: StrengthWeights;
  rank: 'weak' | 'moderate' | 'strong' | 'very-strong';
}

/**
 * Aspect Analysis Response
 * Comprehensive aspect analysis including scored aspects
 */
export interface AspectAnalysisResponse {
  date: string;
  aspects: ScoredAspect[];
  topAspects: ScoredAspect[];  // Top 5 by strength
  patterns?: AspectPattern[];  // Detected geometric patterns
}

// ============================================================================
// Aspect Pattern Detection Types
// ============================================================================

/**
 * Aspect Pattern Types
 * Geometric configurations formed by multiple planets
 */
export type AspectPatternType =
  | 'grand-trine'    // 3 planets forming 120° triangle (harmony)
  | 't-square'       // 2 oppositions + apex squaring both (tension)
  | 'grand-cross'    // 4 planets in cross (challenge)
  | 'yod'            // 2 quincunxes + sextile "Finger of God" (fate)
  | 'kite'           // Grand Trine + opposition (talent with direction)
  | 'stellium';      // 3+ planets within 8° (concentration)

/**
 * Pattern Rarity Classification
 */
export type PatternRarity = 'common' | 'moderate' | 'rare' | 'very-rare';

/**
 * Aspect Pattern
 * Detected geometric pattern with participating planets and aspects
 */
export interface AspectPattern {
  type: AspectPatternType;
  planets: string[];           // Planet names involved in pattern
  aspects: ScoredAspect[];     // Aspects forming the pattern
  strength: number;            // 0-1 based on average orb tightness
  interpretation: string;      // Human-readable description
  rarity: PatternRarity;       // How rare this pattern is
  element?: string;            // For Grand Trine/Cross (Fire, Earth, Air, Water)
}

// ============================================================================
// Celestial Events Types
// ============================================================================

/**
 * Celestial Event Types
 * Various astronomical events that can be detected
 */
export type CelestialEventType =
  | 'lunar-phase'          // New Moon, Full Moon, Quarters
  | 'lunar-eclipse'        // Total, Partial, Penumbral
  | 'solar-eclipse'        // Total, Annular, Partial
  | 'planetary-alignment'  // 3+ planets in narrow arc
  | 'conjunction'          // Planets close together
  | 'occultation'          // Moon/planet blocking another
  | 'retrograde-start'     // Planet stations retrograde
  | 'retrograde-end'       // Planet stations direct
  | 'ingress'              // Planet enters new sign
  | 'equinox'              // Spring/Autumn equinox
  | 'solstice';            // Summer/Winter solstice

/**
 * Celestial Event
 * Detected astronomical event with metadata
 */
export interface CelestialEvent {
  id: string;                    // Unique identifier
  type: CelestialEventType;      // Event type
  name: string;                  // Display name
  description: string;           // Detailed description
  date: DateTime;                // Event date/time
  endDate?: DateTime;            // For events with duration
  planets?: string[];            // Involved planets
  rarity: PatternRarity;         // How rare/significant
  visibility?: 'visible' | 'not-visible' | 'telescope-only';
  significance: string;          // Astrological meaning
}


// ============================================================================
// Optimal Timing Engine Types
// ============================================================================

/**
 * Intention Categories
 * Types of intentions users might want to find optimal timing for
 */
export type IntentionCategory =
  | 'drop-habits'
  | 'start-project'
  | 'make-decision'
  | 'relationship'
  | 'career-change'
  | 'health-wellness'
  | 'financial'
  | 'creative'
  | 'spiritual';

/**
 * Timing Window
 * A scored period of time favorable for a specific intention
 */
export interface TimingWindow {
  id: string;
  date: DateTime;
  score: number; // 0-100
  events: CelestialEvent[];
  summary: string;
  explanation?: string;
  warnings?: string[];
  suggestions?: string[];
  moonPhase?: string;
  moonSign?: string;
}

/**
 * Timing Rule
 * Configuration for scoring events based on intention
 */
export interface TimingRule {
  type: CelestialEventType;
  phase?: string;        // For lunar phases or retrogrades
  planet?: string;       // Specific planet involved
  targetPlanet?: string; // Secondary planet involved
  sign?: string;         // Specific zodiac sign
  weight: number;        // Positive = favorable, Negative = unfavorable
  condition?: 'exact-match' | 'contains';
}
