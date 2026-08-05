import { Request, Response } from 'express';
import { createEphemerisCalculator } from '../../core/ephemeris';
import type { DateTime } from '@adaptive-astro/shared/types';
import { interpretationService } from '../../services/astrology/interpretation.service';
import { zonedTimeToUtc } from 'date-fns-tz';
import {
  computeHouseRulers,
  type HouseCusp,
  type PlanetPosition,
  type RulershipSystem,
} from '../../services/house-rulers';
import { corpusRepository } from '../../database/repositories/corpus.repository';

/**
 * Ephemeris Controller
 *
 * Handles HTTP requests for ephemeris data
 */
export class EphemerisController {
  private ephemeris = createEphemerisCalculator();

  /**
   * GET /ephemeris/planets
   *
   * Get planetary positions for a specific date/time
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   * - time: HH:MM:SS time string (default: 12:00:00)
   * - latitude: number (default: 55.7558 - Moscow)
   * - longitude: number (default: 37.6173 - Moscow)
   * - timezone: string (default: 'Europe/Moscow')
   */
  async getPlanets(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        time = '12:00:00',
        latitude = '55.7558',
        longitude = '37.6173',
        timezone = 'Europe/Moscow',
        points = 'rahu,ketu,lilith,chiron',
      } = req.query;

      const dateTime: DateTime = {
        date: new Date(`${date}T${time}Z`), // time is UTC from frontend
        timezone: timezone as string,
        location: {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        },
      };

      const planets = await this.ephemeris.getPlanetsPositions(dateTime, points as string);
      res.json(planets);
    } catch (error) {
      console.error('Error fetching planetary positions:', error);
      res.status(500).json({
        error: 'Failed to fetch planetary positions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /ephemeris/aspects
   *
   * Get planetary aspects for a specific date/time
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   * - time: HH:MM:SS time string (default: 12:00:00)
   * - orb: number (default: 8)
   */
  async getAspects(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        time = '12:00:00',
        timezone = 'Europe/Moscow',
        orb,
        points = 'rahu,ketu,lilith,chiron',
      } = req.query;

      // Орбис не задан — работает таблица из aspects.json, у каждого аспекта
      // своя ширина. Заданный сужает её, но не расширяет.
      const orbCap = orb === undefined ? undefined : Number(orb);
      if (orbCap !== undefined && !Number.isFinite(orbCap)) {
        res.status(400).json({ error: 'Invalid orb', message: `orb must be a number, got "${orb}"` });
        return;
      }

      const dateTime: DateTime = {
        date: new Date(`${date}T${time}Z`), // time is UTC from frontend
        timezone: timezone as string,
        location: { latitude: 0, longitude: 0 }, // Not needed for aspects
      };

      const aspects = await this.ephemeris.getAspects(dateTime, orbCap, points as string);
      res.json(aspects);
    } catch (error) {
      console.error('Error fetching aspects:', error);
      res.status(500).json({
        error: 'Failed to fetch aspects',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /ephemeris/houses
   *
   * Get astrological houses for a specific date/time/location
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   * - time: HH:MM:SS time string (default: 12:00:00)
   * - latitude: number (required)
   * - longitude: number (required)
   * - system: string (default: 'placidus')
   */
  async getHouses(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        time = '12:00:00',
        latitude,
        longitude,
        system = 'placidus',
        timezone = 'Europe/Moscow',
      } = req.query;

      if (!latitude || !longitude) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'latitude and longitude are required for house calculations',
        });
        return;
      }

      const dateTime: DateTime = {
        date: new Date(`${date}T${time}Z`), // time is UTC from frontend
        timezone: timezone as string,
        location: {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        },
      };

      const houses = await this.ephemeris.getHouses(dateTime, system as string);
      res.json(houses);
    } catch (error) {
      console.error('Error fetching houses:', error);
      res.status(500).json({
        error: 'Failed to fetch houses',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /ephemeris/planetary-hours
   *
   * Get planetary hours for a specific date/location
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   * - latitude: number (default: 55.7558 - Moscow)
   * - longitude: number (default: 37.6173 - Moscow)
   * - timezone: string (default: 'Europe/Moscow')
   */
  async getPlanetaryHours(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        latitude = '55.7558',
        longitude = '37.6173',
        timezone = 'Europe/Moscow',
      } = req.query;

      const dateTime: DateTime = {
        date: zonedTimeToUtc(`${date}T12:00:00`, timezone as string),
        timezone: timezone as string,
        location: {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        },
      };

      const planetaryHours = await this.ephemeris.getPlanetaryHours(dateTime);
      res.json(planetaryHours);
    } catch (error) {
      console.error('Error fetching planetary hours:', error);
      res.status(500).json({
        error: 'Failed to fetch planetary hours',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /ephemeris/retrogrades
   *
   * Get retrograde planets for a specific date
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   */
  async getRetrogrades(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        timezone = 'Europe/Moscow',
      } = req.query;

      const dateTime: DateTime = {
        date: zonedTimeToUtc(`${date}T12:00:00`, timezone as string),
        timezone: timezone as string,
        location: { latitude: 0, longitude: 0 }, // Not needed for retrogrades
      };

      const retrogrades = await this.ephemeris.getRetrogradePlanets(dateTime);
      res.json(retrogrades);
    } catch (error) {
      console.error('Error fetching retrogrades:', error);
      res.status(500).json({
        error: 'Failed to fetch retrogrades',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /ephemeris/void-moon
   *
   * Get void of course moon data for a specific date
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   * - timezone: string (default: 'Europe/Moscow')
   */
  async getVoidMoon(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        timezone = 'Europe/Moscow',
      } = req.query;

      const dateTime: DateTime = {
        date: zonedTimeToUtc(`${date}T12:00:00`, timezone as string),
        timezone: timezone as string,
        location: { latitude: 0, longitude: 0 }, // Not needed for void moon
      };

      const voidMoon = await this.ephemeris.getVoidOfCourseMoon(dateTime);
      res.json({
        success: true,
        data: {
          isVoid: voidMoon.isVoidOfCourse,
          voidStart: voidMoon.voidPeriod?.startTime,
          voidEnd: voidMoon.voidPeriod?.endTime,
          currentSign: voidMoon.voidPeriod?.currentSign,
          nextSign: voidMoon.voidPeriod?.nextSign,
          duration: voidMoon.voidPeriod?.durationHours
        }
      });
    } catch (error) {
      console.error('Error fetching void moon:', error);
      res.status(500).json({
        error: 'Failed to fetch void moon data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /ephemeris/lunar-day
   *
   * Get lunar day data for a specific date
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   * - timezone: string (default: 'Europe/Moscow')
   */
  async getLunarDay(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        timezone = 'Europe/Moscow',
      } = req.query;

      const dateTime: DateTime = {
        date: zonedTimeToUtc(`${date}T12:00:00`, timezone as string),
        timezone: timezone as string,
        location: { latitude: 55.7558, longitude: 37.6173 }, // Default to Moscow
      };

      const lunarDayRaw = await this.ephemeris.getLunarDay(dateTime);
      const enriched = interpretationService.getLunarDay(lunarDayRaw.number, lunarDayRaw.lunarPhase);
      
      res.json({
        ...lunarDayRaw,
        ...enriched
      });
    } catch (error) {
      console.error('Error fetching lunar day:', error);
      res.status(500).json({
        error: 'Failed to fetch lunar day data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /ephemeris/moon-phase
   *
   * Get moon phase for a specific date
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   * - timezone: string (default: 'Europe/Moscow')
   */
  async getMoonPhase(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        timezone = 'Europe/Moscow',
      } = req.query;

      const dateTime: DateTime = {
        date: zonedTimeToUtc(`${date}T12:00:00`, timezone as string),
        timezone: timezone as string,
        location: { latitude: 55.7558, longitude: 37.6173 }, // Default to Moscow
      };

      const moonPhase = await this.ephemeris.getMoonPhase(dateTime);
      res.json({ moonPhase, date: dateTime.date });
    } catch (error) {
      console.error('Error fetching moon phase:', error);
      res.status(500).json({
        error: 'Failed to fetch moon phase',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /ephemeris/dispositors
   *
   * Get dispositor chains — who rules the ruler of each planet
   *
   * Query params:
   * - date: ISO 8601 date string (default: today)
   * - latitude: number (default: 55.7558)
   * - longitude: number (default: 37.6173)
   * - system: 'traditional' | 'modern' (default: 'traditional')
   */
  async getDispositorChains(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        latitude = '55.7558',
        longitude = '37.6173',
        timezone = 'Europe/Moscow',
        system = 'traditional',
      } = req.query;

      const dateTime: DateTime = {
        date: zonedTimeToUtc(`${date}T12:00:00`, timezone as string),
        timezone: timezone as string,
        location: {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        },
      };

      const chains = await this.ephemeris.getDispositorChains(dateTime, system as string);
      res.json(chains);
    } catch (error) {
      console.error('Error fetching dispositor chains:', error);
      res.status(500).json({
        error: 'Failed to fetch dispositor chains',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /ephemeris/house-rulers
   *
   * Управитель каждого дома и дом, в котором он стоит, вместе с
   * толкованиями из раздела RHH корпуса. Одним запросом, потому что
   * пар всегда двенадцать и разносить их по вызовам нет смысла.
   */
  async getHouseRulers(req: Request, res: Response): Promise<void> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        time = '12:00:00',
        latitude = '55.7558',
        longitude = '37.6173',
        timezone = 'Europe/Moscow',
        system = 'traditional',
        houseSystem = 'placidus',
        withTexts = 'true',
      } = req.query;

      const dateTime: DateTime = {
        date: new Date(`${date}T${time}Z`),
        timezone: timezone as string,
        location: {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        },
      };

      const [houses, planetsPayload] = await Promise.all([
        this.ephemeris.getHouses(dateTime, houseSystem as string),
        this.ephemeris.getPlanetsPositions(dateTime, 'rahu,ketu,lilith,chiron'),
      ]);

      // Адаптеры отдают то голый массив, то обёртку с полем: mock-adapter и
      // кэширующий слой расходятся в форме. Разворачиваем обе.
      const unwrap = <T,>(payload: unknown, field: string): T[] => {
        if (Array.isArray(payload)) return payload as T[];
        const inner = (payload as Record<string, unknown>)?.[field];
        return Array.isArray(inner) ? (inner as T[]) : [];
      };

      const planets = unwrap<PlanetPosition>(planetsPayload, 'planets');
      const cusps = unwrap<HouseCusp>(houses, 'houses');

      const placements = computeHouseRulers(
        cusps,
        planets,
        (system as RulershipSystem) === 'modern' ? 'modern' : 'traditional',
      );

      if (withTexts !== 'true' || placements.length === 0) {
        res.json({ system, placements });
        return;
      }

      const texts = await corpusRepository.findHouseRulers(
        placements.map((p) => ({ house: p.house, rulerHouse: p.rulerHouse })),
      );

      res.json({
        system,
        placements: placements.map((p) => ({
          ...p,
          interpretations: texts.get(`${p.house}|${p.rulerHouse}`) ?? [],
        })),
      });
    } catch (error) {
      console.error('Error fetching house rulers:', error);
      res.status(500).json({
        error: 'Failed to fetch house rulers',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}