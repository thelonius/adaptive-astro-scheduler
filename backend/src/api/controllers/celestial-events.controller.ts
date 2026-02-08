import { Request, Response } from 'express';
import { createEphemerisCalculator } from '../../core/ephemeris';
import { CelestialEventsDetector } from '../../services/celestial-events-detector';
import type { DateTime } from '@adaptive-astro/shared/types';

/**
 * Celestial Events Controller
 * 
 * Handles HTTP requests for celestial events data
 */
export class CelestialEventsController {
    private ephemeris = createEphemerisCalculator();
    private detector = new CelestialEventsDetector(this.ephemeris);

    /**
     * GET /celestial-events/upcoming
     * 
     * Get upcoming celestial events
     * 
     * Query params:
     * - days: number of days to look ahead (default: 90)
     * - limit: max number of events to return (default: 50)
     */
    async getUpcoming(req: Request, res: Response): Promise<void> {
        try {
            const {
                days = '90',
                limit = '50'
            } = req.query;

            const startDate: DateTime = {
                date: new Date(),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const endDate: DateTime = {
                date: new Date(Date.now() + parseInt(days as string) * 24 * 60 * 60 * 1000),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const events = await this.detector.getAllEvents(startDate, endDate);
            const limitedEvents = events.slice(0, parseInt(limit as string));

            res.json({
                count: limitedEvents.length,
                total: events.length,
                events: limitedEvents
            });
        } catch (error) {
            console.error('Error fetching upcoming celestial events:', error);
            res.status(500).json({
                error: 'Failed to fetch upcoming celestial events',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /celestial-events/past
     * 
     * Get past celestial events
     * 
     * Query params:
     * - days: number of days to look back (default: 30)
     * - limit: max number of events to return (default: 50)
     */
    async getPast(req: Request, res: Response): Promise<void> {
        try {
            const {
                days = '30',
                limit = '50'
            } = req.query;

            const endDate: DateTime = {
                date: new Date(),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const startDate: DateTime = {
                date: new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const events = await this.detector.getAllEvents(startDate, endDate);
            const limitedEvents = events.reverse().slice(0, parseInt(limit as string));

            res.json({
                count: limitedEvents.length,
                total: events.length,
                events: limitedEvents
            });
        } catch (error) {
            console.error('Error fetching past celestial events:', error);
            res.status(500).json({
                error: 'Failed to fetch past celestial events',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /celestial-events/range
     * 
     * Get celestial events in a date range
     * 
     * Query params:
     * - start: ISO 8601 date string (required)
     * - end: ISO 8601 date string (required)
     */
    async getRange(req: Request, res: Response): Promise<void> {
        try {
            const { start, end } = req.query;

            if (!start || !end) {
                res.status(400).json({
                    error: 'Missing required parameters',
                    message: 'start and end dates are required'
                });
                return;
            }

            const startDate: DateTime = {
                date: new Date(start as string),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const endDate: DateTime = {
                date: new Date(end as string),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const events = await this.detector.getAllEvents(startDate, endDate);

            res.json({
                count: events.length,
                start: startDate.date,
                end: endDate.date,
                events
            });
        } catch (error) {
            console.error('Error fetching celestial events in range:', error);
            res.status(500).json({
                error: 'Failed to fetch celestial events',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /celestial-events/type/:type
     * 
     * Get celestial events of a specific type
     * 
     * Path params:
     * - type: event type (lunar-phase, planetary-alignment, etc.)
     * 
     * Query params:
     * - days: number of days to look ahead (default: 90)
     * - limit: max number of events to return (default: 50)
     */
    async getByType(req: Request, res: Response): Promise<void> {
        try {
            const { type } = req.params;
            const {
                days = '90',
                limit = '50'
            } = req.query;

            const startDate: DateTime = {
                date: new Date(),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const endDate: DateTime = {
                date: new Date(Date.now() + parseInt(days as string) * 24 * 60 * 60 * 1000),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const allEvents = await this.detector.getAllEvents(startDate, endDate);
            const filteredEvents = allEvents.filter(e => e.type === type);
            const limitedEvents = filteredEvents.slice(0, parseInt(limit as string));

            res.json({
                type,
                count: limitedEvents.length,
                total: filteredEvents.length,
                events: limitedEvents
            });
        } catch (error) {
            console.error(`Error fetching celestial events of type ${req.params.type}:`, error);
            res.status(500).json({
                error: 'Failed to fetch celestial events',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
