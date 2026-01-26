import { Request, Response } from 'express';
import { LLMPipelineService } from '../../services/llm-pipeline';
import { RuleValidationEngine } from '../../services/rule-validator';
import type { 
  LayerGenerationRequest,
  CustomRule,
  RuleExecutionContext,
  AstrologicalLayer,
  RuleFeedback
} from '@adaptive-astro/shared/types';
import { createEphemerisCalculator } from '../../core/ephemeris';

/**
 * Custom Layers Controller
 * 
 * Handles API requests for LLM-powered custom astrological layers
 */
export class CustomLayersController {
  private llmService: LLMPipelineService;
  private validator: RuleValidationEngine;
  private ephemeris = createEphemerisCalculator();

  constructor() {
    this.llmService = new LLMPipelineService();
    this.validator = new RuleValidationEngine();
  }

  /**
   * Generate custom rule using LLM
   * POST /api/custom-layers/generate-rule
   */
  async generateRule(req: Request, res: Response): Promise<void> {
    try {
      const request: LayerGenerationRequest = req.body;

      if (!request.description?.trim()) {
        res.status(400).json({
          success: false,
          error: 'Description is required'
        });
        return;
      }

      if (!this.llmService.isAvailable()) {
        res.status(503).json({
          success: false,
          error: 'LLM service is not configured. Please set API keys for OpenAI or Anthropic.'
        });
        return;
      }

      console.log('🔮 Generating rule for:', request.description);

      const rule = await this.llmService.generateRule(request);
      
      // Validate generated rule immediately
      const validation = await this.validator.validateRule(rule);

      res.json({
        success: true,
        data: {
          rule,
          validation,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Rule generation failed:', error);
      res.status(500).json({
        success: false,
        error: `Failed to generate rule: ${error}`
      });
    }
  }

  /**
   * Validate existing rule
   * POST /api/custom-layers/validate-rule
   */
  async validateRule(req: Request, res: Response): Promise<void> {
    try {
      const rule: CustomRule = req.body;

      if (!rule.condition_code?.trim()) {
        res.status(400).json({
          success: false,
          error: 'Rule condition_code is required'
        });
        return;
      }

      const validation = await this.validator.validateRule(rule);

      res.json({
        success: true,
        data: {
          validation,
          validated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Rule validation failed:', error);
      res.status(500).json({
        success: false,
        error: `Failed to validate rule: ${error}`
      });
    }
  }

  /**
   * Test rule execution with sample data
   * POST /api/custom-layers/test-rule
   */
  async testRule(req: Request, res: Response): Promise<void> {
    try {
      const { rule, testContext } = req.body;

      if (!rule?.condition_code) {
        res.status(400).json({
          success: false,
          error: 'Rule with condition_code is required'
        });
        return;
      }

      // Create test context if not provided
      const context: RuleExecutionContext = testContext || await this.createTestContext();

      const result = await this.validator.executeRule(rule, context);

      res.json({
        success: true,
        data: {
          result,
          context: {
            timestamp: context.currentTime,
            location: context.userPrefs.location
          },
          executed_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Rule testing failed:', error);
      res.status(500).json({
        success: false,
        error: `Failed to test rule: ${error}`
      });
    }
  }

  /**
   * Improve existing rule based on feedback
   * POST /api/custom-layers/improve-rule/:ruleId
   */
  async improveRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const { rule, feedback, outcomeData } = req.body;

      if (!rule) {
        res.status(400).json({
          success: false,
          error: 'Original rule is required'
        });
        return;
      }

      if (!feedback?.trim()) {
        res.status(400).json({
          success: false,
          error: 'Feedback is required for improvement'
        });
        return;
      }

      if (!this.llmService.isAvailable()) {
        res.status(503).json({
          success: false,
          error: 'LLM service is not available'
        });
        return;
      }

      const improvedRule = await this.llmService.improveRule(rule, feedback, outcomeData);
      const validation = await this.validator.validateRule(improvedRule);

      res.json({
        success: true,
        data: {
          original_rule: rule,
          improved_rule: improvedRule,
          validation,
          improvement_feedback: feedback,
          improved_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Rule improvement failed:', error);
      res.status(500).json({
        success: false,
        error: `Failed to improve rule: ${error}`
      });
    }
  }

  /**
   * Get user's custom layers
   * GET /api/custom-layers/layers
   */
  async getUserLayers(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement database layer storage
      // For now, return mock data
      
      const mockLayers: AstrologicalLayer[] = [
        {
          id: '1',
          name: 'Personal Timing Layer',
          description: 'Custom rules for optimal timing based on personal preferences',
          rules: [],
          isActive: true,
          weight: 0.8,
          category: 'timing',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      res.json({
        success: true,
        data: mockLayers
      });

    } catch (error) {
      console.error('❌ Failed to get user layers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve layers'
      });
    }
  }

  /**
   * Create new astrological layer
   * POST /api/custom-layers/layers
   */
  async createLayer(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, category, weight = 0.5 } = req.body;

      if (!name?.trim()) {
        res.status(400).json({
          success: false,
          error: 'Layer name is required'
        });
        return;
      }

      const layer: AstrologicalLayer = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description?.trim() || '',
        rules: [],
        isActive: true,
        weight: Math.max(0, Math.min(1, weight)), // Clamp to 0-1
        category: category || 'general',
        created_at: new Date(),
        updated_at: new Date()
      };

      // TODO: Save to database

      res.status(201).json({
        success: true,
        data: layer
      });

    } catch (error) {
      console.error('❌ Failed to create layer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create layer'
      });
    }
  }

  /**
   * Get LLM service status
   * GET /api/custom-layers/llm/status
   */
  async getLLMStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = {
        available: this.llmService.isAvailable(),
        providers: this.llmService.getAvailableProviders(),
        openai_configured: !!process.env.OPENAI_API_KEY,
        anthropic_configured: !!process.env.ANTHROPIC_API_KEY,
        last_check: new Date().toISOString()
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get LLM status'
      });
    }
  }

  /**
   * Get examples for rule generation
   * GET /api/custom-layers/examples/:category
   */
  async getExamples(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;

      const examples = this.getRuleExamples(category);

      res.json({
        success: true,
        data: {
          category,
          examples,
          count: examples.length
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get examples'
      });
    }
  }

  /**
   * Submit feedback for a rule
   * POST /api/custom-layers/rules/:ruleId/feedback
   */
  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const { feedback_type, feedback_text, activity_outcome } = req.body;

      if (!feedback_text?.trim()) {
        res.status(400).json({
          success: false,
          error: 'Feedback text is required'
        });
        return;
      }

      const feedback: RuleFeedback = {
        rule_id: ruleId,
        user_id: 'current_user', // TODO: Get from auth
        feedback_type: feedback_type || 'suggestion',
        feedback_text: feedback_text.trim(),
        activity_outcome,
        created_at: new Date()
      };

      // TODO: Save to database

      res.status(201).json({
        success: true,
        data: feedback
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to submit feedback'
      });
    }
  }

  // Placeholder methods for other endpoints
  async getLayer(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  }

  async updateLayer(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  }

  async deleteLayer(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  }

  async getLayerRules(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  }

  async addRuleToLayer(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  }

  async removeRuleFromLayer(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  }

  async getRuleFeedback(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  }

  async executeLayer(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  }

  async executeAllLayers(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  }

  async getUsageStats(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  }

  async getTemplates(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  }

  /**
   * Create test context for rule execution
   */
  private async createTestContext(): Promise<RuleExecutionContext> {
    const now = new Date();
    const testLocation = { latitude: 40.7128, longitude: -74.0060 }; // NYC

    // Get current astronomical data
    const dateTime = {
      date: now,
      timezone: 'America/New_York',
      location: testLocation
    };

    try {
      const [planets, aspects, lunarDay, moonPhase, houses] = await Promise.all([
        this.ephemeris.getPlanetsPositions(dateTime),
        this.ephemeris.getAspects(dateTime, 8),
        this.ephemeris.getLunarDay(dateTime),
        this.ephemeris.getMoonPhase(dateTime),
        this.ephemeris.getHouses(dateTime, 'placidus')
      ]);

      return {
        astroData: {
          planets,
          aspects: (aspects as unknown as any).aspects || aspects,
          lunarDay,
          moonPhase,
          houses: (houses as unknown as any).houses || houses
        },
        userPrefs: {
          birthChart: {}, // Mock birth chart
          timezone: 'America/New_York',
          location: testLocation
        },
        currentTime: now
      };
    } catch (error) {
      console.warn('⚠️  Failed to get live astronomical data, using mock data');
      
      // Return mock context if ephemeris fails
      return {
        astroData: {
          planets: { sun: { longitude: 135, sign: 'Leo' } },
          aspects: [],
          lunarDay: { number: 15, phase: 'Full Moon' },
          moonPhase: { phase: 'Full', illumination: 100 },
          houses: []
        },
        userPrefs: {
          birthChart: {},
          timezone: 'America/New_York',
          location: testLocation
        },
        currentTime: now
      };
    }
  }

  /**
   * Get rule examples by category
   */
  private getRuleExamples(category: string): string[] {
    const examplesByCategory: Record<string, string[]> = {
      timing: [
        "Best time for important meetings when Mercury is strong",
        "Avoid signing contracts during Mercury retrograde",
        "Schedule creative work when Venus is well-aspected",
        "Plan physical activities when Mars is in good aspect"
      ],
      energy: [
        "High energy days during New Moon in fire signs",
        "Introspective activities during Saturn transits",
        "Social activities when Venus is prominent",
        "Study and learning when Mercury is well-placed"
      ],
      compatibility: [
        "Team meetings work better with harmonious Moon aspects",
        "Negotiations succeed with Venus-Jupiter contacts",
        "Creative collaborations thrive with Sun-Venus aspects",
        "Avoid conflicts when Mars is heavily afflicted"
      ],
      avoidance: [
        "Postpone important decisions during Void of Course Moon",
        "Avoid travel during difficult Mars transits",
        "Skip risky investments during Saturn squares",
        "Delay launches during Mercury retrograde"
      ]
    };

    return examplesByCategory[category] || examplesByCategory.timing;
  }
}