import { Router } from 'express';
import { AspectAnalysisController } from '../controllers/aspect-analysis.controller';

const router = Router();
const controller = new AspectAnalysisController();

/**
 * Aspect Analysis Routes
 *
 * Endpoints for aspect strength analysis and filtering
 */

// Comprehensive aspect analysis (primary endpoint)
router.get('/analyze', (req, res) => controller.analyzeAspects(req, res));

// Score a specific aspect
router.get('/score', (req, res) => controller.scoreAspect(req, res));

// Filter aspects by strength criteria
router.get('/filter', (req, res) => controller.filterAspects(req, res));

export default router;
