import type {
  DateTime,
  CelestialBody,
  LunarDay,
  VoidOfCourseMoon,
  Aspect,
  House,
  PlanetaryHour,
  LunarPhaseType,
  PlanetsApiResponse,
  AspectsApiResponse,
  AspectApiData,
  HousesApiResponse,
  VoidMoonApiResponse,
  PlanetaryHoursApiResponse,
  RetrogradesApiResponse,
  ZodiacSign,
  PlanetName,
} from '@adaptive-astro/shared/types/astrology';
import { ZODIAC_SIGNS, getZodiacSignByLongitude } from '@adaptive-astro/shared/constants/zodiac';
import { IEphemerisCalculator } from './interface';

/**
 * Mock Ephemeris Adapter
 *
 * Provides realistic mock data for testing when external API is unavailable
 */
export class MockEphemerisAdapter implements IEphemerisCalculator {

  /**
   * Generate mock planetary positions based on date
   */
  async getPlanetsPositions(dateTime: DateTime): Promise<PlanetsApiResponse> {
    // Use date to generate consistent but varying positions
    const dayOfYear = this.getDayOfYear(dateTime.date);

    const planets: CelestialBody[] = [
      this.createMockPlanet('Sun', dayOfYear * 0.986, 1.0, false),
      this.createMockPlanet('Moon', dayOfYear * 13.176, 27.3, false),
      this.createMockPlanet('Mercury', dayOfYear * 4.09, 88, dayOfYear % 117 < 20),
      this.createMockPlanet('Venus', dayOfYear * 1.602, 225, dayOfYear % 584 < 40),
      this.createMockPlanet('Mars', dayOfYear * 0.524, 687, dayOfYear % 780 < 72),
      this.createMockPlanet('Jupiter', dayOfYear * 0.083, 4333, dayOfYear % 399 < 121),
      this.createMockPlanet('Saturn', dayOfYear * 0.033, 10759, dayOfYear % 378 < 138),
      this.createMockPlanet('Uranus', dayOfYear * 0.012, 30687, dayOfYear % 370 < 151),
      this.createMockPlanet('Neptune', dayOfYear * 0.006, 60190, dayOfYear % 367 < 158),
      this.createMockPlanet('Pluto', dayOfYear * 0.004, 90560, dayOfYear % 366 < 182),
    ];

    return {
      date: dateTime.date.toISOString(),
      location: {
        latitude: dateTime.location.latitude,
        longitude: dateTime.location.longitude,
        timezone: dateTime.timezone,
      },
      planets,
    };
  }

  /**
   * Generate mock aspects between planets
   */
  async getAspects(dateTime: DateTime, orb: number = 8): Promise<AspectsApiResponse> {
    const planetsData = await this.getPlanetsPositions(dateTime);
    const planets = planetsData.planets;
    const aspects: AspectApiData[] = [];

    // Check all planet pairs for aspects
    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        const planet1 = planets[i];
        const planet2 = planets[j];

        let angle = Math.abs(planet1.longitude - planet2.longitude);
        if (angle > 180) angle = 360 - angle;

        // Check for aspects
        const aspectTypes = [
          { type: 'conjunction' as const, targetAngle: 0 },
          { type: 'sextile' as const, targetAngle: 60 },
          { type: 'square' as const, targetAngle: 90 },
          { type: 'trine' as const, targetAngle: 120 },
          { type: 'quincunx' as const, targetAngle: 150 },
          { type: 'opposition' as const, targetAngle: 180 },
        ];

        for (const aspectType of aspectTypes) {
          const diff = Math.abs(angle - aspectType.targetAngle);
          if (diff <= orb) {
            aspects.push({
              planet1: planet1.name,
              planet2: planet2.name,
              type: aspectType.type,
              angle: aspectType.targetAngle,
              orb: diff,
              isApplying: Math.random() > 0.5, // Random for mock data
              interpretation: `${planet1.name} ${aspectType.type} ${planet2.name}`,
            });
          }
        }
      }
    }

    return {
      date: dateTime.date.toISOString(),
      aspects,
    };
  }

  /**
   * Generate mock houses
   */
  async getHouses(dateTime: DateTime, system: string = 'placidus'): Promise<HousesApiResponse> {
    // Calculate Ascendant (simplified - based on time and location)
    const hourAngle = (dateTime.date.getHours() + dateTime.date.getMinutes() / 60) * 15;
    const ascendant = (hourAngle + dateTime.location.longitude) % 360;

    const houses: House[] = [];
    for (let i = 1; i <= 12; i++) {
      const cusp = (ascendant + (i - 1) * 30) % 360;
      const zodiacSign = getZodiacSignByLongitude(cusp);

      houses.push({
        number: i as House['number'],
        cusp,
        sign: zodiacSign,
      });
    }

    return {
      date: dateTime.date.toISOString(),
      location: {
        latitude: dateTime.location.latitude,
        longitude: dateTime.location.longitude,
      },
      system,
      houses,
    };
  }

  async getVoidOfCourseMoon(dateTime: DateTime): Promise<VoidMoonApiResponse> {
    // Simplified: void moon happens periodically
    const dayOfYear = this.getDayOfYear(dateTime.date);
    const isVoid = dayOfYear % 3 === 0;

    return {
      date: dateTime.date.toISOString(),
      isVoidOfCourse: isVoid,
      voidPeriod: isVoid ? {
        startTime: dateTime.date.toISOString(),
        endTime: new Date(dateTime.date.getTime() + 6 * 3600000).toISOString(),
        currentSign: 'Gemini',
        nextSign: 'Cancer',
        durationHours: 6,
      } : undefined,
    };
  }

  async getPlanetaryHours(dateTime: DateTime): Promise<PlanetaryHoursApiResponse> {
    const planetOrder: PlanetName[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
    const hours: any[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const planetIndex = hour % 7;
      hours.push({
        hour,
        planet: planetOrder[planetIndex],
        startTime: `${hour.toString().padStart(2, '0')}:00:00`,
        endTime: `${((hour + 1) % 24).toString().padStart(2, '0')}:00:00`,
      });
    }

    return {
      date: dateTime.date.toISOString(),
      sunrise: '06:00:00',
      sunset: '18:00:00',
      hours,
    };
  }

  async getRetrogradePlanets(dateTime: DateTime): Promise<RetrogradesApiResponse> {
    const planetsData = await this.getPlanetsPositions(dateTime);
    const retrogradePlanets = planetsData.planets
      .filter(p => p.isRetrograde)
      .map(p => ({
        name: p.name,
        retrogradeStart: new Date(dateTime.date.getTime() - 30 * 86400000).toISOString(),
        retrogradeEnd: new Date(dateTime.date.getTime() + 30 * 86400000).toISOString(),
        currentSign: p.zodiacSign.name,
      }));

    return {
      date: dateTime.date.toISOString(),
      retrogradePlanets,
    };
  }

  async getMoonPhase(dateTime: DateTime): Promise<number> {
    // Calculate approximate moon phase (0-1) based on date
    const dayOfYear = this.getDayOfYear(dateTime.date);
    const lunarCycle = 29.53;
    const phase = (dayOfYear % lunarCycle) / lunarCycle;
    return phase;
  }

  async getLunarDay(dateTime: DateTime): Promise<LunarDay> {
    const dayOfYear = this.getDayOfYear(dateTime.date);
    const lunarDayNumber = (dayOfYear % 30) + 1;
    const phase = await this.getMoonPhase(dateTime);

    let lunarPhase: LunarPhaseType;
    if (phase < 0.125) lunarPhase = 'New';
    else if (phase < 0.375) lunarPhase = 'Waxing';
    else if (phase < 0.625) lunarPhase = 'Full';
    else lunarPhase = 'Waning';

    return {
      number: lunarDayNumber,
      symbol: `Day ${lunarDayNumber}`,
      energy: lunarDayNumber <= 15 ? 'Light' : 'Dark',
      lunarPhase,
      characteristics: {
        spiritual: `Lunar day ${lunarDayNumber} spiritual energy`,
        practical: `Good for planning and reflection`,
        avoided: ['Conflicts', 'Major decisions'],
      },
    };
  }

  // Helper methods

  private createMockPlanet(
    name: PlanetName,
    basePosition: number,
    orbitalPeriod: number,
    isRetrograde: boolean
  ): CelestialBody {
    const longitude = basePosition % 360;
    const zodiacSign = getZodiacSignByLongitude(longitude);

    // Speed in degrees per day
    const speed = isRetrograde ? -(360 / orbitalPeriod) : (360 / orbitalPeriod);

    // Simplified distance (AU)
    const distances: Record<PlanetName, number> = {
      Sun: 0,
      Moon: 0.00257,
      Mercury: 0.39,
      Venus: 0.72,
      Mars: 1.52,
      Jupiter: 5.20,
      Saturn: 9.54,
      Uranus: 19.19,
      Neptune: 30.07,
      Pluto: 39.48,
    };

    return {
      name,
      longitude,
      latitude: 0, // Simplified
      zodiacSign,
      speed,
      isRetrograde,
      distanceAU: distances[name],
    };
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }
}
