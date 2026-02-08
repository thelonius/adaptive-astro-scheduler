import { Router } from 'express';
import { CelestialEventsController } from '../controllers/celestial-events.controller';

const router = Router();
const controller = new CelestialEventsController();

/**
 * Celestial Events Routes
 * 
 * /api/celestial-events/*
 */

// GET /api/celestial-events/upcoming
router.get('/upcoming', (req, res) => controller.getUpcoming(req, res));

// GET /api/celestial-events/past
router.get('/past', (req, res) => controller.getPast(req, res));

// GET /api/celestial-events/range
router.get('/range', (req, res) => controller.getRange(req, res));

// GET /api/celestial-events/type/:type
router.get('/type/:type', (req, res) => controller.getByType(req, res));

export default router;
