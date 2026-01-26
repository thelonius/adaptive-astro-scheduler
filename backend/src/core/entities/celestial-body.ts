import type { CelestialBody, PlanetName, ZodiacSign } from '@adaptive-astro/shared/types/astrology';
import { getZodiacSignByLongitude } from '@adaptive-astro/shared';

/**
 * Celestial Body Entity
 *
 * Represents a planet, sun, or moon with its astronomical properties
 */
export class CelestialBodyEntity implements CelestialBody {
  name: PlanetName;
  longitude: number;
  latitude: number;
  zodiacSign: ZodiacSign;
  speed: number;
  isRetrograde: boolean;
  distanceAU: number;

  constructor(data: {
    name: PlanetName;
    longitude: number;
    latitude: number;
    speed: number;
    distanceAU: number;
  }) {
    this.name = data.name;
    this.longitude = this.normalizeLongitude(data.longitude);
    this.latitude = data.latitude;
    this.speed = data.speed;
    this.isRetrograde = data.speed < 0;
    this.distanceAU = data.distanceAU;

    // Calculate zodiac sign from longitude
    this.zodiacSign = getZodiacSignByLongitude(this.longitude);
  }

  /**
   * Normalize longitude to 0-360 range
   */
  private normalizeLongitude(longitude: number): number {
    let normalized = longitude % 360;
    if (normalized < 0) {
      normalized += 360;
    }
    return normalized;
  }

  /**
   * Get position within zodiac sign (0-30 degrees)
   */
  getPositionInSign(): number {
    return this.longitude % 30;
  }

  /**
   * Get formatted position string (e.g., "15°23' Aries")
   */
  getFormattedPosition(): string {
    const degrees = Math.floor(this.getPositionInSign());
    const minutes = Math.floor((this.getPositionInSign() - degrees) * 60);
    return `${degrees}°${minutes}' ${this.zodiacSign.name}`;
  }

  /**
   * Check if this body is in the same sign as another
   */
  isInSameSignAs(other: CelestialBody): boolean {
    return this.zodiacSign.id === other.zodiacSign.id;
  }

  /**
   * Calculate angular distance to another body
   */
  angularDistanceTo(other: CelestialBody): number {
    let distance = Math.abs(this.longitude - other.longitude);

    // Use the shorter arc
    if (distance > 180) {
      distance = 360 - distance;
    }

    return distance;
  }

  /**
   * Check if this body forms a specific aspect with another
   * @param other - Other celestial body
   * @param aspectAngle - Target aspect angle (0, 60, 90, 120, 180)
   * @param orb - Allowable orb in degrees
   */
  formsAspectWith(
    other: CelestialBody,
    aspectAngle: number,
    orb: number = 8
  ): boolean {
    const distance = this.angularDistanceTo(other);
    const diff = Math.abs(distance - aspectAngle);

    return diff <= orb;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): CelestialBody {
    return {
      name: this.name,
      longitude: this.longitude,
      latitude: this.latitude,
      zodiacSign: this.zodiacSign,
      speed: this.speed,
      isRetrograde: this.isRetrograde,
      distanceAU: this.distanceAU,
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: CelestialBody): CelestialBodyEntity {
    return new CelestialBodyEntity({
      name: data.name,
      longitude: data.longitude,
      latitude: data.latitude,
      speed: data.speed,
      distanceAU: data.distanceAU,
    });
  }
}
