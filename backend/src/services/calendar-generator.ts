import type {
  DateTime,
  CalendarDay,
  CalendarMonth,
  CelestialBody,
} from '@adaptive-astro/shared/types';
import { IEphemerisCalculator } from '../core/ephemeris/interface';
import { LunarDayEntity } from '../core/entities/lunar-day';

/**
 * Calendar Generator Service
 *
 * Generates CalendarDay objects with astronomical data
 * and basic recommendations
 */
export class CalendarGenerator {
  constructor(private ephemeris: IEphemerisCalculator) {}

  /**
   * Generate a single calendar day
   */
  async generateDay(dateTime: DateTime): Promise<CalendarDay> {
    // Fetch astronomical data in parallel
    const [lunarDay, moonPhase] = await Promise.all([
      this.ephemeris.getLunarDay(dateTime),
      this.ephemeris.getMoonPhase(dateTime),
    ]);

    const lunarDayEntity = new LunarDayEntity(lunarDay);

    // Determine seasonal phase
    const seasonalPhase = this.getSeasonalPhase(dateTime.date);

    // Get day of week
    const dayOfWeek = dateTime.date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

    // Generate basic recommendations from lunar day
    const recommendations = this.generateRecommendations(lunarDayEntity, moonPhase);

    // For now, we'll use placeholders for data not available from the API
    // These will be populated when full ephemeris data becomes available
    const calendarDay: CalendarDay = {
      date: dateTime,
      lunarDay,
      lunarPhase: moonPhase,
      moonSign: this.getPlaceholderZodiacSign(), // TODO: Get from ephemeris when available
      dayOfWeek,
      seasonalPhase,
      transits: {
        sun: this.getPlaceholderCelestialBody('Sun'),
        moon: this.getPlaceholderCelestialBody('Moon'),
        mercury: this.getPlaceholderCelestialBody('Mercury'),
        venus: this.getPlaceholderCelestialBody('Venus'),
        mars: this.getPlaceholderCelestialBody('Mars'),
        jupiter: this.getPlaceholderCelestialBody('Jupiter'),
        saturn: this.getPlaceholderCelestialBody('Saturn'),
      },
      voidOfCourseMoon: null, // TODO: Get from ephemeris when available
      retrogradesActive: [], // TODO: Get from ephemeris when available
      eclipseWindow: false, // TODO: Calculate when ephemeris supports it
      recommendations,
    };

    return calendarDay;
  }

  /**
   * Generate a calendar month
   */
  async generateMonth(
    year: number,
    month: number,
    location: { latitude: number; longitude: number },
    timezone: string = 'UTC'
  ): Promise<CalendarMonth> {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: CalendarDay[] = [];

    // Generate all days in parallel
    const dayPromises = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day, 12, 0, 0); // Noon each day

      const dateTime: DateTime = {
        date,
        timezone,
        location,
      };

      dayPromises.push(this.generateDay(dateTime));
    }

    const generatedDays = await Promise.all(dayPromises);
    days.push(...generatedDays);

    return {
      year,
      month,
      days,
    };
  }

  /**
   * Find best days for a specific activity
   */
  async findBestDaysFor(
    activity: string,
    startDate: Date,
    endDate: Date,
    location: { latitude: number; longitude: number },
    timezone: string = 'UTC',
    minStrength: number = 0.5
  ): Promise<CalendarDay[]> {
    const days: CalendarDay[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateTime: DateTime = {
        date: new Date(currentDate),
        timezone,
        location,
      };

      const day = await this.generateDay(dateTime);

      // Check if day meets minimum strength for this activity
      if (day.recommendations.strength >= minStrength) {
        // Check if activity is recommended
        const isRecommended = day.recommendations.bestFor.some(
          rec => rec.toLowerCase().includes(activity.toLowerCase())
        );

        if (isRecommended) {
          days.push(day);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort by strength (best first)
    return days.sort((a, b) => b.recommendations.strength - a.recommendations.strength);
  }

  /**
   * Generate recommendations from lunar day data
   */
  private generateRecommendations(
    lunarDay: LunarDayEntity,
    moonPhase: number
  ): CalendarDay['recommendations'] {
    const bestFor: string[] = [];
    const avoidFor: string[] = [];
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Extract recommendations from lunar day
    const practical = lunarDay.characteristics.practical;
    if (practical) {
      bestFor.push(...practical.split(',').map(s => s.trim()));
    }

    avoidFor.push(...lunarDay.characteristics.avoided);

    // Add phase-based recommendations
    if (lunarDay.lunarPhase === 'New') {
      bestFor.push('New beginnings', 'Planning', 'Setting intentions');
      reasons.push('New moon energy supports fresh starts');
    } else if (lunarDay.lunarPhase === 'Full') {
      bestFor.push('Completion', 'Celebration', 'Manifestation');
      reasons.push('Full moon energy enhances completion and manifestation');
    } else if (lunarDay.lunarPhase === 'Waxing') {
      bestFor.push('Building', 'Growing', 'Expanding');
      reasons.push('Waxing moon supports growth and expansion');
    } else if (lunarDay.lunarPhase === 'Waning') {
      bestFor.push('Releasing', 'Cleansing', 'Letting go');
      reasons.push('Waning moon supports release and cleansing');
    }

    // Add energy-based reasons
    if (lunarDay.energy === 'Light') {
      reasons.push('Light lunar day energy is favorable');
    } else if (lunarDay.energy === 'Dark') {
      warnings.push('Dark lunar day energy - proceed with caution');
    }

    // Special day warnings
    if (lunarDay.isSpecialDay()) {
      warnings.push(`Lunar day ${lunarDay.number} is a powerful and potentially challenging day`);
    }

    // Calculate overall strength
    let strength = lunarDay.getEnergyLevel();

    // Adjust for moon phase
    if (moonPhase > 0.9 || moonPhase < 0.1) {
      strength *= 1.1; // Boost for new/full moon
    }

    // Clamp strength to 0-1
    strength = Math.max(0, Math.min(1, strength));

    // Generate general mood
    const generalMood = this.getGeneralMood(lunarDay, moonPhase);

    return {
      bestFor,
      avoidFor,
      generalMood,
      strength,
      reasons,
      warnings,
    };
  }

  /**
   * Get general mood description
   */
  private getGeneralMood(lunarDay: LunarDayEntity, moonPhase: number): string {
    const phase = lunarDay.lunarPhase;
    const energy = lunarDay.energy;

    if (phase === 'New') {
      return 'Introspective and contemplative';
    } else if (phase === 'Full') {
      return 'Energetic and expressive';
    } else if (phase === 'Waxing') {
      if (energy === 'Light') {
        return 'Building momentum and optimistic';
      } else {
        return 'Growing but cautious';
      }
    } else {
      // Waning
      if (energy === 'Dark') {
        return 'Releasing and introspective';
      } else {
        return 'Reflective and clearing';
      }
    }
  }

  /**
   * Determine seasonal phase from date
   */
  private getSeasonalPhase(
    date: Date
  ): 'Spring' | 'Summer' | 'Autumn' | 'Winter' {
    const month = date.getMonth();

    // Northern hemisphere seasons
    if (month >= 2 && month <= 4) return 'Spring'; // Mar, Apr, May
    if (month >= 5 && month <= 7) return 'Summer'; // Jun, Jul, Aug
    if (month >= 8 && month <= 10) return 'Autumn'; // Sep, Oct, Nov
    return 'Winter'; // Dec, Jan, Feb
  }

  /**
   * Placeholder for zodiac sign (until ephemeris provides it)
   */
  private getPlaceholderZodiacSign(): any {
    return {
      id: 1,
      name: 'Овен',
      element: 'Огонь',
      quality: 'Кардинальный',
      rulingPlanet: 'Mars',
      symbol: '♈',
      dateRange: [21, 19],
    };
  }

  /**
   * Placeholder for celestial body (until ephemeris provides it)
   */
  private getPlaceholderCelestialBody(name: string): CelestialBody {
    return {
      name: name as any,
      longitude: 0,
      latitude: 0,
      zodiacSign: this.getPlaceholderZodiacSign(),
      speed: 1,
      isRetrograde: false,
      distanceAU: 1,
    };
  }
}
