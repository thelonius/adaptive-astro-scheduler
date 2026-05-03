# Predicates

Deterministic implementations of the closed predicate vocabulary
defined in `../schema/dsl.ts`. Each predicate is a pure function:

```ts
type PredicateFn = (
    predicate: SpecificPredicate,
    day: DayContext,
) => { matched: boolean; details: Record<string, unknown> };
```

`DayContext` is a struct with the day's full ephemeris snapshot
(planet positions, aspects, lunar state, houses) — produced once per
day in `pipeline/score-day.ts` and reused across all predicates so
each day costs one ephemeris call, not one per predicate.

## File organization

- `index.ts` — registry mapping `predicate.type` (the discriminator
  string from the DSL) to the implementing function. The scoring
  engine uses this registry exclusively; never imports individual
  predicate files directly.
- `moon.ts` — `moon_waxing`, `moon_waning`, `moon_phase`,
  `moon_void_of_course`, `moon_in_sign`, `moon_not_in_sign`.
- `aspects.ts` — `aspect`, `no_aspect`. The single most complex
  predicate group: must compute orb, applying/separating, and
  respect `max_orb_deg` overrides.
- `planet-state.ts` — `planet_retrograde`, `planet_combust`,
  `planet_dignified`, `planet_debilitated`.
- `placement.ts` — `planet_in_sign`, `planet_in_house`.

## Build order

Implement these in this order (each unit-testable independently):

1. `moon_waxing`, `moon_waning`, `moon_void_of_course` —
   trivial, only need lunar phase + VoC flag.
2. `planet_retrograde` — direct ephemeris flag.
3. `aspect` (without `applying`) — angular distance + orb.
4. `aspect` with `applying: true` — requires planet velocities.
5. `no_aspect` — inverse of `aspect`.
6. `moon_in_sign`, `planet_in_sign`, `moon_not_in_sign` — sign lookup.
7. `planet_in_house` — needs house cusps for the day's location.
8. `planet_dignified`, `planet_debilitated` — dignity tables in `data/`.
9. `planet_combust` — Sun-planet distance check.

Steps 1–6 unblock the canonical recipes in
`prompts/examples/canonical-recipes.json`. Steps 7–9 are needed for
the full vocabulary but the canonical recipes still work without
them (they use planet_in_house lightly and don't strictly require
dignity for v1).

## Versioning

Bump `PREDICATE_ENGINE_VERSION` in `index.ts` whenever predicate
behavior changes (bug fix, new param handling, etc.). The trace
records this version so old runs are reproducible.
