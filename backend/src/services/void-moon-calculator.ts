import type { DateTime, CelestialBody, Aspect, PlanetApiData, AspectApiData } from '@adaptive-astro/shared/types/astrology';
import { IEphemerisCalculator } from '../core/ephemeris';

/**
 * Void of Course Moon Calculator
 *
 * Calculates when the Moon is void of course by analyzing:
 * 1. Moon's current position and zodiac sign
 * 2. All aspects the Moon makes
 * 3. When the Moon enters the next zodiac sign
 *
 * The Moon is "void of course" during the period between:
 * - Its last major aspect (to another planet) before changing signs
 * - And when it enters the next zodiac sign
 */

interface VoidPeriod {
  isVoid: boolean;
  voidStart?: Date;
  voidEnd?: Date;
  lastAspect?: string;
  nextSign?: string;
  currentSign?: string;
}

export class VoidMoonCalculator {
  constructor(private ephemeris: IEphemerisCalculator) {}

  /**
   * Calculate if Moon is currently void of course
   */
  async calculateVoidMoon(dateTime: DateTime): Promise<VoidPeriod> {
    // Get current planetary positions
    const planetsData = await this.ephemeris.getPlanetsPositions(dateTime);
    const moon = planetsData.planets.find(p => p.name === 'Moon');

    if (!moon) {
      return { isVoid: false };
    }

    // Get Moon's aspects for the current day and next day
    const aspectsToday = await this.ephemeris.getAspects(dateTime, 8);

    // Calculate next day to check for aspects crossing into next sign
    const tomorrow = new Date(dateTime.date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateTime: DateTime = { ...dateTime, date: tomorrow };
    const aspectsTomorrow = await this.ephemeris.getAspects(tomorrowDateTime, 8);

    // Get Moon aspects (aspects involving the Moon)
    const moonAspects = [
      ...aspectsToday.aspects.filter(a => a.planet1 === 'Moon' || a.planet2 === 'Moon'),
      ...aspectsTomorrow.aspects.filter(a => a.planet1 === 'Moon' || a.planet2 === 'Moon'),
    ];

    // Calculate when Moon enters next sign
    const currentSign = moon.zodiacSign;
    const nextSignChange = this.calculateNextSignChange(moon, dateTime.date);

    // Find last aspect before sign change
    const lastAspect = this.findLastAspectBeforeSignChange(
      moonAspects,
      dateTime.date,
      nextSignChange
    );

    // Determine if currently void
    const now = dateTime.date.getTime();
    const isVoid = lastAspect && now >= lastAspect.time && now < nextSignChange.getTime();

    if (isVoid && lastAspect) {
      return {
        isVoid: true,
        voidStart: new Date(lastAspect.time),
        voidEnd: nextSignChange,
        lastAspect: lastAspect.description,
        currentSign,
        nextSign: this.getNextZodiacSign(currentSign),
      };
    }

    return { isVoid: false, currentSign };
  }

  /**
   * Calculate when Moon enters the next zodiac sign
   * Each zodiac sign is 30 degrees
   */
  private calculateNextSignChange(moon: CelestialBody | PlanetApiData, currentDate: Date): Date {
    const currentLongitude = moon.longitude;
    const moonSpeed = Math.abs(moon.speed); // degrees per day

    // Calculate degrees until next sign boundary
    const currentSignStart = Math.floor(currentLongitude / 30) * 30;
    const nextSignBoundary = currentSignStart + 30;
    let degreesUntilChange = nextSignBoundary - currentLongitude;

    // Handle wraparound at 360 degrees
    if (degreesUntilChange < 0) {
      degreesUntilChange += 360;
    }

    // Calculate time until sign change
    const hoursUntilChange = (degreesUntilChange / moonSpeed) * 24;

    // Add hours to current date
    const signChangeTime = new Date(currentDate.getTime() + hoursUntilChange * 60 * 60 * 1000);

    return signChangeTime;
  }

  /**
   * Find the last aspect Moon makes before changing signs
   */
  private findLastAspectBeforeSignChange(
    aspects: AspectApiData[],
    currentDate: Date,
    signChangeTime: Date
  ): { time: number; description: string } | null {
    // Major aspects to consider for void moon
    const majorAspects = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];

    // Filter to major aspects only
    const relevantAspects = aspects.filter(a => majorAspects.includes(a.type));

    if (relevantAspects.length === 0) {
      // If no aspects, void starts now
      return {
        time: currentDate.getTime(),
        description: 'No major aspects',
      };
    }

    // For simplicity, we'll estimate aspect timing based on orb
    // A tighter orb means the aspect is closer in time
    // This is an approximation - real calculation would need Moon's speed
    const aspectsWithTime = relevantAspects.map(aspect => {
      // Estimate: aspect is exact when orb = 0
      // If orb > 0, aspect is either applying or separating
      // For void moon, we care about when the last aspect perfects

      // Approximate: assume aspect perfects within the next few hours
      // based on how tight the orb is
      const moonSpeed = 13; // Moon moves ~13 degrees per day
      const hoursToExact = aspect.isApplying
        ? (aspect.orb / (moonSpeed / 24)) // approaching
        : -(aspect.orb / (moonSpeed / 24)); // separating (negative = past)

      const aspectTime = new Date(currentDate.getTime() + hoursToExact * 60 * 60 * 1000);

      return {
        aspect,
        time: aspectTime.getTime(),
        description: `${aspect.planet1} ${this.getAspectSymbol(aspect.type)} ${aspect.planet2}`,
      };
    });

    // Find last aspect before sign change
    const aspectsBeforeChange = aspectsWithTime
      .filter(a => a.time < signChangeTime.getTime())
      .sort((a, b) => b.time - a.time); // Sort descending

    if (aspectsBeforeChange.length > 0) {
      return aspectsBeforeChange[0];
    }

    // No aspects before sign change means Moon is already void
    return {
      time: currentDate.getTime(),
      description: 'No aspects before sign change',
    };
  }

  /**
   * Get aspect symbol
   */
  private getAspectSymbol(aspectType: string): string {
    const symbols: Record<string, string> = {
      conjunction: '☌',
      sextile: '⚹',
      square: '□',
      trine: '△',
      opposition: '☍',
      quincunx: '⚻',
    };
    return symbols[aspectType] || aspectType;
  }

  /**
   * Get next zodiac sign
   */
  private getNextZodiacSign(currentSign: string): string {
    const zodiacSigns = [
      'Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева',
      'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы'
    ];

    const currentIndex = zodiacSigns.indexOf(currentSign);
    if (currentIndex === -1) {
      // Fallback to English names
      const englishSigns = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
      ];
      const englishIndex = englishSigns.indexOf(currentSign);
      return englishSigns[(englishIndex + 1) % 12];
    }

    return zodiacSigns[(currentIndex + 1) % 12];
  }
}
