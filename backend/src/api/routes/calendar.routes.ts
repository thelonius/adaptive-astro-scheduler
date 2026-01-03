import { Router } from 'express';
import { CalendarController } from '../controllers/calendar.controller';

const router = Router();
const calendarController = new CalendarController();

/**
 * Calendar Routes
 *
 * /api/calendar/*
 */

// GET /api/calendar/day - Get single day
router.get('/day', (req, res) => calendarController.getDay(req, res));

// GET /api/calendar/month - Get entire month
router.get('/month', (req, res) => calendarController.getMonth(req, res));

// POST /api/calendar/find-best-days - Find optimal days for activity
router.post('/find-best-days', (req, res) => calendarController.findBestDays(req, res));

export default router;
