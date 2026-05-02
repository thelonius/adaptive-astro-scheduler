/**
 * Predicate registry.
 *
 * Maps the discriminator string `predicate.type` (from the DSL Zod
 * schema) to its implementation. The scoring engine uses this
 * registry exclusively; never imports individual predicate files.
 *
 * Adding a new predicate:
 *   1. Add it to the discriminatedUnion in `../schema/dsl.ts`.
 *   2. Implement `eval<Name>` in the appropriate file.
 *   3. Register here.
 *   4. Bump PREDICATE_ENGINE_VERSION below.
 *   5. Bump SCHEMA_VERSION in dsl.ts.
 */

import type { Predicate } from '../schema/dsl';
import type { DayContext, PredicateResult } from './types';
import {
    evalMoonWaxing, evalMoonWaning, evalMoonPhase, evalMoonVoidOfCourse,
    evalMoonInSign, evalMoonNotInSign,
} from './moon';
import {
    evalPlanetRetrograde, evalPlanetInSign, evalPlanetInHouse,
    evalPlanetCombust, evalPlanetDignified, evalPlanetDebilitated,
} from './planet-state';
import { evalAspect, evalNoAspect } from './aspects';

/**
 * Bump this on any predicate-impl change (semantic shift, new branch,
 * I/O dependency change). Traces record this version so old runs can
 * be replayed against the engine that produced them.
 *
 * History:
 *   0.1.0 — initial scaffold, all predicates against single noon snapshot.
 *   0.2.0 — `aspect` predicate honors `window` parameter. Default
 *           `perfects_in_day` reads from `DayContext.perfections`
 *           (pre-computed for the whole window) instead of the noon
 *           `aspects` snapshot. Old `applying_at_noon` semantic
 *           remains available as opt-in. Schema bumped to 1.1.0.
 */
export const PREDICATE_ENGINE_VERSION = '0.2.0';

type Registry = {
    [K in Predicate['type']]: (
        predicate: Extract<Predicate, { type: K }>,
        ctx: DayContext,
    ) => PredicateResult;
};

export const PREDICATE_REGISTRY: Registry = {
    moon_waxing: evalMoonWaxing,
    moon_waning: evalMoonWaning,
    moon_phase: evalMoonPhase,
    moon_void_of_course: evalMoonVoidOfCourse,
    moon_in_sign: evalMoonInSign,
    moon_not_in_sign: evalMoonNotInSign,
    planet_retrograde: evalPlanetRetrograde,
    planet_combust: evalPlanetCombust,
    planet_dignified: evalPlanetDignified,
    planet_debilitated: evalPlanetDebilitated,
    planet_in_sign: evalPlanetInSign,
    planet_in_house: evalPlanetInHouse,
    aspect: evalAspect,
    no_aspect: evalNoAspect,
};

/**
 * Evaluate a single predicate against a day context.
 * Type-narrows on the discriminator so each impl gets its specific predicate type.
 */
export function evaluatePredicate(predicate: Predicate, ctx: DayContext): PredicateResult {
    const impl = PREDICATE_REGISTRY[predicate.type] as (
        p: Predicate,
        ctx: DayContext,
    ) => PredicateResult;
    return impl(predicate, ctx);
}

/**
 * Stable list of predicate types not yet implemented in this version.
 * Score-day uses this to skip them with a logged warning rather than
 * silently treating them as `matched: false`.
 */
export const STUB_PREDICATES: ReadonlySet<Predicate['type']> = new Set([
    'planet_dignified',
    'planet_debilitated',
    'planet_in_house',
]);
