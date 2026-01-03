import type {
  DateTime,
  CelestialBody,
  LunarDay,
  VoidOfCourseMoon,
  Aspect,
  House,
  PlanetaryHour,
} from '@adaptive-astro/shared/types/astrology';

/**
 * Ephemeris Calculator Interface
 *
 * This interface defines the contract for astronomical calculations.
 * Implementations must provide precise planetary positions, lunar data,
 * and astrological calculations.
 */
export interface IEphemerisCalculator {
  /**
   * Get positions of all major planets for a given date/time
   * @param dateTime - Date, time, and location
   * @returns Object with planet positions
   */
  getPlanetsPositions(dateTime: DateTime): Promise<PlanetPositions>;

  /**
   * Get current moon phase (illumination percentage)
   * @param dateTime - Date and time
   * @returns Moon illumination (0.0 = new moon, 1.0 = full moon)
   */
  getMoonPhase(dateTime: DateTime): Promise<number>;

  /**
   * Calculate lunar day (1-30) for given date/time
   * @param dateTime - Date and time
   * @returns Lunar day number and metadata
   */
  getLunarDay(dateTime: DateTime): Promise<LunarDay>;

  /**
   * Detect Void of Course Moon periods
   * @param dateTime - Date and time to check
   * @returns VoidOfCourseMoon object or null
   */
  getVoidOfCourseMoon(dateTime: DateTime): Promise<VoidOfCourseMoon | null>;

  /**
   * Get list of retrograde planets
   * @param dateTime - Date and time
   * @returns Array of retrograde planets
   */
  getRetrogradePlanets(dateTime: DateTime): Promise<CelestialBody[]>;

  /**
   * Calculate aspects between celestial bodies
   * @param bodies - Array of celestial bodies
   * @param orb - Orb tolerance (default: 8 degrees)
   * @returns Array of aspects
   */
  calculateAspects(
    bodies: CelestialBody[],
    orb?: number
  ): Promise<Aspect[]>;

  /**
   * Calculate house cusps for given birth data
   * @param dateTime - Birth date, time, and location
   * @param system - House system ('placidus', 'whole-sign', 'equal', etc.)
   * @returns House cusps
   */
  calculateHouses(
    dateTime: DateTime,
    system?: 'placidus' | 'whole-sign' | 'equal'
  ): Promise<{[key: number]: House}>;

  /**
   * Get planetary hours for a given date and location
   * @param dateTime - Date and location
   * @returns Array of planetary hours
   */
  getPlanetaryHours(dateTime: DateTime): Promise<PlanetaryHour[]>;
}

/**
 * Planet Positions Collection
 */
export interface PlanetPositions {
  sun: CelestialBody;
  moon: CelestialBody;
  mercury: CelestialBody;
  venus: CelestialBody;
  mars: CelestialBody;
  jupiter: CelestialBody;
  saturn: CelestialBody;
  uranus: CelestialBody;
  neptune: CelestialBody;
  pluto: CelestialBody;
}
