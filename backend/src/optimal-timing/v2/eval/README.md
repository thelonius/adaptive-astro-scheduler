# Eval

Regression harness. Fixed gold queries with expected outputs;
runs on every PR and after model/prompt changes.

## Files

- `queries.yaml` — gold set. Start small (3–5 queries) and grow.
  Schema:

  ```yaml
  version: 1
  queries:
    - id: business_launch_basic
      prompt: "когда лучше открыть кофейню в мае"
      expected:
        intent_class: business_launch
        must_disqualify:
          - moon_void_of_course
          - planet_retrograde:Mercury
        must_have_weighted_predicate:
          - aspect:Moon-Jupiter:trine|sextile:applying
        # optional: which dates SHOULD appear in top-5 if the gold
        # recipe is run against actual ephemeris of the date range
        gold_top_dates: ["2026-05-15", "2026-05-22"]
  ```

- `run.ts` — runs all queries through the full pipeline (or just
  Stage 3 in fast mode), compares against expected, writes a
  Markdown report to `var/eval-reports/{timestamp}.md`.
- `metrics.ts` — recipe-level metrics (precision/recall on
  predicates) and date-level metrics (P@5, NDCG@10, MRR) using the
  same definitions as the PropTech eval harness.
- `compare-runs.ts` — diffs two reports to surface regressions.

## What to evaluate

Two layers:

### Recipe correctness
For each query, does the generated recipe contain the expected
disqualifiers and weighted predicates? This is binary per
predicate, computed as precision/recall.

Use this when iterating on **prompts** — fast feedback, no
ephemeris computation needed.

### Date ranking
Run the generated recipe against the date range, compare top-N
dates to `gold_top_dates`. P@5, recall@10, NDCG@10.

Use this when iterating on **predicate implementations or scoring
logic** — slower, but tests the full pipeline.

## Building the gold set

Two paths to populate `gold_top_dates`:

1. **Stellium parity check**: run the equivalent ElectionalSearch
   in Python (in `research/stellium_electional_cookbook.py`) on
   a fixed window, take the moments it returns, use those as
   gold dates. This validates that v2 reproduces the canonical
   electional logic.

2. **Real outcomes**: from `vedastro-org/15000-Famous-People-
   Marriage-Divorce-Info` and Ritter IPO database. Sample 50
   real wedding dates and 50 real successful-IPO dates; for each,
   build a query like "good day to get married in {month}" using
   the actual dates as expected matches. Statistical test (Mann-
   Whitney U) instead of strict ranking.

Phase 1 of the eval harness uses path (1). Path (2) requires
data ingestion and is a v2.5 feature.

## Cadence

- Locally: `npm run eval` before pushing.
- CI: every PR that touches `optimal-timing/v2/`.
- Nightly: full eval against latest model versions; alert on
  regression > 5% in any metric.

## Phase 3 acceptance — recorded fixture replay

Until the eval harness above is fully wired, a single recorded
fixture covers the M3 Phase 3 acceptance criterion (Moon-Jupiter
applying matches at least one of {2026-05-25, 2026-05-30} in the
business_launch May 2026 query, with the perfection time recorded
in the trace).

Files:

- `replay-calculator.ts` — `FixtureEphemerisCalculator` (replays a
  recorded fixture offline) and `RecordingEphemerisCalculator`
  (wraps the real adapter and captures every call into a fixture).
- `in-memory-trace-store.ts` — `TraceStore` subclass for tests; no
  filesystem writes.
- `fixtures/v2-may-2026-business-launch.json` — the recorded fixture.
  Until recorded, contains `_status: "not_recorded"` and the
  matching jest test (`backend/tests/v2/v2-may-2026.test.ts`) skips.

### Recording workflow

Prerequisites:

1. Python ephemeris API deployed with commits `8607191` (applying
   formula fix in `core/ephemeris/adapter.py`) and `afc2996`
   (signed-separation discriminator + `POST /api/v1/planning/aspect-perfections`).
2. Network reach to the API from the recording machine.

Steps:

```bash
EPHEMERIS_API_BASE=http://<host>:<port> \
  API_REVISION=$(git -C lunar-calendar-api rev-parse --short HEAD) \
  npm --prefix backend run record:v2-may-2026
```

The recorder runs the v2 pipeline through `RecordingEphemerisCalculator`,
captures every ephemeris call, writes the fixture, and prints a
human summary (top 5 days with a `moon-jupiter applying ✓` tag where
applicable).

### After recording

1. Inspect the fixture diff. If `records.length` collapses or a top
   day swaps unexpectedly, re-investigate before committing.
2. Commit the fixture in the same PR as any code change that caused
   the difference. Fixture and the code that produced it must move
   together — otherwise replays drift.
3. The jest test starts running automatically next time CI sees the
   fixture with `_status: "recorded"`.

### When to re-record

- Upstream Python API algorithm change (applying, perfection search,
  VoC, ingress detection, etc.).
- v2 pipeline starts requesting a new endpoint or different args.
- Canonical `business_launch` recipe is edited.
- Schema/predicate engine version bumps that change the trace shape.
  (Old fixtures still replay because we key by call args, but the
  trace assertions might shift.)
