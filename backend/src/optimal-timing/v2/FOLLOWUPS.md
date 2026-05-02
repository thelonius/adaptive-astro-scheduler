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

- ~~`lunar-calendar-api/app/calculators/transit_engine.py:_is_transit_applying`~~
  Verified during Phase 1 research: this one already does the right
  2h orb-shrink check. No fix required.
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
- **M2 (closed):** second-mine research. See "Second mine — research
  findings" below for inventory results, sizing, and recommendation.
- **M3 Phase 1 (closed):** signed-separation discriminator landed in
  `aspect_engine` and `lunar_engine`; `find_perfections_in_window`
  wrapper added; exposed via `POST /api/v1/planning/aspect-perfections`
  (90-day cap). Side benefit: v1 VoC end detection now correctly sees
  Moon–planet conjunction perfections that the old unsigned scan
  missed. Unit tests for `_aspect_diff` cover conj/opp/trine/wrap.
- **M3:** implement the chosen strategy. Bump
  `PREDICATE_ENGINE_VERSION`. Add an integration smoke (item 6) that
  exercises the new applying logic over a real (or recorded) ephemeris.
- **M4:** stub predicates (item 3) — `planet_dignified`,
  `planet_debilitated`, then `planet_in_house` (with house cusps
  plumbed via item 4).
- **M5:** drift cleanup — items 5, 7, 9, 10. Batch into one PR.

---

## Second mine — research findings

### Inventory: what already exists in `lunar-calendar-api`

Surveyed `app/calculators/` and `app/api/v1/`. Two competing aspect
implementations live in this repo:

| Module | Function | Behavior |
|---|---|---|
| `core/ephemeris/adapter.py` | `calculate_aspects` | Snapshot at one moment. Used by `/api/v1/ephemeris/aspects`. Now correct after `8607191`. |
| `calculators/aspect_engine.py` | `calculate_aspect` (single pair, single moment) | Uses 1h-lookahead via `_is_applying`. Used by `aspect_engine.get_all_aspects` → `/api/v1/reference/aspects`. |
| `calculators/aspect_engine.py` | `find_next_exact_aspect(planet_a, planet_b, aspect_name, start_dt, max_days=30)` | **Event-finder.** 2h coarse step + binary search to 1-min precision. Returns the first perfection moment in the window or `None`. Not exposed via HTTP. |
| `calculators/lunar_engine.py` | `find_void_of_course_windows(start, end)` | Walks Moon's aspect timeline backwards from each ingress; reuses `_refine_aspect_crossing` (binary search). Exposed via `/api/v1/planning/void-of-course`. |

**Verdict.** A working perfection-time search **already exists**
(`find_next_exact_aspect`). It is not yet exposed via HTTP and has two
known issues:

- **Conjunction and opposition aren't reliably detected.** The function
  finds aspects via sign change of `(angular_distance - target_angle)`.
  `angular_distance ∈ [0, 180]`, so for target=0 (conjunction) the
  expression is always `≥ 0` (touches zero, doesn't cross), and for
  target=180 (opposition) it's always `≤ 0`. Sign change never fires
  at the perfection of those aspects. Falls back to
  `abs(curr_diff) < 0.01` which a 2h-step scan rarely hits cleanly.
  Same bug in `lunar_engine._find_last_moon_aspect_before`. Practical
  consequence in v1: VoC windows that should end at a Moon-Saturn
  conjunction get extended back to an earlier sextile/square/trine.
- The fix is to use **signed** separation. Define
  `signed_sep(a, b) = ((lon_a - lon_b + 540) mod 360) - 180`, range
  `(-180, 180]`. Then conjunction is the zero of `signed_sep`,
  opposition is the zero of `signed_sep ± 180`, and sign change works
  uniformly across all five major aspects.

A "list all perfections in [t0, t1] for a set of pairs" wrapper does
not exist and would need to be built atop the fixed search.

### Sizing: applying-window widths and sampling cost

Half-window (entering orb → perfection) for a few representative
pairs, computed from canonical mean daily motion:

```
pair                  |v_rel| °/d   apply h@orb=2°  @4°  @6°  @8°
Moon-Sun                  12.20         3.9          7.9  11.8 15.7
Moon-Mercury              11.78         4.1          8.1  12.2 16.3
Moon-Venus                11.98         4.0          8.0  12.0 16.0
Moon-Mars                 12.66         3.8          7.6  11.4 15.2
Moon-Jupiter              13.10         3.7          7.3  11.0 14.7
Moon-Saturn               13.15         3.7          7.3  11.0 14.6
Mars-Jupiter               0.44       109.8        219.7 329.5 439.4
Saturn-Pluto               0.03      66.7d        133.3d 200d  266d
```

So:

- **Moon vs anything**: applying half-window 7–12h at orb 4–6°. Single
  noon snapshot lands inside ~50% of the time. Sampling every 4h
  (6 snapshots/day) catches every applying window of width ≥ 4h with
  near-100% probability — but breaks down for very tight orbs (≤ 2°)
  where the window can be 3–4h.
- **Slow-vs-slow**: applying window measured in days. Single noon
  sample is fine; multi-sampling adds nothing.

**Cost of strategy 2** (event-finder): for `business_launch` (4
weighted aspect predicates × ~3 aspect types), 24h window, 2h coarse
step + 7-iter bisection per crossing, 2 swisseph calls per step:
~456 calls/day × 30 days ≈ 14K calls/month. Swisseph throughput is
~50K calls/sec → **~0.3s of pure compute per 30-day query, single
threaded**. HTTP overhead and serialization dominate.

**Cost of strategy 1** (multi-sample): 6 snapshots/day × current per-day
cost (4 ephemeris endpoints × 1 HTTP roundtrip each) = 24 HTTP calls/day,
720/month. Already higher than strategy 2 once HTTP overhead is counted.

### Semantics: what should `applying: true` mean in a v2 recipe

| | Semantic | Fires when… | Match to traditional electional | Discrimination power |
|---|---|---|---|---|
| A | Snapshot at noon | aspect is applying at 12:00 UTC | weak — depends on arbitrary sample moment | poor (50% noise) |
| B | Any moment in [00:00, 24:00) | aspect was applying at any t in the day | medium — captures "had a window" but every applying period is shared by ~2 calendar days | medium (most days near a perfection light up) |
| C | Aspect perfects in [00:00, 24:00) | exact aspect happens this calendar day | strong — Stellium and traditional sources mean this | high (1–2 calendar days per Moon-pair perfection cycle) |

Stellium's electional cookbook (the source of v2's canonical recipes)
implicitly uses C — its predicates name specific perfecting events,
not "in-orb-and-applying" generic states. Honoring that gets v2 to
parity with the source rules and gives the most discrimination among
days.

**Recommended default: C.**

To preserve the cheaper "approximate" mode for cost-sensitive callers,
parameterize the predicate at the DSL level rather than hardcode:

```jsonc
{ "type": "aspect", "from": "Moon", "to": "Jupiter",
  "aspects": ["trine", "sextile", "conjunction"],
  "applying": true,
  "window": "perfects_in_day"   // default
  // | "applying_at_noon"       // strategy A — cheap fallback
}
```

Drop semantic B unless an explicit use case appears. It blurs ranking
without astrological grounding.

### Recommended implementation path

Phase 1 — fix and expose what exists [DONE]:

1. ~~Patch `aspect_engine.find_next_exact_aspect` and
   `lunar_engine._find_last_moon_aspect_before` to use signed
   separation, so conjunction/opposition perfections are detected
   correctly. Add a unit test with a Moon–Sun conjunction (trivially
   findable: ~one per month).~~ **Landed.** Static helper
   `AspectEngine._aspect_diff(lon_a, lon_b, target)` returns the
   signed discriminator: signed-longitude-difference shifted by target
   for `target ∈ {0, 180}`, classic unsigned `angular_distance -
   target` for the rest. Both scan loops and binary searches in
   `aspect_engine` and `lunar_engine` consume it. Unit tests in
   `tests/calculators/test_aspect_diff.py` lock in conj / opp /
   wrap / trine behavior with no swisseph dependency.
2. ~~Add `aspect_engine.find_perfections_in_window(start_dt, end_dt,
   pairs, aspect_names)` — thin loop calling the fixed
   `find_next_exact_aspect` for each pair × aspect, stepping forward
   through the window.~~ **Landed.** Walks each (pair, aspect),
   advances 1 minute past each found perfection, sorts by time.
3. ~~Expose via `POST /api/v1/planning/aspect-perfections`.~~ **Landed.**
   90-day cap, validates `end > start`, returns
   `{start, end, count, perfections[]}`.
4. ~~Add the same applying-formula fix to `transit_engine` and
   `chart_service`.~~ `transit_engine._is_transit_applying` already
   uses the correct 2h orb-shrink check; verified, no fix needed.
   `chart_service.py:161` is for ASC/MC angles and is out of scope
   for v2 (no angle predicates yet).

Phase 2 — wire into v2:

5. Add `perfections: AspectPerfection[]` field to `DayContext`.
   Populate it in `build-day-context` via the new endpoint, scoped
   to the pairs/aspects actually referenced in the recipe.
6. Extend `predicates/aspects.ts:evalAspect` to honor a
   `window: "perfects_in_day" | "applying_at_noon"` parameter.
   Default to `"perfects_in_day"`. For the perfects-in-day branch,
   look up `ctx.perfections` instead of `ctx.aspects`.
7. Update `schema/dsl.ts` aspect predicate Zod schema with the
   optional `window` field. Bump `SCHEMA_VERSION` and
   `PREDICATE_ENGINE_VERSION`.
8. Re-run the May 2026 `business_launch` query. Acceptance criteria:
   - Moon–Jupiter applying matches at least one of
     {2026-05-25, 2026-05-30}.
   - Score for that day moves measurably from baseline 70.
   - Trace records the perfection time and which calendar day hosted
     it.

Phase 3 — eval/regression:

9. Add a fixture run of the May 2026 query (with response recorded)
   and an end-to-end test that asserts the acceptance criteria above.
   Catches regressions of either the upstream applying logic or the
   v2 wiring in one shot.

### Open decisions for the user

- **Confirm semantic C as default?** Or keep A as default and make C
  opt-in via `window: "perfects_in_day"`?
- **Conjunction/opposition fix scope**: ship as a separate PR (small,
  isolated, also fixes VoC accuracy for v1) or bundle with the v2
  endpoint work?
- **Endpoint shape**: `POST /api/v1/planning/aspect-perfections` with
  body `{start, end, pairs, aspects}`, or `GET` with query string?
  POST scales better for arbitrary pair lists.
- **Cap**: 30 days seems sufficient for v2 (matches typical query
  range); 90 days matches the existing VoC cap. Pick one.
