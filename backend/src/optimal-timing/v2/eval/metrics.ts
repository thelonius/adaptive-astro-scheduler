/**
 * Eval metrics — phase 1: recipe-correctness only.
 *
 * Predicate matching: each `expected` entry is a partial JSON object.
 * An actual predicate matches if every key in `expected` equals the
 * corresponding key in actual. For arrays we require intersection
 * (≥ 1 element in common). Nested objects recurse.
 */

import type { PredicatePartial, PredicateCheckResult } from './types';

export function predicateMatches(
    expected: PredicatePartial,
    actual: Record<string, unknown>,
): boolean {
    for (const [k, v] of Object.entries(expected)) {
        const av = actual[k];
        if (Array.isArray(v)) {
            if (!Array.isArray(av)) return false;
            if (!v.some((x) => av.includes(x as unknown))) return false;
        } else if (v !== null && typeof v === 'object') {
            if (av === null || typeof av !== 'object' || Array.isArray(av)) return false;
            if (!predicateMatches(v as PredicatePartial, av as Record<string, unknown>)) return false;
        } else {
            if (av !== v) return false;
        }
    }
    return true;
}

export function checkPredicateList(
    expectedList: PredicatePartial[],
    actualList: Array<Record<string, unknown>>,
): PredicateCheckResult[] {
    return expectedList.map((expected) => {
        const matchedAgainst = actualList.find((actual) => predicateMatches(expected, actual));
        return {
            expected,
            matched: !!matchedAgainst,
            matchedAgainst,
        };
    });
}

export function recall(checks: PredicateCheckResult[]): number {
    if (checks.length === 0) return 1; // vacuous: nothing expected = nothing missed
    const hits = checks.filter((c) => c.matched).length;
    return hits / checks.length;
}

/**
 * A query "passes" if every must_* check matches (recall = 1) on
 * disqualifiers and weighted_must. Should-predicates don't gate pass.
 */
export function isPass(
    disqualifierChecks: PredicateCheckResult[],
    weightedMustChecks: PredicateCheckResult[],
): boolean {
    return recall(disqualifierChecks) === 1 && recall(weightedMustChecks) === 1;
}
