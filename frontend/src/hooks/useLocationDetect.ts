/**
 * useLocationDetect — хук для автоматического определения геолокации
 *
 * Использует browser Geolocation API + Nominatim для обратного геокодирования.
 * Сохраняет результат в locationStore (globально + persist).
 */

import { useCallback } from 'react';
import axios from 'axios';
import { useLocationStore, UserLocation } from '../store/locationStore';

// Простая оценка timezone по долготе (fallback)
function estimateTimezone(lat: number, lon: number): string {
    const offset = Math.round(lon / 15);
    const sign = offset >= 0 ? '+' : '';
    return `Etc/GMT${offset === 0 ? '' : `${sign}${offset}`}`;
}

// Обратное геокодирование через Nominatim (OpenStreetMap, бесплатно)
async function reverseGeocode(lat: number, lon: number): Promise<Partial<UserLocation>> {
    try {
        const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse`,
            {
                params: { format: 'json', lat, lon, 'accept-language': 'en' },
                timeout: 5000,
                headers: { 'User-Agent': 'adaptive-astro-scheduler/1.0' },
            }
        );

        const addr = response.data.address || {};
        const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.county ||
            'Unknown';
        const country = addr.country || 'Unknown';
        const countryCode = (addr.country_code || '').toUpperCase();

        return { city, country, countryCode };
    } catch {
        return { city: 'Unknown', country: 'Unknown', countryCode: '' };
    }
}

// Поиск города через Nominatim
export async function searchCity(query: string): Promise<UserLocation[]> {
    if (!query.trim() || query.length < 2) return [];

    try {
        const response = await axios.get(
            `https://nominatim.openstreetmap.org/search`,
            {
                params: {
                    format: 'json',
                    q: query,
                    limit: 6,
                    addressdetails: 1,
                    'accept-language': 'en',
                    featuretype: 'city',
                },
                timeout: 5000,
                headers: { 'User-Agent': 'adaptive-astro-scheduler/1.0' },
            }
        );

        return response.data
            .filter((item: any) => {
                const addr = item.address || {};
                return addr.city || addr.town || addr.village || addr.municipality;
            })
            .map((item: any) => {
                const addr = item.address || {};
                const lat = parseFloat(item.lat);
                const lon = parseFloat(item.lon);
                const city =
                    addr.city ||
                    addr.town ||
                    addr.village ||
                    addr.municipality ||
                    item.display_name.split(',')[0];
                const country = addr.country || '';
                const countryCode = (addr.country_code || '').toUpperCase();
                const timezone = estimateTimezone(lat, lon);

                return { latitude: lat, longitude: lon, timezone, city, country, countryCode };
            });
    } catch {
        return [];
    }
}

export function useLocationDetect() {
    const { setLocation, setDetecting, setDetectionError } = useLocationStore();

    const detectLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setDetectionError('Geolocation is not supported by your browser');
            return;
        }

        setDetecting(true);

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;

                // Браузерная timezone
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

                // Обратное геокодирование
                const geo = await reverseGeocode(lat, lon);

                setLocation({
                    latitude: lat,
                    longitude: lon,
                    timezone,
                    city: geo.city,
                    country: geo.country,
                    countryCode: geo.countryCode,
                });

                setDetecting(false);
            },
            (err) => {
                const messages: Record<number, string> = {
                    1: 'Location access denied. Please allow it in browser settings.',
                    2: 'Location unavailable. Check your network.',
                    3: 'Location request timed out.',
                };
                setDetectionError(messages[err.code] || 'Failed to detect location');
            },
            { timeout: 10_000, maximumAge: 3_600_000 } // cache 1h
        );
    }, [setLocation, setDetecting, setDetectionError]);

    return { detectLocation };
}
