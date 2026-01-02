import express from 'express';
import * as dataController from '../controllers/data.controller';

const router = express.Router();

// Natal Charts
router.post('/charts', dataController.createNatalChart);
router.get('/charts', dataController.getNatalCharts);
router.get('/charts/:id', dataController.getNatalChart);

// Rules
router.post('/rules', dataController.createRule);
router.get('/rules', dataController.getRules);
router.get('/rules/:id', dataController.getRule);

// Outcomes
router.post('/outcomes', dataController.createOutcome);
router.get('/outcomes', dataController.getOutcomes);

export default router;
