import { useState, useCallback } from 'react';
import { chartService } from '../services/chartService';
import type { CelestialBody, Aspect, House } from '@adaptive-astro/shared/types';
import { transformPlanetData, transformAspectData, transformHouseData } from '../utils/apiTransform';

export interface NatalChartData {
  birthData: {
    date: string;
    time: string;
    location: {
      latitude: number;
      longitude: number;
      timezone: string;
    };
  };
  planets: CelestialBody[];
  houses: House[];
  aspects: Aspect[];
  lunarDay: any;
  moonPhase: string;
  calculatedAt: string;
}

export interface NatalChartInput {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface UseNatalChartReturn {
  data: NatalChartData | null;
  loading: boolean;
  error: Error | null;
  calculateChart: (input: NatalChartInput) => Promise<void>;
  loadSavedChart: (id: string) => Promise<void>;
  clearChart: () => void;
}

import { API_BASE_URL } from '../config';

export function useNatalChart(): UseNatalChartReturn {
  const [data, setData] = useState<NatalChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const calculateChart = useCallback(async (input: NatalChartInput) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/natal-chart/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to calculate natal chart');
      }

      const rawChartData = await response.json();

      // Transform planets
      const transformedPlanets = rawChartData.planets.map((p: any) => transformPlanetData(p));

      // Create planets map for aspect transformation
      const planetsMap = new Map<string, CelestialBody>();
      transformedPlanets.forEach((p: CelestialBody) => planetsMap.set(p.name, p));

      // Transform aspects
      const transformedAspects = rawChartData.aspects
        .map((a: any) => transformAspectData(a, planetsMap))
        .filter((a: Aspect | null) => a !== null);

      // Transform houses
      const transformedHouses = rawChartData.houses.map((h: any) => {
        console.log('Raw house data:', h);
        const transformed = transformHouseData(h);
        console.log('Transformed house:', transformed);
        return transformed;
      });

      // Set transformed data
      const finalData = {
        ...rawChartData,
        planets: transformedPlanets,
        aspects: transformedAspects,
        houses: transformedHouses,
      };

      console.log('Final natal chart data:', finalData);
      setData(finalData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error calculating natal chart:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSavedChart = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const savedChart = await chartService.getChart(id);
      const input: NatalChartInput = {
        birthDate: savedChart.date,
        birthTime: savedChart.time,
        latitude: savedChart.location.latitude,
        longitude: savedChart.location.longitude,
        timezone: savedChart.location.timezone,
      };
      await calculateChart(input);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load chart'));
    } finally {
      setLoading(false);
    }
  }, [calculateChart]);

  const clearChart = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    calculateChart,
    loadSavedChart,
    clearChart,
  };
}
