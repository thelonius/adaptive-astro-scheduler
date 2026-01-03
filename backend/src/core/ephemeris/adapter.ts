import type {
  DateTime,
  CelestialBody,
  LunarDay,
  VoidOfCourseMoon,
  Aspect,
  House,
  PlanetaryHour,
  LunarPhaseType,
  LunarEnergyType,
} from '@adaptive-astro/shared/types/astrology';
import { IEphemerisCalculator, PlanetPositions } from './interface';
import { EphemerisError } from './errors';

/**
 * Response types from the external ephemeris API
 */
interface LunarDayResponse {
  lunar_day: number;
  gregorian_date: string;
  timing: {
    starts_at: string;
    ends_at: string;
    duration_hours: number;
    is_current: boolean;
  };
  moon_phase: {
    name: string;
    illumination: number;
    is_waxing: boolean;
    emoji: string;
  };
  color_palette: {
    base_colors: string[];
    gradient: string[];
  };
  health: {
    affected_organs: string[];
    affected_body_parts: string[];
    health_tips: string[];
  };
  recommendations: {
    recommended: string[];
    not_recommended: string[];
  };
  planetary_influence: {
    dominant_planet: string;
    additional_influences: string[];
    description: string;
  };
  general_description: string;
}

interface MoonPhaseResponse {
  name: string;
  illumination: number;
  is_waxing: boolean;
  emoji: string;
}

/**
 * Ephemeris Adapter
 *
 * Wraps the external Lunar Calendar & Ephemeris API
 * and normalizes output to match our type system.
 *
 * Base API URL: http://91.84.112.120:8000
 */
export class EphemerisAdapter implements IEphemerisCalculator {
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://91.84.112.120:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Helper to make HTTP requests to the API
   */
  private async fetch<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    try {
      const response = await globalThis.fetch(url.toString());

      if (!response.ok) {
        throw new EphemerisError(
          'API_ERROR',
          `API request failed: ${response.status} ${response.statusText}`,
          { endpoint, status: response.status }
        );
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof EphemerisError) {
        throw error;
      }

      throw new EphemerisError(
        'NETWORK_ERROR',
        `Failed to fetch from ephemeris API: ${error instanceof Error ? error.message : String(error)}`,
        { endpoint, originalError: error }
      );
    }
  }

  /**
   * Format date for API
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Convert moon phase name to our type
   */
  private parseLunarPhase(phaseName: string): LunarPhaseType {
    const normalized = phaseName.toLowerCase();
    if (normalized.includes('new')) return 'New';
    if (normalized.includes('full')) return 'Full';
    if (normalized.includes('waxing') || normalized.includes('crescent') || normalized.includes('first')) {
      return 'Waxing';
    }
    if (normalized.includes('waning') || normalized.includes('last')) {
      return 'Waning';
    }
    return 'New';
  }

  /**
   * Determine lunar energy from lunar day number
   * Based on traditional lunar calendar classification
   */
  private getLunarEnergy(lunarDay: number): LunarEnergyType {
    // Light days: 1-15 (waxing moon)
    // Dark days: 16-30 (waning moon)
    // Special neutral days: 9, 15, 23, 29
    const neutralDays = [9, 15, 23, 29];

    if (neutralDays.includes(lunarDay)) {
      return 'Neutral';
    }

    return lunarDay <= 15 ? 'Light' : 'Dark';
  }

  /**
   * Get current moon phase (illumination percentage)
   */
  async getMoonPhase(dateTime: DateTime): Promise<number> {
    const response = await this.fetch<MoonPhaseResponse>('/api/v1/moon-phase', {
      date: this.formatDate(dateTime.date),
      lat: dateTime.location.latitude.toString(),
      lon: dateTime.location.longitude.toString(),
      tz: dateTime.timezone,
    });

    // Convert percentage (0-100) to decimal (0-1)
    return response.illumination / 100;
  }

  /**
   * Calculate lunar day (1-30) for given date/time
   */
  async getLunarDay(dateTime: DateTime): Promise<LunarDay> {
    const response = await this.fetch<LunarDayResponse>('/api/v1/lunar-day', {
      date: this.formatDate(dateTime.date),
      timezone: dateTime.timezone,
    });

    return {
      number: response.lunar_day,
      symbol: response.moon_phase.emoji,
      energy: this.getLunarEnergy(response.lunar_day),
      lunarPhase: this.parseLunarPhase(response.moon_phase.name),
      characteristics: {
        spiritual: response.general_description,
        practical: response.recommendations.recommended.join(', '),
        avoided: response.recommendations.not_recommended,
      },
    };
  }

  /**
   * Get positions of all major planets
   *
   * NOTE: The current API doesn't provide planet positions.
   * This is a placeholder implementation that will need to be extended
   * when full ephemeris data becomes available.
   */
  async getPlanetsPositions(dateTime: DateTime): Promise<PlanetPositions> {
    throw new EphemerisError(
      'DATA_UNAVAILABLE',
      'Planet positions not available in current API. Requires full ephemeris integration.',
      { requestedDate: dateTime.date }
    );
  }

  /**
   * Detect Void of Course Moon periods
   *
   * NOTE: Not available in current API
   */
  async getVoidOfCourseMoon(dateTime: DateTime): Promise<VoidOfCourseMoon | null> {
    throw new EphemerisError(
      'DATA_UNAVAILABLE',
      'Void of Course Moon detection not available in current API',
      { requestedDate: dateTime.date }
    );
  }

  /**
   * Get list of retrograde planets
   *
   * NOTE: Not available in current API
   */
  async getRetrogradePlanets(dateTime: DateTime): Promise<CelestialBody[]> {
    throw new EphemerisError(
      'DATA_UNAVAILABLE',
      'Retrograde planet detection not available in current API',
      { requestedDate: dateTime.date }
    );
  }

  /**
   * Calculate aspects between celestial bodies
   *
   * NOTE: Not available in current API
   */
  async calculateAspects(
    bodies: CelestialBody[],
    orb: number = 8
  ): Promise<Aspect[]> {
    throw new EphemerisError(
      'DATA_UNAVAILABLE',
      'Aspect calculations not available in current API',
      { bodiesCount: bodies.length, orb }
    );
  }

  /**
   * Calculate house cusps
   *
   * NOTE: Not available in current API
   */
  async calculateHouses(
    dateTime: DateTime,
    system: 'placidus' | 'whole-sign' | 'equal' = 'placidus'
  ): Promise<{[key: number]: House}> {
    throw new EphemerisError(
      'DATA_UNAVAILABLE',
      'House calculations not available in current API',
      { requestedDate: dateTime.date, system }
    );
  }

  /**
   * Get planetary hours
   *
   * NOTE: Not available in current API
   */
  async getPlanetaryHours(dateTime: DateTime): Promise<PlanetaryHour[]> {
    throw new EphemerisError(
      'DATA_UNAVAILABLE',
      'Planetary hours not available in current API',
      { requestedDate: dateTime.date }
    );
  }

  /**
   * Health check - verify API is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetch<{ status: string }>('/health');
      return response.status === 'healthy';
    } catch {
      return false;
    }
  }
}
