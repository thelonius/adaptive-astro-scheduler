import type {
  DateTime,
  CelestialBody,
  LunarDay,
  VoidOfCourseMoon,
  Aspect,
  House,
  PlanetaryHour,
} from '@adaptive-astro/shared/types/astrology';
import { IEphemerisCalculator, PlanetPositions } from './interface';

/**
 * Simple Cache Interface
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * In-Memory Cache Implementation
 * Simple LRU cache for development/testing
 */
export class InMemoryCache implements ICacheService {
  private cache: Map<string, { value: any; expires: number }> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (item.expires > 0 && Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 0): Promise<void> {
    // If cache is full, remove oldest entry (first in Map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expires = ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : 0;

    this.cache.set(key, { value, expires });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Cached Ephemeris Calculator
 *
 * Wraps any IEphemerisCalculator implementation with caching.
 * Uses intelligent TTL strategy:
 * - Past dates: cache forever (astronomical data doesn't change)
 * - Future dates: cache for 1 day (might recalculate with better precision)
 * - Current day: cache for 1 hour
 */
export class CachedEphemerisCalculator implements IEphemerisCalculator {
  constructor(
    private calculator: IEphemerisCalculator,
    private cache: ICacheService
  ) {}

  /**
   * Generate cache key from DateTime
   */
  private getCacheKey(prefix: string, dateTime: DateTime): string {
    const dateStr = dateTime.date.toISOString();
    const locStr = `${dateTime.location.latitude.toFixed(2)},${dateTime.location.longitude.toFixed(2)}`;
    return `${prefix}:${dateStr}:${locStr}:${dateTime.timezone}`;
  }

  /**
   * Determine TTL based on date
   */
  private getTTL(date: Date): number {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isPast = date < now;

    if (isPast) {
      return 0; // Cache forever for past dates
    } else if (isToday) {
      return 3600; // 1 hour for current day
    } else {
      return 86400; // 24 hours for future dates
    }
  }

  async getPlanetsPositions(dateTime: DateTime): Promise<PlanetPositions> {
    const cacheKey = this.getCacheKey('planets', dateTime);
    const cached = await this.cache.get<PlanetPositions>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.calculator.getPlanetsPositions(dateTime);
    await this.cache.set(cacheKey, result, this.getTTL(dateTime.date));

    return result;
  }

  async getMoonPhase(dateTime: DateTime): Promise<number> {
    const cacheKey = this.getCacheKey('moon-phase', dateTime);
    const cached = await this.cache.get<number>(cacheKey);

    if (cached !== null) {
      return cached;
    }

    const result = await this.calculator.getMoonPhase(dateTime);
    await this.cache.set(cacheKey, result, this.getTTL(dateTime.date));

    return result;
  }

  async getLunarDay(dateTime: DateTime): Promise<LunarDay> {
    const cacheKey = this.getCacheKey('lunar-day', dateTime);
    const cached = await this.cache.get<LunarDay>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.calculator.getLunarDay(dateTime);
    await this.cache.set(cacheKey, result, this.getTTL(dateTime.date));

    return result;
  }

  async getVoidOfCourseMoon(dateTime: DateTime): Promise<VoidOfCourseMoon | null> {
    const cacheKey = this.getCacheKey('void-moon', dateTime);
    const cached = await this.cache.get<VoidOfCourseMoon | null>(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const result = await this.calculator.getVoidOfCourseMoon(dateTime);
    await this.cache.set(cacheKey, result, this.getTTL(dateTime.date));

    return result;
  }

  async getRetrogradePlanets(dateTime: DateTime): Promise<CelestialBody[]> {
    const cacheKey = this.getCacheKey('retrogrades', dateTime);
    const cached = await this.cache.get<CelestialBody[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.calculator.getRetrogradePlanets(dateTime);
    await this.cache.set(cacheKey, result, this.getTTL(dateTime.date));

    return result;
  }

  async calculateAspects(
    bodies: CelestialBody[],
    orb?: number
  ): Promise<Aspect[]> {
    // Aspects depend on specific bodies, so we create a hash of the input
    const bodiesHash = bodies
      .map(b => `${b.name}:${b.longitude.toFixed(2)}`)
      .join('|');
    const cacheKey = `aspects:${bodiesHash}:${orb || 8}`;

    const cached = await this.cache.get<Aspect[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.calculator.calculateAspects(bodies, orb);
    await this.cache.set(cacheKey, result, 86400); // Cache aspects for 24h

    return result;
  }

  async calculateHouses(
    dateTime: DateTime,
    system?: 'placidus' | 'whole-sign' | 'equal'
  ): Promise<{[key: number]: House}> {
    const cacheKey = this.getCacheKey(`houses-${system || 'placidus'}`, dateTime);
    const cached = await this.cache.get<{[key: number]: House}>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.calculator.calculateHouses(dateTime, system);
    await this.cache.set(cacheKey, result, this.getTTL(dateTime.date));

    return result;
  }

  async getPlanetaryHours(dateTime: DateTime): Promise<PlanetaryHour[]> {
    const cacheKey = this.getCacheKey('planetary-hours', dateTime);
    const cached = await this.cache.get<PlanetaryHour[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.calculator.getPlanetaryHours(dateTime);
    await this.cache.set(cacheKey, result, this.getTTL(dateTime.date));

    return result;
  }
}
