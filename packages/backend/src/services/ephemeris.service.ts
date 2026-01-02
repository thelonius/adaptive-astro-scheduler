import * as Astronomy from 'astronomy-engine';
import logger from '../utils/logger';

export interface PlanetPosition {
  name: string;
  longitude: number;
  latitude: number;
  distance: number;
  sign: string;
  degree: number;
}

export interface EphemerisData {
  date: Date;
  planets: PlanetPosition[];
  houses: Array<{
    number: number;
    cusp: number;
    sign: string;
  }>;
}

class EphemerisService {
  private readonly planets = [
    'Sun',
    'Moon',
    'Mercury',
    'Venus',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Neptune',
    'Pluto',
  ];

  private readonly zodiacSigns = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ];

  getZodiacSign(longitude: number): { sign: string; degree: number } {
    const signIndex = Math.floor(longitude / 30);
    const degree = longitude % 30;
    return {
      sign: this.zodiacSigns[signIndex],
      degree: Math.round(degree * 100) / 100,
    };
  }

  async calculatePlanetPositions(date: Date): Promise<PlanetPosition[]> {
    try {
      const positions: PlanetPosition[] = [];

      for (const planetName of this.planets) {
        const body = planetName as Astronomy.Body;
        const vector = Astronomy.HelioVector(body, date);
        const ecliptic = Astronomy.Ecliptic(vector);

        const { sign, degree } = this.getZodiacSign(ecliptic.elon);

        positions.push({
          name: planetName,
          longitude: ecliptic.elon,
          latitude: ecliptic.elat,
          distance: ecliptic.vec.Length(),
          sign,
          degree,
        });
      }

      return positions;
    } catch (error) {
      logger.error('Error calculating planet positions:', error);
      throw error;
    }
  }

  async calculateHouses(
    date: Date,
    latitude: number,
    longitude: number
  ): Promise<Array<{ number: number; cusp: number; sign: string }>> {
    try {
      // Simplified house calculation using equal house system
      const sunVector = Astronomy.HelioVector('Sun' as Astronomy.Body, date);
      const sunPos = Astronomy.Ecliptic(sunVector);
      const ascendant = this.calculateAscendant(date, latitude, longitude);

      const houses = [];
      for (let i = 0; i < 12; i++) {
        const cuspLongitude = (ascendant + i * 30) % 360;
        const { sign } = this.getZodiacSign(cuspLongitude);
        houses.push({
          number: i + 1,
          cusp: cuspLongitude,
          sign,
        });
      }

      return houses;
    } catch (error) {
      logger.error('Error calculating houses:', error);
      throw error;
    }
  }

  private calculateAscendant(date: Date, latitude: number, longitude: number): number {
    // Simplified ascendant calculation
    // In a production system, use a more accurate algorithm
    const observer = new Astronomy.Observer(latitude, longitude, 0);
    const sunVector = Astronomy.GeoVector('Sun' as Astronomy.Body, date, false);
    const equ = Astronomy.EquatorFromVector(sunVector);
    const hor = Astronomy.Horizon(date, observer, equ.ra, equ.dec, 'normal');
    
    // Convert to ecliptic longitude (simplified)
    return (hor.azimuth + 90) % 360;
  }

  async getEphemeris(
    date: Date,
    latitude: number,
    longitude: number
  ): Promise<EphemerisData> {
    const planets = await this.calculatePlanetPositions(date);
    const houses = await this.calculateHouses(date, latitude, longitude);

    return {
      date,
      planets,
      houses,
    };
  }

  calculateAspect(
    longitude1: number,
    longitude2: number
  ): { type: string; orb: number } | null {
    const diff = Math.abs(longitude1 - longitude2);
    const angle = diff > 180 ? 360 - diff : diff;

    const aspects = [
      { name: 'Conjunction', angle: 0, orb: 8 },
      { name: 'Sextile', angle: 60, orb: 6 },
      { name: 'Square', angle: 90, orb: 8 },
      { name: 'Trine', angle: 120, orb: 8 },
      { name: 'Opposition', angle: 180, orb: 8 },
    ];

    for (const aspect of aspects) {
      const orb = Math.abs(angle - aspect.angle);
      if (orb <= aspect.orb) {
        return { type: aspect.name, orb };
      }
    }

    return null;
  }
}

export default new EphemerisService();
