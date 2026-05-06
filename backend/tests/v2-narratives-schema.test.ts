import { NarrativeBundleSchema, tryParseNarrativeBundle } from '../src/optimal-timing/v2/schema/narratives';

describe('NarrativeBundle schema', () => {
  it('accepts a well-formed bundle', () => {
    const bundle = {
      narratives: {
        '2026-05-19': {
          nostalgic_return: 'Луна в Раке поднимает память…',
          practical_cleanup: 'Земная Луна, пора разбирать прошлогодние ящики…',
        },
        '2026-05-20': {
          nostalgic_return: 'Тёплый вторник…',
          practical_cleanup: 'Отлично для уборки…',
        },
      },
    };
    expect(NarrativeBundleSchema.safeParse(bundle).success).toBe(true);
  });

  it('accepts empty narratives map', () => {
    expect(NarrativeBundleSchema.safeParse({ narratives: {} }).success).toBe(true);
  });

  it('rejects non-ISO date keys', () => {
    expect(
      NarrativeBundleSchema.safeParse({
        narratives: { 'May 19': { nostalgic: 'x' } },
      }).success,
    ).toBe(false);
  });

  it('rejects empty narrative text', () => {
    expect(
      NarrativeBundleSchema.safeParse({
        narratives: { '2026-05-19': { nostalgic: '' } },
      }).success,
    ).toBe(false);
  });

  it('rejects narrative text > 1000 chars', () => {
    expect(
      NarrativeBundleSchema.safeParse({
        narratives: { '2026-05-19': { nostalgic: 'x'.repeat(1001) } },
      }).success,
    ).toBe(false);
  });

  it('tryParseNarrativeBundle returns null on failure, parsed on success', () => {
    expect(tryParseNarrativeBundle({ narratives: 'not an object' })).toBeNull();
    expect(
      tryParseNarrativeBundle({ narratives: { '2026-05-19': { v: 'ok' } } }),
    ).not.toBeNull();
  });
});
