/**
 * Types shared by all predicate implementations.
 *
 * A `DayContext` is a normalized, pre-computed snapshot of one day's
 * ephemeris — built once per day in `pipeline/build-day-context.ts`
 * and passed to every predicate that day. Using a normalized form
 * (instead of raw API responses) shields predicate code from
 * underlying ephemeris API quirks (snake_case fields, Russian sign
 * names, etc.) and makes predicates trivially unit-testable.
 */

import type { Planet, Sign, AspectType } from '../schema/dsl';

/** Sign in which a planet is currently posited (English). */
export interface PlanetSnapshot {
    planet: Planet;
    longitude: number;       // 0-360°
    sign: Sign;
    speed: number;           // °/day; negative = retrograde
    isRetrograde: boolean;
}

export interface AspectSnapshot {
    from: Planet;
    to: Planet;
    type: AspectType;
    orbDeg: number;
    /** True if the aspect is perfecting; false if separating. May be null if unknown. */
    applying: boolean | null;
}

/**
 * Exact-perfection event: the moment a specific aspect between two
 * planets becomes perfectly exact (orb = 0). Pre-computed once per
 * query window from `IEphemerisCalculator.getAspectPerfections` and
 * sliced per day into `DayContext.perfections`.
 */
export interface AspectPerfection {
    from: Planet;
    to: Planet;
    type: AspectType;
    /** UTC moment of perfection */
    exactAt: Date;
}

export interface MoonSnapshot {
    sign: Sign;
    longitude: number;
    /** 0..1, where 0 = new, 0.5 = full quarters, 1 = full */
    illumination: number;
    /** Convenient enum derived from illumination + waxing flag */
    phase:
        | 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous'
        | 'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';
    /** True if Sun→Moon angular separation is in (0°, 180°), exclusive. */
    isWaxing: boolean;
    voidOfCourse: boolean;
}

export interface DayContext {
    /** ISO date YYYY-MM-DD (the day this snapshot represents) */
    date: string;
    /** Reference moment used to query the ephemeris (typically noon UTC of `date`) */
    referenceTime: Date;
    location: { latitude: number; longitude: number; timezone: string };

    moon: MoonSnapshot;
    planets: Record<Planet, PlanetSnapshot>;
    aspects: AspectSnapshot[];
    /**
     * Aspect perfections occurring within this calendar day, [00:00, 24:00) UTC.
     * Filled by the pipeline from a single window-wide query against
     * `getAspectPerfections`. Empty when the recipe asks for none, or when
     * the day has none.
     */
    perfections: AspectPerfection[];
    /** Houses are optional — populated only when intent needs them. */
    houseCusps: number[] | null;
}

export interface PredicateResult {
    matched: boolean;
    /** Engine-supplied context: orb, applying flag, sign matched, etc. */
    details: Record<string, unknown>;
}

export type PredicateImpl<P> = (predicate: P, ctx: DayContext) => PredicateResult;
