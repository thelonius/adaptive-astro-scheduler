import { Request, Response } from 'express';
import { createEphemerisCalculator } from '../../core/ephemeris';
import type { DateTime } from '@adaptive-astro/shared/types';

/**
 * Natal Chart Controller
 *
 * Handles HTTP requests for natal chart calculations
 */
export class NatalChartController {
  private ephemeris = createEphemerisCalculator();

  /**
   * POST /natal-chart/calculate
   *
   * Calculate natal chart for given birth data
   *
   * Body params:
   * - birthDate: ISO 8601 date string (YYYY-MM-DD)
   * - birthTime: HH:MM:SS time string
   * - latitude: number
   * - longitude: number
   * - timezone: string
   * - includeNodes: boolean (optional, default: false)
   * - includeLilith: boolean (optional, default: false)
   */
  async calculateNatalChart(req: Request, res: Response): Promise<void> {
    try {
      const {
        birthDate,
        birthTime,
        latitude,
        longitude,
        timezone,
        includeNodes = false,
        includeLilith = false,
      } = req.body;

      // Validate required fields
      if (!birthDate || !birthTime || !latitude || !longitude || !timezone) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'birthDate, birthTime, latitude, longitude, and timezone are required',
        });
        return;
      }

      // Create DateTime object for birth moment
      const birthDateTime: DateTime = {
        date: new Date(`${birthDate}T${birthTime}`),
        timezone: timezone as string,
        location: {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        },
      };

      // Fetch all necessary data in parallel
      const [planets, houses, aspects, lunarDay, moonPhase] = await Promise.all([
        this.ephemeris.getPlanetsPositions(birthDateTime),
        this.ephemeris.getHouses(birthDateTime, 'placidus'),
        this.ephemeris.getAspects(birthDateTime, 8),
        this.ephemeris.getLunarDay(birthDateTime),
        this.ephemeris.getMoonPhase(birthDateTime),
      ]);

      // Build natal chart response
      const natalChart = {
        birthData: {
          date: birthDate,
          time: birthTime,
          location: {
            latitude: parseFloat(latitude as string),
            longitude: parseFloat(longitude as string),
            timezone,
          },
        },
        planets: planets.planets,
        houses: houses.houses,
        aspects: aspects.aspects,
        lunarDay,
        moonPhase,
        calculatedAt: new Date().toISOString(),
      };

      // Add optional points if requested
      if (includeNodes) {
        // Lunar nodes calculation would go here
        // For now, we'll add a placeholder
        (natalChart as any).lunarNodes = {
          northNode: null,
          southNode: null,
          note: 'Lunar nodes calculation not yet implemented',
        };
      }

      if (includeLilith) {
        // Black Moon Lilith calculation would go here
        (natalChart as any).blackMoon = {
          note: 'Black Moon Lilith calculation not yet implemented',
        };
      }

      res.json(natalChart);
    } catch (error) {
      console.error('Error calculating natal chart:', error);
      res.status(500).json({
        error: 'Failed to calculate natal chart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /natal-chart/quick
   *
   * Quick natal chart calculation using query params (for testing)
   *
   * Query params:
   * - birthDate: YYYY-MM-DD
   * - birthTime: HH:MM:SS
   * - latitude: number
   * - longitude: number
   * - timezone: string
   */
  async quickCalculate(req: Request, res: Response): Promise<void> {
    try {
      const {
        birthDate,
        birthTime,
        latitude,
        longitude,
        timezone,
      } = req.query;

      if (!birthDate || !birthTime || !latitude || !longitude || !timezone) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'birthDate, birthTime, latitude, longitude, and timezone are required',
        });
        return;
      }

      // Convert query params to body format and reuse main method
      req.body = {
        birthDate,
        birthTime,
        latitude,
        longitude,
        timezone,
      };

      await this.calculateNatalChart(req, res);
    } catch (error) {
      console.error('Error in quick calculate:', error);
      res.status(500).json({
        error: 'Failed to calculate natal chart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
