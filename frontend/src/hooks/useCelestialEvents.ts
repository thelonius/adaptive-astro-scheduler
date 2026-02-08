import { useState, useEffect } from 'react';
import { celestialEventsService } from '../services/celestialEventsService';
import type { CelestialEvent, CelestialEventType } from '@adaptive-astro/shared/types';

export interface EventFilters {
    types?: CelestialEventType[];
    planets?: string[];
    rarity?: ('common' | 'moderate' | 'rare' | 'very-rare')[];
}

export interface UseCelestialEventsResult {
    events: CelestialEvent[];
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

/**
 * Hook for fetching celestial events
 */
export function useCelestialEvents(
    startDate?: Date,
    endDate?: Date,
    filters?: EventFilters
): UseCelestialEventsResult {
    const [events, setEvents] = useState<CelestialEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            setError(null);

            let data;

            if (startDate && endDate) {
                // Fetch events in date range
                const response = await celestialEventsService.getRange(startDate, endDate);
                data = response.events;
            } else {
                // Fetch upcoming events by default
                const response = await celestialEventsService.getUpcoming(90, 100);
                data = response.events;
            }

            // Apply client-side filters
            let filteredEvents = data;

            if (filters?.types && filters.types.length > 0) {
                filteredEvents = filteredEvents.filter(e =>
                    filters.types!.includes(e.type)
                );
            }

            if (filters?.planets && filters.planets.length > 0) {
                filteredEvents = filteredEvents.filter(e =>
                    e.planets?.some(p => filters.planets!.includes(p))
                );
            }

            if (filters?.rarity && filters.rarity.length > 0) {
                filteredEvents = filteredEvents.filter(e =>
                    filters.rarity!.includes(e.rarity)
                );
            }

            setEvents(filteredEvents);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch events'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [startDate, endDate, filters]);

    return {
        events,
        loading,
        error,
        refetch: fetchEvents
    };
}

/**
 * Hook for fetching upcoming events
 */
export function useUpcomingEvents(days: number = 90): UseCelestialEventsResult {
    const [events, setEvents] = useState<CelestialEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await celestialEventsService.getUpcoming(days, 100);
            setEvents(response.events);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch upcoming events'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [days]);

    return {
        events,
        loading,
        error,
        refetch: fetchEvents
    };
}
