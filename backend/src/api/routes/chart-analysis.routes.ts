import { Router } from 'express';
import { ChartAnalysisController } from '../controllers/chart-analysis.controller';

const router = Router();
const controller = new ChartAnalysisController();

router.post('/synastry', (req, res) => controller.synastry(req, res));
router.post('/progressions', (req, res) => controller.progressions(req, res));
router.post('/draconic', (req, res) => controller.draconic(req, res));
router.post('/human-design', (req, res) => controller.humanDesign(req, res));
router.post('/vimshottari-dasha', (req, res) => controller.vimshottariDasha(req, res));
router.post('/navamsa', (req, res) => controller.navamsa(req, res));

export default router;
