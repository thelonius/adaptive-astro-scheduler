import * as fs from 'fs';
import * as path from 'path';
import { tryParseRecipe } from '../src/optimal-timing/v2/schema/dsl';

const CANONICAL_PATH = path.join(
  __dirname,
  '..',
  'src',
  'optimal-timing',
  'v2',
  'prompts',
  'examples',
  'canonical-recipes.json',
);

describe('canonical-recipes.json', () => {
  const raw = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8')) as {
    _schema_version: string;
    recipes: Array<Record<string, unknown> & { _id: string }>;
  };

  it('declares schema version 1.1.0', () => {
    expect(raw._schema_version).toBe('1.1.0');
  });

  it('contains 5 canonical recipes', () => {
    expect(raw.recipes).toHaveLength(5);
  });

  it.each(['business_launch', 'marriage_relationship', 'mercury_matters', 'mars_matters', 'jupiter_matters'])(
    '%s parses cleanly and has 3-4 vibes',
    (id) => {
      const found = raw.recipes.find((r) => r._id === id);
      expect(found).toBeDefined();

      // Strip underscore-prefixed meta keys, mirroring loadCanonicalRecipe()
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(found!)) {
        if (!k.startsWith('_')) cleaned[k] = v;
      }

      const parsed = tryParseRecipe(cleaned);
      expect(parsed).not.toBeNull();
      expect(parsed!.vibes.length).toBeGreaterThanOrEqual(3);
      expect(parsed!.vibes.length).toBeLessThanOrEqual(4);
      // Each vibe has a stable id
      const ids = parsed!.vibes.map((v) => v.id);
      expect(new Set(ids).size).toBe(ids.length);
    },
  );
});
