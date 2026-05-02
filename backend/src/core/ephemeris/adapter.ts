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
  AspectPerfectionsApiResponse,
  HousesApiResponse,
  VoidMoonApiResponse,
  PlanetaryHoursApiResponse,
  RetrogradesApiResponse,
  DispositorChainsResponse,
} from '@adaptive-astro/shared/types/astrology';
import { IEphemerisCalculator } from './interface';
import { EphemerisError } from './errors';

/**
 * Response types from the external ephemeris API
 */
interface LunarDayResponse {
  number: number;
  lunar_phase: string;
  starts_at: string;
  ends_at: string;
  duration_hours: number;
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
   * Helper for POST requests with a JSON body.
   */
  private async fetchPost<T>(
    endpoint: string,
    body: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await globalThis.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new EphemerisError(
          'API_ERROR',
          `API request failed: ${response.status} ${response.statusText}`,
          { endpoint, status: response.status },
        );
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof EphemerisError) throw error;
      throw new EphemerisError(
        'NETWORK_ERROR',
        `Failed to POST to ephemeris API: ${error instanceof Error ? error.message : String(error)}`,
        { endpoint, originalError: error },
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
    const response = await this.fetch<LunarDayResponse>('/api/v1/ephemeris/lunar-day', {
      date: dateTime.date.toISOString().split('.')[0],
      latitude: dateTime.location.latitude.toString(),
      longitude: dateTime.location.longitude.toString(),
      timezone: dateTime.timezone,
    });

    return {
      number: response.number,
      symbol: '🌙', // Default symbol since API is now data-only
      energy: this.getLunarEnergy(response.number),
      lunarPhase: this.parseLunarPhase(response.lunar_phase),
      characteristics: {
        spiritual: `Lunar Day ${response.number}`,
        practical: `Starts: ${response.starts_at}, Ends: ${response.ends_at}`,
        avoided: [],
      },
    };
  }

  /**
   * Calculate zodiac sign from ecliptic longitude
   */
  private getZodiacSign(longitude: number): string {
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
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
   * Uses planning endpoint for reliable windows
   */
  async getVoidOfCourseMoon(dateTime: DateTime): Promise<VoidMoonApiResponse> {
    try {
      // Search window: +/- 12 hours from target time to find windows
      const startTime = new Date(dateTime.date.getTime() - 12 * 60 * 60 * 1000);
      const endTime = new Date(dateTime.date.getTime() + 12 * 60 * 60 * 1000);

      const params = {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      };

      const resp = await this.fetch<any>('/api/v1/planning/void-of-course', params);
      
      // Find if target date is in any window
      const targetTime = dateTime.date.getTime();
      const activeWindow = (resp.windows || []).find((w: any) => {
        const start = new Date(w.voc_start).getTime();
        const end = new Date(w.voc_end).getTime();
        return targetTime >= start && targetTime <= end;
      });

      return {
        date: dateTime.date.toISOString().split('T')[0],
        isVoidOfCourse: !!activeWindow,
        voidPeriod: activeWindow ? {
          startTime: activeWindow.voc_start,
          endTime: activeWindow.voc_end,
          currentSign: activeWindow.last_aspect?.planet || 'Moon', // Fallback
          nextSign: activeWindow.new_sign,
          durationHours: activeWindow.duration_hours,
        } : undefined,
      };
    } catch (error) {
      console.warn('❌ Failed to fetch VoC windows:', error instanceof Error ? error.message : String(error));
      return {
        date: dateTime.date.toISOString().split('T')[0],
        isVoidOfCourse: false,
      };
    }
  }

  /**
   * Get retrograde planets from API.
   * Handles three known response formats:
   *   1. Plain array:  [{name, longitude, zodiac_sign, speed}, ...]
   *   2. camelCase:    {date, retrogradePlanets: [...]}
   *   3. snake_case:   {date, retrograde_planets: [...]}
   * Fallback: derive retrogrades from planet positions (isRetrograde flag).
   */
  async getRetrogradePlanets(dateTime: DateTime): Promise<RetrogradesApiResponse> {
    const params = {
      date: this.formatDate(dateTime.date),
    };

    try {
      const raw = await this.fetch<any>('/api/v1/ephemeris/retrogrades', params);

      // Format 1: plain array [{name, longitude, zodiac_sign, speed}, ...]
      if (Array.isArray(raw)) {
        return {
          date: params.date,
          retrogradePlanets: raw.map((p: any) => ({
            name: p.name,
            retrogradeStart: params.date,
            retrogradeEnd: params.date,
            currentSign: p.zodiac_sign || p.zodiacSign || this.getZodiacSign(p.longitude),
            longitude: p.longitude,
            speed: p.speed,
          })),
        };
      }

      // Format 2: camelCase {retrogradePlanets: [...]}
      if (raw.retrogradePlanets && Array.isArray(raw.retrogradePlanets)) {
        return raw as RetrogradesApiResponse;
      }

      // Format 3: snake_case {retrograde_planets: [...]}
      if (raw.retrograde_planets && Array.isArray(raw.retrograde_planets)) {
        return {
          date: raw.date || params.date,
          retrogradePlanets: raw.retrograde_planets.map((p: any) => ({
            name: p.name,
            retrogradeStart: p.retrograde_start || params.date,
            retrogradeEnd: p.retrograde_end || params.date,
            currentSign: p.current_sign || p.zodiac_sign || this.getZodiacSign(p.longitude ?? 0),
            longitude: p.longitude,
            speed: p.speed,
          })),
        };
      }

      // Unknown format — return as-is and hope for the best
      return raw as RetrogradesApiResponse;
    } catch {
      // Endpoint not available or errored — derive retrogrades from planet positions
      return this.retrogradesFromPlanets(dateTime, params.date);
    }
  }

  /**
   * Fallback: extract retrograde planets from the general positions endpoint.
   */
  private async retrogradesFromPlanets(dateTime: DateTime, dateStr: string): Promise<RetrogradesApiResponse> {
    try {
      const planetsData = await this.getPlanetsPositions(dateTime);
      const retroPlanets = (planetsData.planets || []).filter(
        (p: any) => p.is_retrograde || p.isRetrograde
      );
      return {
        date: dateStr,
        retrogradePlanets: retroPlanets.map((p: any) => ({
          name: p.name,
          retrogradeStart: dateStr,
          retrogradeEnd: dateStr,
          currentSign: p.zodiac_sign || p.zodiacSign || this.getZodiacSign(p.longitude ?? 0),
          longitude: p.longitude,
          speed: p.speed,
        })),
      };
    } catch {
      return { date: dateStr, retrogradePlanets: [] };
    }
  }

  /**
   * Find every exact aspect perfection in [start, end) for the given pairs
   * and aspect names. Calls POST /api/v1/planning/aspect-perfections.
   */
  async getAspectPerfections(
    start: string,
    end: string,
    pairs: ReadonlyArray<readonly [string, string]>,
    aspects: ReadonlyArray<string>,
  ): Promise<AspectPerfectionsApiResponse> {
    return this.fetchPost<AspectPerfectionsApiResponse>(
      '/api/v1/planning/aspect-perfections',
      {
        start,
        end,
        pairs: pairs.map(([a, b]) => [a, b]),
        aspects: [...aspects],
      },
    );
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
      date: dateTime.date.toISOString().split('.')[0],
      latitude: dateTime.location.latitude.toString(),
      longitude: dateTime.location.longitude.toString(),
      timezone: dateTime.timezone,
    };

    const response = await this.fetch<{ hours: any[] }>('/api/v1/ephemeris/planetary-hours', params);
    
    return {
      date: dateTime.date.toISOString().split('T')[0],
      sunrise: response.hours[0]?.start_time || '', 
      sunset: response.hours[12]?.start_time || '',
      hours: response.hours.map(h => ({
        hour: h.hour_number,
        planet: h.planet,
        startTime: h.start_time,
        endTime: h.end_time,
      })),
    };
  }

  /**
   * Get dispositor chains from API
   * Answers: who rules the ruler? (traditional rulership-based)
   */
  async getDispositorChains(
    dateTime: DateTime,
    system: string = 'traditional'
  ): Promise<DispositorChainsResponse> {
    const params = {
      date: this.formatDate(dateTime.date),
      latitude: dateTime.location.latitude.toString(),
      longitude: dateTime.location.longitude.toString(),
      system,
    };

    return this.fetch<DispositorChainsResponse>('/api/v1/planning/dispositors', params);
  }

  /**
   * Format time for API (HH:MM:SS) in UTC
   */
  private formatTime(date: Date): string {
    return date.toISOString().split('T')[1].split('.')[0];
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
