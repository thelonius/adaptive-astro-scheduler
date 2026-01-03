/**
 * Ephemeris Module
 *
 * Provides astronomical calculations through adapter pattern.
 * Currently wraps the Lunar Calendar & Ephemeris API.
 */

export { IEphemerisCalculator, PlanetPositions } from './interface';
export { EphemerisAdapter } from './adapter';
export { EphemerisError, type EphemerisErrorCode } from './errors';
export {
  CachedEphemerisCalculator,
  InMemoryCache,
  type ICacheService,
} from './cached-adapter';

// Factory function to create a cached ephemeris calculator
import { EphemerisAdapter } from './adapter';
import { CachedEphemerisCalculator, InMemoryCache } from './cached-adapter';

export function createEphemerisCalculator(
  baseUrl?: string,
  enableCache: boolean = true
) {
  const adapter = new EphemerisAdapter(baseUrl);

  if (enableCache) {
    const cache = new InMemoryCache();
    return new CachedEphemerisCalculator(adapter, cache);
  }

  return adapter;
}
