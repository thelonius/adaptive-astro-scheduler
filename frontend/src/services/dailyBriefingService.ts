// src/services/dailyBriefingService.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface LunarDayTiming {
    starts_at: string;
    ends_at: string;
    is_current: boolean;
}

export interface DailyBriefingData {
    date: string;
    timestamp: string;
    lunar: {
        zodiac: {
            sign: string;
            sign_id: number;
            degree: number;
            absolute_degree: number;
        };
        mansion: {
            system: string;
            mansion_id: number;
            progress_percentage: number;
            degree_in_mansion: number;
            is_gandanta: boolean;
            error?: string;
        };
        lunar_day: number;
        lunar_day_timing: LunarDayTiming;
        phase: {
            name: string;
            illumination: number;
            emoji: string;
        };
    };
    solar: {
        sunrise: string | null;
        sunset: string | null;
        civil_dawn: string | null;
        civil_dusk: string | null;
        nautical_dawn: string | null;
        nautical_dusk: string | null;
        astronomical_dawn: string | null;
        astronomical_dusk: string | null;
    };
    planetary: {
        retrogrades: any[];
    };
    advisories: Array<{
        type: string;
        category: string;
        message: string;
    }>;
}

export const dailyBriefingService = {
    /**
     * Fetch the comprehensive daily briefing for a specific date and location.
     */
    async getDailyBriefing(
        dateStr?: string,
        lat = 55.7558,
        lon = 37.6173,
        tz = "Europe/Moscow"
    ): Promise<DailyBriefingData> {

        const params: any = { lat, lon, tz };
        if (dateStr) params.date = dateStr;

        try {
            const response = await axios.get<DailyBriefingData>(`${API_BASE_URL}/api/v1/daily-briefing`, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching Daily Briefing:', error);
            throw error;
        }
    }
};
