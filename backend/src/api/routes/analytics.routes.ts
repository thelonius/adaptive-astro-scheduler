import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();
const controller = new AnalyticsController();

/**
 * Analytics Routes
 *
 * Personalized analytics based on natal charts
 */

// Get daily personalized analytics
router.get('/daily/:chartId', (req, res) => controller.getDailyAnalytics(req, res));

// Score specific activities
router.post('/activities/:chartId', (req, res) => controller.scoreActivities(req, res));

// Get current transits
router.get('/transits/:chartId', (req, res) => controller.getTransits(req, res));

// Get weekly analytics overview
router.get('/weekly/:chartId', (req, res) => controller.getWeeklyAnalytics(req, res));

export default router;
