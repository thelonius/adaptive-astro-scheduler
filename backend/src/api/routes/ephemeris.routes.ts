import { Router } from 'express';
import { EphemerisController } from '../controllers/ephemeris.controller';

const router = Router();
const ephemerisController = new EphemerisController();

/**
 * Ephemeris API Routes
 *
 * All routes return ephemeris data in JSON format
 */

// GET /api/ephemeris/planets - Get planetary positions
router.get('/planets', async (req, res) => {
  await ephemerisController.getPlanets(req, res);
});

// GET /api/ephemeris/aspects - Get planetary aspects
router.get('/aspects', async (req, res) => {
  await ephemerisController.getAspects(req, res);
});

// GET /api/ephemeris/houses - Get astrological houses
router.get('/houses', async (req, res) => {
  await ephemerisController.getHouses(req, res);
});

// GET /api/ephemeris/planetary-hours - Get planetary hours
router.get('/planetary-hours', async (req, res) => {
  await ephemerisController.getPlanetaryHours(req, res);
});

// GET /api/ephemeris/retrogrades - Get retrograde planets
router.get('/retrogrades', async (req, res) => {
  await ephemerisController.getRetrogrades(req, res);
});

// GET /api/ephemeris/void-moon - Get void of course moon
router.get('/void-moon', async (req, res) => {
  await ephemerisController.getVoidMoon(req, res);
});

// GET /api/ephemeris/lunar-day - Get lunar day data
router.get('/lunar-day', async (req, res) => {
  await ephemerisController.getLunarDay(req, res);
});

// GET /api/ephemeris/moon-phase - Get moon phase
router.get('/moon-phase', async (req, res) => {
  await ephemerisController.getMoonPhase(req, res);
});

export default router;