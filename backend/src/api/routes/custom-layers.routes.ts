import { Router } from 'express';
import { CustomLayersController } from '../controllers/custom-layers.controller';

const router = Router();
const controller = new CustomLayersController();

/**
 * Custom Layer Routes
 *
 * API endpoints for LLM-powered custom astrological layer creation
 */

// Rule Generation
router.post('/generate-rule', (req, res) => controller.generateRule(req, res));

// Rule Validation
router.post('/validate-rule', (req, res) => controller.validateRule(req, res));

// Rule Execution (testing)
router.post('/test-rule', (req, res) => controller.testRule(req, res));

// Rule Improvement
router.post('/improve-rule/:ruleId', (req, res) => controller.improveRule(req, res));

// Layer Management
router.get('/layers', (req, res) => controller.getUserLayers(req, res));
router.post('/layers', (req, res) => controller.createLayer(req, res));
router.get('/layers/:layerId', (req, res) => controller.getLayer(req, res));
router.put('/layers/:layerId', (req, res) => controller.updateLayer(req, res));
router.delete('/layers/:layerId', (req, res) => controller.deleteLayer(req, res));

// Rule Management within Layers
router.get('/layers/:layerId/rules', (req, res) => controller.getLayerRules(req, res));
router.post('/layers/:layerId/rules', (req, res) => controller.addRuleToLayer(req, res));
router.delete('/layers/:layerId/rules/:ruleId', (req, res) => controller.removeRuleFromLayer(req, res));

// Feedback System
router.post('/rules/:ruleId/feedback', (req, res) => controller.submitFeedback(req, res));
router.get('/rules/:ruleId/feedback', (req, res) => controller.getRuleFeedback(req, res));

// Layer Execution
router.post('/layers/:layerId/execute', (req, res) => controller.executeLayer(req, res));
router.post('/layers/execute-all', (req, res) => controller.executeAllLayers(req, res));

// LLM Status and Configuration
router.get('/llm/status', (req, res) => controller.getLLMStatus(req, res));
router.get('/llm/usage-stats', (req, res) => controller.getUsageStats(req, res));

// Examples and Templates
router.get('/examples/:category', (req, res) => controller.getExamples(req, res));
router.get('/templates', (req, res) => controller.getTemplates(req, res));

export default router;