import OpenAI from 'openai';
import config from '../config';
import logger from '../utils/logger';
import { INatalChart } from '../models/NatalChart';

interface GeneratedRule {
  name: string;
  description: string;
  conditions: Array<{
    type: string;
    planet?: string;
    aspect?: string;
    sign?: string;
    house?: number;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    priority: number;
    metadata: Record<string, any>;
  }>;
}

class LLMRuleGeneratorService {
  private openai: OpenAI | null = null;

  constructor() {
    if (config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    } else {
      logger.warn('OpenAI API key not configured. LLM rule generation will not be available.');
    }
  }

  private buildPrompt(natalChart: INatalChart, userRequest: string): string {
    const chartSummary = `
Natal Chart for ${natalChart.name}:
Birth Date: ${natalChart.birthDate.toISOString()}
Birth Place: ${natalChart.birthPlace.city}, ${natalChart.birthPlace.country}

Planets:
${natalChart.planets.map((p) => `- ${p.name} in ${p.sign} at ${p.degree}° (House ${p.house})`).join('\n')}

Houses:
${natalChart.houses.map((h) => `- House ${h.number}: ${h.sign} at ${h.degree}°`).join('\n')}

Key Aspects:
${natalChart.aspects.map((a) => `- ${a.planet1} ${a.type} ${a.planet2} (orb: ${a.orb}°)`).join('\n')}
    `.trim();

    return `
You are an expert astrologer helping to generate scheduling rules based on natal charts and transits.

${chartSummary}

User Request: ${userRequest}

Based on this natal chart and the user's request, generate a scheduling rule in JSON format with the following structure:

{
  "name": "Rule name",
  "description": "Detailed description of the rule",
  "conditions": [
    {
      "type": "transit" | "natal" | "progression",
      "planet": "Planet name (optional)",
      "aspect": "Aspect type (optional)",
      "sign": "Zodiac sign (optional)",
      "house": house number (optional),
      "operator": "equals" | "in" | "aspects",
      "value": "comparison value"
    }
  ],
  "actions": [
    {
      "type": "suggest_time" | "avoid_time" | "prioritize",
      "priority": 1-10,
      "metadata": {
        "timeRange": "morning" | "afternoon" | "evening",
        "activity": "activity type",
        "reason": "astrological reason"
      }
    }
  ]
}

Generate a practical, actionable rule that helps with scheduling based on astrological principles.
Return ONLY the JSON object, no additional text.
    `.trim();
  }

  async generateRule(natalChart: INatalChart, userRequest: string): Promise<GeneratedRule> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const prompt = this.buildPrompt(natalChart, userRequest);

      logger.info('Generating rule with OpenAI', { chartId: natalChart._id, request: userRequest });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert astrologer. Generate scheduling rules in valid JSON format only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

      const rule = JSON.parse(jsonString) as GeneratedRule;

      logger.info('Rule generated successfully', { ruleName: rule.name });

      return rule;
    } catch (error) {
      logger.error('Error generating rule with LLM:', error);
      throw error;
    }
  }

  async explainRule(rule: any): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert astrologer explaining scheduling rules in simple terms.',
          },
          {
            role: 'user',
            content: `Explain this astrological scheduling rule in simple, practical terms:\n\n${JSON.stringify(rule, null, 2)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      return response.choices[0]?.message?.content || 'Unable to generate explanation.';
    } catch (error) {
      logger.error('Error explaining rule with LLM:', error);
      throw error;
    }
  }
}

export default new LLMRuleGeneratorService();
