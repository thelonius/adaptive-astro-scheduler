import type { DateTime } from '@adaptive-astro/shared/types/astrology';
import type { NatalChart } from '../database/models';
import { IEphemerisCalculator } from '../core/ephemeris';
import { TransitCalculator, type TransitAnalysis } from './transit-calculator';
import { CalendarGenerator } from './calendar-generator';

/**
 * Personalized Day Analytics
 */
export interface PersonalizedDayAnalytics {
  date: Date;
  universalEnergy: {
    lunarDay: number;
    moonPhase: string;
    voidOfCourse: boolean;
    dayStrength: number; // 0-1, from calendar generator
  };
  personalTransits: TransitAnalysis;
  recommendations: {
    bestActivities: string[];
    avoid: string[];
    energyFocus: string[];
  };
  overall Score: number; // 0-100
  personalSummary: string;
}

/**
 * Activity Recommendations
 */
export interface ActivityRecommendation {
  activity: string;
  score: number; // 0-100
  reasoning: string[];
  bestTime?: string; // HH:MM format
}

/**
 * Personalized Analytics Service
 *
 * Combines universal astronomical data with personal natal chart
 * to provide customized daily analytics and recommendations
 */
export class PersonalizedAnalyticsService {
  private transitCalculator: TransitCalculator;
  private calendarGenerator: CalendarGenerator;

  constructor(private ephemeris: IEphemerisCalculator) {
    this.transitCalculator = new TransitCalculator(ephemeris);
    this.calendarGenerator = new CalendarGenerator(ephemeris);
  }

  /**
   * Generate personalized daily analytics
   */
  async generateDayAnalytics(
    natalChart: NatalChart,
    date: Date = new Date(),
    location?: { latitude: number; longitude: number }
  ): Promise<PersonalizedDayAnalytics> {
    // Use natal location if not specified
    const analysisLocation = location || natalChart.birth_location;

    const dateTime: DateTime = {
      date,
      timezone: natalChart.birth_location.timezone,
      location: {
        latitude: analysisLocation.latitude,
        longitude: analysisLocation.longitude,
      },
    };

    // Get universal calendar data
    const calendarDay = await this.calendarGenerator.generateDay(dateTime);

    // Get personal transits
    const transits = await this.transitCalculator.calculateTransits(
      natalChart,
      date,
      location
    );

    // Calculate overall score
    const overallScore = this.calculateOverallScore(
      calendarDay.dayStrength,
      transits
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      calendarDay,
      transits
    );

    // Generate personal summary
    const personalSummary = this.generatePersonalSummary(
      calendarDay,
      transits,
      overallScore
    );

    return {
      date,
      universalEnergy: {
        lunarDay: calendarDay.lunarDay.number,
        moonPhase: calendarDay.lunarDay.lunarPhase,
        voidOfCourse: false, // TODO: Add void moon check
        dayStrength: calendarDay.dayStrength,
      },
      personalTransits: transits,
      recommendations,
      overallScore,
      personalSummary,
    };
  }

  /**
   * Calculate activity-specific scores for the day
   */
  async scoreActivities(
    natalChart: NatalChart,
    activities: string[],
    date: Date = new Date()
  ): Promise<ActivityRecommendation[]> {
    const analytics = await this.generateDayAnalytics(natalChart, date);

    return activities.map(activity => {
      const score = this.calculateActivityScore(activity, analytics);
      const reasoning = this.explainActivityScore(activity, analytics);

      return {
        activity,
        score,
        reasoning,
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate overall day score (0-100)
   */
  private calculateOverallScore(
    universalStrength: number,
    transits: TransitAnalysis
  ): number {
    let score = universalStrength * 50; // Universal base: 0-50 points

    // Add points for beneficial transits
    const beneficTransits = transits.significantTransits.filter(
      t => t.aspectType === 'trine' || t.aspectType === 'sextile'
    );
    score += Math.min(beneficTransits.length * 5, 25);

    // Subtract points for challenging transits
    const challengingTransits = transits.significantTransits.filter(
      t => t.aspectType === 'square' || t.aspectType === 'opposition'
    );
    score -= Math.min(challengingTransits.length * 5, 25);

    // Boost for exact aspects
    const exactTransits = transits.significantTransits.filter(t => t.isExact);
    score += exactTransits.length * 3;

    // Cap between 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate activity recommendations
   */
  private generateRecommendations(
    calendarDay: any,
    transits: TransitAnalysis
  ) {
    const bestActivities: string[] = [];
    const avoid: string[] = [];
    const energyFocus: string[] = [];

    // Based on lunar day
    if (calendarDay.lunarDay.energy === 'Light') {
      bestActivities.push('Новые начинания', 'Социальная активность');
    } else {
      bestActivities.push('Завершение проектов', 'Внутренняя работа');
    }

    // Based on transits
    const hasJupiterTransits = transits.significantTransits.some(
      t => t.transitingPlanet === 'Jupiter'
    );
    if (hasJupiterTransits) {
      bestActivities.push('Расширение бизнеса', 'Обучение');
    }

    const hasMarsSquares = transits.significantTransits.some(
      t => t.transitingPlanet === 'Mars' && t.aspectType === 'square'
    );
    if (hasMarsSquares) {
      avoid.push('Конфликты', 'Импульсивные решения');
    }

    // Energy focus based on house transits
    const sunHouse = transits.houseTransits.find(ht => ht.planet === 'Sun');
    if (sunHouse) {
      energyFocus.push(this.getHouseFocus(sunHouse.natalHouse));
    }

    return {
      bestActivities: bestActivities.slice(0, 5),
      avoid: avoid.slice(0, 3),
      energyFocus: energyFocus.slice(0, 3),
    };
  }

  /**
   * Get energy focus for house
   */
  private getHouseFocus(house: number): string {
    const focuses: Record<number, string> = {
      1: 'Личность и самопрезентация',
      2: 'Финансы и ценности',
      3: 'Коммуникация и обучение',
      4: 'Дом и семья',
      5: 'Творчество и романтика',
      6: 'Работа и здоровье',
      7: 'Партнерства и отношения',
      8: 'Трансформация и глубина',
      9: 'Философия и путешествия',
      10: 'Карьера и репутация',
      11: 'Дружба и сообщество',
      12: 'Духовность и подсознание',
    };

    return focuses[house] || `Дом ${house}`;
  }

  /**
   * Calculate activity-specific score
   */
  private calculateActivityScore(
    activity: string,
    analytics: PersonalizedDayAnalytics
  ): number {
    let score = analytics.overallScore;

    // Activity-specific adjustments
    const activityLower = activity.toLowerCase();

    // Surgery, medical
    if (activityLower.includes('операц') || activityLower.includes('хирург')) {
      if (analytics.universalEnergy.moonPhase === 'Waxing') {
        score += 10;
      }
      if (analytics.universalEnergy.voidOfCourse) {
        score -= 20;
      }
    }

    // Business, contracts
    if (activityLower.includes('бизнес') || activityLower.includes('контракт')) {
      const hasMercuryRetro = analytics.personalTransits.retrogradeInfluences.some(
        r => r.planet === 'Mercury'
      );
      if (hasMercuryRetro) {
        score -= 15;
      }
    }

    // Romance, social
    if (activityLower.includes('свидан') || activityLower.includes('роман')) {
      const hasVenusAspects = analytics.personalTransits.significantTransits.some(
        t => t.transitingPlanet === 'Venus' || t.natalPlanet === 'Venus'
      );
      if (hasVenusAspects) {
        score += 15;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Explain activity score
   */
  private explainActivityScore(
    activity: string,
    analytics: PersonalizedDayAnalytics
  ): string[] {
    const reasons: string[] = [];

    reasons.push(`Общая энергия дня: ${analytics.overallScore}/100`);

    if (analytics.personalTransits.significantTransits.length > 0) {
      const top = analytics.personalTransits.significantTransits[0];
      reasons.push(
        `Основной транзит: ${top.transitingPlanet} ${top.aspectType} ${top.natalPlanet}`
      );
    }

    if (analytics.recommendations.bestActivities.length > 0) {
      reasons.push(
        `Рекомендовано: ${analytics.recommendations.bestActivities.join(', ')}`
      );
    }

    return reasons;
  }

  /**
   * Generate personal summary
   */
  private generatePersonalSummary(
    calendarDay: any,
    transits: TransitAnalysis,
    score: number
  ): string {
    const parts: string[] = [];

    // Overall assessment
    if (score >= 80) {
      parts.push('Отличный день для важных дел!');
    } else if (score >= 60) {
      parts.push('Хороший день с благоприятной энергией.');
    } else if (score >= 40) {
      parts.push('Обычный день, действуйте осторожно.');
    } else {
      parts.push('Сложный день, будьте внимательны.');
    }

    // Transit summary
    if (transits.summary) {
      parts.push(transits.summary);
    }

    // Lunar day
    parts.push(
      `Лунный день ${calendarDay.lunarDay.number}, ${calendarDay.lunarDay.lunarPhase}.`
    );

    return parts.join(' ');
  }
}
