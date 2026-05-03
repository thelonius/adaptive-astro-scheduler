import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type {
  AstrologicalLayer,
  CustomRule,
  LayerGenerationRequest,
  LayerValidationResult,
  LLMProvider
} from '@adaptive-astro/shared/types';

/**
 * LLM Pipeline Service
 *
 * Handles intelligent rule generation using Large Language Models.
 * Supports both OpenAI (GPT-4) and Anthropic (Claude) providers.
 */
export class LLMPipelineService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private defaultProvider: LLMProvider;

  constructor() {
    if (process.env.NVIDIA_NIM_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.NVIDIA_NIM_API_KEY,
        baseURL: process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      });
    } else if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }

    this.defaultProvider = this.anthropic ? 'claude' : 'openai';

    console.log('🤖 LLM Pipeline initialized with providers:', {
      nim: !!process.env.NVIDIA_NIM_API_KEY,
      openai: !!this.openai,
      anthropic: !!this.anthropic,
      default: this.defaultProvider,
    });
  }

  /**
   * Generate astrological rule from natural language description
   */
  async generateRule(request: LayerGenerationRequest): Promise<CustomRule> {
    const { description, category, mode, examples } = request;

    console.log('🔮 Generating rule:', { description, category, mode });

    const provider = request.preferredProvider || this.defaultProvider;

    try {
      const prompt = this.buildRuleGenerationPrompt(description, category, mode, examples);
      const response = await this.callLLM(prompt, provider);

      return this.parseRuleResponse(response, request);
    } catch (error) {
      console.error('❌ Rule generation failed:', error);
      throw new Error(`Failed to generate rule: ${error}`);
    }
  }

  /**
   * Validate generated rule for correctness and safety
   */
  async validateRule(rule: CustomRule): Promise<LayerValidationResult> {
    console.log('🔍 Validating rule:', rule.rule_name);

    try {
      const prompt = this.buildValidationPrompt(rule);
      const response = await this.callLLM(prompt, this.defaultProvider);

      return this.parseValidationResponse(response, rule);
    } catch (error) {
      console.error('❌ Rule validation failed:', error);
      return {
        isValid: false,
        errors: [`Validation failed: ${error}`],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Improve existing rule based on feedback
   */
  async improveRule(
    rule: CustomRule,
    feedback: string,
    outcomeData?: any[]
  ): Promise<CustomRule> {
    console.log('🔄 Improving rule:', rule.rule_name);

    const prompt = this.buildImprovementPrompt(rule, feedback, outcomeData);
    const response = await this.callLLM(prompt, this.defaultProvider);

    return this.parseRuleResponse(response, {
      description: `Improved: ${rule.rule_name}`,
      category: rule.category,
      mode: 'improvement'
    });
  }

  /**
   * Synthesize a full set of IntentionRules from a natural language prompt
   */
  async synthesizeIntentionRules(prompt: string): Promise<any> {
    console.log('🚀 Synthesizing intention rules for:', prompt);

    const systemPrompt = this.buildIntentionRulesPrompt(prompt);
    const response = await this.callLLM(systemPrompt, this.defaultProvider);

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                       response.match(/(\{[\s\S]*\})/);

      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      return JSON.parse(jsonMatch[1]);
    } catch (error) {
       console.error('❌ Failed to parse synthesized rules:', response);
       throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  /**
   * Build prompt for full intention rules synthesis
   */
  private buildIntentionRulesPrompt(userPrompt: string): string {
    return `
# Astrological Electional Architect
You are an expert in Electional Astrology (choosing best times).
Your task is to translate a user request into a JSON structure of weighted rules.

## User Request: "${userPrompt}"

## Output Requirements:
Return ONLY a JSON object following this interface:
{
  "description": "Short explanation of the astrological strategy used",
  "favorable": [
    { "type": "conjunction|trine|square|opposition|sextile|quincunx|lunar-phase|ingress|retrograde-start|retrograde-end|void-moon", "planet": "PlanetName", "targetPlanet": "PlanetName (for aspects)", "sign": "SignName (for ingress)", "phase": "New|Full|Waxing|Waning (for phase)", "weight": 1-20 }
  ],
  "unfavorable": [
    { "type": "...", "weight": -1 to -20 }
  ],
  "moonSigns": {
    "favorable": ["SignName"],
    "unfavorable": ["SignName"]
  }
}

## Valid Values:
- Planets: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- Signs: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces
- Aspects: conjunction, trine, square, opposition, sextile, quincunx

## Example: "Starting a business"
{
  "description": "Focus on growth (Jupiter), stability (Saturn), and new starts (New Moon)",
  "favorable": [
    { "type": "lunar-phase", "phase": "Waxing", "weight": 10 },
    { "type": "trine", "planet": "Jupiter", "targetPlanet": "Sun", "weight": 15 },
    { "type": "retrograde-end", "planet": "Mercury", "weight": 12 }
  ],
  "unfavorable": [
    { "type": "void-moon", "weight": -20 },
    { "type": "retrograde-start", "planet": "Mercury", "weight": -10 }
  ],
  "moonSigns": {
    "favorable": ["Capricorn", "Taurus"],
    "unfavorable": ["Pisces"]
  }
}

Generate the JSON for the user request now:`;
  }

  /**
   * Build few-shot learning prompt for rule generation
   */
  private buildRuleGenerationPrompt(
    description: string,
    category: string,
    mode: string,
    examples?: string[]
  ): string {
    return `
# Astrological Rule Generation

You are an expert astrologer and programmer. Generate a JavaScript rule that evaluates astrological conditions for activity planning.

## Task
Create a rule for: "${description}"
Category: ${category}
Mode: ${mode}

## Rule Structure
Return a JSON object with:
- rule_name: Clear, descriptive name
- category: "${category}"
- description: Detailed explanation
- condition_code: JavaScript function as string
- priority: 1-10 (10 = highest)
- metadata: Additional info (planets, aspects, etc.)

## JavaScript Function Requirements
\`\`\`javascript
function evaluateCondition(astroData, userPrefs, currentTime) {
  // astroData: { planets, aspects, lunarDay, moonPhase, houses }
  // userPrefs: { birthChart, timezone, location }
  // currentTime: Date object

  // Return { score: 0-100, reasoning: "explanation" }
  return { score: 85, reasoning: "Venus trine Jupiter suggests..." };
}
\`\`\`

## Examples
${examples ? examples.join('\n') : this.getDefaultExamples(category)}

## Astrological Knowledge Base
- Planetary dignities, aspects (conjunction, trine, square, etc.)
- Lunar phases and void-of-course moon
- House meanings (1st = identity, 7th = relationships, etc.)
- Transit vs natal chart interactions
- Electional astrology principles

Generate the rule now:`;
  }

  /**
   * Build validation prompt for rule checking
   */
  private buildValidationPrompt(rule: CustomRule): string {
    return `
# Astrological Rule Validation

Validate this generated astrological rule for correctness, safety, and astrological accuracy.

## Rule to Validate
\`\`\`json
${JSON.stringify(rule, null, 2)}
\`\`\`

## Validation Criteria
1. **JavaScript Syntax**: Valid function syntax and structure
2. **Astrological Accuracy**: Correct use of astrological concepts
3. **Data Access**: Proper use of astroData, userPrefs, currentTime
4. **Return Format**: Correct { score, reasoning } structure
5. **Safety**: No dangerous operations or infinite loops
6. **Logic**: Reasonable scoring and conditions

## Response Format
Return JSON:
\`\`\`json
{
  "isValid": true/false,
  "errors": ["Critical issues that must be fixed"],
  "warnings": ["Minor issues or improvements needed"],
  "suggestions": ["Enhancements or optimizations"],
  "astrologicalAccuracy": 1-10,
  "codeQuality": 1-10
}
\`\`\`

Validate now:`;
  }

  /**
   * Build improvement prompt for rule enhancement
   */
  private buildImprovementPrompt(
    rule: CustomRule,
    feedback: string,
    outcomeData?: any[]
  ): string {
    const outcomeAnalysis = outcomeData ?
      `\n## Outcome Data\n${JSON.stringify(outcomeData, null, 2)}` : '';

    return `
# Rule Improvement Request

Improve this astrological rule based on user feedback and outcome data.

## Current Rule
\`\`\`json
${JSON.stringify(rule, null, 2)}
\`\`\`

## Feedback
${feedback}
${outcomeAnalysis}

## Improvement Instructions
1. Address the feedback directly
2. Maintain astrological accuracy
3. Improve scoring algorithm if needed
4. Enhance reasoning explanations
5. Consider outcome patterns if provided

Generate improved rule:`;
  }

  /**
   * Call appropriate LLM provider
   */
  private async callLLM(prompt: string, provider: string): Promise<string> {
    if (provider === 'mock' || (!this.openai && !this.anthropic)) {
      console.log('🧪 Using MOCK LLM Response for prompt:', prompt);
      
      // Return a professional-looking mock response for common astrological intents
      return `
      {
        "description": "Mocked AI strategy for ${prompt.substring(0, 30).replace(/\n/g, " ")}...",
        "favorable": [
          { "type": "trine", "planet": "Sun", "targetPlanet": "Jupiter", "weight": 15 },
          { "type": "conjunction", "planet": "Mercury", "targetPlanet": "Venus", "weight": 10 },
          { "type": "lunar-phase", "phase": "Waxing", "weight": 8 }
        ],
        "unfavorable": [
          { "type": "void-moon", "weight": -20 },
          { "type": "opposition", "planet": "Mars", "targetPlanet": "Saturn", "weight": -12 }
        ],
        "moonSigns": {
          "favorable": ["Leo", "Sagittarius", "Aries"],
          "unfavorable": ["Scorpio", "Capricorn"]
        }
      }`;
    }

    switch (provider) {
      case 'openai':
        if (!this.openai) throw new Error('OpenAI/NIM not configured');
        const gptModel = process.env.NVIDIA_NIM_MODEL || process.env.OPENAI_MODEL || 'gpt-4';
        const gptResponse = await this.openai.chat.completions.create({
          model: gptModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000,
        });
        return gptResponse.choices[0].message.content || '';

      case 'claude':
        if (!this.anthropic) throw new Error('Anthropic not configured');
        const claudeResponse = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }],
        });

        // Extract text from Claude's response format
        const content = claudeResponse.content[0];
        return content.type === 'text' ? content.text : '';

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  /**
   * Parse LLM response into CustomRule object
   */
  private parseRuleResponse(response: string, request: LayerGenerationRequest): CustomRule {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                       response.match(/(\{[\s\S]*\})/);

      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[1]);

      // Validate required fields
      if (!parsed.rule_name || !parsed.condition_code) {
        throw new Error('Missing required fields in generated rule');
      }

      return {
        id: crypto.randomUUID(),
        rule_name: parsed.rule_name,
        category: parsed.category || request.category,
        description: parsed.description || request.description,
        condition_code: parsed.condition_code,
        priority: parsed.priority || 5,
        metadata: {
          ...parsed.metadata,
          generated_by: 'llm',
          generation_mode: request.mode,
          created_at: new Date().toISOString()
        },
        user_id: '', // Will be set by caller
        created_at: new Date(),
        updated_at: new Date()
      } as CustomRule;

    } catch (error) {
      console.error('❌ Failed to parse rule response:', response);
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }

  /**
   * Parse validation response
   */
  private parseValidationResponse(response: string, rule: CustomRule): LayerValidationResult {
    try {
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                       response.match(/(\{[\s\S]*\})/);

      if (!jsonMatch) {
        return {
          isValid: false,
          errors: ['Failed to parse validation response'],
          warnings: [],
          suggestions: []
        };
      }

      const parsed = JSON.parse(jsonMatch[1]);

      return {
        isValid: parsed.isValid || false,
        errors: parsed.errors || [],
        warnings: parsed.warnings || [],
        suggestions: parsed.suggestions || [],
        astrologicalAccuracy: parsed.astrologicalAccuracy,
        codeQuality: parsed.codeQuality
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation parsing failed: ${error}`],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Get default examples for different categories
   */
  private getDefaultExamples(category: string): string {
    const examples = {
      timing: `
Example 1: "Moon trine Venus for relationship activities"
Example 2: "Mars in strong aspect for physical activities"
Example 3: "Mercury direct for communication tasks"`,

      energy: `
Example 1: "New Moon for starting projects"
Example 2: "Full Moon for completion and manifestation"
Example 3: "Waxing Moon for growth-oriented activities"`,

      compatibility: `
Example 1: "Venus-Jupiter aspects for social activities"
Example 2: "Sun-Mercury conjunction for learning"
Example 3: "Moon-Saturn aspects for disciplined work"`,

      avoidance: `
Example 1: "Void of Course Moon for important decisions"
Example 2: "Mercury retrograde for signing contracts"
Example 3: "Mars square Saturn for risky activities"`
    };

    return examples[category as keyof typeof examples] || examples.timing;
  }

  /**
   * Check if LLM services are available
   */
  public isAvailable(): boolean {
    return !!(this.openai || this.anthropic);
  }

  /**
   * Get available providers
   */
  public getAvailableProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    if (this.openai) providers.push('openai');
    if (this.anthropic) providers.push('claude');
    return providers;
  }
}

export default LLMPipelineService;