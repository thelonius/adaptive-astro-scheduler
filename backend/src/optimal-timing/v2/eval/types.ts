/**
 * Zod schemas for the gold-set YAML format.
 *
 * Schema is intentionally permissive on the predicate side — we
 * accept any object, since the matcher in metrics.ts handles the
 * shape variability of DSL predicates.
 */

import { z } from 'zod';

const PredicatePartialSchema = z.record(z.unknown());

const ExpectedBlockSchema = z.object({
    intent_class: z.string().optional(),
    must_disqualifiers: z.array(PredicatePartialSchema).default([]),
    must_weighted_predicates: z.array(PredicatePartialSchema).default([]),
    should_weighted_predicates: z.array(PredicatePartialSchema).default([]),
    /** Phase-2: gold dates that should appear in top-N when running the recipe. */
    gold_top_dates: z.array(z.string()).default([]),
});

export const QuerySchema = z.object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    /** Used by intent_class checks; if omitted, defaults to undefined. */
    language: z.string().optional(),
    expected: ExpectedBlockSchema,
});

export const QueryFileSchema = z.object({
    version: z.literal(1),
    queries: z.array(QuerySchema).min(1),
});

export type Query = z.infer<typeof QuerySchema>;
export type QueryFile = z.infer<typeof QueryFileSchema>;
export type ExpectedBlock = z.infer<typeof ExpectedBlockSchema>;
export type PredicatePartial = z.infer<typeof PredicatePartialSchema>;

// ─── Eval result types ────────────────────────────────────────────────────────

export interface PredicateCheckResult {
    expected: PredicatePartial;
    matched: boolean;
    matchedAgainst?: Record<string, unknown>;
}

export interface QueryResult {
    queryId: string;
    prompt: string;
    error?: string;
    /** Set when LLM call fails or recipe doesn't validate. */
    llm: {
        model: string;
        promptVersion: string;
        attempts: number;
        cached: boolean;
        latencyMs: number;
    } | null;
    generatedRecipe?: {
        intent: string;
        rationale: string;
        disqualifierCount: number;
        weightedConditionCount: number;
    };
    disqualifierChecks: PredicateCheckResult[];
    weightedMustChecks: PredicateCheckResult[];
    weightedShouldChecks: PredicateCheckResult[];
    metrics: {
        disqualifierRecall: number;
        weightedMustRecall: number;
        weightedShouldRecall: number;
        overallPass: boolean;
    };
}

export interface RunResult {
    timestamp: string;
    model: string;
    promptVersion: string;
    queries: QueryResult[];
    aggregate: {
        totalQueries: number;
        passedQueries: number;
        avgDisqRecall: number;
        avgMustRecall: number;
        avgShouldRecall: number;
    };
}
