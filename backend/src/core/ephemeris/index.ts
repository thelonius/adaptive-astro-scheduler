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
import { MockEphemerisAdapter } from './mock-adapter';
import { CachedEphemerisCalculator, InMemoryCache } from './cached-adapter';

export function createEphemerisCalculator(
  baseUrl: string = process.env.EPHEMERIS_API_URL || 'http://localhost:8000',
  enableCache: boolean = true,
  useMock: boolean = process.env.USE_MOCK_EPHEMERIS === 'true'
) {
  console.log('🔧 createEphemerisCalculator called:');
  console.log('  - USE_MOCK_EPHEMERIS env:', process.env.USE_MOCK_EPHEMERIS);
  console.log('  - EPHEMERIS_API_URL env:', process.env.EPHEMERIS_API_URL);
  console.log('  - useMock param:', useMock);
  console.log('  - baseUrl param:', baseUrl);

  // Use mock adapter if explicitly configured
  const adapter = useMock
    ? new MockEphemerisAdapter()
    : new EphemerisAdapter(baseUrl);

  console.log('  - Using adapter:', adapter.constructor.name);

  if (enableCache) {
    const cache = new InMemoryCache();
    return new CachedEphemerisCalculator(adapter, cache);
  }

  return adapter;
}
