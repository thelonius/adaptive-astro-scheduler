import { Router } from 'express';
import { NatalChartController } from '../controllers/natal-chart.controller';

const router = Router();
const natalChartController = new NatalChartController();

/**
 * Natal Chart API Routes
 *
 * All routes return natal chart data in JSON format
 */

// Calculation endpoints
router.post('/calculate', async (req, res) => {
  await natalChartController.calculateNatalChart(req, res);
});

router.get('/quick', async (req, res) => {
  await natalChartController.quickCalculate(req, res);
});

// Persistence endpoints
router.post('/save', async (req, res) => {
  await natalChartController.saveNatalChart(req, res);
});

router.get('/list/guest', async (req, res) => {
  await natalChartController.listGuestCharts(req, res);
});

router.get('/:id', async (req, res) => {
  await natalChartController.getNatalChart(req, res);
});

router.put('/:id', async (req, res) => {
  await natalChartController.updateNatalChart(req, res);
});

router.delete('/:id', async (req, res) => {
  await natalChartController.deleteNatalChart(req, res);
});

export default router;
