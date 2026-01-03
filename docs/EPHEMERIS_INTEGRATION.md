# Ephemeris Calculator Integration Requirements

**Version:** 1.0
**Status:** Integration Specification
**Last Updated:** January 2, 2026

---

## Overview

The **Ephemeris Calculator** is the foundational Layer 1 component that provides precise astronomical calculations. This document specifies the integration requirements for the existing ephemeris calculation system.

**Note:** The ephemeris calculator is **already implemented**. This document serves as an integration guide for connecting it to the Adaptive Astro-Scheduler system.

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────┐
│         EXISTING EPHEMERIS CALCULATOR                │
│  (Assumed to be already implemented)                │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│         EPHEMERIS ADAPTER (To be created)            │
│  Normalizes output to match our type system         │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│      CALENDAR GENERATOR & BUSINESS LOGIC             │
│  Uses normalized ephemeris data                      │
└─────────────────────────────────────────────────────┘
```

---

## Required Interface

The ephemeris calculator **MUST** implement or be wrapped to provide the following interface:

### TypeScript Interface

```typescript
interface IEphemerisCalculator {
  /**
   * Get positions of all major planets for a given date/time
   * @param dateTime - Date, time, and location
   * @returns Object with planet positions
   */
  getPlanetsPositions(dateTime: DateTime): Promise<PlanetPositions>

  /**
   * Get current moon phase (illumination percentage)
   * @param dateTime - Date and time
   * @returns Moon illumination (0.0 = new moon, 1.0 = full moon)
   */
  getMoonPhase(dateTime: DateTime): Promise<number>

  /**
   * Calculate lunar day (1-30) for given date/time
   * @param dateTime - Date and time
   * @returns Lunar day number and metadata
   */
  getLunarDay(dateTime: DateTime): Promise<LunarDay>

  /**
   * Detect Void of Course Moon periods
   * @param dateTime - Date and time to check
   * @returns VoidOfCourseMoon object or null
   */
  getVoidOfCourseMoon(dateTime: DateTime): Promise<VoidOfCourseMoon | null>

  /**
   * Get list of retrograde planets
   * @param dateTime - Date and time
   * @returns Array of retrograde planets
   */
  getRetrogradePlanets(dateTime: DateTime): Promise<CelestialBody[]>

  /**
   * Calculate aspects between celestial bodies
   * @param bodies - Array of celestial bodies
   * @param orb - Orb tolerance (default: 8 degrees)
   * @returns Array of aspects
   */
  calculateAspects(
    bodies: CelestialBody[],
    orb?: number
  ): Promise<Aspect[]>

  /**
   * Calculate house cusps for given birth data
   * @param dateTime - Birth date, time, and location
   * @param system - House system ('placidus', 'whole-sign', 'equal', etc.)
   * @returns House cusps
   */
  calculateHouses(
    dateTime: DateTime,
    system?: 'placidus' | 'whole-sign' | 'equal'
  ): Promise<{[key: number]: House}>

  /**
   * Get planetary hours for a given date and location
   * @param dateTime - Date and location
   * @returns Array of planetary hours
   */
  getPlanetaryHours(dateTime: DateTime): Promise<PlanetaryHour[]>
}
```

---

## Input/Output Specifications

### Input: DateTime

```typescript
interface DateTime {
  date: Date              // JavaScript Date object
  timezone: string        // IANA timezone: 'Europe/Moscow', 'America/New_York'
  location: {
    latitude: number      // -90 to 90
    longitude: number     // -180 to 180
  }
}

// Example
const input: DateTime = {
  date: new Date('2026-01-15T14:30:00Z'),
  timezone: 'Europe/Moscow',
  location: {
    latitude: 55.7558,
    longitude: 37.6173
  }
}
```

### Output: PlanetPositions

```typescript
interface PlanetPositions {
  sun: CelestialBody
  moon: CelestialBody
  mercury: CelestialBody
  venus: CelestialBody
  mars: CelestialBody
  jupiter: CelestialBody
  saturn: CelestialBody
  uranus: CelestialBody
  neptune: CelestialBody
  pluto: CelestialBody
}

interface CelestialBody {
  name: PlanetName
  longitude: number       // 0-360 degrees
  latitude: number        // Declination
  zodiacSign: ZodiacSign  // Computed from longitude
  speed: number           // Degrees per day
  isRetrograde: boolean   // True if speed < 0
  distanceAU: number      // Distance in Astronomical Units
}
```

### Output: LunarDay

```typescript
interface LunarDay {
  number: number          // 1-30
  symbol: string          // 'Новолуние', 'Первый серп', etc.
  energy: 'Light' | 'Dark' | 'Neutral'
  lunarPhase: 'New' | 'Waxing' | 'Full' | 'Waning'
  characteristics: {
    spiritual: string     // 'Медитация', 'Очищение'
    practical: string     // 'Сажать', 'Стричься'
    avoided: string[]     // ['Важные решения', 'Брак']
  }
}
```

### Output: VoidOfCourseMoon

```typescript
interface VoidOfCourseMoon {
  startTime: DateTime
  endTime: DateTime
  sign: ZodiacSign
  duration: number        // Hours
  isActive: (at: DateTime) => boolean
}
```

### Output: Aspect

```typescript
interface Aspect {
  body1: CelestialBody
  body2: CelestialBody
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition' | 'quincunx'
  angle: number           // Exact angle in degrees
  orb: number             // Orb (difference from exact)
  isExact: boolean        // Within acceptable orb?
  interpretation: string  // Human-readable description
}
```

---

## Integration Checklist

### Phase 1: Adapter Creation

- [ ] Create `backend/src/core/ephemeris/adapter.ts`
- [ ] Wrap existing ephemeris calculator
- [ ] Normalize output to match TypeScript interfaces
- [ ] Handle timezone conversions
- [ ] Add error handling and validation

### Phase 2: Testing

- [ ] Unit tests for each method
- [ ] Validate against known astronomical data (NASA JPL)
- [ ] Test edge cases:
  - [ ] Leap years
  - [ ] Timezone boundaries (DST changes)
  - [ ] Retrograde detection accuracy
  - [ ] Void of Course Moon transitions
  - [ ] Eclipse windows

### Phase 3: Performance Optimization

- [ ] Implement caching layer
- [ ] Batch calculations when possible
- [ ] Profile calculation times
- [ ] Target: <100ms per day calculation

### Phase 4: Documentation

- [ ] Document calculation methods used
- [ ] List data sources (Swiss Ephemeris, NASA, etc.)
- [ ] Specify accuracy guarantees
- [ ] Provide example usage

---

## Data Sources

The ephemeris calculator **MUST** use one or more of the following:

1. **Swiss Ephemeris (Recommended)**
   - Precision: ±0.001 arcseconds
   - Coverage: 13,000 BCE - 17,000 CE
   - License: GPL or commercial

2. **ephemeris.fyi API**
   - REST API for astronomical calculations
   - Precision: Sufficient for astrological use
   - Coverage: 1800 CE - 2200 CE

3. **NASA JPL HORIZONS**
   - Highest precision (research-grade)
   - Limited to scientific use cases

---

## Accuracy Requirements

| Calculation | Required Precision | Acceptable Error |
|-------------|-------------------|------------------|
| Planet longitude | ±0.01° | <1 arcminute |
| Moon position | ±0.1° | <6 arcminutes |
| Lunar day | Exact | No error |
| Void of Course Moon | ±5 minutes | <15 minutes |
| House cusps | ±0.5° | <30 arcminutes |
| Aspects | ±0.1° | <6 arcminutes |

---

## Error Handling

The adapter **MUST** handle:

```typescript
class EphemerisError extends Error {
  code: 'INVALID_DATE' | 'OUT_OF_RANGE' | 'CALCULATION_FAILED' | 'DATA_UNAVAILABLE'
  details: any
}

// Example usage
try {
  const positions = await ephemeris.getPlanetsPositions(dateTime)
} catch (error) {
  if (error instanceof EphemerisError) {
    switch (error.code) {
      case 'OUT_OF_RANGE':
        // Date outside ephemeris coverage
        // Fallback to API or warn user
        break
      case 'CALCULATION_FAILED':
        // Retry or use cached data
        break
    }
  }
}
```

---

## Caching Strategy

The adapter **SHOULD** implement caching:

```typescript
class CachedEphemerisCalculator implements IEphemerisCalculator {
  constructor(
    private calculator: IEphemerisCalculator,
    private cache: CacheService
  ) {}

  async getPlanetsPositions(dateTime: DateTime): Promise<PlanetPositions> {
    const cacheKey = `planets:${dateTime.date.toISOString()}`

    const cached = await this.cache.get(cacheKey)
    if (cached) return cached

    const result = await this.calculator.getPlanetsPositions(dateTime)

    // Cache forever for past dates, 1 day for future
    const ttl = dateTime.date < new Date() ? 0 : 86400
    await this.cache.set(cacheKey, result, ttl)

    return result
  }
}
```

---

## Example Implementation Wrapper

```typescript
// backend/src/core/ephemeris/adapter.ts

import { ExistingEphemerisLibrary } from 'your-ephemeris-library'

export class EphemerisAdapter implements IEphemerisCalculator {
  private sweph: ExistingEphemerisLibrary

  constructor(dataPath: string) {
    this.sweph = new ExistingEphemerisLibrary(dataPath)
  }

  async getPlanetsPositions(dateTime: DateTime): Promise<PlanetPositions> {
    // Convert DateTime to Julian Day
    const jd = this.toJulianDay(dateTime.date)

    // Call existing library
    const rawData = await this.sweph.calculate(jd, [
      'sun', 'moon', 'mercury', 'venus', 'mars',
      'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
    ])

    // Normalize to our format
    return this.normalizePlanetPositions(rawData)
  }

  private normalizePlanetPositions(raw: any): PlanetPositions {
    // Transform library output to match our interface
    return {
      sun: this.toCelestialBody(raw.sun),
      moon: this.toCelestialBody(raw.moon),
      // ... rest of planets
    }
  }

  private toCelestialBody(raw: any): CelestialBody {
    const longitude = raw.longitude
    return {
      name: raw.name,
      longitude,
      latitude: raw.latitude,
      zodiacSign: getZodiacSignByLongitude(longitude),
      speed: raw.speed,
      isRetrograde: raw.speed < 0,
      distanceAU: raw.distance
    }
  }

  private toJulianDay(date: Date): number {
    // Julian Day conversion
    // ... implementation
  }
}
```

---

## Testing Requirements

### Unit Tests

```typescript
// backend/tests/unit/ephemeris.test.ts

describe('EphemerisAdapter', () => {
  it('should calculate planet positions accurately', async () => {
    const dateTime: DateTime = {
      date: new Date('2026-01-01T12:00:00Z'),
      timezone: 'UTC',
      location: { latitude: 0, longitude: 0 }
    }

    const positions = await ephemeris.getPlanetsPositions(dateTime)

    // Validate against known data
    expect(positions.sun.longitude).toBeCloseTo(280.5, 1) // Capricorn
    expect(positions.moon.zodiacSign.name).toBe('...')
  })

  it('should detect retrograde planets', async () => {
    // Test with known retrograde date
    const retrogrades = await ephemeris.getRetrogradePlanets(dateTime)
    expect(retrogrades).toContainEqual(
      expect.objectContaining({ name: 'Mercury' })
    )
  })
})
```

---

## Performance Benchmarks

Target performance (on modern hardware):

| Operation | Target Time | Max Acceptable |
|-----------|-------------|----------------|
| Single planet position | <10ms | <50ms |
| All planets | <50ms | <200ms |
| Lunar day | <5ms | <20ms |
| VoC Moon detection | <20ms | <100ms |
| House calculation | <30ms | <150ms |
| Full calendar day | <100ms | <500ms |

---

## Migration Path

If the existing ephemeris calculator uses a different interface:

1. Create adapter class (as shown above)
2. Map existing methods to required interface
3. Add type conversions where needed
4. Implement missing features (if any)
5. Add comprehensive tests
6. Validate against known astronomical data

---

## Support & Maintenance

**Primary Contact:** [Your Name/Team]
**Documentation:** See `backend/src/core/ephemeris/README.md`
**Issues:** Report to project issue tracker

---

## Appendix: Known Astronomical Events for Testing

Use these dates to validate accuracy:

| Date | Event | Expected Result |
|------|-------|-----------------|
| 2026-02-17 | Mercury Retrograde Begins | Mercury.isRetrograde = true |
| 2026-03-20 | Spring Equinox | Sun longitude ≈ 0° (Aries) |
| 2026-05-26 | Full Moon | Moon phase ≈ 1.0 |
| 2026-08-12 | Mars Opposition | Mars-Sun aspect ≈ 180° |

---

**End of Document**
