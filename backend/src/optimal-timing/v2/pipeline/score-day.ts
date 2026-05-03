/**
 * Apply a Recipe to one DayContext. Pure function, no I/O.
 *
 * Two-stage scoring:
 *   1. Disqualifiers: any match → day is dropped (raw_score = 0,
 *      rank null, predicates_fired records what triggered it).
 *   2. Weighted conditions: sum of matched weights becomes raw_score.
 *
 * The function records EVERY predicate the engine evaluated —
 * matched or not — so debug UI can show why a day got the score
 * it did, including the negative space ("here are the things we
 * looked for but didn't find").
 */

import type { Recipe, Predicate } from '../schema/dsl';
import type { DayContext } from '../predicates/types';
import { evaluatePredicate, STUB_PREDICATES } from '../predicates';
import type { ScoredDay, PredicateFiring, DayEphemerisSummary } from '../schema/trace';

export const SCORING_ENGINE_VERSION = '0.1.0';

export interface ScoreDayResult {
    /** Compiled ScoredDay record ready to embed in a TraceRecord. */
    scored: ScoredDay;
    /** Convenience flag: was this day disqualified? */
    disqualified: boolean;
    /** Disqualification reasons (predicate type names). Empty if not disqualified. */
    disqualificationReasons: string[];
}

export function scoreDay(recipe: Recipe, ctx: DayContext): ScoreDayResult {
    const firings: PredicateFiring[] = [];
    const disqualificationReasons: string[] = [];

    // Stage 1: disqualifiers. Evaluate ALL of them (not short-circuit)
    // so the trace shows the full picture of what was checked.
    for (const predicate of recipe.disqualifiers) {
        const result = evalSafe(predicate, ctx);
        firings.push({
            predicate_type: predicate.type,
            predicate,
            weight: null,
            matched: result.matched,
            match_details: result.details,
        });
        if (result.matched) disqualificationReasons.push(predicate.type);
    }

    // Stage 2: weighted conditions. Even if disqualified, evaluate
    // them — debug UI uses this to show "here's what would have
    // contributed if this day weren't disqualified".
    let rawScore = 0;
    for (const wc of recipe.weighted_conditions) {
        const result = evalSafe(wc.predicate, ctx);
        firings.push({
            predicate_type: wc.predicate.type,
            predicate: wc.predicate,
            weight: wc.weight,
            matched: result.matched,
            match_details: result.details,
        });
        if (result.matched) rawScore += wc.weight;
    }

    // Clamp raw score to a sane range. Recipes usually keep weights in
    // [-30, +30], so a recipe with say 6 weighted_conditions could
    // theoretically reach ±180. Clamp to 0..100 for UI display.
    // Disqualified days display as 0 — the disqualified flag is the
    // real signal but the score field needs to be unambiguous in UI.
    const clamped = disqualificationReasons.length > 0
        ? 0
        : Math.max(0, Math.min(100, 50 + rawScore));

    const scored: ScoredDay = {
        date: ctx.date,
        raw_score: clamped,
        rank: null, // assigned by rank-windows.ts
        predicates_fired: firings,
        ephemeris_snapshot: summarize(ctx),
    };

    return {
        scored,
        disqualified: disqualificationReasons.length > 0,
        disqualificationReasons,
    };
}

function evalSafe(
    predicate: Predicate,
    ctx: DayContext,
): { matched: boolean; details: Record<string, unknown> } {
    if (STUB_PREDICATES.has(predicate.type)) {
        return {
            matched: false,
            details: {
                stub: true,
                note: `${predicate.type} not yet implemented; treated as non-match`,
            },
        };
    }
    try {
        return evaluatePredicate(predicate, ctx);
    } catch (e) {
        return {
            matched: false,
            details: {
                error: e instanceof Error ? e.message : String(e),
                predicate_type: predicate.type,
            },
        };
    }
}

function summarize(ctx: DayContext): DayEphemerisSummary {
    const retrogradePlanets = Object.values(ctx.planets)
        .filter((p) => p.isRetrograde)
        .map((p) => p.planet);

    const notable = ctx.aspects
        .filter((a) => a.orbDeg <= 4) // tight aspects only for debug brevity
        .slice(0, 6)
        .map((a) => ({
            from: a.from,
            to: a.to,
            type: a.type,
            orb_deg: a.orbDeg,
            applying: a.applying ?? false,
        }));

    return {
        moon: {
            sign: ctx.moon.sign,
            phase: ctx.moon.phase,
            illumination: Number(ctx.moon.illumination.toFixed(3)),
            void_of_course: ctx.moon.voidOfCourse,
        },
        sun_sign: ctx.planets.Sun.sign,
        retrograde_planets: retrogradePlanets,
        notable_aspects: notable,
    };
}
