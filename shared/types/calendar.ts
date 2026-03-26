import {
  DateTime,
  LunarDay,
  ZodiacSign,
  CelestialBody,
  VoidOfCourseMoon,
  Transit,
  PlanetaryHour,
  AspectApiData,
  House,
} from './astrology';

export interface CalendarDay {
  date: DateTime;

  // Lunar data
  lunarDay: LunarDay;
  lunarPhase: number;          // 0.0 - 1.0 (illumination)
  moonPhase: {
    phase: string;
    illumination: number;
    age: number;
  };
  moonSign: ZodiacSign;

  // Basic temporal info
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  seasonalPhase: 'Spring' | 'Summer' | 'Autumn' | 'Winter';

  // Planet positions (current sky)
  transits: {
    sun: CelestialBody;
    moon: CelestialBody;
    mercury: CelestialBody;
    venus: CelestialBody;
    mars: CelestialBody;
    jupiter: CelestialBody;
    saturn: CelestialBody;
  };

  // Special conditions
  voidOfCourseMoon: VoidOfCourseMoon | null;
  retrogradesActive: CelestialBody[];
  eclipseWindow: boolean;
  aspects?: AspectApiData[];   // Current sky aspects
  houses?: House[];            // Current sky houses


  // Personal (if natal chart provided)
  personalTransits?: Transit[];
  personalLunarNodeAspect?: any;

  // Planetary hours (location-dependent)
  planetaryHours?: PlanetaryHour[];

  // Recommendations
  recommendations: {
    bestFor: string[];
    avoidFor: string[];
    generalMood: string;
    strength: number;          // 0.0 - 1.0
    reasons: string[];
    warnings: string[];
  };
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDay[];
}

export interface CalendarQuery {
  activityType: string;
  dateRange: {
    start: string;             // ISO 8601
    end: string;
  };
  minStrength?: number;        // Filter threshold
  limit?: number;              // Max results
}
