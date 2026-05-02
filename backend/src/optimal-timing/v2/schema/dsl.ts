/**
 * Optimal Timing v2 — Recipe DSL
 *
 * A Recipe is the LLM's structured translation of a free-text intent
 * into executable astrological conditions. Built around a closed
 * vocabulary of predicates so the LLM cannot invent new operators.
 *
 * Schema versioning: bump SCHEMA_VERSION whenever predicates are
 * added/removed/renamed, or their parameters change. Old traces are
 * still readable but should be marked with their original version.
 */

import { z } from 'zod';

export const SCHEMA_VERSION = '1.1.0';

// ─── Closed enums ────────────────────────────────────────────────────────────

export const PLANETS = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;
export const PlanetSchema = z.enum(PLANETS);
export type Planet = z.infer<typeof PlanetSchema>;

export const SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;
export const SignSchema = z.enum(SIGNS);
export type Sign = z.infer<typeof SignSchema>;

export const ASPECT_TYPES = [
    'conjunction', 'sextile', 'square', 'trine', 'opposition',
] as const;
export const AspectTypeSchema = z.enum(ASPECT_TYPES);
export type AspectType = z.infer<typeof AspectTypeSchema>;

export const MOON_PHASES = [
    'new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
    'full', 'waning_gibbous', 'last_quarter', 'waning_crescent',
] as const;
export const MoonPhaseSchema = z.enum(MOON_PHASES);
export type MoonPhase = z.infer<typeof MoonPhaseSchema>;

export const HouseSchema = z.number().int().min(1).max(12);

/**
 * Window semantic for `applying: true` aspect predicates.
 *
 * - `perfects_in_day` (default): the predicate matches when the aspect
 *   reaches exactness within the calendar day. Uses the perfections
 *   list pre-computed for the whole query window. This is what
 *   traditional electional astrology means by "Moon applying to X" —
 *   strongest day-level discrimination.
 * - `applying_at_noon`: the predicate matches when, at the noon-UTC
 *   snapshot, the aspect is in orb and applying. Cheap fallback;
 *   misses applying windows that don't include noon.
 *
 * Has no effect when `applying` is false or omitted — those branches
 * always use the noon snapshot.
 */
export const ASPECT_WINDOWS = ['perfects_in_day', 'applying_at_noon'] as const;
export const AspectWindowSchema = z.enum(ASPECT_WINDOWS);
export type AspectWindow = z.infer<typeof AspectWindowSchema>;

// ─── Predicates ──────────────────────────────────────────────────────────────
// Each predicate is a discriminated union member with a literal `type`.
// Add new predicates here; bump SCHEMA_VERSION when you do.

const MoonWaxing = z.object({
    type: z.literal('moon_waxing'),
});

const MoonWaning = z.object({
    type: z.literal('moon_waning'),
});

const MoonPhaseIs = z.object({
    type: z.literal('moon_phase'),
    phases: z.array(MoonPhaseSchema).min(1),
});

const MoonVoidOfCourse = z.object({
    type: z.literal('moon_void_of_course'),
});

const MoonInSign = z.object({
    type: z.literal('moon_in_sign'),
    signs: z.array(SignSchema).min(1),
});

const MoonNotInSign = z.object({
    type: z.literal('moon_not_in_sign'),
    signs: z.array(SignSchema).min(1),
});

const PlanetRetrograde = z.object({
    type: z.literal('planet_retrograde'),
    planet: PlanetSchema,
});

const PlanetCombust = z.object({
    type: z.literal('planet_combust'),
    planet: PlanetSchema,
});

const PlanetDignified = z.object({
    type: z.literal('planet_dignified'),
    planet: PlanetSchema,
    /** 'essential' = ruler/exaltation/triplicity; 'accidental' = angular house, joy */
    mode: z.enum(['essential', 'accidental']).default('essential'),
});

const PlanetDebilitated = z.object({
    type: z.literal('planet_debilitated'),
    planet: PlanetSchema,
});

const PlanetInSign = z.object({
    type: z.literal('planet_in_sign'),
    planet: PlanetSchema,
    signs: z.array(SignSchema).min(1),
});

const PlanetInHouse = z.object({
    type: z.literal('planet_in_house'),
    planet: PlanetSchema,
    houses: z.array(HouseSchema).min(1),
});

const Aspect = z.object({
    type: z.literal('aspect'),
    from: PlanetSchema,
    to: PlanetSchema,
    aspects: z.array(AspectTypeSchema).min(1),
    /** require the aspect to be applying (perfecting), not separating */
    applying: z.boolean().optional(),
    /** maximum allowed orb in degrees (default: 6° for major aspects).
     *  Ignored when window === 'perfects_in_day' (perfection has zero orb). */
    max_orb_deg: z.number().positive().max(15).optional(),
    /** Window semantic for applying:true. Default 'perfects_in_day'. */
    window: AspectWindowSchema.optional(),
});

const NoAspect = z.object({
    type: z.literal('no_aspect'),
    from: PlanetSchema,
    to: PlanetSchema,
    aspects: z.array(AspectTypeSchema).min(1),
    max_orb_deg: z.number().positive().max(15).optional(),
});

/**
 * Predicate union. To add a new predicate:
 *   1. Define a Zod object above.
 *   2. Add it to the discriminatedUnion below.
 *   3. Implement it in `predicates/<group>.ts`.
 *   4. Register in `predicates/index.ts`.
 *   5. Bump SCHEMA_VERSION.
 */
export const PredicateSchema = z.discriminatedUnion('type', [
    MoonWaxing,
    MoonWaning,
    MoonPhaseIs,
    MoonVoidOfCourse,
    MoonInSign,
    MoonNotInSign,
    PlanetRetrograde,
    PlanetCombust,
    PlanetDignified,
    PlanetDebilitated,
    PlanetInSign,
    PlanetInHouse,
    Aspect,
    NoAspect,
]);
export type Predicate = z.infer<typeof PredicateSchema>;

// ─── Recipe ──────────────────────────────────────────────────────────────────

export const WeightedPredicateSchema = z.object({
    predicate: PredicateSchema,
    /**
     * Signed weight. Positive = favorable, negative = unfavorable.
     * Conventional range: ±20. Larger absolute values reserved for
     * very strong endorsements/cautions.
     */
    weight: z.number().min(-30).max(30),
    /** optional human-readable note shown in debug UI and reasoning */
    note: z.string().max(200).optional(),
});
export type WeightedPredicate = z.infer<typeof WeightedPredicateSchema>;

export const RecipeMetadataSchema = z.object({
    schema_version: z.string().default(SCHEMA_VERSION),
    generated_by: z.object({
        model: z.string(),
        prompt_template_version: z.string(),
    }),
    generated_at: z.string().datetime(),
});
export type RecipeMetadata = z.infer<typeof RecipeMetadataSchema>;

export const RecipeSchema = z.object({
    /** Echo of the user's intent in normalized form */
    intent: z.string().min(1).max(500),

    /**
     * LLM's plain-language explanation of the strategy.
     * Shown to the user in debug mode; archived as training context.
     */
    rationale: z.string().min(1).max(1000),

    /**
     * Hard "no" conditions. If ANY matches a day, the day is dropped
     * from results entirely. Use sparingly — over-disqualification
     * can return zero results in a 30-day window.
     */
    disqualifiers: z.array(PredicateSchema).default([]),

    /**
     * Soft conditions that contribute to the day's score.
     * Sum of matched weights = raw score. Order does not matter.
     */
    weighted_conditions: z.array(WeightedPredicateSchema).min(1),

    metadata: RecipeMetadataSchema,
});
export type Recipe = z.infer<typeof RecipeSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validate untrusted JSON (e.g. LLM output) and return a typed Recipe.
 * Throws ZodError with structured field-level messages on failure.
 */
export function parseRecipe(raw: unknown): Recipe {
    return RecipeSchema.parse(raw);
}

/**
 * Like parseRecipe but returns null on failure. Use when you want to
 * fall back to a default rather than crash.
 */
export function tryParseRecipe(raw: unknown): Recipe | null {
    const result = RecipeSchema.safeParse(raw);
    return result.success ? result.data : null;
}
