import axios from 'axios';
import { ChartData, SavedChart, GeocodeResult, ChartCalculationResult } from '../types/chart';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Chart Management API
export class ChartService {
  private baseURL: string;

  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Save a new chart
  async saveChart(chartData: Omit<ChartData, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedChart> {
    const response = await axios.post(`${this.baseURL}/api/charts`, chartData);
    return response.data;
  }

  // Get all saved charts
  async getCharts(): Promise<SavedChart[]> {
    const response = await axios.get(`${this.baseURL}/api/charts`);
    return response.data;
  }

  // Get chart by ID
  async getChart(id: string): Promise<SavedChart> {
    const response = await axios.get(`${this.baseURL}/api/charts/${id}`);
    return response.data;
  }

  // Update chart
  async updateChart(id: string, chartData: Partial<ChartData>): Promise<SavedChart> {
    const response = await axios.put(`${this.baseURL}/api/charts/${id}`, chartData);
    return response.data;
  }

  // Delete chart
  async deleteChart(id: string): Promise<void> {
    await axios.delete(`${this.baseURL}/api/charts/${id}`);
  }

  // Calculate chart (get planetary positions, houses, aspects)
  async calculateChart(chartData: ChartData): Promise<ChartCalculationResult> {
    const response = await axios.post(`${this.baseURL}/api/natal-chart/calculate`, {
      birthDate: new Date(`${chartData.date}T${chartData.time}`),
      birthLocation: chartData.location,
      name: chartData.name
    });
    return {
      ...response.data,
      chartData
    };
  }
}

// Geocoding Service
export class GeocodingService {
  // Search for locations using OpenStreetMap Nominatim (free)
  async searchLocations(query: string): Promise<GeocodeResult[]> {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`
      );

      return response.data.map((item: any) => ({
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        city: item.address?.city || item.address?.town || item.address?.village || '',
        country: item.address?.country || '',
        timezone: this.getTimezoneFromCoordinates(parseFloat(item.lat), parseFloat(item.lon)),
        displayName: item.display_name
      }));
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  }

  // Get timezone from coordinates (simplified - in production use a proper timezone API)
  private getTimezoneFromCoordinates(lat: number, lon: number): string {
    // Basic timezone estimation based on longitude
    // In production, use a proper timezone API like Google Time Zone API
    const timezoneOffset = Math.round(lon / 15);
    return `UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`;
  }

  // Get current location using browser geolocation
  async getCurrentLocation(): Promise<GeocodeResult> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Reverse geocode to get city/country info
          try {
            const response = await axios.get(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );

            const address = response.data.address || {};

            resolve({
              latitude,
              longitude,
              city: address.city || address.town || address.village || 'Unknown',
              country: address.country || 'Unknown',
              timezone: this.getTimezoneFromCoordinates(latitude, longitude),
              displayName: response.data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            });
          } catch (error) {
            // If reverse geocoding fails, still return coordinates
            resolve({
              latitude,
              longitude,
              city: 'Unknown',
              country: 'Unknown',
              timezone: this.getTimezoneFromCoordinates(latitude, longitude),
              displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            });
          }
        },
        (error) => reject(new Error(`Geolocation error: ${error.message}`))
      );
    });
  }
}

// Export singleton instances
export const chartService = new ChartService();
export const geocodingService = new GeocodingService();