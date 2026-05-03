import type {
  LunarDay,
  LunarPhaseType,
  LunarEnergyType,
} from '@adaptive-astro/shared/types/astrology';

/**
 * Lunar Day Entity
 *
 * Represents a lunar day (1-30) with its characteristics
 * and recommendations
 */
export class LunarDayEntity implements LunarDay {
  number: number;
  symbol: string;
  energy: LunarEnergyType;
  lunarPhase: LunarPhaseType;
  colorPalette?: {
    base_colors: string[];
    gradient: string[];
  };
  characteristics: {
    spiritual: string;
    practical: string;
    avoided: string[];
  };

  constructor(data: LunarDay) {
    this.validateLunarDay(data.number);

    this.number = data.number;
    this.symbol = data.symbol;
    this.energy = data.energy;
    this.lunarPhase = data.lunarPhase;
    this.colorPalette = data.colorPalette;
    this.characteristics = {
      spiritual: data.characteristics.spiritual,
      practical: data.characteristics.practical,
      avoided: [...data.characteristics.avoided],
    };
  }

  /**
   * Validate lunar day number (1-30)
   */
  private validateLunarDay(day: number): void {
    if (day < 1 || day > 30) {
      throw new Error(`Invalid lunar day: ${day}. Must be between 1 and 30.`);
    }
  }

  /**
   * Check if this is a waxing moon day (1-15)
   */
  isWaxing(): boolean {
    return this.number <= 15;
  }

  /**
   * Check if this is a waning moon day (16-30)
   */
  isWaning(): boolean {
    return this.number > 15;
  }

  /**
   * Check if this is a special/satanic day
   * Days 9, 15, 23, 29 are considered particularly powerful or dangerous
   */
  isSpecialDay(): boolean {
    const specialDays = [9, 15, 23, 29];
    return specialDays.includes(this.number);
  }

  /**
   * Check if this is a favorable day for new beginnings
   * Typically days 1-7 of waxing moon
   */
  isFavorableForNewBeginnings(): boolean {
    return this.number >= 1 && this.number <= 7;
  }

  /**
   * Check if this is a favorable day for completion
   * Typically days 24-30 of waning moon
   */
  isFavorableForCompletion(): boolean {
    return this.number >= 24 && this.number <= 30;
  }

  /**
   * Check if activity is recommended
   */
  isActivityRecommended(activity: string): boolean {
    const practical = this.characteristics.practical.toLowerCase();
    return practical.includes(activity.toLowerCase());
  }

  /**
   * Check if activity should be avoided
   */
  shouldAvoidActivity(activity: string): boolean {
    const avoided = this.characteristics.avoided.map(a => a.toLowerCase());
    const activityLower = activity.toLowerCase();

    return avoided.some(a => a.includes(activityLower) || activityLower.includes(a));
  }

  /**
   * Get energy level (0-1 scale)
   * Based on lunar day characteristics
   */
  getEnergyLevel(): number {
    if (this.energy === 'Light') {
      // Waxing moon: energy builds
      return Math.min(1.0, this.number / 15);
    } else if (this.energy === 'Dark') {
      // Waning moon: energy decreases
      return Math.max(0.0, (30 - this.number) / 15);
    } else {
      // Neutral days: moderate energy
      return 0.5;
    }
  }

  /**
   * Get recommendation score for an activity (0-1)
   */
  getActivityScore(activity: string): number {
    if (this.shouldAvoidActivity(activity)) {
      return 0.0;
    }

    if (this.isActivityRecommended(activity)) {
      return 1.0;
    }

    // Base score on energy type and lunar phase
    let score = 0.5;

    // Adjust based on lunar phase
    if (this.lunarPhase === 'New') {
      score += 0.2; // Good for new beginnings
    } else if (this.lunarPhase === 'Full') {
      score += 0.1; // Peak energy
    }

    // Adjust based on energy type
    if (this.energy === 'Light') {
      score += 0.1;
    } else if (this.energy === 'Dark') {
      score -= 0.1;
    }

    return Math.max(0.0, Math.min(1.0, score));
  }

  /**
   * Serialize to JSON
   */
  toJSON(): LunarDay {
    return {
      number: this.number,
      symbol: this.symbol,
      energy: this.energy,
      lunarPhase: this.lunarPhase,
      colorPalette: this.colorPalette,
      characteristics: {
        spiritual: this.characteristics.spiritual,
        practical: this.characteristics.practical,
        avoided: [...this.characteristics.avoided],
      },
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: LunarDay): LunarDayEntity {
    return new LunarDayEntity(data);
  }
}
