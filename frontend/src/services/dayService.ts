import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Location {
    latitude: number;
    longitude: number;
}

export interface LunarDayData {
    number: number;
    symbol: string;
    energy: string;
    description: string;
    recommendations: {
        good: string[];
        avoid: string[];
    };
}

export interface MoonPhaseData {
    phase: string;
    illumination: number;
    age: number;
}

export interface VoidMoonData {
    isVoid: boolean;
    voidStart?: string;
    voidEnd?: string;
    nextAspect?: string;
}

export interface PlanetPosition {
    planet: string;
    sign: string;
    degree: number;
    minute: number;
    isRetrograde: boolean;
}

export interface CalendarDay {
    date: string;
    lunarDay: LunarDayData;
    moonPhase: MoonPhaseData;
    voidMoon: VoidMoonData;
    planets?: PlanetPosition[];
    aspects?: any[];
    planetaryHours?: any[];
    dayQuality?: {
        overall: string;
        score: number;
    };
}

export interface CalendarMonth {
    year: number;
    month: number;
    days: CalendarDay[];
}

class DayService {
    private baseURL: string;

    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    /**
     * Get calendar data for a specific day
     */
    async getDay(
        date: string,
        location: Location = { latitude: 55.7558, longitude: 37.6173 },
        timezone: string = 'Europe/Moscow'
    ): Promise<CalendarDay> {
        const response = await axios.get(`${this.baseURL}/api/calendar/day`, {
            params: {
                date,
                latitude: location.latitude,
                longitude: location.longitude,
                timezone,
            },
        });

        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.error?.message || 'Failed to fetch day data');
    }

    /**
     * Get calendar data for an entire month
     */
    async getMonth(
        year: number,
        month: number,
        location: Location = { latitude: 55.7558, longitude: 37.6173 },
        timezone: string = 'Europe/Moscow'
    ): Promise<CalendarMonth> {
        const response = await axios.get(`${this.baseURL}/api/calendar/month`, {
            params: {
                year,
                month,
                latitude: location.latitude,
                longitude: location.longitude,
                timezone,
            },
        });

        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.error?.message || 'Failed to fetch month data');
    }

    /**
     * Get planetary positions for a specific date/time
     */
    async getPlanets(
        date: string,
        location: Location = { latitude: 55.7558, longitude: 37.6173 },
        timezone: string = 'Europe/Moscow'
    ): Promise<PlanetPosition[]> {
        const response = await axios.get(`${this.baseURL}/api/ephemeris/planets`, {
            params: {
                date,
                latitude: location.latitude,
                longitude: location.longitude,
                timezone,
            },
        });

        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.error?.message || 'Failed to fetch planets');
    }

    /**
     * Get void of course moon data
     */
    async getVoidMoon(
        date: string,
        location: Location = { latitude: 55.7558, longitude: 37.6173 },
        timezone: string = 'Europe/Moscow'
    ): Promise<VoidMoonData> {
        const response = await axios.get(`${this.baseURL}/api/ephemeris/void-moon`, {
            params: {
                date,
                latitude: location.latitude,
                longitude: location.longitude,
                timezone,
            },
        });

        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.error?.message || 'Failed to fetch void moon data');
    }
}

// Export singleton instance
export const dayService = new DayService();
