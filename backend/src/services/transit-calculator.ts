import type {
  CelestialBody,
  DateTime,
  Aspect,
  House,
} from '@adaptive-astro/shared/types/astrology';
import type { NatalChart } from '../database/models';
import { IEphemerisCalculator } from '../core/ephemeris';

/**
 * Transit Types
 */

export interface Transit {
  transitingPlanet: string;
  natalPlanet: string;
  aspectType: Aspect['type'];
  orb: number;
  isExact: boolean; // True if orb < 1°
  isApplying: boolean; // True if getting closer
  interpretation: string;
}

export interface HouseTransit {
  planet: string;
  natalHouse: number;
  transitHouse: number;
  interpretation: string;
}

export interface TransitAnalysis {
  date: Date;
  transits: Transit[];
  houseTransits: HouseTransit[];
  significantTransits: Transit[]; // Major aspects only (conjunction, square, trine, opposition)
  retrogradeInfluences: {
    planet: string;
    affectedNatalPlanets: string[];
  }[];
  summary: string;
}

/**
 * Transit Calculator Service
 *
 * Calculates transits (current planetary positions vs natal chart)
 * and generates personalized daily analytics
 */
export class TransitCalculator {
  constructor(private ephemeris: IEphemerisCalculator) {}

  /**
   * Calculate all transits for a given date and natal chart
   */
  async calculateTransits(
    natalChart: NatalChart,
    date: Date = new Date(),
    location?: { latitude: number; longitude: number }
  ): Promise<TransitAnalysis> {
    // Use natal birth location if no location specified
    const transitLocation = location || {
      latitude: natalChart.birth_location.latitude,
      longitude: natalChart.birth_location.longitude,
    };

    const dateTime: DateTime = {
      date,
      timezone: natalChart.birth_location.timezone,
      location: transitLocation,
    };

    // Get current planetary positions
    const [currentPlanets, currentHouses] = await Promise.all([
      this.ephemeris.getPlanetsPositions(dateTime),
      this.ephemeris.getHouses(dateTime, natalChart.house_system || 'placidus'),
    ]);

    // Calculate planet-to-planet transits
    const transits = this.calculatePlanetTransits(
      currentPlanets.planets,
      natalChart.planets
    );

    // Calculate house transits
    const houseTransits = this.calculateHouseTransits(
      currentPlanets.planets,
      natalChart.houses,
      currentHouses.houses
    );

    // Filter significant transits (major aspects only)
    const significantTransits = transits.filter(t =>
      ['conjunction', 'square', 'trine', 'opposition'].includes(t.aspectType)
    );

    // Find retrograde influences
    const retrogradeInfluences = this.findRetrogradeInfluences(
      currentPlanets.planets,
      natalChart.planets
    );

    // Generate summary
    const summary = this.generateSummary(significantTransits, houseTransits);

    return {
      date,
      transits,
      houseTransits,
      significantTransits,
      retrogradeInfluences,
      summary,
    };
  }

  /**
   * Calculate aspects between transiting and natal planets
   */
  private calculatePlanetTransits(
    currentPlanets: CelestialBody[],
    natalPlanets: CelestialBody[]
  ): Transit[] {
    const transits: Transit[] = [];
    const maxOrb = 8; // degrees

    const aspectTypes = [
      { type: 'conjunction' as const, angle: 0, orb: 8 },
      { type: 'sextile' as const, angle: 60, orb: 6 },
      { type: 'square' as const, angle: 90, orb: 8 },
      { type: 'trine' as const, angle: 120, orb: 8 },
      { type: 'quincunx' as const, angle: 150, orb: 3 },
      { type: 'opposition' as const, angle: 180, orb: 8 },
    ];

    for (const transitPlanet of currentPlanets) {
      for (const natalPlanet of natalPlanets) {
        // Calculate angular distance
        let diff = Math.abs(transitPlanet.longitude - natalPlanet.longitude);
        if (diff > 180) diff = 360 - diff;

        // Check each aspect type
        for (const aspect of aspectTypes) {
          const orbDiff = Math.abs(diff - aspect.angle);

          if (orbDiff <= aspect.orb) {
            // Determine if applying or separating
            // This is simplified - real calculation would consider speeds
            const isApplying = transitPlanet.speed > 0;

            transits.push({
              transitingPlanet: transitPlanet.name,
              natalPlanet: natalPlanet.name,
              aspectType: aspect.type,
              orb: orbDiff,
              isExact: orbDiff < 1,
              isApplying,
              interpretation: this.interpretTransit(
                transitPlanet.name,
                natalPlanet.name,
                aspect.type
              ),
            });
          }
        }
      }
    }

    // Sort by orb (tightest first)
    return transits.sort((a, b) => a.orb - b.orb);
  }

  /**
   * Calculate which houses transiting planets are in
   */
  private calculateHouseTransits(
    currentPlanets: CelestialBody[],
    natalHouses: House[],
    currentHouses: House[]
  ): HouseTransit[] {
    const houseTransits: HouseTransit[] = [];

    for (const planet of currentPlanets) {
      // Find which natal house this planet is transiting
      const natalHouse = this.findHouseForPlanet(planet, natalHouses);
      const transitHouse = this.findHouseForPlanet(planet, currentHouses);

      if (natalHouse !== null) {
        houseTransits.push({
          planet: planet.name,
          natalHouse,
          transitHouse: transitHouse || natalHouse,
          interpretation: this.interpretHouseTransit(planet.name, natalHouse),
        });
      }
    }

    return houseTransits;
  }

  /**
   * Find which house a planet is in
   */
  private findHouseForPlanet(
    planet: CelestialBody,
    houses: House[]
  ): number | null {
    for (let i = 0; i < houses.length; i++) {
      const currentHouse = houses[i];
      const nextHouse = houses[(i + 1) % houses.length];

      let start = currentHouse.cusp;
      let end = nextHouse.cusp;

      // Handle wrap-around at 360/0 degrees
      if (end < start) {
        if (planet.longitude >= start || planet.longitude < end) {
          return currentHouse.number;
        }
      } else {
        if (planet.longitude >= start && planet.longitude < end) {
          return currentHouse.number;
        }
      }
    }

    return null;
  }

  /**
   * Find retrograde planets affecting natal planets
   */
  private findRetrogradeInfluences(
    currentPlanets: CelestialBody[],
    natalPlanets: CelestialBody[]
  ) {
    const influences: { planet: string; affectedNatalPlanets: string[] }[] = [];

    const retrogradePlanets = currentPlanets.filter(p => p.isRetrograde);

    for (const retroPlanet of retrogradePlanets) {
      const affected: string[] = [];

      // Check if retrograde planet is within 15° of any natal planet
      for (const natalPlanet of natalPlanets) {
        let diff = Math.abs(retroPlanet.longitude - natalPlanet.longitude);
        if (diff > 180) diff = 360 - diff;

        if (diff <= 15) {
          affected.push(natalPlanet.name);
        }
      }

      if (affected.length > 0) {
        influences.push({
          planet: retroPlanet.name,
          affectedNatalPlanets: affected,
        });
      }
    }

    return influences;
  }

  /**
   * Generate a human-readable summary
   */
  private generateSummary(
    significantTransits: Transit[],
    houseTransits: HouseTransit[]
  ): string {
    if (significantTransits.length === 0) {
      return 'Спокойный день без значительных транзитных аспектов.';
    }

    const parts: string[] = [];

    // Highlight exact transits
    const exactTransits = significantTransits.filter(t => t.isExact);
    if (exactTransits.length > 0) {
      parts.push(
        `Точные транзиты: ${exactTransits
          .map(t => `${t.transitingPlanet} ${this.aspectSymbol(t.aspectType)} ${t.natalPlanet}`)
          .join(', ')}.`
      );
    }

    // Highlight major transits
    const conjunctions = significantTransits.filter(
      t => t.aspectType === 'conjunction'
    );
    if (conjunctions.length > 0) {
      parts.push(
        `Соединения: ${conjunctions.map(t => `${t.transitingPlanet}-${t.natalPlanet}`).join(', ')}.`
      );
    }

    return parts.join(' ') || 'Обычная активность транзитов.';
  }

  /**
   * Interpret a transit aspect
   */
  private interpretTransit(
    transitPlanet: string,
    natalPlanet: string,
    aspectType: Aspect['type']
  ): string {
    const interpretations: Record<string, Record<string, Record<string, string>>> = {
      Sun: {
        Sun: {
          conjunction: 'Возврат Солнца - день рождения или близко к нему. Время новых начинаний.',
          trine: 'Гармоничный период для самовыражения и творчества.',
          square: 'Напряжение между текущими целями и базовой идентичностью.',
          opposition: 'Конфликт между личными желаниями и внешними требованиями.',
        },
        Moon: {
          conjunction: 'Эмоции и воля в гармонии. Хороший день для начинаний.',
          square: 'Напряжение между логикой и эмоциями.',
        },
      },
    };

    return (
      interpretations[transitPlanet]?.[natalPlanet]?.[aspectType] ||
      `${transitPlanet} ${aspectType} натальный ${natalPlanet}`
    );
  }

  /**
   * Interpret house transit
   */
  private interpretHouseTransit(planet: string, house: number): string {
    const houseInterpretations: Record<string, Record<number, string>> = {
      Sun: {
        1: 'Фокус на личности и самопрезентации.',
        4: 'Внимание к дому и семье.',
        7: 'Акцент на отношениях и партнерстве.',
        10: 'Карьера и публичный имидж на первом плане.',
      },
      Moon: {
        1: 'Эмоции выходят на поверхность.',
        4: 'Потребность в домашнем комфорте.',
        7: 'Эмоциональная вовлеченность в отношения.',
      },
    };

    return (
      houseInterpretations[planet]?.[house] ||
      `${planet} транзитирует ${house}-й дом`
    );
  }

  /**
   * Get aspect symbol
   */
  private aspectSymbol(aspectType: Aspect['type']): string {
    const symbols: Record<Aspect['type'], string> = {
      conjunction: '☌',
      sextile: '⚹',
      square: '□',
      trine: '△',
      quincunx: '⚻',
      opposition: '☍',
    };

    return symbols[aspectType] || aspectType;
  }
}
