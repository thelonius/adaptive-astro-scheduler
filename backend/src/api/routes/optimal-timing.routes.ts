import { Router } from 'express';
import { OptimalTimingController } from '../controllers/optimal-timing.controller';

export const optimalTimingRoutes = Router();
const controller = new OptimalTimingController();

optimalTimingRoutes.post('/find', (req, res) => controller.find(req, res));
optimalTimingRoutes.post('/find-ai', (req, res) => controller.findAI(req, res));
optimalTimingRoutes.get('/intentions', (req, res) => controller.getIntentions(req, res));
