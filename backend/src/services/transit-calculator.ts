import type {
  CelestialBody,
  DateTime,
  Aspect,
  House,
  PlanetApiData,
  HouseApiData,
} from '@adaptive-astro/shared/types/astrology';
import type { NatalChart } from '../database/models';
import { IEphemerisCalculator } from '../core/ephemeris';
import { DEFAULT_CHART_POINTS } from '@adaptive-astro/shared/constants/chart-points';
import {
  orbAndDirection,
  rankDailyTransits,
  ASPECT_ANGLES,
  MAX_ORB,
  type TransitInput,
} from './transit-strength';

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

  // Ранжирование, см. transit-strength.ts
  /** Значимость: насколько транзит весом сам по себе. */
  strength: number;
  /** Актуальность: происходит ли это именно сегодня. */
  topicality: number;
  /** strength × topicality — по этому полю отсортирована выдача. */
  dailyScore: number;
  /** Суток до точного аспекта при текущей скорости. */
  daysToExact: number;
  /** Транзит попадает на ось ASC/MC натальной карты. */
  isAngular: boolean;
  rank: 'weak' | 'moderate' | 'strong' | 'very-strong';
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
  constructor(private ephemeris: IEphemerisCalculator) { }

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

    // Те же доп. точки, что и в натальной карте — иначе транзитный Хирон/узлы
    // к натальным планетам не попадают в выдачу.
    const [currentPlanets, currentHouses] = await Promise.all([
      this.ephemeris.getPlanetsPositions(dateTime, DEFAULT_CHART_POINTS),
      this.ephemeris.getHouses(dateTime, natalChart.house_system || 'placidus'),
    ]);

    // Углы натальной карты нужны для бонуса за угловость: транзит на ASC/MC
    // весит заметно больше того же аспекта в середине дома.
    const natalAngles = {
      asc: natalChart.houses?.find((h: House) => h.number === 1)?.cusp,
      mc: natalChart.houses?.find((h: House) => h.number === 10)?.cusp,
    };

    // Calculate planet-to-planet transits
    const transits = this.calculatePlanetTransits(
      currentPlanets.planets,
      Object.values(natalChart.planets),
      natalAngles
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
      Object.values(natalChart.planets)
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
    currentPlanets: (CelestialBody | PlanetApiData)[],
    natalPlanets: (CelestialBody | PlanetApiData)[],
    natalAngles?: { asc?: number; mc?: number }
  ): Transit[] {
    const candidates: TransitInput[] = [];

    for (const transitPlanet of currentPlanets) {
      for (const natalPlanet of natalPlanets) {
        for (const aspectType of Object.keys(ASPECT_ANGLES) as (keyof typeof ASPECT_ANGLES)[]) {
          const { orb } = orbAndDirection(
            transitPlanet.longitude,
            natalPlanet.longitude,
            aspectType,
            transitPlanet.speed ?? 0
          );
          if (orb > MAX_ORB[aspectType]) continue;

          candidates.push({
            transitingPlanet: transitPlanet.name,
            natalPlanet: natalPlanet.name,
            aspectType,
            transitLongitude: transitPlanet.longitude,
            natalLongitude: natalPlanet.longitude,
            transitSpeed: transitPlanet.speed ?? 0,
            natalAngles,
          });
        }
      }
    }

    // Сортировка по актуальности, а не по орбису. Медленная планета,
    // застрявшая в орбисе на полгода, не должна занимать верх дневного
    // списка: значимость у неё высокая, но новостью дня она не является.
    return rankDailyTransits(candidates).map(scored => ({
      transitingPlanet: scored.transitingPlanet,
      natalPlanet: scored.natalPlanet,
      aspectType: scored.aspectType,
      orb: scored.orb,
      isExact: scored.isExact,
      isApplying: scored.isApplying,
      strength: scored.strength,
      topicality: scored.topicality,
      dailyScore: scored.dailyScore,
      daysToExact: scored.daysToExact,
      isAngular: scored.isAngular,
      rank: scored.rank,
      interpretation: this.interpretTransit(
        scored.transitingPlanet,
        scored.natalPlanet,
        scored.aspectType
      ),
    }));
  }

  /**
   * Calculate which houses transiting planets are in
   */
  private calculateHouseTransits(
    currentPlanets: (CelestialBody | PlanetApiData)[],
    natalHouses: House[],
    currentHouses: (House | HouseApiData)[]
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
    planet: CelestialBody | PlanetApiData,
    houses: (House | HouseApiData)[]
  ): number | null {
    for (let i = 0; i < houses.length; i++) {
      const currentHouse = houses[i];
      const nextHouse = houses[(i + 1) % houses.length];

      const start = currentHouse.cusp;
      const end = nextHouse.cusp;

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
    currentPlanets: (CelestialBody | PlanetApiData)[],
    natalPlanets: (CelestialBody | PlanetApiData)[]
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
    _houseTransits: HouseTransit[]
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
