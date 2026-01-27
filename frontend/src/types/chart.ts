export interface ChartData {
  id?: string;
  name: string;
  type: 'natal' | 'event' | 'question';
  date: string; // ISO date string
  time: string; // HH:MM format
  location: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    timezone: string;
  };
  description?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SavedChart extends ChartData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartFormData {
  name: string;
  type: 'natal' | 'event' | 'question';
  date: Date;
  time: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    timezone: string;
  };
  description: string;
  tags: string[];
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  timezone: string;
  displayName: string;
}

export interface ChartCalculationResult {
  planets: any[];
  houses: any[];
  aspects: any[];
  chartData: ChartData;
}