import type {
  ZodiacSign,
  ZodiacSignName,
  ElementType,
  QualityType,
  PlanetName,
} from '@adaptive-astro/shared/types/astrology';
import { ZODIAC_SIGNS } from '@adaptive-astro/shared/constants/zodiac';

/**
 * Zodiac Sign Entity
 *
 * Represents a zodiac sign with its properties and helper methods
 */
export class ZodiacSignEntity implements ZodiacSign {
  id: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  name: ZodiacSignName;
  element: ElementType;
  quality: QualityType;
  rulingPlanet: PlanetName;
  symbol: string;
  dateRange: [number, number];

  constructor(data: ZodiacSign) {
    this.id = data.id;
    this.name = data.name;
    this.element = data.element;
    this.quality = data.quality;
    this.rulingPlanet = data.rulingPlanet;
    this.symbol = data.symbol;
    this.dateRange = data.dateRange;
  }

  /**
   * Check if this is a fire sign
   */
  isFireSign(): boolean {
    return this.element === 'Огонь';
  }

  /**
   * Check if this is an earth sign
   */
  isEarthSign(): boolean {
    return this.element === 'Земля';
  }

  /**
   * Check if this is an air sign
   */
  isAirSign(): boolean {
    return this.element === 'Воздух';
  }

  /**
   * Check if this is a water sign
   */
  isWaterSign(): boolean {
    return this.element === 'Вода';
  }

  /**
   * Check if this is a cardinal sign
   */
  isCardinal(): boolean {
    return this.quality === 'Кардинальный';
  }

  /**
   * Check if this is a fixed sign
   */
  isFixed(): boolean {
    return this.quality === 'Фиксированный';
  }

  /**
   * Check if this is a mutable sign
   */
  isMutable(): boolean {
    return this.quality === 'Мутабельный';
  }

  /**
   * Get compatible signs (same element or complementary)
   */
  getCompatibleSigns(): ZodiacSign[] {
    const compatible: ZodiacSign[] = [];

    for (const sign of ZODIAC_SIGNS) {
      // Same element is compatible
      if (sign.element === this.element && sign.id !== this.id) {
        compatible.push(sign);
      }

      // Complementary elements
      if (
        (this.element === 'Огонь' && sign.element === 'Воздух') ||
        (this.element === 'Воздух' && sign.element === 'Огонь') ||
        (this.element === 'Земля' && sign.element === 'Вода') ||
        (this.element === 'Вода' && sign.element === 'Земля')
      ) {
        compatible.push(sign);
      }
    }

    return compatible;
  }

  /**
   * Get opposing sign (6 signs away)
   */
  getOpposingSign(): ZodiacSign {
    const opposingIndex = (this.id + 5) % 12;
    return ZODIAC_SIGNS[opposingIndex];
  }

  /**
   * Get square signs (3 and 9 signs away)
   */
  getSquareSigns(): ZodiacSign[] {
    const square1Index = (this.id + 2) % 12;
    const square2Index = (this.id + 8) % 12;

    return [ZODIAC_SIGNS[square1Index], ZODIAC_SIGNS[square2Index]];
  }

  /**
   * Get trine signs (4 and 8 signs away)
   */
  getTrineSigns(): ZodiacSign[] {
    const trine1Index = (this.id + 3) % 12;
    const trine2Index = (this.id + 7) % 12;

    return [ZODIAC_SIGNS[trine1Index], ZODIAC_SIGNS[trine2Index]];
  }

  /**
   * Check if another sign is compatible
   */
  isCompatibleWith(other: ZodiacSign): boolean {
    return this.getCompatibleSigns().some(sign => sign.id === other.id);
  }

  /**
   * Get element energy level (fire/air = active, earth/water = receptive)
   */
  isActiveElement(): boolean {
    return this.element === 'Огонь' || this.element === 'Воздух';
  }

  /**
   * Get quality characteristics
   */
  getQualityDescription(): string {
    switch (this.quality) {
      case 'Кардинальный':
        return 'Initiating, action-oriented, leadership';
      case 'Фиксированный':
        return 'Stable, persistent, determined';
      case 'Мутабельный':
        return 'Adaptable, flexible, changeable';
    }
  }

  /**
   * Get element characteristics
   */
  getElementDescription(): string {
    switch (this.element) {
      case 'Огонь':
        return 'Passionate, energetic, enthusiastic';
      case 'Земля':
        return 'Practical, grounded, material';
      case 'Воздух':
        return 'Intellectual, communicative, social';
      case 'Вода':
        return 'Emotional, intuitive, sensitive';
    }
  }

  /**
   * Serialize to JSON
   */
  toJSON(): ZodiacSign {
    return {
      id: this.id,
      name: this.name,
      element: this.element,
      quality: this.quality,
      rulingPlanet: this.rulingPlanet,
      symbol: this.symbol,
      dateRange: this.dateRange,
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: ZodiacSign): ZodiacSignEntity {
    return new ZodiacSignEntity(data);
  }

  /**
   * Find zodiac sign by ID
   */
  static findById(
    id: number
  ): ZodiacSignEntity | null {
    const sign = ZODIAC_SIGNS.find(s => s.id === id);
    return sign ? new ZodiacSignEntity(sign) : null;
  }

  /**
   * Find zodiac sign by name
   */
  static findByName(name: ZodiacSignName): ZodiacSignEntity | null {
    const sign = ZODIAC_SIGNS.find(s => s.name === name);
    return sign ? new ZodiacSignEntity(sign) : null;
  }

  /**
   * Get all zodiac signs
   */
  static getAll(): ZodiacSignEntity[] {
    return ZODIAC_SIGNS.map(sign => new ZodiacSignEntity(sign));
  }
}
