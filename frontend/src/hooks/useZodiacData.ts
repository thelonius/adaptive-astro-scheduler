import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import type { CelestialBody, Aspect, House, PlanetApiData, AspectApiData, HouseApiData } from '@adaptive-astro/shared/types';
import type { ZodiacWheelData } from '../components/ZodiacWheel/types';
import { transformPlanetData, transformAspectData, transformHouseData } from '../utils/apiTransform';

interface UseZodiacDataOptions {
  refreshInterval?: number;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  includeHouses?: boolean;
  aspectOrb?: number;
  enabled?: boolean;
  date?: Date | string;
  adaptive?: boolean;
}

interface UseZodiacDataResult {
  data: ZodiacWheelData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdate: Date | null;
}

import { API_BASE_URL } from '../config';

export function useZodiacData(options: UseZodiacDataOptions = {}): UseZodiacDataResult {
  const {
    refreshInterval = 1 * 60 * 1000, // 1 minute
    latitude = 55.7558, // Moscow default
    longitude = 37.6173,
    timezone = 'Europe/Moscow',
    includeHouses = false,
    aspectOrb = 8,
    enabled = true,
    date: dateProp,
  } = options;

  const [data, setData] = useState<ZodiacWheelData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    // Determine the date/time to use
    // If dateProp is provided, use it. Otherwise use current time
    let queryDate: string;
    let queryTime: string;
    let targetDate: Date;

    if (dateProp) {
      targetDate = typeof dateProp === 'string' ? new Date(dateProp) : dateProp;
      // Use Intl to get exact localized time for the TARGET timezone
      // This ensures we send the 'local' time of that location to the backend
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(targetDate);
      const getPart = (type: string) => parts.find(p => p.type === type)?.value;
      
      queryDate = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
      queryTime = `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;

    } else {
      targetDate = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(targetDate);
      const getPart = (type: string) => parts.find(p => p.type === type)?.value;
      
      queryDate = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
      queryTime = `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
    }



    try {
      setLoading(true);
      setError(null);

      // Fetch planets and aspects in parallel
      const [planetsResponse, aspectsResponse, housesResponse, voidMoonResponse, hoursResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/ephemeris/planets`, {
          params: { date: queryDate, time: queryTime, latitude, longitude, timezone },
          signal: abortControllerRef.current.signal,
        }),
        axios.get(`${API_BASE_URL}/api/ephemeris/aspects`, {
          params: { date: queryDate, time: queryTime, timezone, orb: aspectOrb },
          signal: abortControllerRef.current.signal,
        }),
        includeHouses
          ? axios.get(`${API_BASE_URL}/api/ephemeris/houses`, {
            params: { date: queryDate, time: queryTime, timezone, latitude, longitude, system: 'placidus' },
            signal: abortControllerRef.current.signal,
          })
          : Promise.resolve(null),
        axios.get(`${API_BASE_URL}/api/ephemeris/void-moon`, {
          params: { date: queryDate, latitude, longitude, timezone },
          signal: abortControllerRef.current.signal,
        }).catch(() => null), // fail gracefully
        axios.get(`${API_BASE_URL}/api/ephemeris/planetary-hours`, {
          params: { date: queryDate, latitude, longitude, timezone },
          signal: abortControllerRef.current.signal,
        }).catch(() => null),
      ]);

      // Transform API data to frontend types
      const apiPlanets = planetsResponse.data.planets as PlanetApiData[];
      const apiAspects = (aspectsResponse.data.aspects as AspectApiData[]) || [];
      const apiHouses = housesResponse?.data.houses as HouseApiData[] | undefined;
      const hoursData = hoursResponse?.data?.hours || [];

      // Transform planets
      const planets = apiPlanets.map(transformPlanetData);

      // Create a map for quick planet lookup for aspects
      const planetsMap = new Map<string, CelestialBody>();
      planets.forEach(planet => planetsMap.set(planet.name, planet));

      // Transform aspects
      const aspects = apiAspects
        .map(apiAspect => transformAspectData(apiAspect, planetsMap))
        .filter((aspect): aspect is Aspect => aspect !== null);

      // Transform houses
      const houses = apiHouses?.map(transformHouseData);

      // Validate that we got valid data
      if (!Array.isArray(planets)) {
        throw new Error('Invalid planets data received from API');
      }
      if (!Array.isArray(aspects)) {
        throw new Error('Invalid aspects data received from API');
      }

      setData({
        planets,
        aspects,
        houses,
        voidMoon: voidMoonResponse?.data?.success ? ({
          isVoid: voidMoonResponse.data.data.isVoid,
          voidStart: voidMoonResponse.data.data.voidStart,
          voidEnd: voidMoonResponse.data.data.voidEnd
        }) : undefined,
        planetaryHours: hoursData,
        timestamp: targetDate,
      });
      setLastUpdate(new Date());
    } catch (err) {
      if (axios.isCancel(err)) {
        // Request was cancelled, ignore
        return;
      }
      const error = err instanceof Error ? err : new Error('Failed to fetch zodiac data');
      setError(error);
      console.error('Error fetching zodiac data:', error);
    } finally {
      setLoading(false);
    }
  }, [enabled, latitude, longitude, timezone, aspectOrb, includeHouses, dateProp]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchData();

    // Set up interval for updates
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, refreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdate,
  };
}

// Hook for adaptive refresh rates based on celestial body speed
export function useAdaptiveZodiacData(options: UseZodiacDataOptions = {}): UseZodiacDataResult {
  const { adaptive = true, refreshInterval: userInterval } = options;
  const [dynamicInterval, setDynamicInterval] = useState(1 * 60 * 1000);

  // If adaptive is enabled, use dynamic interval, otherwise use user provided interval
  const effectiveInterval = adaptive ? dynamicInterval : (userInterval || 1 * 60 * 1000);

  const result = useZodiacData({
    ...options,
    refreshInterval: effectiveInterval,
  });

  useEffect(() => {
    if (!adaptive || !result.data?.planets) return;

    // Calculate optimal refresh interval based on fastest moving planet
    const speeds = result.data.planets.map(p => Math.abs(p.speed));
    const maxSpeed = Math.max(...speeds);

    // Moon moves ~13°/day, Mercury ~1-2°/day, outer planets <0.1°/day
    // Refresh every minute for all bodies to reduce load
    let interval: number;

    if (maxSpeed > 10) {
      // Fast (Moon): every 1 minute
      interval = 1 * 60 * 1000;
    } else if (maxSpeed > 1) {
      // Medium (inner planets): every 1 minute
      interval = 1 * 60 * 1000;
    } else {
      // Slow (outer planets): every 1 minute
      interval = 1 * 60 * 1000;
    }

    setDynamicInterval(interval);
  }, [result.data?.planets, adaptive]);

  return result;
}
