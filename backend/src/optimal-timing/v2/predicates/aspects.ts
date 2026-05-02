/**
 * Aspect predicates.
 *
 * `aspect` matches when the day contains an aspect of one of the listed
 * types between `from` and `to`. Two semantic windows for `applying`:
 *
 *   - applying:true + window:'perfects_in_day' (default): the aspect
 *     reaches exactness within the calendar day. Looked up against
 *     `ctx.perfections` (pre-computed for the whole query window).
 *     Strongest signal — matches what traditional electional sources
 *     mean by "Moon applying to X".
 *   - applying:true + window:'applying_at_noon': cheap fallback. The
 *     noon snapshot in `ctx.aspects` flags applying. Misses applying
 *     periods that don't include noon.
 *   - applying:false or applying:undefined: always against the noon
 *     snapshot, regardless of `window`. (window only modulates
 *     applying:true.)
 *
 * `no_aspect` is the strict inverse over the noon snapshot only —
 * "perfection didn't occur today" is a separate question and not
 * what the predicate is for.
 */

import type { Predicate } from '../schema/dsl';
import type { DayContext, PredicateResult, AspectSnapshot, AspectPerfection } from './types';

type Pick<T, K extends string> = T extends { type: K } ? T : never;

const DEFAULT_MAX_ORB_DEG = 6;
const DEFAULT_APPLYING_WINDOW = 'perfects_in_day';

function involvesPair(a: { from: string; to: string }, from: string, to: string): boolean {
    return (a.from === from && a.to === to) || (a.from === to && a.to === from);
}

function findMatchingAspect(
    ctx: DayContext,
    from: string,
    to: string,
    aspectTypes: string[],
    maxOrbDeg: number,
    requireApplying: boolean | undefined,
): AspectSnapshot | null {
    for (const a of ctx.aspects) {
        if (!involvesPair(a, from, to)) continue;
        if (!aspectTypes.includes(a.type)) continue;
        if (a.orbDeg > maxOrbDeg) continue;
        if (requireApplying === true && a.applying !== true) continue;
        if (requireApplying === false && a.applying === true) continue;
        return a;
    }
    return null;
}

function findPerfectionInDay(
    ctx: DayContext,
    from: string,
    to: string,
    aspectTypes: string[],
): AspectPerfection | null {
    for (const p of ctx.perfections) {
        if (!involvesPair(p, from, to)) continue;
        if (!aspectTypes.includes(p.type)) continue;
        return p;
    }
    return null;
}

export function evalAspect(
    p: Pick<Predicate, 'aspect'>,
    ctx: DayContext,
): PredicateResult {
    const window = p.window ?? DEFAULT_APPLYING_WINDOW;

    // Branch 1: applying:true + perfects_in_day (default). Look at the
    // pre-computed perfections list rather than the noon snapshot.
    if (p.applying === true && window === 'perfects_in_day') {
        const hit = findPerfectionInDay(ctx, p.from, p.to, p.aspects);
        if (hit) {
            return {
                matched: true,
                details: {
                    from: hit.from,
                    to: hit.to,
                    type: hit.type,
                    exact_at: hit.exactAt.toISOString(),
                    window: 'perfects_in_day',
                },
            };
        }
        return {
            matched: false,
            details: {
                looked_for: {
                    from: p.from, to: p.to, aspects: p.aspects,
                    applying: true, window: 'perfects_in_day',
                },
            },
        };
    }

    // Branch 2: noon-snapshot semantics (applying:false, applying:undefined,
    // or explicit window:'applying_at_noon').
    const maxOrb = p.max_orb_deg ?? DEFAULT_MAX_ORB_DEG;
    const match = findMatchingAspect(ctx, p.from, p.to, p.aspects, maxOrb, p.applying);

    if (match) {
        return {
            matched: true,
            details: {
                from: match.from,
                to: match.to,
                type: match.type,
                orbDeg: match.orbDeg,
                applying: match.applying,
                window: 'applying_at_noon',
            },
        };
    }
    return {
        matched: false,
        details: {
            looked_for: {
                from: p.from, to: p.to, aspects: p.aspects,
                maxOrbDeg: maxOrb,
                applying: p.applying ?? null,
                window: 'applying_at_noon',
            },
        },
    };
}

export function evalNoAspect(
    p: Pick<Predicate, 'no_aspect'>,
    ctx: DayContext,
): PredicateResult {
    const maxOrb = p.max_orb_deg ?? DEFAULT_MAX_ORB_DEG;
    const match = findMatchingAspect(ctx, p.from, p.to, p.aspects, maxOrb, undefined);

    return {
        matched: match === null,
        details: {
            from: p.from,
            to: p.to,
            forbiddenAspects: p.aspects,
            maxOrbDeg: maxOrb,
            offendingAspect: match
                ? { type: match.type, orbDeg: match.orbDeg }
                : null,
        },
    };
}
