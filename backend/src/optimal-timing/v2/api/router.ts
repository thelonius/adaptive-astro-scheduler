/**
 * Express router for v2. Mounted at `/api/optimal-timing/v2` in app.ts.
 */

import { Router } from 'express';
import { OptimalTimingV2Controller } from './controller';

export function createOptimalTimingV2Router(): Router {
    const router = Router();
    const controller = new OptimalTimingV2Controller();

    router.get('/recipes', (req, res) => controller.listRecipes(req, res));
    router.post('/find-with-fixed-recipe', (req, res) => controller.findWithFixedRecipe(req, res));
    router.post('/find-with-intent', (req, res) => controller.findWithIntent(req, res));
    router.get('/traces/:id', (req, res) => controller.getTrace(req, res));

    return router;
}
