import { Request, Response } from 'express';
import { zonedTimeToUtc } from 'date-fns-tz';
import { postChartApi, ChartApiChartRequest } from '../../core/chart-api/client';

interface BirthChartInput {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezone: string;
  houseSystem?: string;
}

function toChartApiRequest(input: BirthChartInput): ChartApiChartRequest {
  const time = input.birthTime.length === 5 ? `${input.birthTime}:00` : input.birthTime;
  const utcDate = zonedTimeToUtc(`${input.birthDate}T${time}`, input.timezone);

  return {
    datetime_utc: utcDate.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    latitude: input.latitude,
    longitude: input.longitude,
    house_system: input.houseSystem || 'placidus',
  };
}

function validateBirthInput(body: Record<string, unknown>, label: string): BirthChartInput | null {
  const { birthDate, birthTime, latitude, longitude, timezone } = body;
  if (
    !birthDate || !birthTime ||
    latitude === undefined || longitude === undefined || !timezone
  ) {
    return null;
  }
  return {
    birthDate: String(birthDate),
    birthTime: String(birthTime),
    latitude: parseFloat(String(latitude)),
    longitude: parseFloat(String(longitude)),
    timezone: String(timezone),
    houseSystem: body.houseSystem ? String(body.houseSystem) : undefined,
  };
}

export class ChartAnalysisController {
  async synastry(req: Request, res: Response): Promise<void> {
    try {
      const chartA = validateBirthInput(req.body.chartA ?? req.body.chart_a, 'chartA');
      const chartB = validateBirthInput(req.body.chartB ?? req.body.chart_b, 'chartB');

      if (!chartA || !chartB) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'chartA and chartB each need birthDate, birthTime, latitude, longitude, timezone',
        });
        return;
      }

      const aspectCategories = req.body.aspectCategories ?? req.body.aspect_categories ?? 'major';

      const result = await postChartApi('/synastry', {
        chart_a: toChartApiRequest(chartA),
        chart_b: toChartApiRequest(chartB),
        aspect_categories: aspectCategories,
      });

      res.json(result);
    } catch (error) {
      console.error('Synastry error:', error);
      res.status(500).json({
        error: 'Failed to calculate synastry',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async progressions(req: Request, res: Response): Promise<void> {
    try {
      const natal = validateBirthInput(req.body.natal ?? req.body, 'natal');
      if (!natal) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'natal needs birthDate, birthTime, latitude, longitude, timezone',
        });
        return;
      }

      const targetDate = req.body.targetDate ?? req.body.target_date;
      const targetTime = req.body.targetTime ?? req.body.target_time ?? '12:00:00';
      const targetTimezone = req.body.targetTimezone ?? req.body.target_timezone ?? natal.timezone;

      if (!targetDate) {
        res.status(400).json({
          error: 'Missing targetDate',
          message: 'targetDate is required for progressions',
        });
        return;
      }

      const time = String(targetTime).length === 5 ? `${targetTime}:00` : String(targetTime);
      const targetUtc = zonedTimeToUtc(`${targetDate}T${time}`, String(targetTimezone));

      const result = await postChartApi('/progressions', {
        natal: toChartApiRequest(natal),
        target_datetime_utc: targetUtc.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      });

      res.json(result);
    } catch (error) {
      console.error('Progressions error:', error);
      res.status(500).json({
        error: 'Failed to calculate progressions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async draconic(req: Request, res: Response): Promise<void> {
    try {
      const natal = validateBirthInput(req.body.natal ?? req.body, 'natal');
      if (!natal) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'natal needs birthDate, birthTime, latitude, longitude, timezone',
        });
        return;
      }

      const result = await postChartApi('/draconic', toChartApiRequest(natal));
      res.json(result);
    } catch (error) {
      console.error('Draconic error:', error);
      res.status(500).json({
        error: 'Failed to calculate draconic chart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async humanDesign(req: Request, res: Response): Promise<void> {
    try {
      const natal = validateBirthInput(req.body.natal ?? req.body, 'natal');
      if (!natal) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'natal needs birthDate, birthTime, latitude, longitude, timezone',
        });
        return;
      }

      const result = await postChartApi('/human-design', toChartApiRequest(natal));
      res.json(result);
    } catch (error) {
      console.error('Human Design error:', error);
      res.status(500).json({
        error: 'Failed to calculate Human Design bodygraph',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async vimshottariDasha(req: Request, res: Response): Promise<void> {
    try {
      const natal = validateBirthInput(req.body.natal ?? req.body, 'natal');
      if (!natal) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'natal needs birthDate, birthTime, latitude, longitude, timezone',
        });
        return;
      }

      const payload: Record<string, unknown> = { natal: toChartApiRequest(natal) };
      const queryDate = req.body.queryDate ?? req.body.query_date;
      const queryTime = req.body.queryTime ?? req.body.query_time ?? '12:00:00';
      const queryTimezone = req.body.queryTimezone ?? req.body.query_timezone ?? natal.timezone;

      if (queryDate) {
        const time = String(queryTime).length === 5 ? `${queryTime}:00` : String(queryTime);
        const utcDate = zonedTimeToUtc(`${queryDate}T${time}`, String(queryTimezone));
        payload.query_datetime_utc = utcDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
      }

      const result = await postChartApi('/vimshottari-dasha', payload);
      res.json(result);
    } catch (error) {
      console.error('Vimshottari dasha error:', error);
      res.status(500).json({
        error: 'Failed to calculate Vimshottari dasha',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async navamsa(req: Request, res: Response): Promise<void> {
    try {
      const natal = validateBirthInput(req.body.natal ?? req.body, 'natal');
      if (!natal) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'natal needs birthDate, birthTime, latitude, longitude, timezone',
        });
        return;
      }

      const result = await postChartApi('/navamsa', toChartApiRequest(natal));
      res.json(result);
    } catch (error) {
      console.error('Navamsa error:', error);
      res.status(500).json({
        error: 'Failed to calculate Navamsa chart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
