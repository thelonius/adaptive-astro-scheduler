/**
 * Record a live fixture for the v2 May 2026 acceptance test.
 *
 * Talks to a deployed Python ephemeris API, runs the v2 pipeline for
 * `business_launch` over 2026-05-01..2026-05-31, captures every API
 * call, and writes the result to
 * `backend/src/optimal-timing/v2/eval/fixtures/v2-may-2026-business-launch.json`.
 *
 * The matching jest test (tests/v2/v2-may-2026.test.ts) replays the
 * fixture offline. Re-record after any of:
 *   - the upstream API algorithm changes (applying formula, perfection
 *     search, VoC detection, etc.)
 *   - the v2 pipeline starts requesting a new endpoint or different
 *     args
 *   - the canonical `business_launch` recipe is edited
 *
 * Prerequisites:
 *   1. Deployed Python API with commits 8607191 (applying formula fix)
 *      and afc2996 (signed-separation + perfection endpoint) applied.
 *   2. EPHEMERIS_API_BASE env var pointing at it.
 *
 * Usage:
 *   EPHEMERIS_API_BASE=http://<host>:<port> \
 *     npx tsx backend/scripts/record-v2-may-2026.ts
 *
 * Optional env:
 *   API_REVISION=<git-sha>  — recorded into the fixture for traceability
 */

import * as fs from 'fs';
import * as path from 'path';

import { EphemerisAdapter } from '../src/core/ephemeris/adapter';
import {
    findWithFixedRecipe,
    loadCanonicalRecipe,
} from '../src/optimal-timing/v2/pipeline';
import { RecordingEphemerisCalculator } from '../src/optimal-timing/v2/eval/replay-calculator';
import { InMemoryTraceStore } from '../src/optimal-timing/v2/eval/in-memory-trace-store';

const FIXTURE_PATH = path.join(
    __dirname,
    '..',
    'src',
    'optimal-timing',
    'v2',
    'eval',
    'fixtures',
    'v2-may-2026-business-launch.json',
);

async function main(): Promise<void> {
    const apiBase = process.env.EPHEMERIS_API_BASE;
    if (!apiBase) {
        console.error(
            'EPHEMERIS_API_BASE is not set. Point it at a deployed Python ' +
            'ephemeris API with commits 8607191 + afc2996 applied. Example:\n\n' +
            '  EPHEMERIS_API_BASE=http://10.0.0.5:8000 npx tsx backend/scripts/record-v2-may-2026.ts',
        );
        process.exit(2);
    }

    const apiRevision = process.env.API_REVISION ?? null;

    console.error(`recording fixture against ${apiBase}…`);

    const inner = new EphemerisAdapter(apiBase);
    const ephemeris = new RecordingEphemerisCalculator(inner, {
        api_base: apiBase,
        api_revision: apiRevision,
        note: 'v2 May 2026 business_launch acceptance run.',
    });
    const traceStore = new InMemoryTraceStore();

    const recipe = loadCanonicalRecipe('business_launch');

    const result = await findWithFixedRecipe(
        {
            user_prompt: 'open a coffee shop in May',
            recipe,
            start_date: '2026-05-01',
            end_date: '2026-05-31',
            location: { latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow' },
            top_n: 10,
            debug_mode: true,
        },
        { ephemeris, traceStore },
    );

    const fixture = ephemeris.dump();

    fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2) + '\n', 'utf-8');

    // Tiny human summary. Not consumed by the test, just a sanity
    // signal at the recording machine.
    const top = result.trace.stage_scoring.scored_days
        .filter((d) => d.rank !== null)
        .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
        .slice(0, 5);

    console.error(`recorded ${fixture.records.length} API calls -> ${path.relative(process.cwd(), FIXTURE_PATH)}`);
    console.error('top 5 days:');
    for (const d of top) {
        const moonJupiter = d.predicates_fired.find(
            (p) =>
                p.matched &&
                p.predicate.type === 'aspect' &&
                ((p.predicate.from === 'Moon' && p.predicate.to === 'Jupiter') ||
                    (p.predicate.from === 'Jupiter' && p.predicate.to === 'Moon')) &&
                p.predicate.applying === true,
        );
        const tag = moonJupiter ? ' moon-jupiter applying ✓' : '';
        console.error(`  #${d.rank} ${d.date} score=${d.raw_score}${tag}`);
    }
}

main().catch((err) => {
    console.error('recording failed:', err);
    process.exit(1);
});
