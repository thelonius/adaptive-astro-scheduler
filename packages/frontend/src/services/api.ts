import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Layer {
  id: string;
  name: string;
  description: string;
  type: 'transit' | 'progression' | 'solar_return' | 'custom';
  priority: number;
  active: boolean;
  config: Record<string, any>;
}

export interface NatalChart {
  _id: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
}

export interface Rule {
  _id: string;
  name: string;
  description: string;
  natalChartId: string;
  active: boolean;
  generated: boolean;
}

export const apiService = {
  // Layers
  getLayers: () => api.get<{ data: Layer[] }>('/layers'),
  createLayer: (data: Partial<Layer>) => api.post<{ data: Layer }>('/layers', data),
  updateLayer: (id: string, data: Partial<Layer>) => api.patch<{ data: Layer }>(`/layers/${id}`, data),
  deleteLayer: (id: string) => api.delete(`/layers/${id}`),
  toggleLayer: (id: string) => api.post<{ data: Layer }>(`/layers/${id}/toggle`),

  // Natal Charts
  getCharts: () => api.get<{ data: NatalChart[] }>('/charts'),
  createChart: (data: Partial<NatalChart>) => api.post<{ data: NatalChart }>('/charts', data),

  // Rules
  getRules: (natalChartId?: string) => 
    api.get<{ data: Rule[] }>('/rules', { params: { natalChartId } }),
  generateRule: (natalChartId: string, request: string) =>
    api.post<{ data: Rule }>('/llm/generate-rule', { natalChartId, request }),

  // Ephemeris
  getEphemeris: (date: string, latitude: number, longitude: number) =>
    api.get('/ephemeris', { params: { date, latitude, longitude } }),
  getPlanetPositions: (date: string) =>
    api.get('/ephemeris/planets', { params: { date } }),
};

export default apiService;
