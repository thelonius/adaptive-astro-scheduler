import { API_BASE_URL } from '../config';
import type { CelestialEvent } from '@adaptive-astro/shared/types';

/**
 * Celestial Events Service
 * 
 * API client for fetching celestial events data
 */
export class CelestialEventsService {
    private baseUrl = `${API_BASE_URL}/api/celestial-events`;

    /**
     * Get upcoming celestial events
     */
    async getUpcoming(days: number = 90, limit: number = 50): Promise<{
        count: number;
        total: number;
        events: CelestialEvent[];
    }> {
        const response = await fetch(
            `${this.baseUrl}/upcoming?days=${days}&limit=${limit}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch upcoming events');
        }

        return response.json();
    }

    /**
     * Get past celestial events
     */
    async getPast(days: number = 30, limit: number = 50): Promise<{
        count: number;
        total: number;
        events: CelestialEvent[];
    }> {
        const response = await fetch(
            `${this.baseUrl}/past?days=${days}&limit=${limit}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch past events');
        }

        return response.json();
    }

    /**
     * Get celestial events in a date range
     */
    async getRange(start: Date, end: Date): Promise<{
        count: number;
        start: string;
        end: string;
        events: CelestialEvent[];
    }> {
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const response = await fetch(
            `${this.baseUrl}/range?start=${startStr}&end=${endStr}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch events in range');
        }

        return response.json();
    }

    /**
     * Get celestial events of a specific type
     */
    async getByType(
        type: string,
        days: number = 90,
        limit: number = 50
    ): Promise<{
        type: string;
        count: number;
        total: number;
        events: CelestialEvent[];
    }> {
        const response = await fetch(
            `${this.baseUrl}/type/${type}?days=${days}&limit=${limit}`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch events of type ${type}`);
        }

        return response.json();
    }
}

// Singleton instance
export const celestialEventsService = new CelestialEventsService();
