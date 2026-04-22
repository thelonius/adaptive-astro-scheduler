import type { DateTime, AspectPattern, ScoredAspect } from '@adaptive-astro/shared/types';
import type { IEphemerisCalculator } from '../core/ephemeris';
import { AspectStrengthCalculator } from '../utils/aspect-strength';

/**
 * Planet position for pattern detection
 */
interface PlanetPosition {
  name: string;
  longitude: number;
}

/**
 * Aspect Pattern Detector Service
 *
 * Detects geometric aspect patterns in planetary positions:
 * - Grand Trine: 3 planets forming 120° triangle (harmony, talent)
 * - T-Square: 2 oppositions + apex squaring both (tension, dynamic energy)
 * - Grand Cross: 4 planets in cross formation (major challenge, strength)
 * - Yod: 2 quincunxes + sextile "Finger of God" (fate, adjustment)
 * - Kite: Grand Trine + opposition (talent with purpose)
 * - Stellium: 3+ planets within 8° (concentrated energy)
 */
export class AspectPatternDetector {
  constructor(private ephemeris: IEphemerisCalculator) { }

  /**
   * Detect all patterns for a given date/time
   */
  async detectPatterns(
    dateTime: DateTime,
    orb: number = 8
  ): Promise<AspectPattern[]> {
    // Fetch planets and aspects
    const [planetsData, aspectsData] = await Promise.all([
      this.ephemeris.getPlanetsPositions(dateTime),
      this.ephemeris.getAspects(dateTime, orb),
    ]);

    // Convert to simple format for pattern detection
    const planets: PlanetPosition[] = planetsData.planets.map(p => ({
      name: p.name,
      longitude: p.longitude,
    }));

    // Score all aspects
    const scoredAspects = AspectStrengthCalculator.scoreAspects(aspectsData.aspects);

    // Detect each pattern type
    const patterns: AspectPattern[] = [];

    // Stellium (check first - simplest, no aspects needed)
    const stelliums = this.detectStelliums(planets);
    patterns.push(...stelliums);

    // Grand Trine (3 trines forming triangle)
    const grandTrines = this.detectGrandTrines(planets, scoredAspects);
    patterns.push(...grandTrines);

    // T-Square (2 oppositions + apex planet)
    const tSquares = this.detectTSquares(planets, scoredAspects);
    patterns.push(...tSquares);

    // Grand Cross (4 planets forming cross)
    const grandCrosses = this.detectGrandCrosses(planets, scoredAspects);
    patterns.push(...grandCrosses);

    // Yod (2 quincunxes + sextile)
    const yods = this.detectYods(planets, scoredAspects);
    patterns.push(...yods);

    // Kite (Grand Trine + opposition)
    const kites = this.detectKites(grandTrines, scoredAspects);
    patterns.push(...kites);

    return patterns;
  }

  /**
   * Detect Grand Trine patterns
   * 3 planets forming 120° (trine) angles with each other
   */
  private detectGrandTrines(
    planets: PlanetPosition[],
    aspects: ScoredAspect[]
  ): AspectPattern[] {
    const patterns: AspectPattern[] = [];
    const trines = aspects.filter(a => a.type === 'trine');

    // Need at least 3 trines to form a triangle
    if (trines.length < 3) return patterns;

    // Check all combinations of 3 planets
    for (let i = 0; i < planets.length - 2; i++) {
      for (let j = i + 1; j < planets.length - 1; j++) {
        for (let k = j + 1; k < planets.length; k++) {
          const p1 = planets[i];
          const p2 = planets[j];
          const p3 = planets[k];

          // Find trines between each pair
          const trine12 = trines.find(a =>
            (a.planet1 === p1.name && a.planet2 === p2.name) ||
            (a.planet1 === p2.name && a.planet2 === p1.name)
          );
          const trine23 = trines.find(a =>
            (a.planet1 === p2.name && a.planet2 === p3.name) ||
            (a.planet1 === p3.name && a.planet2 === p2.name)
          );
          const trine31 = trines.find(a =>
            (a.planet1 === p3.name && a.planet2 === p1.name) ||
            (a.planet1 === p1.name && a.planet2 === p3.name)
          );

          // If all 3 trines exist, we have a Grand Trine!
          if (trine12 && trine23 && trine31) {
            const patternAspects = [trine12, trine23, trine31];
            const avgStrength = patternAspects.reduce((sum, a) => sum + a.strength, 0) / 3;
            const element = this.detectElement(p1.longitude);

            patterns.push({
              type: 'grand-trine',
              planets: [p1.name, p2.name, p3.name],
              aspects: patternAspects,
              strength: avgStrength,
              interpretation: `Гранд-Трин в ${element}: гармоничный поток энергии, природный талант`,
              rarity: 'rare',
              element,
            });
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Detect T-Square patterns
   * 2 planets in opposition, both squared by a third (apex) planet
   */
  private detectTSquares(
    planets: PlanetPosition[],
    aspects: ScoredAspect[]
  ): AspectPattern[] {
    const patterns: AspectPattern[] = [];
    const oppositions = aspects.filter(a => a.type === 'opposition');
    const squares = aspects.filter(a => a.type === 'square');

    if (oppositions.length === 0 || squares.length < 2) return patterns;

    // For each opposition, look for an apex planet that squares both ends
    for (const opposition of oppositions) {
      const p1 = opposition.planet1;
      const p2 = opposition.planet2;

      // Find planets that square both p1 and p2
      for (const planet of planets) {
        if (planet.name === p1 || planet.name === p2) continue;

        const squareToP1 = squares.find(a =>
          (a.planet1 === planet.name && a.planet2 === p1) ||
          (a.planet1 === p1 && a.planet2 === planet.name)
        );
        const squareToP2 = squares.find(a =>
          (a.planet1 === planet.name && a.planet2 === p2) ||
          (a.planet1 === p2 && a.planet2 === planet.name)
        );

        // Found a T-Square!
        if (squareToP1 && squareToP2) {
          const patternAspects = [opposition, squareToP1, squareToP2];
          const avgStrength = patternAspects.reduce((sum, a) => sum + a.strength, 0) / 3;

          patterns.push({
            type: 't-square',
            planets: [p1, p2, planet.name],
            aspects: patternAspects,
            strength: avgStrength,
            interpretation: `Т-Квадрат с вершиной в ${planet.name}: динамическое напряжение, требует действий`,
            rarity: 'moderate',
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect Grand Cross patterns
   * 4 planets forming 2 oppositions and 4 squares (cross shape)
   */
  private detectGrandCrosses(
    planets: PlanetPosition[],
    aspects: ScoredAspect[]
  ): AspectPattern[] {
    const patterns: AspectPattern[] = [];
    const oppositions = aspects.filter(a => a.type === 'opposition');
    const squares = aspects.filter(a => a.type === 'square');

    if (oppositions.length < 2 || squares.length < 4) return patterns;

    // Check all pairs of oppositions
    for (let i = 0; i < oppositions.length - 1; i++) {
      for (let j = i + 1; j < oppositions.length; j++) {
        const opp1 = oppositions[i];
        const opp2 = oppositions[j];

        // Get 4 planets (should be unique)
        const planetSet = new Set([opp1.planet1, opp1.planet2, opp2.planet1, opp2.planet2]);
        if (planetSet.size !== 4) continue;

        const fourPlanets = Array.from(planetSet);

        // Check if all 4 planets are connected by squares
        const squareCount = this.countSquaresBetweenPlanets(fourPlanets, squares);

        // Grand Cross requires 4 squares (each planet squares 2 others)
        if (squareCount >= 4) {
          const patternSquares = squares.filter(sq =>
            fourPlanets.includes(sq.planet1) && fourPlanets.includes(sq.planet2)
          );
          const patternAspects = [opp1, opp2, ...patternSquares.slice(0, 4)];
          const avgStrength = patternAspects.reduce((sum, a) => sum + a.strength, 0) / patternAspects.length;

          patterns.push({
            type: 'grand-cross',
            planets: fourPlanets,
            aspects: patternAspects,
            strength: avgStrength,
            interpretation: 'Большой Крест: интенсивное напряжение, кармические испытания, сила характера',
            rarity: 'very-rare',
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect Yod patterns (Finger of God)
   * 2 planets in sextile, both forming quincunx (150°) to a third planet (apex)
   */
  private detectYods(
    planets: PlanetPosition[],
    aspects: ScoredAspect[]
  ): AspectPattern[] {
    const patterns: AspectPattern[] = [];
    const sextiles = aspects.filter(a => a.type === 'sextile');
    const quincunxes = aspects.filter(a => a.type === 'quincunx');

    if (sextiles.length === 0 || quincunxes.length < 2) return patterns;

    // For each sextile, look for apex planet forming quincunx to both ends
    for (const sextile of sextiles) {
      const p1 = sextile.planet1;
      const p2 = sextile.planet2;

      // Find planets that form quincunx to both p1 and p2
      for (const planet of planets) {
        if (planet.name === p1 || planet.name === p2) continue;

        const quincunxToP1 = quincunxes.find(a =>
          (a.planet1 === planet.name && a.planet2 === p1) ||
          (a.planet1 === p1 && a.planet2 === planet.name)
        );
        const quincunxToP2 = quincunxes.find(a =>
          (a.planet1 === planet.name && a.planet2 === p2) ||
          (a.planet1 === p2 && a.planet2 === planet.name)
        );

        // Found a Yod!
        if (quincunxToP1 && quincunxToP2) {
          const patternAspects = [sextile, quincunxToP1, quincunxToP2];
          const avgStrength = patternAspects.reduce((sum, a) => sum + a.strength, 0) / 3;

          patterns.push({
            type: 'yod',
            planets: [p1, p2, planet.name],
            aspects: patternAspects,
            strength: avgStrength,
            interpretation: `Йод (Палец Бога) с вершиной в ${planet.name}: судьбоносные события, необходимость адаптации`,
            rarity: 'rare',
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect Kite patterns
   * Grand Trine + opposition to one of the trine planets
   */
  private detectKites(
    grandTrines: AspectPattern[],
    aspects: ScoredAspect[]
  ): AspectPattern[] {
    const patterns: AspectPattern[] = [];
    const oppositions = aspects.filter(a => a.type === 'opposition');

    if (grandTrines.length === 0 || oppositions.length === 0) return patterns;

    // For each Grand Trine, look for opposition to one of its planets
    for (const trine of grandTrines) {
      for (const opposition of oppositions) {
        // Check if one end of opposition is in the trine
        const trineHasP1 = trine.planets.includes(opposition.planet1);
        const trineHasP2 = trine.planets.includes(opposition.planet2);

        if (trineHasP1 || trineHasP2) {
          const fourthPlanet = trineHasP1 ? opposition.planet2 : opposition.planet1;

          // Make sure fourth planet isn't already in the trine
          if (trine.planets.includes(fourthPlanet)) continue;

          const patternAspects = [...trine.aspects, opposition];
          const avgStrength = patternAspects.reduce((sum, a) => sum + a.strength, 0) / patternAspects.length;

          patterns.push({
            type: 'kite',
            planets: [...trine.planets, fourthPlanet],
            aspects: patternAspects,
            strength: avgStrength,
            interpretation: `Воздушный Змей: талант Гранд-Трина направлен на цель через ${fourthPlanet}`,
            rarity: 'very-rare',
            element: trine.element,
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect Stellium patterns
   * 3 or more planets within 8° (tight conjunction cluster)
   */
  private detectStelliums(planets: PlanetPosition[]): AspectPattern[] {
    const patterns: AspectPattern[] = [];
    const maxOrb = 8; // Stellium orb

    // Check all combinations of 3+ planets
    for (let i = 0; i < planets.length - 2; i++) {
      const cluster: PlanetPosition[] = [planets[i]];

      // Find all planets within orb of first planet
      for (let j = i + 1; j < planets.length; j++) {
        const distance = this.angularDistance(planets[i].longitude, planets[j].longitude);
        if (distance <= maxOrb) {
          cluster.push(planets[j]);
        }
      }

      // Stellium requires at least 3 planets
      if (cluster.length >= 3) {
        // Calculate average longitude and strength
        const avgLongitude = cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;
        const maxDistance = Math.max(...cluster.map(p =>
          this.angularDistance(avgLongitude, p.longitude)
        ));
        const strength = 1 - (maxDistance / maxOrb);

        const sign = this.getZodiacSign(avgLongitude);

        patterns.push({
          type: 'stellium',
          planets: cluster.map(p => p.name),
          aspects: [], // Stellium doesn't require specific aspects
          strength,
          interpretation: `Стеллиум в ${sign}: концентрация энергии ${cluster.length} планет, сильный фокус`,
          rarity: cluster.length >= 4 ? 'rare' : 'moderate',
        });

        // Skip planets already in this stellium
        i = i + cluster.length - 1;
        break;
      }
    }

    return patterns;
  }

  /**
   * Helper: Count squares between a set of planets
   */
  private countSquaresBetweenPlanets(
    planetNames: string[],
    squares: ScoredAspect[]
  ): number {
    return squares.filter(sq =>
      planetNames.includes(sq.planet1) && planetNames.includes(sq.planet2)
    ).length;
  }

  /**
   * Helper: Calculate angular distance between two longitudes
   */
  private angularDistance(lon1: number, lon2: number): number {
    let diff = Math.abs(lon1 - lon2);
    if (diff > 180) diff = 360 - diff;
    return diff;
  }

  /**
   * Helper: Detect element from longitude
   */
  private detectElement(longitude: number): string {
    const sign = Math.floor(longitude / 30);
    const elements = ['Огонь', 'Земля', 'Воздух', 'Вода'];
    return elements[sign % 4];
  }

  /**
   * Helper: Get zodiac sign from longitude
   */
  private getZodiacSign(longitude: number): string {
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer',
      'Leo', 'Virgo', 'Libra', 'Scorpio',
      'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    return signs[Math.floor(longitude / 30)];
  }
}
