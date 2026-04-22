import { Request, Response } from 'express';
import { createEphemerisCalculator } from '../../core/ephemeris';
import { PersonalizedAnalyticsService } from '../../services/personalized-analytics';
import { natalChartRepository } from '../../database/repositories/natal-chart.repository';

/**
 * Personalized Analytics Controller
 *
 * Handles HTTP requests for personalized daily analytics
 */
export class AnalyticsController {
  private analyticsService: PersonalizedAnalyticsService;

  constructor() {
    const ephemeris = createEphemerisCalculator();
    this.analyticsService = new PersonalizedAnalyticsService(ephemeris);
  }

  /**
   * GET /analytics/daily/:chartId
   *
   * Get personalized daily analytics for a natal chart
   *
   * Path params:
   * - chartId: UUID of the natal chart
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   * - latitude: number (optional, uses natal chart location if not provided)
   * - longitude: number (optional, uses natal chart location if not provided)
   */
  async getDailyAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { chartId } = req.params;
      const {
        date = new Date().toISOString().split('T')[0],
        latitude,
        longitude,
      } = req.query;

      // Get natal chart
      const natalChart = await natalChartRepository.findById(chartId);

      if (!natalChart) {
        res.status(404).json({
          error: 'Natal chart not found',
          message: `No natal chart found with ID: ${chartId}`,
        });
        return;
      }

      // Parse location if provided
      const location =
        latitude && longitude
          ? {
              latitude: parseFloat(latitude as string),
              longitude: parseFloat(longitude as string),
            }
          : undefined;

      // Generate analytics
      const analytics = await this.analyticsService.generateDayAnalytics(
        natalChart,
        new Date(date as string),
        location
      );

      res.json(analytics);
    } catch (error) {
      console.error('Error generating daily analytics:', error);
      res.status(500).json({
        error: 'Failed to generate daily analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /analytics/activities/:chartId
   *
   * Score specific activities for a natal chart and date
   *
   * Path params:
   * - chartId: UUID of the natal chart
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   *
   * Body:
   * - activities: string[] - List of activities to score
   */
  async scoreActivities(req: Request, res: Response): Promise<void> {
    try {
      const { chartId } = req.params;
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      const { activities } = req.body;

      if (!activities || !Array.isArray(activities)) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Body must contain an "activities" array',
        });
        return;
      }

      // Get natal chart
      const natalChart = await natalChartRepository.findById(chartId);

      if (!natalChart) {
        res.status(404).json({
          error: 'Natal chart not found',
          message: `No natal chart found with ID: ${chartId}`,
        });
        return;
      }

      // Score activities
      const scores = await this.analyticsService.scoreActivities(
        natalChart,
        activities,
        new Date(date as string)
      );

      res.json({ date, scores });
    } catch (error) {
      console.error('Error scoring activities:', error);
      res.status(500).json({
        error: 'Failed to score activities',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /analytics/transits/:chartId
   *
   * Get current transits for a natal chart
   *
   * Path params:
   * - chartId: UUID of the natal chart
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   * - latitude: number (optional)
   * - longitude: number (optional)
   */
  async getTransits(req: Request, res: Response): Promise<void> {
    try {
      const { chartId } = req.params;
      const {
        date = new Date().toISOString().split('T')[0],
        latitude,
        longitude,
      } = req.query;

      // Get natal chart
      const natalChart = await natalChartRepository.findById(chartId);

      if (!natalChart) {
        res.status(404).json({
          error: 'Natal chart not found',
          message: `No natal chart found with ID: ${chartId}`,
        });
        return;
      }

      // Parse location if provided
      const location =
        latitude && longitude
          ? {
              latitude: parseFloat(latitude as string),
              longitude: parseFloat(longitude as string),
            }
          : undefined;

      // Get analytics (which includes transit analysis)
      const analytics = await this.analyticsService.generateDayAnalytics(
        natalChart,
        new Date(date as string),
        location
      );

      res.json(analytics.personalTransits);
    } catch (error) {
      console.error('Error getting transits:', error);
      res.status(500).json({
        error: 'Failed to get transits',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /analytics/weekly/:chartId
   *
   * Get weekly analytics overview for a natal chart
   *
   * Path params:
   * - chartId: UUID of the natal chart
   *
   * Query params:
   * - startDate: ISO 8601 date string (default: today)
   */
  async getWeeklyAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { chartId } = req.params;
      const { startDate = new Date().toISOString().split('T')[0] } = req.query;

      // Get natal chart
      const natalChart = await natalChartRepository.findById(chartId);

      if (!natalChart) {
        res.status(404).json({
          error: 'Natal chart not found',
          message: `No natal chart found with ID: ${chartId}`,
        });
        return;
      }

      // Generate analytics for 7 days
      const weekAnalytics = [];
      const start = new Date(startDate as string);

      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);

        const dayAnalytics = await this.analyticsService.generateDayAnalytics(
          natalChart,
          date
        );

        weekAnalytics.push({
          date,
          overallScore: dayAnalytics.overallScore,
          summary: dayAnalytics.personalSummary,
          significantTransits: dayAnalytics.personalTransits.significantTransits.length,
          bestActivities: dayAnalytics.recommendations.bestActivities.slice(0, 3),
        });
      }

      res.json({
        chartId,
        startDate: start,
        days: weekAnalytics,
      });
    } catch (error) {
      console.error('Error generating weekly analytics:', error);
      res.status(500).json({
        error: 'Failed to generate weekly analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
