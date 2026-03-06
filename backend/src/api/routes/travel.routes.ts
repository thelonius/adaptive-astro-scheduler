import { Router } from 'express';
import { TravelController } from '../controllers/travel.controller';

export const travelRoutes = Router();
const controller = new TravelController();

travelRoutes.post('/relocation', (req, res) => controller.getRelocation(req, res));
travelRoutes.post('/analyze', (req, res) => controller.analyzeTrip(req, res));
travelRoutes.post('/compare', (req, res) => controller.compareDestinations(req, res));
