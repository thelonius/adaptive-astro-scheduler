import { Router } from 'express';
import { ChartController } from '../controllers/chart.controller';
import { NatalChartRepository } from '../../database/repositories/natal-chart.repository';
import { UserRepository } from '../../database/repositories/user.repository';
import { createEphemerisCalculator } from '../../core/ephemeris';

export function createChartRoutes(
  natalRepo: NatalChartRepository,
  userRepo: UserRepository
): Router {
  const router = Router();
  const ephemeris = createEphemerisCalculator();
  const controller = new ChartController(natalRepo, userRepo, ephemeris);

  // Create a new chart
  router.post('/', controller.createChart.bind(controller));

  // Get all charts
  router.get('/', controller.getCharts.bind(controller));

  // Get chart by ID
  router.get('/:id', controller.getChart.bind(controller));

  // Update chart
  router.put('/:id', controller.updateChart.bind(controller));

  // Delete chart
  router.delete('/:id', controller.deleteChart.bind(controller));

  return router;
}