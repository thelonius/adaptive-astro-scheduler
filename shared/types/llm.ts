/**
 * LLM Pipeline Types
 * 
 * Types for Large Language Model integration and rule generation
 */

export type LLMProvider = 'openai' | 'claude';

export type LayerCreationMode = 
  | 'natural' // Natural language description
  | 'guided' // Step-by-step wizard
  | 'example' // Based on existing examples
  | 'improvement'; // Improving existing rule

export interface LayerGenerationRequest {
  description: string;
  category: string;
  mode: LayerCreationMode;
  examples?: string[];
  preferredProvider?: LLMProvider;
  userPreferences?: Record<string, any>;
}

export interface LayerValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  astrologicalAccuracy?: number; // 1-10
  codeQuality?: number; // 1-10
}

export interface CustomRule {
  id: string;
  rule_name: string;
  category: string;
  description: string;
  condition_code: string; // JavaScript function as string
  priority: number; // 1-10
  metadata: {
    generated_by?: 'user' | 'llm';
    generation_mode?: string;
    planets?: string[];
    aspects?: string[];
    houses?: number[];
    created_at: string;
    version?: number;
  };
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface RuleExecutionContext {
  astroData: {
    planets: Record<string, any>;
    aspects: any[];
    lunarDay: any;
    moonPhase: any;
    houses: any[];
  };
  userPrefs: {
    birthChart: any;
    timezone: string;
    location: {
      latitude: number;
      longitude: number;
    };
  };
  currentTime: Date;
}

export interface RuleExecutionResult {
  score: number; // 0-100
  reasoning: string;
  metadata?: Record<string, any>;
}

export interface AstrologicalLayer {
  id: string;
  name: string;
  description: string;
  rules: CustomRule[];
  isActive: boolean;
  weight: number; // 0.0-1.0
  category: string;
  created_at: Date;
  updated_at: Date;
}

export interface RuleFeedback {
  rule_id: string;
  user_id: string;
  feedback_type: 'positive' | 'negative' | 'suggestion';
  feedback_text: string;
  activity_outcome?: {
    activity: string;
    scheduled_date: Date;
    actual_outcome: number; // 1-5 rating
    notes?: string;
  };
  created_at: Date;
}

export interface LLMUsageStats {
  provider: LLMProvider;
  total_requests: number;
  successful_generations: number;
  failed_generations: number;
  tokens_used: number;
  cost_usd?: number;
  last_used: Date;
}