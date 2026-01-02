import express from 'express';
import * as ephemerisController from '../controllers/ephemeris.controller';

const router = express.Router();

router.get('/', ephemerisController.getEphemeris);
router.get('/planets', ephemerisController.getPlanetPositions);
router.get('/aspect', ephemerisController.calculateAspect);

export default router;
