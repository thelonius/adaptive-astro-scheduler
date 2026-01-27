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
  PlanetsApiResponse,
  AspectsApiResponse,
  HousesApiResponse,
  VoidMoonApiResponse,
  PlanetaryHoursApiResponse,
  RetrogradesApiResponse,
} from '@adaptive-astro/shared/types/astrology';
import { IEphemerisCalculator } from './interface';
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
 * Base API URL: http://176.123.166.252:8000
 */
export class EphemerisAdapter implements IEphemerisCalculator {
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://176.123.166.252:8000') {
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
    const response = await this.fetch<MoonPhaseResponse>('/api/v1/ephemeris/moon-phase', {
      date: dateTime.date.toISOString().split('.')[0], // Remove milliseconds and timezone
      latitude: dateTime.location.latitude.toString(),
      longitude: dateTime.location.longitude.toString(),
      timezone: dateTime.timezone,
    });

    // The API already returns a value between 0.0 and 1.0
    return response.illumination;
  }

  /**
   * Calculate lunar day (1-30) for given date/time
   */
  async getLunarDay(dateTime: DateTime): Promise<LunarDay> {
    const response = await this.fetch<any>('/api/v1/ephemeris/lunar-day', {
      date: dateTime.date.toISOString().split('.')[0],
      timezone: dateTime.timezone,
    });

    return {
      number: response.number,
      symbol: response.symbol || '🌙',
      energy: this.getLunarEnergy(response.number),
      lunarPhase: this.parseLunarPhase(response.lunar_phase),
      characteristics: {
        spiritual: `Lunar Day ${response.number}: ${response.symbol}`,
        practical: `Energy: ${response.energy}`,
        avoided: [],
      },
    };
  }

  /**
   * Calculate zodiac sign from ecliptic longitude
   */
  private getZodiacSign(longitude: number): string {
    const signs = [
      'Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева',
      'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы'
    ];
    const index = Math.floor(longitude / 30);
    return signs[index % 12];
  }

  /**
   * Get planetary positions from API
   */
  async getPlanetsPositions(dateTime: DateTime): Promise<PlanetsApiResponse> {
    const params = {
      date: dateTime.date.toISOString().split('.')[0], // Remove milliseconds and timezone
      latitude: dateTime.location.latitude.toString(),
      longitude: dateTime.location.longitude.toString(),
      elevation: '0',
      timezone: dateTime.timezone,
    };

    const response = await this.fetch<PlanetsApiResponse>('/api/v1/ephemeris/planets', params);

    // Ensure all planets have zodiacSign calculated from longitude
    response.planets = response.planets.map(planet => ({
      ...planet,
      zodiacSign: planet.zodiacSign || this.getZodiacSign(planet.longitude),
    }));

    return response;
  }

  /**
   * Get void of course moon from API
   * Falls back to calculation from aspects if API doesn't support it
   */
  async getVoidOfCourseMoon(dateTime: DateTime): Promise<VoidMoonApiResponse> {
    try {
      const params = {
        date: this.formatDate(dateTime.date),
        tz: dateTime.timezone,
      };

      return await this.fetch<VoidMoonApiResponse>('/api/v1/ephemeris/void-moon', params);
    } catch (error) {
      // API doesn't support void moon - calculate from aspects
      // Import here to avoid circular dependency
      const { VoidMoonCalculator } = await import('../../services/void-moon-calculator');
      const calculator = new VoidMoonCalculator(this);
      const voidPeriod = await calculator.calculateVoidMoon(dateTime);

      return {
        date: this.formatDate(dateTime.date),
        isVoidOfCourse: voidPeriod.isVoid,
        voidPeriod: voidPeriod.isVoid && voidPeriod.voidStart && voidPeriod.voidEnd ? {
          startTime: voidPeriod.voidStart.toISOString(),
          endTime: voidPeriod.voidEnd.toISOString(),
          currentSign: voidPeriod.currentSign || '',
          nextSign: voidPeriod.nextSign || '',
          durationHours: (voidPeriod.voidEnd.getTime() - voidPeriod.voidStart.getTime()) / (1000 * 60 * 60),
        } : undefined,
      };
    }
  }

  /**
   * Get retrograde planets from API
   */
  async getRetrogradePlanets(dateTime: DateTime): Promise<RetrogradesApiResponse> {
    const params = {
      date: this.formatDate(dateTime.date),
    };

    return this.fetch<RetrogradesApiResponse>('/api/v1/ephemeris/retrogrades', params);
  }

  /**
   * Get aspects from API
   */
  async getAspects(dateTime: DateTime, orb: number = 8): Promise<AspectsApiResponse> {
    const params = {
      date: this.formatDate(dateTime.date),
      time: this.formatTime(dateTime.date),
      orb: orb.toString(),
    };

    const rawResponse = await this.fetch<any[]>('/api/v1/ephemeris/aspects', params);

    // Transform array response to AspectsApiResponse format
    return {
      date: params.date,
      aspects: rawResponse,
    };
  }

  /**
   * Get houses from API
   */
  async getHouses(dateTime: DateTime, system: string = 'placidus'): Promise<HousesApiResponse> {
    const params = {
      date: this.formatDate(dateTime.date),
      time: this.formatTime(dateTime.date),
      latitude: dateTime.location.latitude.toString(),
      longitude: dateTime.location.longitude.toString(),
      system,
    };

    const rawResponse = await this.fetch<any>('/api/v1/ephemeris/houses', params);

    // Transform the object response to array format
    const housesArray = Object.values(rawResponse).map((house: any) => ({
      number: house.number,
      cusp: house.cusp_longitude,
      zodiacSign: house.cusp_sign || this.getZodiacSign(house.cusp_longitude),
      degree: Math.floor(house.cusp_longitude % 30),
    }));

    return {
      date: params.date,
      location: {
        latitude: parseFloat(params.latitude),
        longitude: parseFloat(params.longitude),
      },
      system: system, // Fixed: added missing property
      houses: housesArray,
    };
  }

  /**
   * Get planetary hours from API
   */
  async getPlanetaryHours(dateTime: DateTime): Promise<PlanetaryHoursApiResponse> {
    const params = {
      date: this.formatDate(dateTime.date),
      lat: dateTime.location.latitude.toString(),
      lon: dateTime.location.longitude.toString(),
      tz: dateTime.timezone,
    };

    return this.fetch<PlanetaryHoursApiResponse>('/api/v1/ephemeris/planetary-hours', params);
  }

  /**
   * Format time for API (HH:MM:SS)
   */
  private formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0];
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
