/**
 * Replay/record helpers for v2 eval fixtures.
 *
 * The fixture file is a flat list of every ephemeris API call made
 * during one run, keyed by method name + canonical-JSON args. Two
 * complementary classes:
 *
 *  - `FixtureEphemerisCalculator` — replays from a recorded fixture.
 *    Used by the e2e jest test so it runs offline.
 *  - `RecordingEphemerisCalculator` — wraps a real calculator and
 *    captures every call. Used by the recorder script
 *    (`backend/scripts/record-v2-may-2026.ts`) once the live Python
 *    API is reachable.
 *
 * Both share the same fixture format (FixtureFile below) and the
 * same canonicalArgs() function so a recording produces a fixture
 * that replays cleanly.
 */

import type { IEphemerisCalculator } from '../../../core/ephemeris/interface';
import type {
    DateTime,
    PlanetsApiResponse,
    AspectsApiResponse,
    AspectPerfectionsApiResponse,
    HousesApiResponse,
    VoidMoonApiResponse,
    PlanetaryHoursApiResponse,
    RetrogradesApiResponse,
    DispositorChainsResponse,
    LunarDay,
} from '@adaptive-astro/shared/types/astrology';

export type EphemerisMethod =
    | 'getPlanetsPositions'
    | 'getAspects'
    | 'getAspectPerfections'
    | 'getHouses'
    | 'getPlanetaryHours'
    | 'getRetrogradePlanets'
    | 'getMoonPhase'
    | 'getLunarDay'
    | 'getVoidOfCourseMoon'
    | 'getDispositorChains';

export interface FixtureRecord {
    method: EphemerisMethod;
    args_key: string;
    response: unknown;
}

export interface FixtureFile {
    /** Status sentinel — set to 'recorded' once a real recording has been written. */
    _status: 'not_recorded' | 'recorded';
    /** ISO timestamp of when the fixture was recorded. Empty when _status='not_recorded'. */
    recorded_at: string;
    /** Base URL of the live API at recording time, for traceability. */
    api_base: string;
    /** Optional git SHA / version of the API service. */
    api_revision: string | null;
    /** Free-text note about the recording (date range, recipe id, etc.). */
    note: string;
    records: FixtureRecord[];
}

/**
 * Canonicalize call args into a stable string key.
 *
 * The DateTime object contains a JS Date which serializes through
 * Date.prototype.toJSON to ISO 8601, so JSON.stringify is stable.
 * For complex inputs we sort keys explicitly via this helper.
 */
export function canonicalArgs(args: unknown[]): string {
    return JSON.stringify(args, replacer);
}

function replacer(_key: string, value: unknown): unknown {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value;
    if (value !== null && typeof value === 'object') {
        const sorted: Record<string, unknown> = {};
        for (const k of Object.keys(value as Record<string, unknown>).sort()) {
            sorted[k] = (value as Record<string, unknown>)[k];
        }
        return sorted;
    }
    return value;
}

/**
 * Replays a recorded fixture. Throws on miss with a clear message
 * pointing at which call wasn't recorded — that's almost always a
 * sign that the recording needs to be re-run after a code change.
 */
export class FixtureEphemerisCalculator implements IEphemerisCalculator {
    private readonly index: Map<string, unknown>;

    constructor(fixture: FixtureFile) {
        if (fixture._status !== 'recorded') {
            throw new Error(
                'FixtureEphemerisCalculator: fixture is a placeholder ' +
                '(_status != "recorded"). Run scripts/record-v2-may-2026.ts ' +
                'against a live API before using it.',
            );
        }
        this.index = new Map(
            fixture.records.map((r) => [`${r.method}::${r.args_key}`, r.response]),
        );
    }

    private lookup<T>(method: EphemerisMethod, args: unknown[]): T {
        const key = `${method}::${canonicalArgs(args)}`;
        if (!this.index.has(key)) {
            throw new Error(
                `FixtureEphemerisCalculator: no recording for ${method} with args ${canonicalArgs(args)}. ` +
                `Re-record the fixture against a live API.`,
            );
        }
        return this.index.get(key) as T;
    }

    async getPlanetsPositions(dt: DateTime): Promise<PlanetsApiResponse> {
        return this.lookup<PlanetsApiResponse>('getPlanetsPositions', [dt]);
    }

    async getAspects(dt: DateTime, orb: number = 8): Promise<AspectsApiResponse> {
        return this.lookup<AspectsApiResponse>('getAspects', [dt, orb]);
    }

    async getAspectPerfections(
        start: string,
        end: string,
        pairs: ReadonlyArray<readonly [string, string]>,
        aspects: ReadonlyArray<string>,
    ): Promise<AspectPerfectionsApiResponse> {
        return this.lookup<AspectPerfectionsApiResponse>(
            'getAspectPerfections',
            [start, end, pairs, aspects],
        );
    }

    async getHouses(dt: DateTime, system: string = 'placidus'): Promise<HousesApiResponse> {
        return this.lookup<HousesApiResponse>('getHouses', [dt, system]);
    }

    async getPlanetaryHours(dt: DateTime): Promise<PlanetaryHoursApiResponse> {
        return this.lookup<PlanetaryHoursApiResponse>('getPlanetaryHours', [dt]);
    }

    async getRetrogradePlanets(dt: DateTime): Promise<RetrogradesApiResponse> {
        return this.lookup<RetrogradesApiResponse>('getRetrogradePlanets', [dt]);
    }

    async getMoonPhase(dt: DateTime): Promise<number> {
        return this.lookup<number>('getMoonPhase', [dt]);
    }

    async getLunarDay(dt: DateTime): Promise<LunarDay> {
        return this.lookup<LunarDay>('getLunarDay', [dt]);
    }

    async getVoidOfCourseMoon(dt: DateTime): Promise<VoidMoonApiResponse> {
        return this.lookup<VoidMoonApiResponse>('getVoidOfCourseMoon', [dt]);
    }

    async getDispositorChains(
        dt: DateTime,
        system: string = 'traditional',
    ): Promise<DispositorChainsResponse> {
        return this.lookup<DispositorChainsResponse>('getDispositorChains', [dt, system]);
    }
}

/**
 * Wraps any IEphemerisCalculator and records every call. Used by
 * the recorder script to talk to the live API once and capture
 * every response. Call `.dump()` after the run to get a FixtureFile.
 */
export class RecordingEphemerisCalculator implements IEphemerisCalculator {
    private readonly records: FixtureRecord[] = [];

    constructor(
        private readonly inner: IEphemerisCalculator,
        private readonly meta: { api_base: string; api_revision?: string | null; note?: string } = { api_base: 'unknown' },
    ) {}

    private async record<T>(method: EphemerisMethod, args: unknown[], call: () => Promise<T>): Promise<T> {
        const response = await call();
        this.records.push({
            method,
            args_key: canonicalArgs(args),
            response,
        });
        return response;
    }

    dump(): FixtureFile {
        return {
            _status: 'recorded',
            recorded_at: new Date().toISOString(),
            api_base: this.meta.api_base,
            api_revision: this.meta.api_revision ?? null,
            note: this.meta.note ?? '',
            records: this.records,
        };
    }

    async getPlanetsPositions(dt: DateTime): Promise<PlanetsApiResponse> {
        return this.record('getPlanetsPositions', [dt], () => this.inner.getPlanetsPositions(dt));
    }

    async getAspects(dt: DateTime, orb: number = 8): Promise<AspectsApiResponse> {
        return this.record('getAspects', [dt, orb], () => this.inner.getAspects(dt, orb));
    }

    async getAspectPerfections(
        start: string,
        end: string,
        pairs: ReadonlyArray<readonly [string, string]>,
        aspects: ReadonlyArray<string>,
    ): Promise<AspectPerfectionsApiResponse> {
        return this.record(
            'getAspectPerfections',
            [start, end, pairs, aspects],
            () => this.inner.getAspectPerfections(start, end, pairs, aspects),
        );
    }

    async getHouses(dt: DateTime, system: string = 'placidus'): Promise<HousesApiResponse> {
        return this.record('getHouses', [dt, system], () => this.inner.getHouses(dt, system));
    }

    async getPlanetaryHours(dt: DateTime): Promise<PlanetaryHoursApiResponse> {
        return this.record('getPlanetaryHours', [dt], () => this.inner.getPlanetaryHours(dt));
    }

    async getRetrogradePlanets(dt: DateTime): Promise<RetrogradesApiResponse> {
        return this.record('getRetrogradePlanets', [dt], () => this.inner.getRetrogradePlanets(dt));
    }

    async getMoonPhase(dt: DateTime): Promise<number> {
        return this.record('getMoonPhase', [dt], () => this.inner.getMoonPhase(dt));
    }

    async getLunarDay(dt: DateTime): Promise<LunarDay> {
        return this.record('getLunarDay', [dt], () => this.inner.getLunarDay(dt));
    }

    async getVoidOfCourseMoon(dt: DateTime): Promise<VoidMoonApiResponse> {
        return this.record('getVoidOfCourseMoon', [dt], () => this.inner.getVoidOfCourseMoon(dt));
    }

    async getDispositorChains(
        dt: DateTime,
        system: string = 'traditional',
    ): Promise<DispositorChainsResponse> {
        return this.record(
            'getDispositorChains',
            [dt, system],
            () => this.inner.getDispositorChains(dt, system),
        );
    }
}
