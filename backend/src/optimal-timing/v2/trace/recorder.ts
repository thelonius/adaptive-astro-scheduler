/**
 * TraceRecorder accumulates a partial TraceRecord across pipeline
 * stages and produces a final immutable record at `.build()`.
 *
 * Usage:
 *   const recorder = new TraceRecorder({ user_prompt, user_id, debug_mode });
 *   recorder.recordIntentEnvelope(stage1Result);
 *   recorder.recordDateRange(stage2Result);
 *   recorder.recordRecipe(stage3Result);
 *   recorder.recordScoring(stage4Result);
 *   recorder.recordOutput(stage5Result);
 *   const trace = recorder.build();
 *
 * Errors are recorded with `recorder.recordError(stage, err)`. The
 * resulting trace is still well-formed; later stages are simply
 * absent.
 */

import { randomUUID } from 'crypto';
import type {
    TraceRecord, LLMStage, StageDateRange, StageScoring, StageOutput, TraceVersions,
} from '../schema/trace';
import type { IntentEnvelope } from '../schema/intent-envelope';
import type { Recipe } from '../schema/dsl';
import { SCHEMA_VERSION } from '../schema/dsl';
import { PREDICATE_ENGINE_VERSION } from '../predicates';
import { SCORING_ENGINE_VERSION } from '../pipeline/score-day';

export interface TraceRecorderInit {
    user_prompt: string;
    user_id?: string | null;
    debug_mode?: boolean;
    appRevision?: string | null;
}

export class TraceRecorder {
    private readonly request_id: string;
    private readonly start_ms: number;
    private readonly partial: Partial<TraceRecord>;
    private totalCost = 0;

    constructor(init: TraceRecorderInit) {
        this.request_id = randomUUID();
        this.start_ms = Date.now();
        this.partial = {
            request_id: this.request_id,
            timestamp: new Date().toISOString(),
            user_id: init.user_id ?? null,
            user_prompt: init.user_prompt,
            debug_mode: init.debug_mode ?? false,
            error: null,
            versions: {
                schema_version: SCHEMA_VERSION,
                predicate_engine_version: PREDICATE_ENGINE_VERSION,
                scoring_engine_version: SCORING_ENGINE_VERSION,
                ephemeris_lib: 'swisseph-0.5.17',
                app_revision: init.appRevision ?? null,
            } satisfies TraceVersions,
        };
    }

    getRequestId(): string {
        return this.request_id;
    }

    recordIntentEnvelope(stage: LLMStage<IntentEnvelope>): void {
        this.partial.stage_intent_envelope = stage;
        this.totalCost += stage.cost_usd;
    }

    recordDateRange(stage: StageDateRange): void {
        this.partial.stage_date_range = stage;
    }

    recordRecipe(stage: LLMStage<Recipe>): void {
        this.partial.stage_recipe = stage;
        this.totalCost += stage.cost_usd;
    }

    recordScoring(stage: StageScoring): void {
        this.partial.stage_scoring = stage;
    }

    recordOutput(stage: StageOutput): void {
        this.partial.stage_output = stage;
    }

    recordError(stage: string, err: unknown): void {
        const e = err instanceof Error ? err : new Error(String(err));
        this.partial.error = {
            stage,
            message: e.message,
            stack: e.stack ?? null,
        };
    }

    build(): TraceRecord {
        const elapsed = Date.now() - this.start_ms;
        return {
            request_id: this.request_id,
            timestamp: this.partial.timestamp!,
            user_id: this.partial.user_id ?? null,
            user_prompt: this.partial.user_prompt!,
            debug_mode: this.partial.debug_mode ?? false,
            stage_intent_envelope: this.partial.stage_intent_envelope as TraceRecord['stage_intent_envelope'],
            stage_date_range: this.partial.stage_date_range as TraceRecord['stage_date_range'],
            stage_recipe: this.partial.stage_recipe as TraceRecord['stage_recipe'],
            stage_scoring: this.partial.stage_scoring as TraceRecord['stage_scoring'],
            stage_output: this.partial.stage_output as TraceRecord['stage_output'],
            total_latency_ms: elapsed,
            total_cost_usd: Number(this.totalCost.toFixed(6)),
            versions: this.partial.versions!,
            error: this.partial.error ?? null,
        };
    }
}
