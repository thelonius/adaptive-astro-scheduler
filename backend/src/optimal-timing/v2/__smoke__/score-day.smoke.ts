/**
 * Smoke test for the v2 scoring engine.
 *
 * Builds a synthetic DayContext (no ephemeris) and runs scoreDay
 * against each of the 5 canonical recipes. Verifies:
 *   - score is in [0, 100]
 *   - disqualifiers correctly drop days
 *   - predicate firings are recorded
 *   - the trace shape is well-formed
 *
 * Run with:
 *   npx tsx backend/src/optimal-timing/v2/__smoke__/score-day.smoke.ts
 *
 * Exits 0 on success, 1 on any assertion failure.
 */

import { scoreDay } from '../pipeline/score-day';
import type { DayContext } from '../predicates/types';
import type { Recipe } from '../schema/dsl';
import { tryParseRecipe } from '../schema/dsl';

// Inline loadCanonicalRecipe (kept self-contained so this file
// doesn't pull pipeline/index.ts and its ephemeris dependencies)
const canonicalData = require('../prompts/examples/canonical-recipes.json') as {
    recipes: Array<Record<string, unknown> & { _id: string }>;
};
function loadCanonicalRecipe(id:
    'business_launch' | 'marriage_relationship' | 'mercury_matters' | 'mars_matters' | 'jupiter_matters',
): Recipe {
    const found = canonicalData.recipes.find((r) => r._id === id);
    if (!found) throw new Error(`Canonical recipe not found: ${id}`);
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(found)) {
        if (!k.startsWith('_')) cleaned[k] = v;
    }
    const parsed = tryParseRecipe(cleaned);
    if (!parsed) throw new Error(`Canonical recipe ${id} failed schema validation`);
    return parsed;
}

let failures = 0;
function assert(cond: boolean, msg: string): void {
    if (!cond) {
        console.error(`  FAIL: ${msg}`);
        failures++;
    } else {
        console.log(`  ok:   ${msg}`);
    }
}

/**
 * A favorable synthetic day: waxing Moon in Taurus, no VoC,
 * Mercury direct, Moon in applying trine to Venus and Jupiter
 * (perfections supplied for predicate_engine 0.2.0+ which uses
 * `perfects_in_day` semantics by default), no Moon-Saturn
 * affliction, Jupiter in 10th house (we treat that as "matched:
 * false" because planet_in_house is stubbed in phase 1).
 */
function favorableDay(): DayContext {
    return {
        date: '2026-05-15',
        referenceTime: new Date('2026-05-15T12:00:00Z'),
        location: { latitude: 55.76, longitude: 37.62, timezone: 'Europe/Moscow' },
        moon: {
            sign: 'Taurus',
            longitude: 35,
            illumination: 0.65,
            phase: 'waxing_gibbous',
            isWaxing: true,
            voidOfCourse: false,
        },
        planets: {
            Sun: { planet: 'Sun', longitude: 25, sign: 'Taurus', speed: 1, isRetrograde: false },
            Moon: { planet: 'Moon', longitude: 35, sign: 'Taurus', speed: 13, isRetrograde: false },
            Mercury: { planet: 'Mercury', longitude: 30, sign: 'Taurus', speed: 1.5, isRetrograde: false },
            Venus: { planet: 'Venus', longitude: 155, sign: 'Virgo', speed: 1.2, isRetrograde: false },
            Mars: { planet: 'Mars', longitude: 200, sign: 'Libra', speed: 0.5, isRetrograde: false },
            Jupiter: { planet: 'Jupiter', longitude: 275, sign: 'Capricorn', speed: 0.1, isRetrograde: false },
            Saturn: { planet: 'Saturn', longitude: 340, sign: 'Pisces', speed: 0.05, isRetrograde: false },
            Uranus: { planet: 'Uranus', longitude: 65, sign: 'Gemini', speed: 0.04, isRetrograde: false },
            Neptune: { planet: 'Neptune', longitude: 5, sign: 'Aries', speed: 0.03, isRetrograde: false },
            Pluto: { planet: 'Pluto', longitude: 305, sign: 'Aquarius', speed: 0.02, isRetrograde: false },
        },
        aspects: [
            { from: 'Moon', to: 'Venus', type: 'trine', orbDeg: 1.0, applying: true },
            { from: 'Moon', to: 'Jupiter', type: 'sextile', orbDeg: 0.5, applying: true },
        ],
        perfections: [
            { from: 'Moon', to: 'Venus', type: 'trine', exactAt: new Date('2026-05-15T14:30:00Z') },
            { from: 'Moon', to: 'Jupiter', type: 'sextile', exactAt: new Date('2026-05-15T18:45:00Z') },
        ],
        houseCusps: null,
    };
}

/**
 * An unfavorable synthetic day: Moon void of course, Mercury
 * retrograde — should disqualify the business_launch recipe.
 */
function unfavorableDay(): DayContext {
    const fav = favorableDay();
    return {
        ...fav,
        date: '2026-05-04',
        moon: { ...fav.moon, voidOfCourse: true },
        planets: {
            ...fav.planets,
            Mercury: { ...fav.planets.Mercury, isRetrograde: true, speed: -0.5 },
        },
    };
}

console.log('=== Canonical recipe load ===');
const businessLaunch = loadCanonicalRecipe('business_launch');
assert(businessLaunch.disqualifiers.length === 2, 'business_launch has 2 disqualifiers');
assert(businessLaunch.weighted_conditions.length === 4, 'business_launch has 4 weighted conditions');

console.log('\n=== Favorable day ===');
const favResult = scoreDay(businessLaunch, favorableDay());
console.log(`  score=${favResult.scored.raw_score}, disqualified=${favResult.disqualified}`);
assert(!favResult.disqualified, 'favorable day not disqualified');
assert(favResult.scored.raw_score > 50, 'favorable day scores above neutral');
assert(favResult.scored.raw_score <= 100, 'score within [0, 100]');
assert(
    favResult.scored.predicates_fired.some(
        (p) => p.predicate_type === 'moon_waxing' && p.matched,
    ),
    'moon_waxing matched',
);
assert(
    favResult.scored.predicates_fired.some(
        (p) => p.predicate_type === 'aspect' && p.matched && (p.match_details as any).to === 'Jupiter',
    ),
    'Moon-Jupiter aspect matched',
);

console.log('\n=== Unfavorable day ===');
const unfavResult = scoreDay(businessLaunch, unfavorableDay());
console.log(`  score=${unfavResult.scored.raw_score}, disqualified=${unfavResult.disqualified}`);
console.log(`  reasons=${unfavResult.disqualificationReasons.join(', ')}`);
assert(unfavResult.disqualified, 'unfavorable day disqualified');
assert(unfavResult.disqualificationReasons.includes('moon_void_of_course'), 'VoC fired');
assert(unfavResult.disqualificationReasons.includes('planet_retrograde'), 'Mercury retrograde fired');
assert(unfavResult.scored.raw_score === 0, 'disqualified day raw_score is 0');

console.log('\n=== All 5 canonical recipes load and score ===');
const ids: Array<Parameters<typeof loadCanonicalRecipe>[0]> = [
    'business_launch', 'marriage_relationship', 'mercury_matters',
    'mars_matters', 'jupiter_matters',
];
for (const id of ids) {
    const recipe = loadCanonicalRecipe(id);
    const result = scoreDay(recipe, favorableDay());
    console.log(`  ${id}: score=${result.scored.raw_score}, disqualified=${result.disqualified}, predicates_evaluated=${result.scored.predicates_fired.length}`);
    assert(typeof result.scored.raw_score === 'number', `${id}: numeric score`);
    assert(
        result.scored.predicates_fired.length ===
            recipe.disqualifiers.length + recipe.weighted_conditions.length,
        `${id}: every predicate evaluated`,
    );
}

console.log(`\n${failures === 0 ? 'ALL TESTS PASSED' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
