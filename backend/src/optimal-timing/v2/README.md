# Optimal Timing v2 — Design

Status: **DRAFT — scaffolding only.** Live system continues to use
`backend/src/services/optimal-timing.service.ts` (v1, rule-based).
v2 lives alongside v1 until it reaches parity in the eval harness, then
v1 retires.

This folder is a **skeleton + spec**, not a working pipeline yet. Each
subfolder has its own README explaining what goes inside and the order
in which to fill it in.

---

## Why v2 exists

v1 maps a free-text intent to one of 9 hardcoded categories
(`classifyIntent`) and scores days with weighted sums of celestial
events. The two limitations that motivated v2:

1. **Intent classification is keyword-based.** Anything outside the
   9 hardcoded categories collapses to `start-project` by default,
   silently. This is the biggest source of "the recommendation feels
   off" complaints.
2. **No disqualifiers, only weights.** A day with VoC Moon plus
   Mercury retrograde plus a single applying Moon-Jupiter trine can
   still score 70+ because the trine weight outweighs the negatives.
   Traditional electional astrology treats VoC Moon as a hard
   disqualifier, not a -20 penalty.

v2 fixes both by replacing the rule table with an **LLM-generated
recipe in a closed DSL**, plus a **two-stage scoring** (disqualify →
weighted rank).

## Pipeline at a glance

```
user prompt
    │
    ▼
[Stage 1] parseIntent (LLM + JSON mode + cache)
    → IntentEnvelope { activity, location, constraints }
    │
    ▼
[Stage 2] extractDateRange (regex + chrono, no LLM)
    → { start, end, method }
    │
    ▼
[Stage 3] buildRecipe (LLM + few-shot + cache + Zod validation)
    → Recipe { disqualifiers[], weighted_conditions[], rationale }
    │
    ▼
[Stage 4] scoreDays (deterministic, no LLM)
    for each day in [start..end]:
      apply disqualifiers → if any match, drop the day
      apply weighted_conditions → sum signed weights
      record predicates_fired with match details
    │
    ▼
[Stage 5] rankWindows
    → top N windows with reasoning
```

Every stage writes to a single `TraceRecord` (see `schema/trace.ts`)
which is persisted per request. The trace is the spine: debug UI,
feedback collection, and eval harness all consume it.

## DSL summary

A `Recipe` is a JSON object with three parts:

- **disqualifiers** — list of predicates. If ANY matches a day, the
  day is removed from results entirely. Used for hard "no" conditions
  (VoC Moon, retrograde of the intent's critical planet, Moon-Saturn
  affliction for risky launches).
- **weighted_conditions** — list of `{predicate, weight}` pairs. Each
  match contributes its (signed) weight to the day's score. Used for
  "more or less favorable" gradient.
- **rationale** — free text from the LLM explaining why these
  conditions match the intent. Shown to the user in debug mode and
  used as training data later.

Predicates come from a closed vocabulary (~15 functions, see
`schema/dsl.ts`) modeled after Stellium's electional library. LLM
output is validated against the Zod schema before execution: it
cannot invent predicates or planets.

## Trace, debug, feedback

Every `/optimal-timing/v2/find` request produces a `TraceRecord` and
writes it to JSONL (Phase 1) or Postgres JSONB (Phase 2). The trace
contains:

- the raw prompt, user_id, timestamp
- LLM stage outputs with model, prompt template version, latency, cost
- per-day scoring breakdown with every predicate firing
- engine versions for reproducibility

Three feedback channels feed into improvement:

1. **Recipe feedback** — user edits the generated recipe in the UI.
   Stored as `(intent_text, original_recipe, edited_recipe)` —
   the supervised label set for future fine-tuning.
2. **Outcome feedback** — post-event rating after the user actually
   uses a recommended date. Used for global predicate weight
   calibration.
3. **Eval harness** — fixed gold queries with expected recipes /
   ranked dates. Run on every PR.

See `feedback/` and `eval/` subfolder READMEs for schema details.

## Build order

Suggested order of filling in this skeleton (each step independently
useful):

1. `schema/dsl.ts` — Zod schema + types. **Done in this commit.**
2. `schema/intent-envelope.ts` — Stage 1 types. **Done in this commit.**
3. `schema/trace.ts` — TraceRecord type. **Done in this commit.**
4. `prompts/examples/canonical-recipes.json` — 5 Stellium recipes
   translated to DSL. **Done in this commit.**
5. `prompts/recipe.v1.md` — few-shot prompt template referencing the
   canonical recipes. **Done in this commit.**
6. `predicates/` — implement each predicate against the existing
   `IEphemerisCalculator` and `CelestialEventsDetector`. Start with
   the 7 used by the canonical recipes:
   `is_waxing`, `moon_void_of_course`, `planet_retrograde`,
   `aspect_applying`, `no_aspect`, `moon_not_in_sign`,
   `planet_in_house`.
7. `pipeline/score-day.ts` — apply a Recipe to one day. Pure
   function, easy to unit test.
8. `pipeline/build-recipe.ts` — LLM call + Zod validation + cache.
9. `pipeline/parse-intent.ts` — Stage 1 LLM call.
10. `trace/recorder.ts` + `trace/store.ts` — JSONL persistence.
11. `api/controller.ts` — wire everything into a new
    `POST /optimal-timing/v2/find` endpoint, leaving v1 untouched.
12. `eval/queries.yaml` — start with 3 gold queries; expand later.
13. `feedback/recipe-feedback.ts` — endpoint to record user edits.
14. Debug UI page (frontend) — separate task in `frontend/`.

Steps 1–5 are this commit. Steps 6+ are future commits.

## Versioning

Every artifact that affects output gets an explicit version string
recorded in the trace:

- `schema_version` — DSL schema version (semver). Increment when
  adding/removing predicates or changing their parameters.
- `prompt_template_version` — incremented on every prompt edit.
- `predicate_engine_version` — version of the deterministic
  predicate implementations.
- `scoring_engine_version` — version of the score aggregation logic.
- Model name + provider for every LLM call.

Without these you cannot replay an old trace against new code or
explain why behavior changed between runs. Treat traces as immutable
historical records.

## Out of scope for v2

- Personalized scoring (natal chart overlay) — handled by existing
  `PersonalizedAnalyticsService` and can be plugged in at Stage 4 as
  a separate weighted layer. Recipe DSL is intentionally
  intent-driven, not native-driven.
- Time-of-day precision (planetary hours, exact moments). v2 scores
  whole days. Sub-day refinement is a v3 feature.
- Auto-fine-tuning. Phase 1 just collects data; tuning is manual
  later when there's enough.
