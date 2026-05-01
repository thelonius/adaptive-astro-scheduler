/**
 * Build a `DayContext` for a single day by querying the ephemeris.
 *
 * Strategy: take noon UTC of the day as the reference moment for
 * "what's the chart of this day". Day-level granularity is fine for
 * v2 — sub-day refinement (planetary hours, exact moments) is a
 * future feature.
 *
 * One ephemeris-fetch per day. All predicates that day reuse the
 * resulting DayContext, so a 30-day window hits the API ~30 times,
 * not 30 × N predicates.
 */

import type { IEphemerisCalculator } from '../../../core/ephemeris/interface';
import type { DateTime as DT, AspectType as ApiAspectType } from '@adaptive-astro/shared/types/astrology';
import type { DayContext, MoonSnapshot, PlanetSnapshot } from '../predicates/types';
import type { Planet, AspectType } from '../schema/dsl';
import { normalizeSign, signFromLongitude } from './sign-mapping';

const PLANETS: Planet[] = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

/**
 * Map our Planet enum to the planet-name strings the API returns.
 * The API uses TitleCase English which matches our enum exactly,
 * but keep this function as a single seam in case the API changes.
 */
function asApiPlanetName(p: Planet): string {
    return p;
}

function fromApiPlanetName(raw: string): Planet | null {
    if (PLANETS.includes(raw as Planet)) return raw as Planet;
    // Some APIs prefix or lowercase; normalize a few common forms.
    const titled = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    if (PLANETS.includes(titled as Planet)) return titled as Planet;
    return null;
}

const API_ASPECT_TO_DSL: Record<string, AspectType> = {
    conjunction: 'conjunction',
    sextile: 'sextile',
    square: 'square',
    trine: 'trine',
    opposition: 'opposition',
};

function classifyMoonPhase(illumination: number, isWaxing: boolean): MoonSnapshot['phase'] {
    // Boundaries are conventional eight-phase split.
    if (illumination < 0.03) return 'new';
    if (illumination > 0.97) return 'full';
    if (isWaxing) {
        if (illumination < 0.45) return illumination < 0.20 ? 'waxing_crescent' : 'first_quarter';
        return illumination < 0.80 ? 'waxing_gibbous' : 'waxing_gibbous';
    } else {
        if (illumination > 0.55) return illumination > 0.80 ? 'waning_gibbous' : 'waning_gibbous';
        return illumination > 0.20 ? 'last_quarter' : 'waning_crescent';
    }
}

export interface BuildContextDeps {
    ephemeris: IEphemerisCalculator;
    location: { latitude: number; longitude: number; timezone: string };
}

export async function buildDayContext(
    dateIso: string,
    deps: BuildContextDeps,
): Promise<DayContext> {
    // Use noon UTC of the day as the reference moment.
    const referenceTime = new Date(`${dateIso}T12:00:00Z`);

    const dt: DT = {
        date: referenceTime,
        timezone: deps.location.timezone,
        location: { latitude: deps.location.latitude, longitude: deps.location.longitude },
    };

    const [planetsResp, aspectsResp, voidMoonResp, illumination] = await Promise.all([
        deps.ephemeris.getPlanetsPositions(dt),
        deps.ephemeris.getAspects(dt, 8),
        deps.ephemeris.getVoidOfCourseMoon(dt),
        deps.ephemeris.getMoonPhase(dt),
    ]);

    // Normalize planets into the snapshot shape.
    const planetMap: Partial<Record<Planet, PlanetSnapshot>> = {};
    for (const apiPlanet of planetsResp.planets) {
        const p = fromApiPlanetName(apiPlanet.name);
        if (!p) continue;
        let sign;
        try {
            sign = normalizeSign(apiPlanet.zodiacSign);
        } catch {
            sign = signFromLongitude(apiPlanet.longitude);
        }
        planetMap[p] = {
            planet: p,
            longitude: apiPlanet.longitude,
            sign,
            speed: apiPlanet.speed,
            isRetrograde: apiPlanet.isRetrograde,
        };
    }
    // Defensive: ensure all 10 planets have a snapshot. Missing
    // planets are filled with placeholder values that make
    // predicates evaluate cleanly to "no match".
    for (const p of PLANETS) {
        if (!planetMap[p]) {
            planetMap[p] = {
                planet: p, longitude: 0, sign: 'Aries', speed: 0, isRetrograde: false,
            };
        }
    }
    const planets = planetMap as Record<Planet, PlanetSnapshot>;

    // Moon snapshot: derive isWaxing from Sun→Moon angular separation
    // (positive separation in [0, 180] = waxing).
    const sunLong = planets.Sun.longitude;
    const moonLong = planets.Moon.longitude;
    const sunMoonDelta = ((moonLong - sunLong) % 360 + 360) % 360;
    const isWaxing = sunMoonDelta > 0 && sunMoonDelta < 180;

    const moon: MoonSnapshot = {
        sign: planets.Moon.sign,
        longitude: moonLong,
        illumination,
        isWaxing,
        phase: classifyMoonPhase(illumination, isWaxing),
        voidOfCourse: voidMoonResp.isVoidOfCourse,
    };

    // Normalize aspects: filter to ones involving recognized planets.
    const aspects = aspectsResp.aspects
        .map((a) => {
            const from = fromApiPlanetName(a.planet1);
            const to = fromApiPlanetName(a.planet2);
            const rawType = (a.type ?? a.aspect_type ?? '') as string;
            const type = API_ASPECT_TO_DSL[rawType.toLowerCase() as keyof typeof API_ASPECT_TO_DSL];
            if (!from || !to || !type) return null;
            return {
                from,
                to,
                type,
                orbDeg: a.orb,
                applying: a.is_applying ?? a.isApplying ?? null,
            };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);

    return {
        date: dateIso,
        referenceTime,
        location: deps.location,
        moon,
        planets,
        aspects,
        houseCusps: null,
    };
}

/** Helper: strip a Date down to YYYY-MM-DD in UTC. */
export function isoDateOnlyUTC(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/** Generate a list of ISO dates inclusive between start and end. */
export function dateRangeISO(startIso: string, endIso: string): string[] {
    const start = new Date(`${startIso}T00:00:00Z`);
    const end = new Date(`${endIso}T00:00:00Z`);
    const out: string[] = [];
    for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60 * 1000) {
        out.push(new Date(t).toISOString().slice(0, 10));
    }
    return out;
}
