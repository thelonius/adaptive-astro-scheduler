import express from 'express';
import * as llmController from '../controllers/llm.controller';

const router = express.Router();

router.post('/generate-rule', llmController.generateRule);
router.get('/explain-rule/:ruleId', llmController.explainRule);

export default router;
