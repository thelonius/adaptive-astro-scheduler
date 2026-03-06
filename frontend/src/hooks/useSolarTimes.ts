/**
 * useSolarTimes — хук для получения времён восхода/заката
 * 
 * Запрашивает /api/ephemeris/solar-times у нашего бэкенда
 * (который использует NASA JPL через Skyfield).
 * 
 * Кэширует результат на сутки (данные не меняются в течение дня).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export type SolarPeriod =
    | 'night'
    | 'astronomical_twilight'
    | 'nautical_twilight'
    | 'civil_twilight'
    | 'day';

export interface SolarTimes {
    date: string;
    latitude: number;
    longitude: number;
    timezone: string;

    // Основные события (ISO строки)
    sunrise: string | null;
    sunset: string | null;
    solarNoon: string | null;

    // Сумерки
    civilDawn: string | null;
    civilDusk: string | null;
    nauticalDawn: string | null;
    nauticalDusk: string | null;
    astronomicalDawn: string | null;
    astronomicalDusk: string | null;

    // Вычисленное
    dayLengthMinutes: number | null;

    // Текущий период (обновляется в реальном времени)
    currentPeriod: SolarPeriod;
    isDaytime: boolean;
    isTwilight: boolean;

    // Epoch timestamps для JS Date
    sunriseTs: number | null;
    sunsetTs: number | null;
}

export interface UserLocation {
    latitude: number;
    longitude: number;
    timezone: string;
}

const DEFAULT_LOCATION: UserLocation = {
    latitude: 55.7558,   // Москва (дефолт)
    longitude: 37.6173,
    timezone: 'Europe/Moscow',
};

/**
 * Функционально вычислить текущий солнечный период по известным временам
 * (без запроса к API — для обновления каждую минуту)
 */
function computeCurrentPeriod(times: SolarTimes): {
    currentPeriod: SolarPeriod;
    isDaytime: boolean;
    isTwilight: boolean;
} {
    const now = Date.now() / 1000; // epoch seconds

    const parse = (s: string | null) => s ? new Date(s).getTime() / 1000 : null;

    const sunrise = times.sunriseTs;
    const sunset = times.sunsetTs;
    const civilDawn = parse(times.civilDawn);
    const civilDusk = parse(times.civilDusk);
    const nauticalDawn = parse(times.nauticalDawn);
    const nauticalDusk = parse(times.nauticalDusk);
    const astroDawn = parse(times.astronomicalDawn);
    const astroDusk = parse(times.astronomicalDusk);

    if (sunrise && sunset && now >= sunrise && now <= sunset) {
        return { currentPeriod: 'day', isDaytime: true, isTwilight: false };
    }
    if (civilDawn && sunrise && now >= civilDawn && now < sunrise) {
        return { currentPeriod: 'civil_twilight', isDaytime: false, isTwilight: true };
    }
    if (sunset && civilDusk && now > sunset && now <= civilDusk) {
        return { currentPeriod: 'civil_twilight', isDaytime: false, isTwilight: true };
    }
    if (nauticalDawn && civilDawn && now >= nauticalDawn && now < civilDawn) {
        return { currentPeriod: 'nautical_twilight', isDaytime: false, isTwilight: true };
    }
    if (civilDusk && nauticalDusk && now > civilDusk && now <= nauticalDusk) {
        return { currentPeriod: 'nautical_twilight', isDaytime: false, isTwilight: true };
    }
    if (astroDawn && nauticalDawn && now >= astroDawn && now < nauticalDawn) {
        return { currentPeriod: 'astronomical_twilight', isDaytime: false, isTwilight: false };
    }
    if (nauticalDusk && astroDusk && now > nauticalDusk && now <= astroDusk) {
        return { currentPeriod: 'astronomical_twilight', isDaytime: false, isTwilight: false };
    }
    return { currentPeriod: 'night', isDaytime: false, isTwilight: false };
}

/** Кеш: сохраняем данные на текущий день по location-ключу */
const solarCache = new Map<string, { data: SolarTimes; fetchedAt: number }>();

export interface UseSolarTimesOptions {
    location?: UserLocation;
    /** Автоматически определить координаты через браузерный geolocation */
    autoGeolocate?: boolean;
    /** Интервал обновления текущего периода в мс (default: 60_000 = 1 мин) */
    updateIntervalMs?: number;
}

export function useSolarTimes(options: UseSolarTimesOptions = {}) {
    const {
        location,
        autoGeolocate = true,
        updateIntervalMs = 60_000,
    } = options;

    const [solarTimes, setSolarTimes] = useState<SolarTimes | null>(null);
    const [userLocation, setUserLocation] = useState<UserLocation>(location || DEFAULT_LOCATION);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Получить геолокацию браузера  
    useEffect(() => {
        if (!autoGeolocate || location) return;

        // Попробуем из localStorage сначала
        const saved = localStorage.getItem('ag-user-location');
        if (saved) {
            try {
                const loc = JSON.parse(saved) as UserLocation;
                setUserLocation(loc);
                return;
            } catch {/* ignore */ }
        }

        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;

                // Определить timezone из браузера
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

                const loc: UserLocation = { latitude: lat, longitude: lon, timezone };
                setUserLocation(loc);
                localStorage.setItem('ag-user-location', JSON.stringify(loc));
            },
            () => {
                // Geolocation недоступна — используем дефолт (Москва)
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                setUserLocation({ ...DEFAULT_LOCATION, timezone });
            },
            { timeout: 5000, maximumAge: 3600_000 } // Кешируем геолокацию 1 час
        );
    }, [autoGeolocate, location]);

    // Загрузить данные о восходе/закате
    const fetchSolarTimes = useCallback(async (loc: UserLocation) => {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)},${today}`;

        // Проверяем кеш (данные действительны до конца текущего дня)
        const cached = solarCache.get(cacheKey);
        const now = Date.now();
        if (cached && now - cached.fetchedAt < 6 * 3600_000) {
            // Обновляем только текущий период (не делая запрос)
            const updated = { ...cached.data, ...computeCurrentPeriod(cached.data) };
            setSolarTimes(updated);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/ephemeris/solar-times`, {
                params: {
                    date: today,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    timezone: loc.timezone,
                },
                timeout: 8000,
            });

            const raw = response.data;

            const times: SolarTimes = {
                date: raw.date,
                latitude: raw.latitude,
                longitude: raw.longitude,
                timezone: raw.timezone,
                sunrise: raw.sunrise,
                sunset: raw.sunset,
                solarNoon: raw.solar_noon,
                civilDawn: raw.civil_dawn,
                civilDusk: raw.civil_dusk,
                nauticalDawn: raw.nautical_dawn,
                nauticalDusk: raw.nautical_dusk,
                astronomicalDawn: raw.astronomical_dawn,
                astronomicalDusk: raw.astronomical_dusk,
                dayLengthMinutes: raw.day_length_minutes,
                currentPeriod: raw.current_period,
                isDaytime: raw.is_daytime,
                isTwilight: raw.is_twilight,
                sunriseTs: raw.sunrise_ts,
                sunsetTs: raw.sunset_ts,
            };

            solarCache.set(cacheKey, { data: times, fetchedAt: now });
            setSolarTimes(times);
            setError(null);
        } catch (err) {
            // Fallback: простой расчёт без API (используем 7:00–19:00 как приближение)
            console.warn('Solar times API unavailable, using fallback', err);
            const fallback = createFallbackSolarTimes(loc);
            setSolarTimes(fallback);
            setError('Используются приблизительные данные (API недоступен)');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Обновить текущий период без запроса к API
    const refreshCurrentPeriod = useCallback(() => {
        setSolarTimes(prev => {
            if (!prev) return prev;
            return { ...prev, ...computeCurrentPeriod(prev) };
        });
    }, []);

    // Загружаем при изменении локации
    useEffect(() => {
        fetchSolarTimes(location || userLocation);
    }, [userLocation, location, fetchSolarTimes]);

    // Обновляем текущий период каждую минуту
    useEffect(() => {
        intervalRef.current = setInterval(refreshCurrentPeriod, updateIntervalMs);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [refreshCurrentPeriod, updateIntervalMs]);

    // Вернуть время следующей смены периода (в мс) для планирования перехода темы
    const getMsUntilNextTransition = useCallback((): number => {
        if (!solarTimes) return 3600_000;

        const now = Date.now() / 1000;
        const transitions = [
            solarTimes.astronomicalDawn ? new Date(solarTimes.astronomicalDawn).getTime() / 1000 : null,
            solarTimes.nauticalDawn ? new Date(solarTimes.nauticalDawn).getTime() / 1000 : null,
            solarTimes.civilDawn ? new Date(solarTimes.civilDawn).getTime() / 1000 : null,
            solarTimes.sunriseTs,
            solarTimes.sunsetTs,
            solarTimes.civilDusk ? new Date(solarTimes.civilDusk).getTime() / 1000 : null,
            solarTimes.nauticalDusk ? new Date(solarTimes.nauticalDusk).getTime() / 1000 : null,
            solarTimes.astronomicalDusk ? new Date(solarTimes.astronomicalDusk).getTime() / 1000 : null,
        ].filter((t): t is number => t !== null && t > now);

        if (transitions.length === 0) return 3600_000;
        return Math.min(...transitions) * 1000 - Date.now();
    }, [solarTimes]);

    return {
        solarTimes,
        userLocation,
        isLoading,
        error,
        getMsUntilNextTransition,
        refetch: () => fetchSolarTimes(location || userLocation),
    };
}

/**
 * Простой фолбэк когда API недоступен:
 * Оцениваем восход/закат по широте и времени года через формулу Ньюкома
 */
function createFallbackSolarTimes(loc: UserLocation): SolarTimes {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

    // Упрощённая формула NOAA для среднего восхода
    const lat = loc.latitude * Math.PI / 180;
    const declination = 23.45 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365);
    const hourAngleDeg = Math.acos(-Math.tan(lat) * Math.tan(declination)) * 180 / Math.PI;
    const solarNoonOffset = 12; // упрощение
    const sunriseHour = solarNoonOffset - hourAngleDeg / 15;
    const sunsetHour = solarNoonOffset + hourAngleDeg / 15;

    const toISO = (h: number) => {
        const d = new Date(now);
        d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
        return d.toISOString();
    };

    const sunriseTs = new Date(now).setHours(Math.floor(sunriseHour), Math.round((sunriseHour % 1) * 60), 0, 0) / 1000;
    const sunsetTs = new Date(now).setHours(Math.floor(sunsetHour), Math.round((sunsetHour % 1) * 60), 0, 0) / 1000;

    const times: SolarTimes = {
        date: now.toISOString().split('T')[0],
        latitude: loc.latitude,
        longitude: loc.longitude,
        timezone: loc.timezone,
        sunrise: toISO(sunriseHour),
        sunset: toISO(sunsetHour),
        solarNoon: toISO(solarNoonOffset),
        civilDawn: toISO(sunriseHour - 0.5),
        civilDusk: toISO(sunsetHour + 0.5),
        nauticalDawn: toISO(sunriseHour - 1),
        nauticalDusk: toISO(sunsetHour + 1),
        astronomicalDawn: toISO(sunriseHour - 1.5),
        astronomicalDusk: toISO(sunsetHour + 1.5),
        dayLengthMinutes: (sunsetHour - sunriseHour) * 60,
        currentPeriod: 'night',
        isDaytime: false,
        isTwilight: false,
        sunriseTs,
        sunsetTs,
    };

    return { ...times, ...computeCurrentPeriod(times) };
}
