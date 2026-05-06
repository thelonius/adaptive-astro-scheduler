import { Request, Response } from 'express';
import { NatalChartRepository } from '../../database/repositories/natal-chart.repository';
import { UserRepository } from '../../database/repositories/user.repository';
import { IEphemerisCalculator } from '../../core/ephemeris';
import { createEphemerisCalculator } from '../../core/ephemeris';

export interface ChartCreateRequest {
  name: string;
  type: 'natal' | 'event' | 'question';
  date: string; // ISO date string
  time: string; // HH:MM format
  location: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    timezone: string;
  };
  description?: string;
  tags?: string[];
}

export class ChartController {
  private natalRepo: NatalChartRepository;
  private userRepo: UserRepository;
  private ephemeris: IEphemerisCalculator;

  constructor(
    natalRepo: NatalChartRepository,
    userRepo: UserRepository,
    ephemeris?: IEphemerisCalculator
  ) {
    this.natalRepo = natalRepo;
    this.userRepo = userRepo;
    this.ephemeris = ephemeris || createEphemerisCalculator();
  }

  /**
   * Create a new chart
   */
  async createChart(req: Request, res: Response) {
    try {
      const chartData = req.body as ChartCreateRequest;

      // Normalize time to HH:MM:SS for ephemeris and storage
      const timeWithSeconds = chartData.time.length === 5
        ? `${chartData.time}:00`
        : chartData.time;

      const birthDateTime = new Date(`${chartData.date}T${timeWithSeconds}`);

      // Compute planets/houses/aspects so the chart is usable without re-calculation.
      // Lunar metadata is best-effort — older birth dates can fall outside ephemeris.
      const ephemerisInput = {
        date: birthDateTime,
        timezone: chartData.location.timezone,
        location: {
          latitude: chartData.location.latitude,
          longitude: chartData.location.longitude,
        },
      };

      const [planetsRes, housesRes, aspectsRes] = await Promise.all([
        this.ephemeris.getPlanetsPositions(ephemerisInput),
        this.ephemeris.getHouses(ephemerisInput, 'placidus'),
        this.ephemeris.getAspects(ephemerisInput, 8),
      ]);

      let lunarDay = null;
      let moonPhase: string | null = null;
      try {
        lunarDay = await this.ephemeris.getLunarDay(ephemerisInput);
      } catch (e) {
        console.warn('getLunarDay failed for chart', chartData.name, e);
      }
      try {
        const phase = await this.ephemeris.getMoonPhase(ephemerisInput);
        moonPhase = typeof phase === 'string' ? phase : String(phase);
      } catch (e) {
        console.warn('getMoonPhase failed for chart', chartData.name, e);
      }

      const natalChart = await this.natalRepo.create({
        // Guest namespace — same as /api/natal-chart/save uses (user_id IS NULL).
        // Auth-bound user_id will be added when accounts ship.
        user_id: null,
        name: chartData.name,
        birth_date: birthDateTime,
        birth_time: timeWithSeconds,
        birth_location: chartData.location,
        house_system: 'placidus',
        chart_type: chartData.type,
        description: chartData.description,
        tags: chartData.tags,
        // ephemeris API types diverge slightly from domain types; persist
        // the API payloads as JSONB and let consumers parse on read.
        planets: planetsRes.planets as any,
        houses: housesRes.houses as any,
        aspects: aspectsRes.aspects as any,
        lunar_day: lunarDay,
        moon_phase: moonPhase,
      });

      // Format response to match frontend interface
      const response = {
        id: natalChart.id,
        name: natalChart.name,
        type: natalChart.chart_type,
        date: chartData.date,
        time: chartData.time,
        location: natalChart.birth_location,
        description: natalChart.description,
        tags: natalChart.tags,
        createdAt: natalChart.created_at.toISOString(),
        updatedAt: natalChart.updated_at.toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating chart:', error);
      res.status(500).json({
        error: 'Failed to create chart',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all charts for the current user
   */
  async getCharts(req: Request, res: Response) {
    try {
      // Until accounts/JWT ship, every chart lives in the guest namespace
      // (user_id IS NULL). This is the same set surfaced by
      // /api/natal-chart/list/guest, so both UIs see the same library.
      const charts = await this.natalRepo.findFullGuestCharts(500);

      const response = charts.map(chart => {
        // Handle Postgres DATE (no time part)
        const birthDate = new Date(chart.birth_date);
        const date = birthDate.getFullYear() + '-' + 
                    String(birthDate.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(birthDate.getDate()).padStart(2, '0');
        
        // Use birth_time column instead of extracting from birth_date
        const time = chart.birth_time ? chart.birth_time.substring(0, 5) : '00:00';

        return {
          id: chart.id,
          name: chart.name,
          type: chart.chart_type || 'natal',
          date,
          time,
          location: chart.birth_location,
          description: chart.description,
          tags: chart.tags,
          createdAt: chart.created_at.toISOString(),
          updatedAt: chart.updated_at.toISOString(),
        };
      });

      res.json(response);
    } catch (error) {
      console.error('Error getting charts:', error);
      res.status(500).json({
        error: 'Failed to get charts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a specific chart by ID
   */
  async getChart(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const chart = await this.natalRepo.findById(id);

      if (!chart) {
        res.status(404).json({ error: 'Chart not found' });
        return;
      }

      // Handle Postgres DATE
      const birthDate = new Date(chart.birth_date);
      const date = birthDate.getFullYear() + '-' + 
                  String(birthDate.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(birthDate.getDate()).padStart(2, '0');
      
      const time = chart.birth_time ? chart.birth_time.substring(0, 5) : '00:00';

      const response = {
        id: chart.id,
        name: chart.name,
        type: chart.chart_type || 'natal',
        date,
        time,
        location: chart.birth_location,
        description: chart.description,
        tags: chart.tags,
        createdAt: chart.created_at.toISOString(),
        updatedAt: chart.updated_at.toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting chart:', error);
      res.status(500).json({
        error: 'Failed to get chart',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update a chart
   */
  async updateChart(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existingChart = await this.natalRepo.findById(id);
      if (!existingChart) {
        res.status(404).json({ error: 'Chart not found' });
        return;
      }

      // Update birth_date if date/time provided
      let birthDate = existingChart.birth_date;
      if (updates.date || updates.time) {
        const dateStr = updates.date || existingChart.birth_date.toISOString().split('T')[0];
        const timeStr = updates.time || existingChart.birth_time.substring(0, 5);
        birthDate = new Date(`${dateStr}T${timeStr}:00`);
      }

      const updateData: any = {
        updated_at: new Date(),
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.type) updateData.chart_type = updates.type;
      if (updates.location) updateData.birth_location = updates.location;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.date || updates.time) {
        updateData.birth_date = birthDate;
        const finalTime = updates.time || existingChart.birth_date.toISOString().split('T')[1].substring(0, 5);
        updateData.birth_time = `${finalTime}:00`;
      }

      const updatedChart = await this.natalRepo.update(id, updateData);

      if (!updatedChart) {
        res.status(404).json({ error: 'Chart not found' });
        return;
      }

      // Format response
      // Format response
      const updatedBirthDate = new Date(updatedChart.birth_date);
      const date = updatedBirthDate.getFullYear() + '-' + 
                  String(updatedBirthDate.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(updatedBirthDate.getDate()).padStart(2, '0');
      
      const time = updatedChart.birth_time ? updatedChart.birth_time.substring(0, 5) : '00:00';

      const response = {
        id: updatedChart.id,
        name: updatedChart.name,
        type: updatedChart.chart_type || 'natal',
        date,
        time,
        location: updatedChart.birth_location,
        description: updatedChart.description,
        tags: updatedChart.tags,
        createdAt: updatedChart.created_at.toISOString(),
        updatedAt: updatedChart.updated_at.toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating chart:', error);
      res.status(500).json({
        error: 'Failed to update chart',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a chart
   */
  async deleteChart(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const chart = await this.natalRepo.findById(id);
      if (!chart) {
        res.status(404).json({ error: 'Chart not found' });
        return;
      }

      await this.natalRepo.delete(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting chart:', error);
      res.status(500).json({
        error: 'Failed to delete chart',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}