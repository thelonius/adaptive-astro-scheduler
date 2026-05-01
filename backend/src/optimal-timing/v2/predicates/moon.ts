/**
 * Moon-related predicate implementations.
 *
 * All of these rely on `ctx.moon` which is built once per day in
 * `pipeline/build-day-context.ts`. They never call the ephemeris.
 */

import type { Predicate } from '../schema/dsl';
import type { DayContext, PredicateResult } from './types';

type Pick<T, K extends string> = T extends { type: K } ? T : never;

export function evalMoonWaxing(
    _p: Pick<Predicate, 'moon_waxing'>,
    ctx: DayContext,
): PredicateResult {
    return {
        matched: ctx.moon.isWaxing,
        details: { phase: ctx.moon.phase, illumination: ctx.moon.illumination },
    };
}

export function evalMoonWaning(
    _p: Pick<Predicate, 'moon_waning'>,
    ctx: DayContext,
): PredicateResult {
    return {
        matched: !ctx.moon.isWaxing,
        details: { phase: ctx.moon.phase, illumination: ctx.moon.illumination },
    };
}

export function evalMoonPhase(
    p: Pick<Predicate, 'moon_phase'>,
    ctx: DayContext,
): PredicateResult {
    return {
        matched: p.phases.includes(ctx.moon.phase),
        details: { phase: ctx.moon.phase, allowed: p.phases },
    };
}

export function evalMoonVoidOfCourse(
    _p: Pick<Predicate, 'moon_void_of_course'>,
    ctx: DayContext,
): PredicateResult {
    return {
        matched: ctx.moon.voidOfCourse,
        details: { voidOfCourse: ctx.moon.voidOfCourse, sign: ctx.moon.sign },
    };
}

export function evalMoonInSign(
    p: Pick<Predicate, 'moon_in_sign'>,
    ctx: DayContext,
): PredicateResult {
    return {
        matched: p.signs.includes(ctx.moon.sign),
        details: { sign: ctx.moon.sign, allowed: p.signs },
    };
}

export function evalMoonNotInSign(
    p: Pick<Predicate, 'moon_not_in_sign'>,
    ctx: DayContext,
): PredicateResult {
    return {
        matched: !p.signs.includes(ctx.moon.sign),
        details: { sign: ctx.moon.sign, forbidden: p.signs },
    };
}
