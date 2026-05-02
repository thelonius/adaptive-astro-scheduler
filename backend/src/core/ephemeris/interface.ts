import type {
  DateTime,
  CelestialBody,
  LunarDay,
  VoidOfCourseMoon,
  Aspect,
  House,
  PlanetaryHour,
  PlanetsApiResponse,
  AspectsApiResponse,
  AspectPerfectionsApiResponse,
  HousesApiResponse,
  VoidMoonApiResponse,
  PlanetaryHoursApiResponse,
  RetrogradesApiResponse,
  DispositorChainsResponse,
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
   * @returns Planet positions from API
   */
  getPlanetsPositions(dateTime: DateTime): Promise<PlanetsApiResponse>;

  /**
   * Get aspects between planets for a given date/time
   * @param dateTime - Date and time
   * @param orb - Orb tolerance (default: 8 degrees)
   * @returns Planetary aspects from API
   */
  getAspects(dateTime: DateTime, orb?: number): Promise<AspectsApiResponse>;

  /**
   * Find every exact aspect perfection between the given planet pairs and
   * aspect types within [start, end). Each entry's `exact_at` is the UTC
   * moment the aspect becomes exact, accurate to ~1 minute.
   *
   * Used by v2 optimal-timing to answer "did aspect X perfect on day D?"
   * — a stronger signal than "is X applying at noon?".
   *
   * @param start ISO 8601 timestamp (UTC) — window start (inclusive)
   * @param end   ISO 8601 timestamp (UTC) — window end (exclusive)
   * @param pairs Planet pairs, e.g. [['Moon','Jupiter']]
   * @param aspects Aspect names, e.g. ['trine','sextile','conjunction']
   */
  getAspectPerfections(
    start: string,
    end: string,
    pairs: ReadonlyArray<readonly [string, string]>,
    aspects: ReadonlyArray<string>,
  ): Promise<AspectPerfectionsApiResponse>;

  /**
   * Get astrological houses for a given date/time/location
   * @param dateTime - Date, time, and location
   * @param system - House system ('placidus', 'whole-sign', 'equal')
   * @returns Houses from API
   */
  getHouses(dateTime: DateTime, system?: string): Promise<HousesApiResponse>;

  /**
   * Get planetary hours for a given date and location
   * @param dateTime - Date and location
   * @returns Planetary hours from API
   */
  getPlanetaryHours(dateTime: DateTime): Promise<PlanetaryHoursApiResponse>;

  /**
   * Get retrograde planets for a given date
   * @param dateTime - Date to check
   * @returns Retrograde planets from API
   */
  getRetrogradePlanets(dateTime: DateTime): Promise<RetrogradesApiResponse>;

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
   * @returns VoidOfCourseMoon data from API
   */
  getVoidOfCourseMoon(dateTime: DateTime): Promise<VoidMoonApiResponse>;

  /**
   * Get dispositor chains — who rules the ruler?
   * @param dateTime - Date and time
   * @param system - 'traditional' | 'modern' (default: 'traditional')
   */
  getDispositorChains(dateTime: DateTime, system?: string): Promise<DispositorChainsResponse>;
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
