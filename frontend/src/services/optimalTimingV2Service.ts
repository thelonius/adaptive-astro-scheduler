/**
 * v2 optimal-timing API client.
 *
 * Backend is mounted at /api/optimal-timing/v2 (see backend/src/app.ts).
 * Endpoints:
 *   GET  /recipes
 *   POST /find-with-fixed-recipe
 *   POST /find-with-intent
 *   GET  /traces/:id
 */

import axios from 'axios';
import { API_BASE_URL } from '../config';

const BASE = `${API_BASE_URL}/api/optimal-timing/v2`;

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface Location {
    latitude: number;
    longitude: number;
    timezone: string;
}

export interface MoonState {
    sign: string;
    phase: string;
    illumination?: number;
    void_of_course?: boolean;
}

export interface MatchedPredicate {
    type: string;
    weight: number;
    details?: Record<string, unknown>;
}

export interface TimingWindowV2 {
    date: string; // YYYY-MM-DD
    score: number; // 0..100
    rank: number;
    matched_predicates: MatchedPredicate[];
    moon: MoonState;
    sun_sign: string;
    retrograde_planets: string[];
}

export interface RecipeDisqualifier {
    type: string;
    [key: string]: unknown;
}

export interface RecipeWeightedCondition {
    predicate: { type: string; [key: string]: unknown };
    weight: number;
    note?: string;
}

export interface GeneratedRecipe {
    intent: string;
    rationale: string;
    disqualifiers: RecipeDisqualifier[];
    weighted_conditions: RecipeWeightedCondition[];
    metadata?: Record<string, unknown>;
}

export interface FindWithIntentResponse {
    request_id: string;
    intent: string;
    date_range: { start: string; end: string };
    generated_recipe: GeneratedRecipe;
    llm: {
        model: string;
        prompt_version: string;
        cached: boolean;
        attempts: number;
    };
    summary: string;
    windows: TimingWindowV2[];
    disqualified_days: number;
    cost: { total_usd: number; latency_ms: number };
}

export interface CanonicalRecipeMeta {
    id: string;
    intent: string;
    rationale: string;
    disqualifier_count: number;
    weighted_condition_count: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export interface FindWithIntentParams {
    intent: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    location?: Location;
    topN?: number;
    language?: string;
    bypassCache?: boolean;
}

class OptimalTimingV2Service {
    async listRecipes(): Promise<CanonicalRecipeMeta[]> {
        const res = await axios.get<{ recipes: CanonicalRecipeMeta[] }>(`${BASE}/recipes`);
        return res.data.recipes;
    }

    async findWithIntent(params: FindWithIntentParams): Promise<FindWithIntentResponse> {
        const res = await axios.post<FindWithIntentResponse>(`${BASE}/find-with-intent`, {
            intent: params.intent,
            start_date: params.startDate,
            end_date: params.endDate,
            location: params.location,
            top_n: params.topN ?? 10,
            language: params.language,
            bypass_cache: params.bypassCache ?? false,
        });
        return res.data;
    }
}

export const optimalTimingV2Service = new OptimalTimingV2Service();
