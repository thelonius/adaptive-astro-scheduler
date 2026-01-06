import { Router } from 'express';
import { NatalChartController } from '../controllers/natal-chart.controller';

const router = Router();
const natalChartController = new NatalChartController();

/**
 * Natal Chart API Routes
 *
 * All routes return natal chart data in JSON format
 */

// POST /api/natal-chart/calculate - Calculate natal chart
router.post('/calculate', async (req, res) => {
  await natalChartController.calculateNatalChart(req, res);
});

// GET /api/natal-chart/quick - Quick calculation using query params
router.get('/quick', async (req, res) => {
  await natalChartController.quickCalculate(req, res);
});

export default router;
