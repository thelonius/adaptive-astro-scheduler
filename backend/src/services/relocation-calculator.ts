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
  constructor(private ephemeris: IEphemerisCalculator) {}

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

    // Natal chart time should be treated as absolute UTC time.
    // We pass the exact same UTC birth time, but change the location and timezone to the destination.
    const relocationDateTime: DateTime = {
      date: natalChart.birthDateTime.date, // The original Date object is timezone-agnostic (represents Unix epoch)
      timezone: locationInfo.timezone,
      location: {
        latitude: locationInfo.latitude,
        longitude: locationInfo.longitude,
      }
    };

    // Calculate houses for the new location at the exact same moment in time
    const apiHouses = await this.ephemeris.getHouses(relocationDateTime);
    
    // Transform HousesApiResponse to local format if needed. 
    // Assuming apiHouses.houses is an array of HouseApiData
    const relocatedHouses: { [key: number]: House } = {};
    if (apiHouses.houses && Array.isArray(apiHouses.houses)) {
      apiHouses.houses.forEach((h: any) => {
        relocatedHouses[h.number] = {
           number: h.number,
           cusp: h.cusp,
           sign: {
             id: 1, // Placeholder
             name: h.zodiacSign,
             element: 'Огонь', // Placeholder
             quality: 'Кардинальный', // Placeholder
             rulingPlanet: 'Sun', // Placeholder
             symbol: '',
             dateRange: [1, 1]
           }
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
