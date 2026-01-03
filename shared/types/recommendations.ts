import { CalendarDay, NatalChart } from './';

export type RuleCategory =
  | 'beauty'
  | 'finance'
  | 'health'
  | 'travel'
  | 'relationships'
  | 'spiritual'
  | 'custom';

export type RuleSource = 'builtin' | 'llm-generated' | 'user-custom';

export interface RuleScore {
  passed: boolean;
  score: number;               // 0.0 - 1.0
  confidence: number;          // 0.0 - 1.0
  reasons: string[];
}

export interface RuleMetadata {
  source: RuleSource;
  version: number;
  createdAt: Date;
  author?: string;             // 'GPT-4', 'Claude', 'User', etc.
  tradition?: string;          // 'Vedic', 'Western', 'Chinese'
  citations?: string[];
}

export interface RecommendationRule {
  id: string;
  category: RuleCategory;
  subcategory?: string;

  // Condition function (evaluates to boolean or RuleScore)
  condition: (day: CalendarDay, natal?: NatalChart) => boolean | RuleScore;

  // Actions this rule recommends
  action: string[];

  // Priority (higher = more important)
  priority: number;            // 0-100

  // Weight in final score calculation
  weight: number;              // 0-100

  // Conflicts
  conflictsWith: string[];

  // Metadata
  metadata: RuleMetadata;
}

export interface RecommendationRequest {
  userId?: string;
  activityType: string;
  dateRange: {
    start: string;             // ISO 8601
    end: string;
  };
  minStrength?: number;        // Minimum acceptable strength
  limit?: number;              // Max results
  location?: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
}

export interface RecommendationResponse {
  recommendations: Array<{
    date: string;
    strength: number;
    reasons: string[];
    warnings: string[];
    calendarDay?: CalendarDay; // Full day data (optional)
  }>;
  totalFound: number;
  query: RecommendationRequest;
}

export interface CustomLayerDefinition {
  name: string;
  description: string;
  category: RuleCategory;
  mode: 'simple' | 'guided' | 'llm' | 'code';

  // Mode-specific data
  simpleData?: {
    frequency: string;         // 'Every Wednesday', 'Daily', etc.
  };

  guidedData?: {
    questions: Array<{
      question: string;
      answer: string;
    }>;
  };

  llmData?: {
    userPrompt: string;        // Natural language description
    generatedRule?: RecommendationRule;
  };

  codeData?: {
    conditionCode: string;     // TypeScript function as string
  };
}
