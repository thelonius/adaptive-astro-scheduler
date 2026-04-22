import { Request, Response } from 'express';
import { createEphemerisCalculator } from '../../core/ephemeris';
import { AspectStrengthCalculator } from '../../utils/aspect-strength';
import type { DateTime, AspectAnalysisResponse } from '@adaptive-astro/shared/types';

/**
 * Aspect Analysis Controller
 *
 * Handles HTTP requests for aspect analysis features:
 * - Aspect strength scoring
 * - Pattern detection (Phase 2)
 * - Timeline calculation (Phase 5)
 * - Enhanced interpretations (Phase 4)
 */
export class AspectAnalysisController {
  private ephemeris;

  constructor() {
    this.ephemeris = createEphemerisCalculator();
  }

  /**
   * GET /api/aspects/analyze
   *
   * Comprehensive aspect analysis for a given date/time
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   * - time: HH:mm:ss format (default: 12:00:00)
   * - latitude: number (default: 55.7558 - Moscow)
   * - longitude: number (default: 37.6173 - Moscow)
   * - timezone: IANA timezone (default: Europe/Moscow)
   * - orb: number (default: 8)
   * - topLimit: number (default: 5) - number of top aspects to return
   */
  async analyzeAspects(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        time = '12:00:00',
        latitude = '55.7558',
        longitude = '37.6173',
        timezone = 'Europe/Moscow',
        orb = '8',
        topLimit = '5',
      } = req.query;

      // Parse date and time
      const dateTimeStr = `${date}T${time}`;
      const dateObj = new Date(dateTimeStr);

      if (isNaN(dateObj.getTime())) {
        res.status(400).json({
          error: 'Invalid date/time',
          message: `Unable to parse date: ${date} and time: ${time}`,
        });
        return;
      }

      // Build DateTime object
      const dateTime: DateTime = {
        date: dateObj,
        timezone: timezone as string,
        location: {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        },
      };

      // Fetch aspects from ephemeris
      const aspectsData = await this.ephemeris.getAspects(
        dateTime,
        parseFloat(orb as string)
      );

      if (!aspectsData || !aspectsData.aspects) {
        res.status(500).json({
          error: 'Failed to fetch aspects',
          message: 'Ephemeris API returned no aspect data',
        });
        return;
      }

      // Score all aspects
      const scoredAspects = AspectStrengthCalculator.scoreAspects(aspectsData.aspects);

      // Get top aspects by strength
      const topAspects = scoredAspects.slice(0, parseInt(topLimit as string));

      // Build response
      const response: AspectAnalysisResponse = {
        date: aspectsData.date,
        aspects: scoredAspects,
        topAspects,
      };

      res.json(response);
    } catch (error) {
      console.error('Error analyzing aspects:', error);
      res.status(500).json({
        error: 'Failed to analyze aspects',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/aspects/score
   *
   * Score a specific aspect by its parameters
   *
   * Query params:
   * - planet1: string
   * - planet2: string
   * - type: AspectType
   * - orb: number
   * - isApplying: boolean (default: false)
   */
  async scoreAspect(req: Request, res: Response): Promise<void> {
    try {
      const { planet1, planet2, type, orb, isApplying = 'false' } = req.query;

      // Validate required params
      if (!planet1 || !planet2 || !type || !orb) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'Required: planet1, planet2, type, orb',
        });
        return;
      }

      // Create aspect object
      const aspect = {
        planet1: planet1 as string,
        planet2: planet2 as string,
        type: type as any,
        angle: 0, // Not needed for scoring
        orb: parseFloat(orb as string),
        isApplying: isApplying === 'true',
        interpretation: '',
      };

      // Calculate strength
      const scoredAspect = AspectStrengthCalculator.calculateStrength(aspect);

      res.json({
        ...scoredAspect,
        description: AspectStrengthCalculator.getStrengthDescription(scoredAspect.rank),
      });
    } catch (error) {
      console.error('Error scoring aspect:', error);
      res.status(500).json({
        error: 'Failed to score aspect',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/aspects/filter
   *
   * Filter aspects by strength criteria
   *
   * Query params:
   * - date, time, latitude, longitude, timezone, orb (same as analyze)
   * - minStrength: number (0-1, default: 0.6) - minimum strength threshold
   * - ranks: comma-separated ranks (e.g., "strong,very-strong")
   */
  async filterAspects(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        time = '12:00:00',
        latitude = '55.7558',
        longitude = '37.6173',
        timezone = 'Europe/Moscow',
        orb = '8',
        minStrength,
        ranks,
      } = req.query;

      // Parse date and time
      const dateTimeStr = `${date}T${time}`;
      const dateObj = new Date(dateTimeStr);

      const dateTime: DateTime = {
        date: dateObj,
        timezone: timezone as string,
        location: {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        },
      };

      // Fetch and score aspects
      const aspectsData = await this.ephemeris.getAspects(
        dateTime,
        parseFloat(orb as string)
      );
      const scoredAspects = AspectStrengthCalculator.scoreAspects(aspectsData.aspects);

      // Apply filters
      let filtered = scoredAspects;

      if (minStrength) {
        filtered = AspectStrengthCalculator.filterByMinStrength(
          filtered,
          parseFloat(minStrength as string)
        );
      }

      if (ranks) {
        const rankList = (ranks as string).split(',') as any[];
        filtered = AspectStrengthCalculator.filterByRank(filtered, rankList);
      }

      res.json({
        date: aspectsData.date,
        totalAspects: scoredAspects.length,
        filteredAspects: filtered.length,
        aspects: filtered,
      });
    } catch (error) {
      console.error('Error filtering aspects:', error);
      res.status(500).json({
        error: 'Failed to filter aspects',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
