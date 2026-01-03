import { Request, Response } from 'express';
import { CalendarGenerator } from '../../services/calendar-generator';
import { createEphemerisCalculator } from '../../core/ephemeris';
import type { DateTime } from '@adaptive-astro/shared/types';

/**
 * Calendar Controller
 *
 * Handles HTTP requests for calendar data
 */
export class CalendarController {
  private calendarGenerator: CalendarGenerator;

  constructor() {
    // Initialize with cached ephemeris calculator
    const ephemeris = createEphemerisCalculator();
    this.calendarGenerator = new CalendarGenerator(ephemeris);
  }

  /**
   * GET /calendar/day
   *
   * Get calendar data for a specific day
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   * - latitude: number (default: 55.7558 - Moscow)
   * - longitude: number (default: 37.6173 - Moscow)
   * - timezone: string (default: 'Europe/Moscow')
   */
  async getDay(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString(),
        latitude = '55.7558',
        longitude = '37.6173',
        timezone = 'Europe/Moscow',
      } = req.query;

      const dateTime: DateTime = {
        date: new Date(date as string),
        timezone: timezone as string,
        location: {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        },
      };

      const calendarDay = await this.calendarGenerator.generateDay(dateTime);

      res.json({
        success: true,
        data: calendarDay,
      });
    } catch (error) {
      console.error('Error generating calendar day:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate calendar day',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * GET /calendar/month
   *
   * Get calendar data for entire month
   *
   * Query params:
   * - year: number (default: current year)
   * - month: number 1-12 (default: current month)
   * - latitude: number (default: 55.7558 - Moscow)
   * - longitude: number (default: 37.6173 - Moscow)
   * - timezone: string (default: 'Europe/Moscow')
   */
  async getMonth(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const {
        year = now.getFullYear().toString(),
        month = (now.getMonth() + 1).toString(),
        latitude = '55.7558',
        longitude = '37.6173',
        timezone = 'Europe/Moscow',
      } = req.query;

      const location = {
        latitude: parseFloat(latitude as string),
        longitude: parseFloat(longitude as string),
      };

      const calendarMonth = await this.calendarGenerator.generateMonth(
        parseInt(year as string),
        parseInt(month as string),
        location,
        timezone as string
      );

      res.json({
        success: true,
        data: calendarMonth,
      });
    } catch (error) {
      console.error('Error generating calendar month:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate calendar month',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * POST /calendar/find-best-days
   *
   * Find best days for a specific activity
   *
   * Body:
   * - activity: string (required)
   * - startDate: ISO 8601 date (default: today)
   * - endDate: ISO 8601 date (default: 30 days from now)
   * - minStrength: number 0-1 (default: 0.5)
   * - latitude: number (default: 55.7558)
   * - longitude: number (default: 37.6173)
   * - timezone: string (default: 'Europe/Moscow')
   */
  async findBestDays(req: Request, res: Response): Promise<void> {
    try {
      const {
        activity,
        startDate = new Date().toISOString(),
        endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        minStrength = 0.5,
        latitude = 55.7558,
        longitude = 37.6173,
        timezone = 'Europe/Moscow',
      } = req.body;

      if (!activity) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Activity is required',
          },
        });
        return;
      }

      const location = {
        latitude: typeof latitude === 'number' ? latitude : parseFloat(latitude),
        longitude: typeof longitude === 'number' ? longitude : parseFloat(longitude),
      };

      const bestDays = await this.calendarGenerator.findBestDaysFor(
        activity,
        new Date(startDate),
        new Date(endDate),
        location,
        timezone,
        typeof minStrength === 'number' ? minStrength : parseFloat(minStrength)
      );

      res.json({
        success: true,
        data: {
          activity,
          totalFound: bestDays.length,
          days: bestDays,
        },
      });
    } catch (error) {
      console.error('Error finding best days:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to find best days',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
