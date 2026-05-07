import { describe, it, expect } from 'vitest';
import { computeCrossAspects } from './utils';
import { DEFAULT_COLORS } from './types';
import type { PlanetPosition } from './types';

function makePos(name: string, longitude: number): PlanetPosition {
  return {
    planet: { name, longitude, latitude: 0, speed: 0, isRetrograde: false } as any,
    x: 100, y: 100, angle: 0, exactAngle: 0,
  };
}

describe('computeCrossAspects', () => {
  it('returns empty array when either input is empty', () => {
    expect(computeCrossAspects([], [makePos('Moon', 40)], DEFAULT_COLORS)).toEqual([]);
    expect(computeCrossAspects([makePos('Sun', 168)], [], DEFAULT_COLORS)).toEqual([]);
  });

  it('detects trine when longitude diff is ~120°', () => {
    const transit = [makePos('Sun', 168)];
    const natal   = [makePos('Sun', 48)]; // diff 120° = trine
    const lines = computeCrossAspects(transit, natal, DEFAULT_COLORS, 8);
    expect(lines).toHaveLength(1);
    expect(lines[0].aspect.type).toBe('trine');
    expect(lines[0].from.planet.name).toBe('Sun');
    expect(lines[0].to.planet.name).toBe('Sun');
  });

  it('does not return conjunction lines', () => {
    const transit = [makePos('Venus', 100)];
    const natal   = [makePos('Mars', 102)]; // 2° diff = conjunction, excluded
    const lines = computeCrossAspects(transit, natal, DEFAULT_COLORS, 8);
    expect(lines).toHaveLength(0);
  });

  it('respects orb — excludes aspects beyond orb', () => {
    const transit = [makePos('Sun', 0)];
    const natal   = [makePos('Moon', 70)]; // 70° — sextile at 60°, diff 10° > orb 8
    const lines = computeCrossAspects(transit, natal, DEFAULT_COLORS, 8);
    expect(lines).toHaveLength(0);
  });

  it('from/to reference the exact PlanetPosition objects passed in', () => {
    const t = makePos('Mars', 90);
    const n = makePos('Saturn', 0); // 90° = square
    t.x = 42; t.y = 77;
    n.x = 13; n.y = 55;
    const lines = computeCrossAspects([t], [n], DEFAULT_COLORS, 8);
    expect(lines[0].from).toBe(t);
    expect(lines[0].to).toBe(n);
  });
});
