/**
 * v2 acceptance test for the May 2026 `business_launch` rerun.
 *
 * Reads a fixture file recorded against the live Python ephemeris API
 * (with commits 8607191 + afc2996 applied) and replays it through the
 * v2 pipeline offline. Asserts the acceptance criteria from
 * `backend/src/optimal-timing/v2/FOLLOWUPS.md` Phase 3.
 *
 * Until the fixture is recorded the suite skips with a clear message
 * — that's expected, not a regression.
 *
 * To record:
 *   EPHEMERIS_API_BASE=http://<host>:<port> \
 *     npx tsx backend/scripts/record-v2-may-2026.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import {
    findWithFixedRecipe,
    loadCanonicalRecipe,
} from '../../src/optimal-timing/v2/pipeline';
import { FixtureEphemerisCalculator, type FixtureFile } from '../../src/optimal-timing/v2/eval/replay-calculator';
import { InMemoryTraceStore } from '../../src/optimal-timing/v2/eval/in-memory-trace-store';
import type { ScoredDay, PredicateFiring } from '../../src/optimal-timing/v2/schema/trace';

const FIXTURE_PATH = path.join(
    __dirname,
    '..',
    '..',
    'src',
    'optimal-timing',
    'v2',
    'eval',
    'fixtures',
    'v2-may-2026-business-launch.json',
);

const QUERY = {
    start_date: '2026-05-01',
    end_date: '2026-05-31',
    location: { latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow' },
    user_prompt: 'open a coffee shop in May',
};

// Days where the live Python ephemeris should report a Moon-Jupiter
// perfection for sextile or trine in May 2026 (per the noon snapshot
// data captured in research/v2-runs/full.json — orb 0.47° on May 25
// and 0.038° on May 30 means the perfection time falls within the
// calendar day).
const ACCEPTANCE_DAYS = ['2026-05-25', '2026-05-30'];

const BASELINE_SCORE = 70;        // pre-fix score for a top day
const APPLYING_WEIGHT = 8;         // weight on the Moon-Jupiter applying predicate
const EXPECTED_MIN_UPLIFTED = BASELINE_SCORE + APPLYING_WEIGHT;

function loadFixture(): FixtureFile | null {
    const raw = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as FixtureFile;
    return parsed._status === 'recorded' ? parsed : null;
}

const fixture = loadFixture();

// Skip the whole describe block until the fixture is recorded. This
// keeps `npm test` green while making the missing recording obvious
// in the report.
const describeIfRecorded = fixture ? describe : describe.skip;

describeIfRecorded('v2 May 2026 business_launch (recorded fixture replay)', () => {
    it('Moon-Jupiter applying matches at least one of the acceptance days', async () => {
        const recipe = loadCanonicalRecipe('business_launch');
        const ephemeris = new FixtureEphemerisCalculator(fixture!);
        const traceStore = new InMemoryTraceStore();

        const result = await findWithFixedRecipe(
            { ...QUERY, recipe },
            { ephemeris, traceStore },
        );

        const matchingDay = result.trace.stage_scoring.scored_days.find((day: ScoredDay) =>
            ACCEPTANCE_DAYS.includes(day.date) &&
            day.predicates_fired.some(isMoonJupiterApplyingMatch),
        );

        expect(matchingDay).toBeDefined();

        const firing = matchingDay!.predicates_fired.find(isMoonJupiterApplyingMatch)!;

        // The match_details must record the perfection moment so the
        // trace remains debuggable. Without exact_at the trace can't
        // explain why this day matched while others didn't.
        expect(typeof (firing.match_details as { exact_at?: unknown }).exact_at).toBe('string');

        // The day's raw_score must beat the pre-fix baseline by at
        // least the applying predicate's weight. Score is clamped to
        // [0, 100] in score-day.ts; the recipe weights cap below 100.
        expect(matchingDay!.raw_score).toBeGreaterThanOrEqual(EXPECTED_MIN_UPLIFTED);
    });

    it('every Moon-Jupiter applying match references a Moon-Jupiter perfection within the same day', async () => {
        const recipe = loadCanonicalRecipe('business_launch');
        const ephemeris = new FixtureEphemerisCalculator(fixture!);
        const traceStore = new InMemoryTraceStore();

        const result = await findWithFixedRecipe(
            { ...QUERY, recipe },
            { ephemeris, traceStore },
        );

        // Catch a class of regressions where evalAspect matches without
        // a corresponding perfection (e.g. accidental fallback to the
        // noon snapshot under perfects_in_day semantics).
        const matches = result.trace.stage_scoring.scored_days.flatMap((day) =>
            day.predicates_fired
                .filter(isMoonJupiterApplyingMatch)
                .map((p) => ({ day: day.date, details: p.match_details })),
        );

        for (const m of matches) {
            const exactAt = (m.details as { exact_at?: string }).exact_at;
            expect(typeof exactAt).toBe('string');
            // exact_at must fall within the day [00:00, 24:00) UTC.
            const t = Date.parse(exactAt!);
            const dayStart = Date.parse(`${m.day}T00:00:00Z`);
            const dayEnd = dayStart + 24 * 3600 * 1000;
            expect(t).toBeGreaterThanOrEqual(dayStart);
            expect(t).toBeLessThan(dayEnd);
        }
    });
});

function isMoonJupiterApplyingMatch(p: PredicateFiring): boolean {
    if (!p.matched) return false;
    if (p.predicate.type !== 'aspect') return false;
    const involvesMoon = p.predicate.from === 'Moon' || p.predicate.to === 'Moon';
    const involvesJupiter = p.predicate.from === 'Jupiter' || p.predicate.to === 'Jupiter';
    if (!involvesMoon || !involvesJupiter) return false;
    if (p.predicate.applying !== true) return false;
    return true;
}
