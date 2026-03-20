import { NatalChart, DateTime, House } from '@adaptive-astro/shared/types';
import { IEphemerisCalculator } from '../core/ephemeris/interface';
import cityTimezones from 'city-timezones';
import tzlookup from 'tz-lookup';

export interface RelocationResult {
  originalChart: NatalChart;
  relocatedHouses: { [key: number]: House };
  location: {
    city: string;
    latitude: number;
    longitude: number;
    timezone: string;
    country: string;
  };
}

export class RelocationCalculator {
  constructor(private ephemeris: IEphemerisCalculator) { }

  /**
   * Geocode a city name to coordinates and timezone
   */
  public resolveLocation(cityName: string): { city: string; latitude: number; longitude: number; timezone: string; country: string } | null {
    const cities = cityTimezones.lookupViaCity(cityName);
    if (!cities || cities.length === 0) {
      return null;
    }

    // Default to the most populated match
    const city = cities.reduce((prev, current) => (prev.pop > current.pop) ? prev : current);

    const timezone = tzlookup(city.lat, city.lng);

    return {
      city: city.city,
      latitude: city.lat,
      longitude: city.lng,
      timezone: timezone,
      country: city.country || 'Unknown'
    };
  }

  /**
   * Calculate a relocation chart based on a new location
   */
  async calculateRelocation(natalChart: NatalChart, destinationCity: string): Promise<RelocationResult | null> {
    const locationInfo = this.resolveLocation(destinationCity);

    if (!locationInfo) {
      throw new Error(`Could not resolve location for city: ${destinationCity}`);
    }

    return this.calculateRelocationByCoords(
      natalChart,
      locationInfo.latitude,
      locationInfo.longitude,
      locationInfo.city
    );
  }

  /**
   * Calculate a relocation chart based on coordinates
   */
  async calculateRelocationByCoords(natalChart: NatalChart, latitude: number, longitude: number, city: string = 'Custom'): Promise<RelocationResult> {
    const timezone = tzlookup(latitude, longitude);

    const locationInfo = {
      city,
      latitude,
      longitude,
      timezone,
      country: 'Unknown'
    };

    const relocationDateTime: DateTime = {
      date: new Date(natalChart.birthDateTime.date),
      timezone: locationInfo.timezone,
      location: {
        latitude: locationInfo.latitude,
        longitude: locationInfo.longitude,
      }
    };

    const apiHouses = await this.ephemeris.getHouses(relocationDateTime);

    const relocatedHouses: { [key: number]: House } = {};
    if (apiHouses.houses && Array.isArray(apiHouses.houses)) {
      apiHouses.houses.forEach((h: any) => {
        relocatedHouses[h.number] = {
          number: h.number,
          cusp: h.cusp,
          sign: {
            id: 1,
            name: h.zodiacSign,
            element: 'Огонь',
            quality: 'Кардинальный',
            rulingPlanet: 'Sun',
            symbol: '',
            dateRange: [1, 1]
          } as any
        };
      });
    }

    return {
      originalChart: natalChart,
      relocatedHouses,
      location: locationInfo
    };
  }
}
