/**
 * Aspect predicates.
 *
 * `aspect` matches if the day's aspect list contains an aspect
 * between `from` and `to` of one of the listed types, within orb,
 * and (optionally) applying. `no_aspect` is the strict inverse.
 */

import type { Predicate } from '../schema/dsl';
import type { DayContext, PredicateResult, AspectSnapshot } from './types';

type Pick<T, K extends string> = T extends { type: K } ? T : never;

const DEFAULT_MAX_ORB_DEG = 6;

function findMatchingAspect(
    ctx: DayContext,
    from: string,
    to: string,
    aspectTypes: string[],
    maxOrbDeg: number,
    requireApplying: boolean | undefined,
): AspectSnapshot | null {
    for (const a of ctx.aspects) {
        const involves =
            (a.from === from && a.to === to) ||
            (a.from === to && a.to === from);
        if (!involves) continue;
        if (!aspectTypes.includes(a.type)) continue;
        if (a.orbDeg > maxOrbDeg) continue;
        if (requireApplying === true && a.applying !== true) continue;
        if (requireApplying === false && a.applying === true) continue;
        return a;
    }
    return null;
}

export function evalAspect(
    p: Pick<Predicate, 'aspect'>,
    ctx: DayContext,
): PredicateResult {
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
            },
        };
    }
    return {
        matched: false,
        details: {
            looked_for: { from: p.from, to: p.to, aspects: p.aspects, maxOrbDeg: maxOrb, applying: p.applying ?? null },
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
