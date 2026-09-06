/**
 * Ретроградность на пути от эфемерид до предиката.
 *
 * Python-сервис отдаёт поле is_retrograde (snake_case), а build-day-context
 * читал только apiPlanet.isRetrograde. С живой ручки там undefined, флаг в
 * DayContext всегда ложился false, и predicate planet_retrograde не срабатывал
 * никогда — даже после того, как сам сервис научился считать ретроградность.
 */

import { buildDayContext } from '../src/optimal-timing/v2/pipeline/build-day-context';
import { evalPlanetRetrograde } from '../src/optimal-timing/v2/predicates/planet-state';
import type { IEphemerisCalculator } from '../src/core/ephemeris/interface';

const LOCATION = { latitude: 55.7558, longitude: 37.6173, timezone: 'UTC' };

// Ответ /api/v1/ephemeris/planets на 2026-09-05: ретроградны Сатурн, Нептун, Плутон.
const SNAKE_CASE_PLANETS = [
    { name: 'Sun', longitude: 162.95, latitude: 0, speed: 0.9696, is_retrograde: false },
    { name: 'Moon', longitude: 88.51, latitude: 0, speed: 14.2801, is_retrograde: false },
    { name: 'Mercury', longitude: 170.97, latitude: 0, speed: 1.7933, is_retrograde: false },
    { name: 'Venus', longitude: 206.63, latitude: 0, speed: 0.7359, is_retrograde: false },
    { name: 'Mars', longitude: 106.23, latitude: 0, speed: 0.6277, is_retrograde: false },
    { name: 'Jupiter', longitude: 134.64, latitude: 0, speed: 0.2069, is_retrograde: false },
    { name: 'Saturn', longitude: 13.42, latitude: 0, speed: -0.0615, is_retrograde: true },
    { name: 'Uranus', longitude: 65.68, latitude: 0, speed: 0.0046, is_retrograde: false },
    { name: 'Neptune', longitude: 3.55, latitude: 0, speed: -0.0254, is_retrograde: true },
    { name: 'Pluto', longitude: 303.43, latitude: 0, speed: -0.0168, is_retrograde: true },
];

function stubEphemeris(planets: unknown[]): IEphemerisCalculator {
    return {
        getPlanetsPositions: async () => ({
            date: '2026-09-05',
            location: LOCATION,
            planets,
        }),
        getAspects: async () => ({ date: '2026-09-05', aspects: [] }),
        getVoidOfCourseMoon: async () => ({ date: '2026-09-05', isVoidOfCourse: false }),
        getMoonPhase: async () => ({ illumination: 0.5, phase: 'first_quarter' }),
    } as unknown as IEphemerisCalculator;
}

describe('buildDayContext: ретроградность', () => {
    it('читает snake_case is_retrograde из ответа Python-сервиса', async () => {
        const ctx = await buildDayContext('2026-09-05', {
            ephemeris: stubEphemeris(SNAKE_CASE_PLANETS),
            location: LOCATION,
        });

        expect(ctx.planets.Saturn.isRetrograde).toBe(true);
        expect(ctx.planets.Neptune.isRetrograde).toBe(true);
        expect(ctx.planets.Pluto.isRetrograde).toBe(true);
        expect(ctx.planets.Mercury.isRetrograde).toBe(false);
        expect(ctx.planets.Sun.isRetrograde).toBe(false);
    });

    it('предикат planet_retrograde срабатывает на этом контексте', async () => {
        const ctx = await buildDayContext('2026-09-05', {
            ephemeris: stubEphemeris(SNAKE_CASE_PLANETS),
            location: LOCATION,
        });

        expect(
            evalPlanetRetrograde({ type: 'planet_retrograde', planet: 'Saturn' } as never, ctx).matched,
        ).toBe(true);
        expect(
            evalPlanetRetrograde({ type: 'planet_retrograde', planet: 'Venus' } as never, ctx).matched,
        ).toBe(false);
    });

    it('camelCase-алиас продолжает работать (моки, старые вызовы)', async () => {
        const camel = SNAKE_CASE_PLANETS.map(({ is_retrograde, ...rest }) => ({
            ...rest,
            isRetrograde: is_retrograde,
        }));

        const ctx = await buildDayContext('2026-09-05', {
            ephemeris: stubEphemeris(camel),
            location: LOCATION,
        });

        expect(ctx.planets.Saturn.isRetrograde).toBe(true);
        expect(ctx.planets.Mercury.isRetrograde).toBe(false);
    });

    it('без поля вовсе флаг ложится false, а не undefined', async () => {
        const bare = SNAKE_CASE_PLANETS.map(({ is_retrograde, ...rest }) => rest);

        const ctx = await buildDayContext('2026-09-05', {
            ephemeris: stubEphemeris(bare),
            location: LOCATION,
        });

        expect(ctx.planets.Saturn.isRetrograde).toBe(false);
    });
});
