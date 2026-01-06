import type { Aspect, AspectType } from '@adaptive-astro/shared/types';

/**
 * Aspect Strength Weights
 */
export interface StrengthWeights {
  orbTightness: number;      // 0-1: How close to exact (1° = 1.0, 8° = 0.25)
  planetImportance: number;  // 0-1: Significance of planets involved
  aspectPower: number;       // 0-1: Inherent power of aspect type
  applyingBonus: number;     // 0-0.1: Bonus if aspect is applying (building)
}

/**
 * Scored Aspect with Strength Analysis
 */
export interface ScoredAspect {
  // Original aspect data
  planet1: string;
  planet2: string;
  type: AspectType;
  angle: number;
  orb: number;
  isApplying: boolean;
  interpretation: string;

  // Strength analysis
  strength: number;          // 0-1 composite score
  weights: StrengthWeights;
  rank: 'weak' | 'moderate' | 'strong' | 'very-strong';
}

/**
 * Aspect Strength Calculator
 *
 * Calculates weighted strength scores for aspects based on:
 * - Orb tightness (how close to exact)
 * - Planet importance (personal vs outer planets)
 * - Aspect power (major vs minor aspects)
 * - Applying vs separating (building vs fading energy)
 */
export class AspectStrengthCalculator {
  /**
   * Calculate strength score for an aspect
   */
  static calculateStrength(aspect: Aspect | any): ScoredAspect {
    // Handle both camelCase and snake_case API formats
    const aspectType = aspect.type || aspect.aspect_type;
    const isApplying = aspect.isApplying ?? aspect.is_applying ?? false;

    const maxOrb = this.getMaxOrbForAspectType(aspectType);

    const weights: StrengthWeights = {
      orbTightness: this.getOrbTightness(aspect.orb, maxOrb),
      planetImportance: this.getPlanetImportance(aspect.planet1, aspect.planet2),
      aspectPower: this.getAspectPower(aspectType),
      applyingBonus: isApplying ? 0.1 : 0,
    };

    // Weighted formula: orb (40%) + planets (30%) + aspect type (30%) + applying bonus
    const strength = Math.min(1.0,
      (weights.orbTightness * 0.4) +
      (weights.planetImportance * 0.3) +
      (weights.aspectPower * 0.3) +
      weights.applyingBonus
    );

    const rank = this.determineRank(strength);

    return {
      planet1: aspect.planet1,
      planet2: aspect.planet2,
      type: aspectType,
      angle: aspect.angle,
      orb: aspect.orb,
      isApplying: isApplying,
      interpretation: aspect.interpretation || '',
      strength,
      weights,
      rank,
    };
  }

  /**
   * Score multiple aspects and sort by strength
   */
  static scoreAspects(aspects: Aspect[] | any[]): ScoredAspect[] {
    return aspects
      .map(aspect => this.calculateStrength(aspect))
      .sort((a, b) => b.strength - a.strength); // Strongest first
  }

  /**
   * Get top N strongest aspects
   */
  static getTopAspects(aspects: Aspect[] | any[], limit: number = 5): ScoredAspect[] {
    return this.scoreAspects(aspects).slice(0, limit);
  }

  /**
   * Calculate orb tightness (0-1)
   * Tighter orb = higher score
   */
  private static getOrbTightness(orb: number, maxOrb: number): number {
    if (orb <= 0) return 1.0;
    if (orb >= maxOrb) return 0.25; // Minimum score for aspects at edge of orb

    // Linear decay from 1.0 at 0° to 0.25 at maxOrb
    return 1.0 - (orb / maxOrb) * 0.75;
  }

  /**
   * Get planet importance score (0-1)
   * Based on astrological significance and personal relevance
   */
  private static getPlanetImportance(planet1: string, planet2: string): number {
    const importance1 = this.getSinglePlanetImportance(planet1);
    const importance2 = this.getSinglePlanetImportance(planet2);

    // Average importance of both planets
    return (importance1 + importance2) / 2;
  }

  /**
   * Get importance of a single planet
   */
  private static getSinglePlanetImportance(planet: string): number {
    const importanceMap: Record<string, number> = {
      // Luminaries (most personal)
      'Sun': 1.0,
      'Moon': 1.0,

      // Personal planets
      'Mercury': 0.8,
      'Venus': 0.8,
      'Mars': 0.8,

      // Social planets
      'Jupiter': 0.7,
      'Saturn': 0.7,

      // Generational planets (less personal)
      'Uranus': 0.5,
      'Neptune': 0.5,
      'Pluto': 0.5,

      // Other bodies
      'Node': 0.6,
      'Chiron': 0.6,
      'Lilith': 0.5,
    };

    return importanceMap[planet] ?? 0.4; // Default for unknown bodies
  }

  /**
   * Get aspect power score (0-1)
   * Based on traditional astrological strength
   */
  private static getAspectPower(aspectType: AspectType): number {
    const powerMap: Record<AspectType, number> = {
      // Major hard aspects (most powerful)
      'conjunction': 1.0,
      'opposition': 1.0,

      // Major dynamic aspects
      'square': 0.9,

      // Major soft aspects
      'trine': 0.8,

      // Minor aspects
      'sextile': 0.6,
      'quincunx': 0.5,
    };

    return powerMap[aspectType] ?? 0.5;
  }

  /**
   * Get maximum orb typically used for aspect type
   */
  private static getMaxOrbForAspectType(aspectType: AspectType): number {
    const orbMap: Record<AspectType, number> = {
      'conjunction': 8,
      'opposition': 8,
      'square': 8,
      'trine': 8,
      'sextile': 6,
      'quincunx': 3,
    };

    return orbMap[aspectType] ?? 8;
  }

  /**
   * Determine strength rank based on score
   */
  private static determineRank(strength: number): 'weak' | 'moderate' | 'strong' | 'very-strong' {
    if (strength >= 0.8) return 'very-strong';
    if (strength >= 0.6) return 'strong';
    if (strength >= 0.4) return 'moderate';
    return 'weak';
  }

  /**
   * Get human-readable strength description
   */
  static getStrengthDescription(rank: string): string {
    const descriptions: Record<string, string> = {
      'very-strong': 'Очень сильный аспект, доминирующее влияние',
      'strong': 'Сильный аспект, значительное влияние',
      'moderate': 'Умеренный аспект, заметное влияние',
      'weak': 'Слабый аспект, фоновое влияние',
    };

    return descriptions[rank] ?? 'Неопределенная сила';
  }

  /**
   * Filter aspects by minimum strength
   */
  static filterByMinStrength(
    scoredAspects: ScoredAspect[],
    minStrength: number
  ): ScoredAspect[] {
    return scoredAspects.filter(aspect => aspect.strength >= minStrength);
  }

  /**
   * Filter aspects by rank
   */
  static filterByRank(
    scoredAspects: ScoredAspect[],
    ranks: Array<'weak' | 'moderate' | 'strong' | 'very-strong'>
  ): ScoredAspect[] {
    return scoredAspects.filter(aspect => ranks.includes(aspect.rank));
  }
}
