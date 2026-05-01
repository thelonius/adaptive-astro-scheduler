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
