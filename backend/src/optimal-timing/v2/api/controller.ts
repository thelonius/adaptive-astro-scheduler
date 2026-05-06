/**
 * v2 HTTP controller — phase 1 + 2 + Phase A vibes/narratives.
 *
 * Endpoints:
 *   POST /api/optimal-timing/v2/find-with-fixed-recipe
 *     Run scoring against one of the 5 canonical recipes by id, or an
 *     inline recipe object. Use to validate the engine without LLM.
 *
 *   POST /api/optimal-timing/v2/find-with-intent
 *     Free-text intent → LLM-generated Recipe (with vibes) → scoring →
 *     LLM-rendered per-day per-vibe narratives. Optional natal_chart_id
 *     in the request grounds narratives in the user's natal chart and
 *     embeds the chart in the response for biwheel rendering on the
 *     client.
 *
 *     Request body:
 *       {
 *         intent: string,                    // free-text user prompt
 *         start_date: string,                // YYYY-MM-DD
 *         end_date: string,                  // YYYY-MM-DD
 *         top_n?: number,                    // default 10
 *         language?: 'ru' | 'en' | 'auto',
 *         natal_chart_id?: string,           // optional UUID
 *         bypass_cache?: boolean,
 *         debug?: boolean,
 *       }
 *
 *     Response includes generated_recipe.vibes,
 *     windows[i].vibe_narratives { [vibeId]: text }, and
 *     natal_chart (full chart object or null).
 *
 *   GET /api/optimal-timing/v2/traces/:id
 *     Fetch a persisted TraceRecord.
 *
 *   GET /api/optimal-timing/v2/recipes
 *     List available canonical recipe ids.
 */

import type { Request, Response } from 'express';
import { getSharedEphemerisCalculator } from '../../../core/ephemeris';
import {
    findWithFixedRecipe, loadCanonicalRecipe,
} from '../pipeline';
import { TraceStore } from '../trace/store';
import { tryParseRecipe } from '../schema/dsl';
import { generateRecipe } from '../llm/recipe-generator';
import { renderNarratives } from '../llm/narratives-generator';
import { natalChartRepository } from '../../../database/repositories';

const CANONICAL_IDS = [
    'business_launch',
    'marriage_relationship',
    'mercury_matters',
    'mars_matters',
    'jupiter_matters',
] as const;
type CanonicalId = typeof CANONICAL_IDS[number];

export class OptimalTimingV2Controller {
    private ephemeris = getSharedEphemerisCalculator();
    private traceStore = new TraceStore();

    async findWithFixedRecipe(req: Request, res: Response): Promise<void> {
        try {
            const {
                recipe_id,
                recipe: customRecipe,
                start_date,
                end_date,
                location,
                user_prompt = '',
                top_n = 10,
                debug = false,
            } = req.body ?? {};

            // Recipe: either a canonical id or an inline recipe object.
            let recipe;
            if (typeof recipe_id === 'string') {
                if (!CANONICAL_IDS.includes(recipe_id as CanonicalId)) {
                    res.status(400).json({
                        error: 'Unknown recipe_id',
                        valid_ids: CANONICAL_IDS,
                    });
                    return;
                }
                recipe = loadCanonicalRecipe(recipe_id as CanonicalId);
            } else if (customRecipe) {
                const parsed = tryParseRecipe(customRecipe);
                if (!parsed) {
                    res.status(400).json({ error: 'Recipe failed schema validation' });
                    return;
                }
                recipe = parsed;
            } else {
                res.status(400).json({
                    error: 'Provide either recipe_id (canonical) or recipe (inline)',
                });
                return;
            }

            if (!start_date || !end_date) {
                res.status(400).json({ error: 'start_date and end_date are required (YYYY-MM-DD)' });
                return;
            }
            if (!isISODate(start_date) || !isISODate(end_date)) {
                res.status(400).json({ error: 'Dates must be YYYY-MM-DD' });
                return;
            }

            const loc = location ?? { latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow' };

            const result = await findWithFixedRecipe(
                {
                    user_prompt,
                    recipe,
                    start_date,
                    end_date,
                    location: loc,
                    top_n: Math.max(1, Math.min(50, Number(top_n) || 10)),
                    debug_mode: !!debug,
                },
                { ephemeris: this.ephemeris, traceStore: this.traceStore },
            );

            res.json({
                request_id: result.trace.request_id,
                recipe_id: typeof recipe_id === 'string' ? recipe_id : null,
                date_range: { start: start_date, end: end_date },
                summary: result.trace.stage_output.response_summary,
                windows: result.windows.map((w) => ({
                    date: w.date,
                    score: w.raw_score,
                    rank: w.rank,
                    matched_predicates: w.predicates_fired
                        .filter((p) => p.matched && p.weight !== null)
                        .map((p) => ({ type: p.predicate_type, weight: p.weight, details: p.match_details })),
                    moon: w.ephemeris_snapshot.moon,
                    sun_sign: w.ephemeris_snapshot.sun_sign,
                    retrograde_planets: w.ephemeris_snapshot.retrograde_planets,
                })),
                disqualified_days: result.trace.stage_scoring.days_disqualified,
                cost: { total_usd: result.trace.total_cost_usd, latency_ms: result.trace.total_latency_ms },
                trace: debug ? result.trace : undefined,
            });
        } catch (e) {
            console.error('[v2] find-with-fixed-recipe error:', e);
            res.status(500).json({
                error: 'Failed to compute timing windows',
                message: e instanceof Error ? e.message : String(e),
            });
        }
    }

    async findWithIntent(req: Request, res: Response): Promise<void> {
        try {
            const {
                intent,
                start_date,
                end_date,
                location,
                top_n = 10,
                debug = false,
                language,
                bypass_cache = false,
                natal_chart_id,
            } = req.body ?? {};

            if (typeof intent !== 'string' || !intent.trim()) {
                res.status(400).json({ error: 'intent (string) is required' });
                return;
            }
            if (!start_date || !end_date) {
                res.status(400).json({ error: 'start_date and end_date are required (YYYY-MM-DD)' });
                return;
            }
            if (!isISODate(start_date) || !isISODate(end_date)) {
                res.status(400).json({ error: 'Dates must be YYYY-MM-DD' });
                return;
            }

            const loc = location ?? { latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow' };
            const locationContext = location?.timezone
                ? `lat=${location.latitude}, lon=${location.longitude}, tz=${location.timezone}`
                : 'unknown';

            // Stage 1: LLM generates a Recipe from free-text intent.
            let generation;
            try {
                generation = await generateRecipe({
                    intent,
                    locationContext,
                    today: new Date().toISOString().slice(0, 10),
                    language,
                    bypassCache: !!bypass_cache,
                });
            } catch (e) {
                res.status(502).json({
                    error: 'Failed to generate recipe from intent',
                    message: e instanceof Error ? e.message : String(e),
                    stage: 'llm_recipe_generation',
                });
                return;
            }

            // Stage 2: feed the generated recipe into the existing pipeline.
            const result = await findWithFixedRecipe(
                {
                    user_prompt: intent,
                    recipe: generation.recipe,
                    start_date,
                    end_date,
                    location: loc,
                    top_n: Math.max(1, Math.min(50, Number(top_n) || 10)),
                    debug_mode: !!debug,
                },
                { ephemeris: this.ephemeris, traceStore: this.traceStore },
            );

            // Stage 4: optional natal chart fetch
            let natal: Awaited<ReturnType<typeof natalChartRepository.findById>> = null;
            if (typeof natal_chart_id === 'string' && natal_chart_id.length > 0) {
                try {
                    natal = await natalChartRepository.findById(natal_chart_id);
                } catch (e) {
                    console.warn('[v2] failed to fetch natal chart, continuing without:', e);
                }
            }

            // Stage 5: per-day per-vibe narratives.
            // result.windows is already the ranked survivors (ScoredDay[] with non-null rank),
            // produced by rankWindows in pipeline/index.ts.
            let narrativeResult: Awaited<ReturnType<typeof renderNarratives>> | null = null;
            try {
                narrativeResult = await renderNarratives({
                    intent,
                    recipe: generation.recipe,
                    windows: result.windows,
                    natal_chart: natal as any,
                    language,
                });
            } catch (e) {
                console.warn('[v2] renderNarratives failed, continuing with empty narratives:', e);
            }

            res.json({
                request_id: result.trace.request_id,
                intent,
                date_range: { start: start_date, end: end_date },
                generated_recipe: {
                    intent: generation.recipe.intent,
                    rationale: generation.recipe.rationale,
                    disqualifiers: generation.recipe.disqualifiers,
                    weighted_conditions: generation.recipe.weighted_conditions,
                    vibes: generation.recipe.vibes,
                    metadata: generation.recipe.metadata,
                },
                llm: {
                    model: generation.model,
                    prompt_version: generation.promptVersion,
                    cached: generation.cached,
                    attempts: generation.attempts,
                },
                narratives_llm: narrativeResult ? {
                    model: narrativeResult.llm.model,
                    prompt_version: narrativeResult.llm.prompt_version,
                    cached: narrativeResult.llm.cached,
                    attempts: narrativeResult.attempts,
                    latency_ms: narrativeResult.llm.latency_ms,
                } : null,
                summary: result.trace.stage_output.response_summary,
                windows: result.windows.map((w) => ({
                    date: w.date,
                    score: w.raw_score,
                    rank: w.rank,
                    matched_predicates: w.predicates_fired
                        .filter((p) => p.matched && p.weight !== null)
                        .map((p) => ({ type: p.predicate_type, weight: p.weight, details: p.match_details })),
                    moon: w.ephemeris_snapshot.moon,
                    sun_sign: w.ephemeris_snapshot.sun_sign,
                    retrograde_planets: w.ephemeris_snapshot.retrograde_planets,
                    vibe_narratives: narrativeResult?.narratives[w.date] ?? {},
                })),
                natal_chart: natal,
                disqualified_days: result.trace.stage_scoring.days_disqualified,
                cost: { total_usd: result.trace.total_cost_usd, latency_ms: result.trace.total_latency_ms },
                trace: debug ? result.trace : undefined,
            });
        } catch (e) {
            console.error('[v2] find-with-intent error:', e);
            res.status(500).json({
                error: 'Failed to compute timing windows from intent',
                message: e instanceof Error ? e.message : String(e),
            });
        }
    }

    async getTrace(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Missing trace id' });
                return;
            }
            const trace = await this.traceStore.findById(id);
            if (!trace) {
                res.status(404).json({ error: 'Trace not found', request_id: id });
                return;
            }
            res.json(trace);
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
        }
    }

    async listRecipes(_req: Request, res: Response): Promise<void> {
        const recipes = CANONICAL_IDS.map((id) => {
            const r = loadCanonicalRecipe(id);
            return {
                id,
                intent: r.intent,
                rationale: r.rationale,
                disqualifier_count: r.disqualifiers.length,
                weighted_condition_count: r.weighted_conditions.length,
            };
        });
        res.json({ recipes });
    }
}

function isISODate(s: unknown): s is string {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
