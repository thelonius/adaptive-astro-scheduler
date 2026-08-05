import { Request, Response } from 'express';
import { zonedTimeToUtc } from 'date-fns-tz';
import { createEphemerisCalculator } from '../../core/ephemeris';
import { natalChartRepository } from '../../database/repositories';
import type { DateTime } from '@adaptive-astro/shared/types';
import type { CreateNatalChartInput } from '../../database/models';

/**
 * Natal Chart Controller
 *
 * Handles HTTP requests for natal chart calculations and persistence
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
   * - points: string (optional, default: 'rahu,ketu,lilith,chiron'; '' to disable)
   */
  async calculateNatalChart(req: Request, res: Response): Promise<void> {
    try {
      const {
        birthDate,
        birthTime,
        latitude,
        longitude,
        timezone,
        points,
      } = req.body;

      // Validate required fields
      if (!birthDate || !birthTime || !latitude || !longitude || !timezone) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'birthDate, birthTime, latitude, longitude, and timezone are required',
        });
        return;
      }

      // Convert local birth time to UTC using the provided timezone
      const birthDateTime: DateTime = {
        date: zonedTimeToUtc(`${birthDate}T${birthTime}`, timezone as string),
        timezone: timezone as string,
        location: {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        },
      };

      // Дополнительные точки карты: узлы, Чёрная Луна, Хирон. По умолчанию
      // включаем все три; вызывающий может переопределить или отключить (points: '').
      const chartPoints =
        typeof points === 'string' ? points : 'rahu,ketu,lilith,chiron';

      // Fetch all necessary data in parallel
      const [planets, houses, aspects, lunarDay, moonPhase] = await Promise.all([
        this.ephemeris.getPlanetsPositions(birthDateTime, chartPoints),
        this.ephemeris.getHouses(birthDateTime, 'placidus'),
        this.ephemeris.getAspects(birthDateTime, undefined, chartPoints),
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

  /**
   * POST /natal-chart/save
   *
   * Save a calculated natal chart to database
   *
   * Body params:
   * - name: string (optional)
   * - birthDate: YYYY-MM-DD
   * - birthTime: HH:MM:SS
   * - latitude, longitude, timezone
   * - placeName: string (optional)
   * - planets, houses, aspects (from calculation)
   */
  async saveNatalChart(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        birthDate,
        birthTime,
        latitude,
        longitude,
        timezone,
        placeName,
        planets,
        houses,
        aspects,
        lunarDay,
        moonPhase,
      } = req.body;

      // Validate required fields
      if (!birthDate || !birthTime || !latitude || !longitude || !timezone) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'birthDate, birthTime, latitude, longitude, and timezone are required',
        });
        return;
      }

      if (!planets || !houses || !aspects) {
        res.status(400).json({
          error: 'Missing calculated data',
          message: 'planets, houses, and aspects are required. Please calculate the chart first.',
        });
        return;
      }

      // Create natal chart in database
      const chartData: CreateNatalChartInput = {
        user_id: null, // For now, all charts are guest charts
        name: name || 'My Chart',
        birth_date: birthDate,
        birth_time: birthTime,
        birth_location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          timezone,
          placeName,
        },
        planets,
        houses,
        aspects,
        lunar_day: lunarDay || null,
        moon_phase: moonPhase || null,
      };

      const savedChart = await natalChartRepository.create(chartData);

      res.status(201).json({
        success: true,
        data: savedChart,
      });
    } catch (error) {
      console.error('Error saving natal chart:', error);
      res.status(500).json({
        error: 'Failed to save natal chart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /natal-chart/:id
   *
   * Load a natal chart by ID
   */
  async getNatalChart(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const chart = await natalChartRepository.findById(id);

      if (!chart) {
        res.status(404).json({
          error: 'Natal chart not found',
          message: `No natal chart found with ID: ${id}`,
        });
        return;
      }

      res.json({
        success: true,
        data: chart,
      });
    } catch (error) {
      console.error('Error loading natal chart:', error);
      res.status(500).json({
        error: 'Failed to load natal chart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /natal-chart/list/guest
   *
   * List all guest natal charts
   */
  async listGuestCharts(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const charts = await natalChartRepository.findGuestCharts(limit);

      res.json({
        success: true,
        data: charts,
        count: charts.length,
      });
    } catch (error) {
      console.error('Error listing guest charts:', error);
      res.status(500).json({
        error: 'Failed to list natal charts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /natal-chart/:id
   *
   * Update a natal chart
   */
  async updateNatalChart(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const chart = await natalChartRepository.update(id, updateData);

      if (!chart) {
        res.status(404).json({
          error: 'Natal chart not found',
          message: `No natal chart found with ID: ${id}`,
        });
        return;
      }

      res.json({
        success: true,
        data: chart,
      });
    } catch (error) {
      console.error('Error updating natal chart:', error);
      res.status(500).json({
        error: 'Failed to update natal chart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /natal-chart/:id
   *
   * Delete a natal chart
   */
  async deleteNatalChart(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await natalChartRepository.delete(id);

      if (!deleted) {
        res.status(404).json({
          error: 'Natal chart not found',
          message: `No natal chart found with ID: ${id}`,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Natal chart deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting natal chart:', error);
      res.status(500).json({
        error: 'Failed to delete natal chart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
