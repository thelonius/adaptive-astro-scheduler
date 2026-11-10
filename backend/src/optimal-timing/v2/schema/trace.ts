/**
 * Optimal Timing v2 — Trace Record
 *
 * A TraceRecord captures EVERYTHING that happened during one
 * /optimal-timing/v2/find request. It's the spine of the whole
 * system:
 *   - Debug UI reads it to show what happened.
 *   - Feedback collection links to it by request_id.
 *   - Eval harness replays gold queries and diffs against expected.
 *   - Future fine-tuning treats (prompt → recipe) pairs from it as
 *     supervised labels.
 *
 * Treat traces as IMMUTABLE historical records. Once written, never
 * mutate. New information about a request goes in feedback tables
 * that reference the trace by request_id.
 */

import type { IntentEnvelope } from './intent-envelope';
import type { Recipe, Predicate } from './dsl';
import type { NarrativeBundle } from './narratives';

// ─── LLM stage envelope ──────────────────────────────────────────────────────

export interface LLMStage<T> {
    /** Provider model id, e.g. "claude-sonnet-4.6" or "gpt-4o-2024-11-20" */
    model: string;
    provider: 'anthropic' | 'openai' | 'nim' | 'mock';
    /** Version of the prompt template, e.g. "recipe.v2" */
    prompt_template_version: string;
    latency_ms: number;
    cost_usd: number;
    input_tokens: number;
    output_tokens: number;
    /** Parsed, validated output. Shape depends on the stage. */
    output: T;
    /** True if served from Redis cache; LLM was not actually called. */
    cache_hit: boolean;
    /**
     * Optional raw response text. Useful for debugging schema-validation
     * failures. Heavy: skip persisting in production unless debug flag set.
     */
    raw_response?: string;
}

/**
 * Stage 6 (added in 1.1.0): per-day per-vibe narrative rendering.
 * Optional on TraceRecord — old traces and requests that didn't request
 * narratives leave this field undefined.
 */
export interface StageRenderNarratives extends LLMStage<NarrativeBundle> {
    /** Echo of the natal chart id used to ground narratives, or null. */
    natal_chart_id: string | null;
    /**
     * Result of checking every astrological claim in the generated text
     * against the day's ephemeris facts. Undefined on traces written
     * before verification existed.
     */
    verification?: NarrativeVerificationSummary;
}

/** Aggregate of the fact-check pass over one narrative bundle. */
export interface NarrativeVerificationSummary {
    /** Total claims extracted from the generated text. */
    claims: number;
    /** Claims that contradict the day's facts. */
    contradicted: number;
    /** Claims the facts say nothing about (invented planets, lunar days, ...). */
    unsupported: number;
    /** LLM attempts spent, including repair rounds. */
    attempts: number;
    /**
     * (date, vibe_id) cells whose text was replaced by a deterministic
     * fact sentence because the model kept contradicting the ephemeris.
     */
    fell_back: Array<{ date: string; vibe_id: string; violations: string[] }>;
}

// ─── Per-stage records ───────────────────────────────────────────────────────

export interface StageDateRange {
    method: 'regex' | 'chrono' | 'llm_hint' | 'default_30d';
    extracted: boolean;
    /** ISO date YYYY-MM-DD */
    start: string;
    end: string;
    raw_phrase: string | null;
}

export interface PredicateFiring {
    /** Discriminator from PredicateSchema.type */
    predicate_type: string;
    /** Full predicate object as passed to the engine */
    predicate: Predicate;
    /** Weight if from weighted_conditions; null for disqualifiers */
    weight: number | null;
    matched: boolean;
    /**
     * Engine-supplied context about the match. Examples:
     *   { orb_deg: 1.4, applying: true } for aspect predicates
     *   { phase: "waxing_gibbous", illumination: 0.78 } for moon_phase
     *   { sign: "Taurus", longitude: 35.4 } for planet_in_sign
     */
    match_details: Record<string, unknown>;
}

export interface PlanetPositionSummary {
    planet: string;
    sign: string;
    /** 0-30°, position inside the sign. */
    degree_in_sign: number;
    /** 0-360°, ecliptic longitude. */
    longitude: number;
    /** °/day; negative means retrograde. */
    speed: number;
    retrograde: boolean;
}

export interface AspectSummary {
    from: string;
    to: string;
    type: string;
    orb_deg: number;
    applying: boolean;
}

/**
 * One day's ephemeris as the LLM and the verifier see it.
 *
 * This is the grounding contract: a narrative may only name placements
 * that appear here. Anything trimmed from this snapshot is something the
 * model has to invent, so keep it complete rather than compact — the
 * predicate firings next to it in the trace are far heavier anyway.
 */
export interface DayEphemerisSummary {
    moon: {
        sign: string;
        phase: string;
        illumination: number;
        void_of_course: boolean;
        longitude: number;
        waxing: boolean;
    };
    sun_sign: string;
    retrograde_planets: string[];
    /** Every planet the engine computed for this day. */
    planets: PlanetPositionSummary[];
    /** Every aspect the engine computed for this day. */
    aspects: AspectSummary[];
    /** Tight subset (orb ≤ 4°, up to 6) kept for debug UI readability. */
    notable_aspects: AspectSummary[];
}

export interface ScoredDay {
    /** ISO date YYYY-MM-DD */
    date: string;
    /** Sum of matched weighted_conditions */
    raw_score: number;
    /** 1-indexed position in the final ranked output, or null if disqualified */
    rank: number | null;
    /** Every predicate the engine evaluated, matched or not */
    predicates_fired: PredicateFiring[];
    ephemeris_snapshot: DayEphemerisSummary;
}

export interface DisqualifiedDay {
    date: string;
    /** predicate_type values that triggered disqualification */
    reasons: string[];
}

export interface StageScoring {
    candidate_days_count: number;
    days_disqualified: DisqualifiedDay[];
    scored_days: ScoredDay[];
    scoring_engine_version: string;
}

export interface StageOutput {
    windows_returned: number;
    top_window_date: string | null;
    /** Short text shown to the user */
    response_summary: string;
}

// ─── The trace itself ────────────────────────────────────────────────────────

export interface TraceVersions {
    /** DSL schema version this recipe was validated against */
    schema_version: string;
    /** Predicate engine implementation version */
    predicate_engine_version: string;
    /** Scoring aggregation engine version */
    scoring_engine_version: string;
    /** Swiss Ephemeris (or whichever ephemeris lib) version */
    ephemeris_lib: string;
    /** Application git SHA, if available */
    app_revision: string | null;
}

export interface TraceRecord {
    /** UUID v4 */
    request_id: string;
    /** ISO 8601 with timezone */
    timestamp: string;
    /** Authenticated user id, or null for anonymous */
    user_id: string | null;
    /** Original prompt as the user typed it */
    user_prompt: string;
    /** True if user requested verbose trace (admin / debug flag) */
    debug_mode: boolean;

    stage_intent_envelope: LLMStage<IntentEnvelope>;
    stage_date_range: StageDateRange;
    stage_recipe: LLMStage<Recipe>;
    stage_scoring: StageScoring;
    stage_output: StageOutput;
    /** New in 1.1.0: per-day per-vibe narratives. Undefined for v1.0.x traces. */
    stage_render_narratives?: StageRenderNarratives;

    total_latency_ms: number;
    total_cost_usd: number;
    versions: TraceVersions;

    /**
     * Free-form error info if any stage failed. When present, later
     * stages may be missing. Always include enough info to reproduce.
     */
    error: {
        stage: string;
        message: string;
        stack: string | null;
    } | null;
}

// ─── Convenience helpers ─────────────────────────────────────────────────────

export function newTraceRecordSkeleton(args: {
    request_id: string;
    user_id: string | null;
    user_prompt: string;
    debug_mode?: boolean;
}): Pick<TraceRecord, 'request_id' | 'timestamp' | 'user_id' | 'user_prompt' | 'debug_mode'> {
    return {
        request_id: args.request_id,
        timestamp: new Date().toISOString(),
        user_id: args.user_id,
        user_prompt: args.user_prompt,
        debug_mode: args.debug_mode ?? false,
    };
}
