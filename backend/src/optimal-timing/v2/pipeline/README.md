# Pipeline

The five stages of `/optimal-timing/v2/find`, each a small module
that does one thing. Stages compose in `index.ts`.

## Stages

### `parse-intent.ts` — Stage 1
Calls the LLM with `prompts/intent-envelope.v1.md` to produce an
`IntentEnvelope` (see `../schema/intent-envelope.ts`). Cached in
Redis by SHA-256 of the normalized prompt. Returns `LLMStage<IntentEnvelope>`.

### `extract-date-range.ts` — Stage 2
Pure function. Wraps existing `backend/src/utils/date-extractor.ts`
to produce a `StageDateRange`. No LLM call. If extraction fails,
returns `default_30d` from today.

### `build-recipe.ts` — Stage 3
Calls the LLM with `prompts/recipe.v1.md` (with canonical recipes
inlined) to produce a `Recipe`. **Strict Zod validation** before
returning — on schema failure, retry once with a corrective prompt
("Your previous response did not match schema X at field Y. Try
again."), then fall back to a category-mapped default recipe and
log the failure to the trace.

Cache key includes the intent envelope (not the raw prompt) so
two prompts that mean the same thing share a cached recipe.

### `score-day.ts` — Stage 4 (per-day)
Pure function. Takes a `Recipe` and a `DayContext`. Returns
`ScoredDay` with full predicate-firing breakdown. No LLM, no I/O.
This is the hot path — must be fast (<50ms per day) so a 90-day
window stays under 5s total.

Algorithm:
1. Build `DayContext` once from ephemeris.
2. For each disqualifier, evaluate. If any matches → return
   `{ rank: null, raw_score: 0, predicates_fired: [...disqualifiers fired] }`.
3. For each weighted_condition, evaluate. Sum matched weights.
4. Return ScoredDay with all firings (including non-matches —
   they're useful in debug UI).

### `rank-windows.ts` — Stage 5
Filter out disqualified days, sort surviving days by `raw_score`
descending, take top N (default 10). Assign ranks 1..N. Build
`stage_output.response_summary` from the top day's recipe note
fields.

## Composer

`index.ts` exports `findOptimalWindowsV2(prompt, location, opts)`
which runs all five stages, builds the `TraceRecord` along the way,
and persists it before returning. The controller in `../api/`
just unwraps it into HTTP response shape.

## Errors

Any stage may throw. The composer wraps every stage in a try/catch
and writes `error: { stage, message, stack }` into the trace. The
HTTP layer translates this into a 500 with `request_id` so the user
can report it and you can pull the trace by id.
