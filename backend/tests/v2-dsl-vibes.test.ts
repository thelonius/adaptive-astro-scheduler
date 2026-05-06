import { tryParseRecipe, parseRecipe, SCHEMA_VERSION } from '../src/optimal-timing/v2/schema/dsl';

const validBase = {
  intent: 'launch a coffee shop',
  rationale: 'For a new business launch...',
  disqualifiers: [],
  weighted_conditions: [
    { predicate: { type: 'moon_waxing' }, weight: 8 },
  ],
  metadata: {
    schema_version: '1.1.0',
    generated_by: { model: 'test', prompt_template_version: 'recipe.v2' },
    generated_at: '2026-05-05T00:00:00.000Z',
  },
};

describe('Recipe schema with vibes', () => {
  it('SCHEMA_VERSION is 1.1.0', () => {
    expect(SCHEMA_VERSION).toBe('1.1.0');
  });

  it('accepts a recipe with 2 valid vibes', () => {
    const r = tryParseRecipe({
      ...validBase,
      vibes: [
        { id: 'aggressive_growth', label: 'агрессивный рост' },
        { id: 'sustainable_build', label: 'устойчивый рост', emoji: '🌱' },
      ],
    });
    expect(r).not.toBeNull();
    expect(r!.vibes).toHaveLength(2);
    expect(r!.vibes[1].emoji).toBe('🌱');
  });

  it('rejects a recipe with no vibes', () => {
    expect(tryParseRecipe({ ...validBase, vibes: [] })).toBeNull();
  });

  it('rejects a recipe missing the vibes field entirely', () => {
    expect(tryParseRecipe(validBase)).toBeNull();
  });

  it('rejects a recipe with more than 5 vibes', () => {
    expect(
      tryParseRecipe({
        ...validBase,
        vibes: Array.from({ length: 6 }, (_, i) => ({
          id: `v${i}`,
          label: `vibe ${i}`,
        })),
      }),
    ).toBeNull();
  });

  it('rejects a vibe id that is not snake_case ascii', () => {
    expect(
      tryParseRecipe({
        ...validBase,
        vibes: [
          { id: 'Mixed-Case', label: 'bad' },
          { id: 'ok_id', label: 'good' },
        ],
      }),
    ).toBeNull();
  });

  it('rejects a vibe with empty label', () => {
    expect(
      tryParseRecipe({
        ...validBase,
        vibes: [
          { id: 'a', label: '' },
          { id: 'b', label: 'ok' },
        ],
      }),
    ).toBeNull();
  });

  it('rejects a vibe with overlong label (>60 chars)', () => {
    expect(
      tryParseRecipe({
        ...validBase,
        vibes: [
          { id: 'a', label: 'x'.repeat(61) },
          { id: 'b', label: 'ok' },
        ],
      }),
    ).toBeNull();
  });

  it('parseRecipe (strict) throws on missing vibes', () => {
    expect(() => parseRecipe(validBase)).toThrow();
  });
});
