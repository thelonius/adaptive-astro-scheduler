/**
 * Predicates over a single planet's state on a given day.
 *
 * Phase 1 implements only `planet_retrograde`. The rest
 * (`planet_combust`, `planet_dignified`, `planet_debilitated`,
 * `planet_in_sign`, `planet_in_house`) ship as runtime-erroring
 * stubs so the registry contract is complete; they're added in
 * follow-up commits with appropriate ephemeris/dignity-table support.
 */

import type { Predicate } from '../schema/dsl';
import type { DayContext, PredicateResult } from './types';

type Pick<T, K extends string> = T extends { type: K } ? T : never;

export function evalPlanetRetrograde(
    p: Pick<Predicate, 'planet_retrograde'>,
    ctx: DayContext,
): PredicateResult {
    const snapshot = ctx.planets[p.planet];
    return {
        matched: snapshot.isRetrograde,
        details: { planet: p.planet, speed: snapshot.speed },
    };
}

export function evalPlanetInSign(
    p: Pick<Predicate, 'planet_in_sign'>,
    ctx: DayContext,
): PredicateResult {
    const snapshot = ctx.planets[p.planet];
    return {
        matched: p.signs.includes(snapshot.sign),
        details: { planet: p.planet, sign: snapshot.sign, allowed: p.signs },
    };
}

export function evalPlanetInHouse(
    _p: Pick<Predicate, 'planet_in_house'>,
    _ctx: DayContext,
): PredicateResult {
    // Phase 2: requires location-aware house cusps + per-planet house
    // assignment. Returning matched: false so recipes that include
    // this predicate degrade gracefully (the predicate just doesn't
    // fire) until implemented.
    return {
        matched: false,
        details: { stub: true, reason: 'planet_in_house not implemented in phase 1' },
    };
}

export function evalPlanetCombust(
    p: Pick<Predicate, 'planet_combust'>,
    ctx: DayContext,
): PredicateResult {
    // Combust = within ~8.5° of Sun. Cheap enough to ship in phase 1.
    if (p.planet === 'Sun') return { matched: false, details: { reason: 'sun-by-itself' } };
    const planet = ctx.planets[p.planet];
    const sun = ctx.planets.Sun;
    const diff = Math.abs(((planet.longitude - sun.longitude + 540) % 360) - 180);
    const angularDistance = 180 - diff;
    return {
        matched: angularDistance <= 8.5,
        details: { planet: p.planet, angularDistanceDeg: angularDistance, threshold: 8.5 },
    };
}

export function evalPlanetDignified(
    _p: Pick<Predicate, 'planet_dignified'>,
    _ctx: DayContext,
): PredicateResult {
    // Phase 2: needs dignity tables (rulership / exaltation / triplicity).
    return {
        matched: false,
        details: { stub: true, reason: 'planet_dignified not implemented in phase 1' },
    };
}

export function evalPlanetDebilitated(
    _p: Pick<Predicate, 'planet_debilitated'>,
    _ctx: DayContext,
): PredicateResult {
    return {
        matched: false,
        details: { stub: true, reason: 'planet_debilitated not implemented in phase 1' },
    };
}
