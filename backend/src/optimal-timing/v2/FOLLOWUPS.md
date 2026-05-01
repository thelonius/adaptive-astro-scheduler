# v2 Follow-ups — review of May 2026 run

Living checklist. Captured from the first end-to-end run against the
`business_launch` recipe over 2026-05-01..2026-05-31 (artifacts in
`research/v2-runs/`). Update as items land or new ones surface; do not
delete completed entries — strike them through with a commit hash.

---

## What ran, what came back

- Recipe `business_launch` over 31 days, top recommendation
  `2026-05-01` (score 70/100), 3 days disqualified (all VoC Moon).
- Across all 31 days, 0 of 4 weighted conditions involving applying
  aspects ever fired.
- Across all 31 days × all aspects in `notable_aspects`, the count of
  `applying: true` was **0/183**.

## Closed

- [x] **`is_applying` always False from `/api/v1/ephemeris/aspects`.**
      Root cause: `lunar-calendar-api/app/core/ephemeris/adapter.py:707`
      used `body2.speed > body1.speed` as a proxy. For canonical body
      iteration order this is False for every Moon–outer pair, and
      meaningless for the rest. Fixed in commit `8607191`: 1-hour
      linear extrapolation of both bodies via `body.speed`,
      `applying ⇔ orb_future < orb_now`. Same algorithm as
      `aspect_engine._is_applying`, but pure (no extra ephemeris call,
      no signature change, cache key untouched).

## Open — high priority

### 1. Day-granularity sampling — see "Second mine" research below

`pipeline/build-day-context.ts:73` takes a single noon-UTC snapshot per
day. For Moon (≈0.55°/h) the applying half-window of an aspect with
orb 6° is ~11h, so noon can land outside it even when the aspect
perfects within the day. Result: `aspect Moon→X applying=true`
predicates remain unreliable even with the applying-formula fix. Two
specific cases in the May run:

- 2026-05-25 Moon–Jupiter sextile, orb at noon 0.47°.
- 2026-05-30 Moon–Jupiter trine, orb at noon 0.038° (essentially
  exact at the sample).

The sample-at-noon answer can be technically correct yet
astrologically misleading (a textbook applying window that closed at
03:00 UTC is invisible).

### 2. Same applying bug pattern in two other places

Not blockers for v2, but they will rot the same way:

- `lunar-calendar-api/app/calculators/transit_engine.py:_is_transit_applying`
  re-queries the ephemeris with a 2h lookahead — geometrically right —
  but uses `lunar_engine` / `planetary_engine` directly rather than
  the same path as `_get_position`. Verify it returns sensible values
  for a known applying transit; if not, port the fixed logic.
- `lunar-calendar-api/app/services/chart_service.py:161` hardcodes
  `is_applying: False` for aspects to dynamic angles (ASC/MC) with the
  comment `Dynamic angles applying/separating is complex due to earth
  rotation`. True — angles move ~15°/h, but applying/separating still
  resolves correctly through the same orb-shrink check if you sample
  ASC/MC twice. Out of scope for v2 (no angle predicates yet) but
  needed once v2 implements `planet_in_house` (item 3) and ASC/MC-aware
  recipes.

### 3. Stub predicates silently degrade `business_launch` and `jupiter_matters`

`predicates/index.ts:71` lists `planet_dignified`, `planet_debilitated`,
`planet_in_house` as stubs. `score-day.ts:93` returns `matched: false`
for stubs. The `business_launch` recipe in `canonical-recipes.json`
includes `{ predicate: { type: planet_in_house, planet: Jupiter,
houses: [1, 4, 7, 10, 11] }, weight: 10 }` — that 10-point weight
never contributes. `jupiter_matters` has the same loss for its
`planet_dignified`/`planet_in_house` clauses (16 points combined).

Two competing fixes:

- **Implement them.** `planet_in_house` needs the location-aware
  cusps from `getHouses` (already wired into the cached adapter, just
  not pulled into `DayContext`). `planet_dignified`/`debilitated`
  need only a static dignity table — no ephemeris work.
- **Reject recipes that cite stubs.** Surface a UX-level error from
  Stage 3 (`buildRecipe`) so the LLM regenerates without those
  predicates instead of silently underscoring days.

Recommend: implement `planet_dignified`/`debilitated` first (cheap,
no I/O), then `planet_in_house`. Reject-on-stub stays as a guard until
all three land.

### 4. Houses are never built into `DayContext`

`build-day-context.ts:160` sets `houseCusps: null` unconditionally. The
README says houses are "optional — populated only when intent needs
them" but there's no plumbing yet to opt in. Tied to item 3.

## Open — medium priority

### 5. Cache key in `cache.py:calculate_aspects` doesn't include speed

`cache.py:314-316` keys on `name:longitude` to 2 decimals. After the
applying fix, `is_applying` also depends on `body.speed`. In practice
identical longitudes imply the same moment for the same pair so the
cache won't collide on real data, but it's worth making explicit:
either include `speed` in the key, or document that the cache key
implicitly assumes longitudes are sourced from a single time-coherent
ephemeris call. Low risk, low effort — make it explicit.

### 6. Smoke test passes with hand-rolled `applying: true`

`__smoke__/score-day.smoke.ts:84` synthesizes a Moon–Jupiter sextile
with `applying: true` baked in. That's why the smoke was green while
real runs returned no applying matches. Add a thin integration smoke
that hits the real ephemeris adapter (mock-adapter or the cached one
against a recorded fixture) and asserts at least one
`applying: true` aspect comes back over a 30-day window — that's the
test that would have caught the upstream bug.

### 7. `notable_aspects` truncation is doubly aggressive

`score-day.ts:120-123` limits to orb ≤ 4° and slices to 6. If a recipe
is interested in a wider orb (e.g. `aspect ... max_orb_deg: 8`), the
day's debug panel can show "no aspect to X" while the predicate
correctly matched on a 5°-orb aspect that didn't make the slice.
Either widen the filter to match the recipe's max orb, or label the
list explicitly as "tightest 6, ≤4°" so users don't misread.

### 8. Mercury speed=0 in the v2 trace on 2026-05-01

Visible in `match_details: { planet: "Mercury", speed: 0 }` for the
disqualifier check. Mercury stations on/around 2026-05-10 (retrograde
phase). Speed near 0 is geometrically real, not a bug — but the
applying fix relies on `body.speed`, and a station planet has speed ≈ 0.
For planets at station, `fut_orb ≈ orb_now`, so `applying = False` even
though the aspect may have been applying minutes ago and will be
separating minutes from now. Acceptable; document as a known boundary
case in the predicate README.

## Open — low priority / drift

### 9. `classifyMoonPhase` boundaries collapse two phases

`build-day-context.ts:55-58`:
```ts
return illumination < 0.80 ? 'waxing_gibbous' : 'waxing_gibbous';
```
Both branches return the same value. Originally probably meant to
emit `full` for the upper branch. Not load-bearing — `phase` is only
used in debug summaries — but it's a typo waiting to confuse a future
reader. One-line fix.

### 10. Versions never bumped after schema/predicate changes

`PREDICATE_ENGINE_VERSION = '0.1.0'`, `SCORING_ENGINE_VERSION = '0.1.0'`,
`schema_version: '1.0.0'`. The README is explicit that these MUST be
bumped on changes. Establish the discipline now (CI check or PR
template) before traces from multiple engine versions accumulate and
become unreplayable.

---

## Second mine — research scope

**Question.** What does "Moon–Jupiter applying within day D" mean
operationally, and how does v2 compute it correctly without giving up
the simplicity of "score days, not moments"?

**Why it matters.** The applying fix is necessary but not sufficient.
With one noon snapshot per day, predicate behavior remains:

- For slow-vs-slow pairs (Saturn–Pluto, Jupiter–Uranus): noon answer
  is essentially the daily answer. Fine.
- For Moon-vs-anything: noon answer is one moment in a continuously
  changing relationship. The aspect can perfect, applying-window can
  open and close, all between two noon samples or far from noon
  within one.

**Three semantics to choose between.** The recipe DSL is silent on
which one is meant.

| # | Semantic | Predicate fires when… | Pros | Cons |
|---|----------|----------------------|------|------|
| A | Snapshot at noon | aspect is applying at exactly 12:00 UTC | one sample, simple | misclassifies any aspect whose applying half is far from noon |
| B | Any moment in [00:00, 24:00) | aspect is applying at any t in the day | matches "had a window" intuition | needs interval search; ambiguous with multiple aspects (e.g. perfects mid-day) |
| C | Aspect perfects within [00:00, 24:00) | actual perfection happens this calendar day | astrologically standard; Stellium uses this | misses days that are entirely applying-but-don't-perfect-yet |

For electional astrology, the closest match to traditional usage is C
(perfection within window) and the closest match to v1's behavior is
A. The user-visible meaning of "Moon–Jupiter applying" in the recipe
should be made explicit in the DSL — probably by parameterizing the
predicate with a `window` argument:

```jsonc
{ "type": "aspect", "from": "Moon", "to": "Jupiter",
  "aspects": ["trine"], "applying": true,
  "window": "perfects_in_day" /* | "applying_at_noon" | "applying_any_moment" */ }
```

**Implementation strategies, ranked by effort.**

1. **Multi-sample per day.** Take N snapshots (e.g. every 4h = 6/day)
   and report `applying = true` if any sample says so. Simple change
   in `build-day-context`. Cost: 6× ephemeris fetches per day.
   Resolves semantic B at coarse resolution. Misses aspects with
   sub-4h applying windows (rare for Moon vs slow planet, common for
   ASC/MC) and still gives a wrong answer for semantic C.

2. **Per-pair perfection-time search.** For each pair X–Y and each
   target angle θ, find roots of
   `f(t) = signed_separation(X(t), Y(t)) − θ`
   over `[t_day_start, t_day_end]` using bisection or Brent on a few
   coarse samples to bracket. Returns exact perfection times.
   Resolves semantic C exactly. Cost: O(pairs × aspect_types ×
   bisection_iters) ephemeris calls per day, but root search is only
   needed where the function changes sign in the day window — most
   pairs are skipped after a coarse scan. Existing precedent in this
   repo: VoC computation already does this for Moon's last/next major
   aspect.

3. **Per-month event timeline.** One-time pass over the date range
   building a sorted list of `(timestamp, planet_pair, aspect, kind)`
   events (perfections, ingresses). All day-level predicates become
   timeline lookups. Cheapest at scale (amortized) but heaviest to
   build first time. Right answer if v3 is going to do moment-of-day
   recommendations anyway.

4. **Reuse `aspect_engine`.** The `lunar-calendar-api/app/calculators/`
   layer already has `aspect_engine.find_exact_aspect_time` /
   similar. Worth checking what's exposed via HTTP — there may be
   no need to build new search infrastructure if an existing endpoint
   answers "when does X next aspect Y?" or "list all aspect
   perfections in [t0, t1]".

**Suggested research steps.**

1. Inventory what `lunar-calendar-api` already exposes for
   perfection-time queries. Check `app/calculators/aspect_engine.py`,
   `transit_engine.py`, `chart_service.py`, and the `app/api/v1/`
   endpoints. If there's already an "events in interval" endpoint,
   strategy 3 becomes mostly free.
2. For the pairs that matter in the canonical recipes (Moon–Sun,
   Moon–Mercury, Moon–Venus, Moon–Mars, Moon–Jupiter, Moon–Saturn,
   plus all 5 outer-vs-outer combinations that show up in
   electional rules), measure the distribution of applying-window
   widths. Inputs to "is N=6 multi-sampling enough?" question.
3. Pick semantics (A/B/C) per use case. Likely outcome: default to
   C (perfects-in-day) for `aspect ... applying: true`, expose A as
   a `window: "noon"` option for low-cost approximate checks, drop B
   unless explicitly requested.
4. Prototype on the 2026-05 dataset and rerun the `business_launch`
   recipe. Acceptance: Moon–Jupiter applying matches at least one of
   {2026-05-25, 2026-05-30}, score for that day moves measurably,
   and the trace shows the perfection time.

**Out of scope for the second mine.**

- Full sub-day windowing (planetary hours, exact moments). Still v3.
- Personalized natal-chart overlay.
- Re-architecting `cache.py` for time-of-day-aware keys (only needed
  if strategy 3 lands).

---

## Milestone proposal

- **M1 (closed):** applying-formula fix in Python adapter — done.
- **M2 (next):** second-mine research — pick semantics, decide
  strategy, write the eval case for the 2026-05 dataset. Output:
  this section gets replaced with a concrete implementation plan
  plus a new follow-up entry.
- **M3:** implement the chosen strategy. Bump
  `PREDICATE_ENGINE_VERSION`. Add an integration smoke (item 6) that
  exercises the new applying logic over a real (or recorded) ephemeris.
- **M4:** stub predicates (item 3) — `planet_dignified`,
  `planet_debilitated`, then `planet_in_house` (with house cusps
  plumbed via item 4).
- **M5:** drift cleanup — items 5, 7, 9, 10. Batch into one PR.
