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

      // For now, we'll use a default user or create anonymous charts
      // In production, this would use authenticated user from JWT token
      const defaultUserId = '00000000-0000-0000-0000-000000000000';

      let user = await this.userRepo.findById(defaultUserId);
      if (!user) {
        // Create a default user for web app charts
        user = await this.userRepo.create({
          id: defaultUserId,
          username: 'web_user',
          metadata: {
            source: 'web_app',
            created_via: 'chart_library'
          }
        });
      }

      // Convert date/time to proper format.
      // Store in UTC but treating input as local time (timezone stored in location).
      // We save the literal entered time by using ISO string without converting.
      const birthDateTime = new Date(`${chartData.date}T${chartData.time}:00`);

      // Calculate natal planets and houses
      const dateTime = {
        date: birthDateTime,
        timezone: chartData.location.timezone,
        location: {
          latitude: chartData.location.latitude,
          longitude: chartData.location.longitude,
        }
      };

      const [planetsData, housesData] = await Promise.all([
        this.ephemeris.getPlanetsPositions(dateTime),
        this.ephemeris.getHouses(dateTime, 'placidus'),
      ]);

      const natalChart = await this.natalRepo.create({
        user_id: user.id,
        name: chartData.name,
        birth_date: birthDateTime,
        birth_time: `${chartData.time}:00`,
        birth_location: chartData.location,
        house_system: 'placidus',
        chart_type: chartData.type,
        planets: planetsData.planets.map(p => ({
          name: p.name as any,
          longitude: p.longitude,
          latitude: p.latitude,
          zodiacSign: this.getZodiacSignFromName(p.zodiacSign),
          speed: p.speed,
          isRetrograde: p.isRetrograde,
          distanceAU: p.distanceAU,
        })),
        houses: housesData.houses.map(h => ({
          number: h.number as any,
          cusp: h.cusp,
          sign: this.getZodiacSignFromName(h.zodiacSign),
        })),
        description: chartData.description,
        tags: chartData.tags,
        created_at: new Date(),
        updated_at: new Date(),
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
      // For now, get charts for the default web user
      const defaultUserId = '00000000-0000-0000-0000-000000000000';

      const user = await this.userRepo.findById(defaultUserId);
      if (!user) {
        res.json([]);
        return;
      }

      const charts = await this.natalRepo.findFullChartsByUserId(user.id);

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
  /**
   * Helper to map zodiac sign name to object
   */
  private getZodiacSignFromName(signName: string): any {
    const zodiacSigns: Record<string, any> = {
      'Aries': { id: 1, name: 'Овен', element: 'Огонь', quality: 'Кардинальный', rulingPlanet: 'Mars', symbol: '♈', dateRange: [21, 19] },
      'Taurus': { id: 2, name: 'Телец', element: 'Земля', quality: 'Фиксированный', rulingPlanet: 'Venus', symbol: '♉', dateRange: [20, 20] },
      'Gemini': { id: 3, name: 'Близнецы', element: 'Воздух', quality: 'Мутабельный', rulingPlanet: 'Mercury', symbol: '♊', dateRange: [21, 20] },
      'Cancer': { id: 4, name: 'Рак', element: 'Вода', quality: 'Кардинальный', rulingPlanet: 'Moon', symbol: '♋', dateRange: [21, 22] },
      'Leo': { id: 5, name: 'Лев', element: 'Огонь', quality: 'Фиксированный', rulingPlanet: 'Sun', symbol: '♌', dateRange: [23, 22] },
      'Virgo': { id: 6, name: 'Дева', element: 'Земля', quality: 'Мутабельный', rulingPlanet: 'Mercury', symbol: '♍', dateRange: [23, 22] },
      'Libra': { id: 7, name: 'Весы', element: 'Воздух', quality: 'Кардинальный', rulingPlanet: 'Venus', symbol: '♎', dateRange: [23, 22] },
      'Scorpio': { id: 8, name: 'Скорпион', element: 'Вода', quality: 'Фиксированный', rulingPlanet: 'Mars', symbol: '♏', dateRange: [23, 21] },
      'Sagittarius': { id: 9, name: 'Стрелец', element: 'Огонь', quality: 'Мутабельный', rulingPlanet: 'Jupiter', symbol: '♐', dateRange: [22, 19] },
      'Capricorn': { id: 10, name: 'Козерог', element: 'Земля', quality: 'Кардинальный', rulingPlanet: 'Saturn', symbol: '♑', dateRange: [20, 18] },
      'Aquarius': { id: 11, name: 'Водолей', element: 'Воздух', quality: 'Фиксированный', rulingPlanet: 'Uranus', symbol: '♒', dateRange: [19, 18] },
      'Pisces': { id: 12, name: 'Рыбы', element: 'Вода', quality: 'Мутабельный', rulingPlanet: 'Neptune', symbol: '♓', dateRange: [19, 20] }
    };

    return zodiacSigns[signName] || { id: 1, name: 'Овен', element: 'Огонь', quality: 'Кардинальный', rulingPlanet: 'Mars', symbol: '♈', dateRange: [21, 19] };
  }
}