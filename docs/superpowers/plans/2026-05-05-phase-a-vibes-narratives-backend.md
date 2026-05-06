# Phase A — Vibes & Narratives Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Optimal Timing v2 backend to (a) generate per-intent vibes alongside recipes, (b) render per-day narratives for each (day, vibe) pair via a new LLM stage, (c) optionally accept a natal chart for personalized narratives. After this phase the API returns the new fields; frontend integration is Phase B+.

**Architecture:** Two LLM stages — `recipe.v2` (LLM #1, recipe + vibes list, modifies existing `generateRecipe`) and `narratives.v1` (LLM #2, new `renderNarratives` stage). Two-level in-memory LRU cache: L1 by `(lang, intent)` (existing, untouched), L2 by `(lang, intent, dates, natal_chart_id)` for narratives. Trace gets a new `stage_render_narratives` field. Spec: [docs/superpowers/specs/2026-05-05-vibe-rendering-and-biwheel-design.md](../specs/2026-05-05-vibe-rendering-and-biwheel-design.md).

**Tech Stack:** TypeScript, Zod, Express, Jest with ts-jest, NVIDIA NIM (OpenAI-compatible HTTP). Existing patterns followed: `recipe-generator.ts` for the LLM-call template; `controller.ts` for the API surface; `schema/dsl.ts` for the DSL.

---

## File Structure

**Create:**
- `backend/src/optimal-timing/v2/llm/narratives-generator.ts` — new LLM stage, mirrors `recipe-generator.ts` patterns
- `backend/src/optimal-timing/v2/prompts/narratives.v1.md` — system prompt template for narratives
- `backend/src/optimal-timing/v2/prompts/recipe.v2.md` — replaces `recipe.v1.md`, with vibes instruction (rename via `git mv`)
- `backend/tests/v2-dsl-vibes.test.ts` — Zod validation of `vibes` field
- `backend/tests/v2-narratives-generator.test.ts` — narratives stage with mocked NIM
- `backend/tests/v2-controller-find-with-intent.test.ts` — controller integration with mocked NIM and natal repo

**Modify:**
- `backend/src/optimal-timing/v2/schema/dsl.ts` — add `VibeSchema`, extend `RecipeSchema.vibes`, bump `SCHEMA_VERSION` to `1.1.0`
- `backend/src/optimal-timing/v2/prompts/examples/canonical-recipes.json` — add 3-4 vibes per recipe, bump `_schema_version` to `1.1.0`
- `backend/src/optimal-timing/v2/llm/recipe-generator.ts` — `PROMPT_VERSION = 'recipe.v2'`, point at renamed file
- `backend/src/optimal-timing/v2/schema/trace.ts` — add `StageRenderNarratives` type, add `stage_render_narratives` to `TraceRecord`
- `backend/src/optimal-timing/v2/api/controller.ts` — accept optional `natal_chart_id`, fetch natal, call `renderNarratives`, embed `vibe_narratives` per window in response
- `backend/src/optimal-timing/v2/pipeline/index.ts` — re-export `renderNarratives` (no logic changes)

---

## Task 1: Add `VibeSchema` and extend `RecipeSchema`

**Files:**
- Modify: `backend/src/optimal-timing/v2/schema/dsl.ts:15` (bump `SCHEMA_VERSION`), `:183-208` (add `VibeSchema`, extend `RecipeSchema`)
- Test: `backend/tests/v2-dsl-vibes.test.ts` (new)

- [ ] **Step 1: Write failing tests**

Create `backend/tests/v2-dsl-vibes.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests, expect FAIL**

```bash
cd backend && npx jest v2-dsl-vibes -v
```

Expected: tests fail because `VibeSchema` doesn't exist and `RecipeSchema` doesn't include `vibes`. Compile errors or "expected non-null, got null" assertions.

- [ ] **Step 3: Add `VibeSchema` and extend `RecipeSchema`**

In `backend/src/optimal-timing/v2/schema/dsl.ts`, replace line 15:

```typescript
export const SCHEMA_VERSION = '1.1.0';
```

Insert the `VibeSchema` block right above `RecipeMetadataSchema` (around line 173):

```typescript
// ─── Vibes (Phase A) ──────────────────────────────────────────────────────────
// A vibe is a framing of the user's intent — an alternative reading lens.
// LLM proposes 2-5 vibes per recipe. The IDs are stable handles, the labels
// are user-facing strings in the user's language, the emoji is decorative.

export const VibeSchema = z.object({
    id: z.string().regex(/^[a-z][a-z0-9_]*$/, 'vibe id must be snake_case ascii'),
    label: z.string().min(1).max(60),
    emoji: z.string().max(4).optional(),
});
export type Vibe = z.infer<typeof VibeSchema>;
```

Modify `RecipeSchema` (around line 183) to add `vibes` between `weighted_conditions` and `metadata`:

```typescript
export const RecipeSchema = z.object({
    intent: z.string().min(1).max(500),
    rationale: z.string().min(1).max(1000),
    disqualifiers: z.array(PredicateSchema).default([]),
    weighted_conditions: z.array(WeightedPredicateSchema).min(1),
    /**
     * Alternative framings of the intent — different vibes the user
     * might bring to the same event with different intentions or
     * expectations. 2-5 entries.
     */
    vibes: z.array(VibeSchema).min(2).max(5),
    metadata: RecipeMetadataSchema,
});
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
cd backend && npx jest v2-dsl-vibes -v
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/optimal-timing/v2/schema/dsl.ts backend/tests/v2-dsl-vibes.test.ts
git commit -m "feat(v2/dsl): add VibeSchema, extend RecipeSchema with vibes (1.1.0)"
```

---

## Task 2: Add vibes to canonical recipes JSON

**Files:**
- Modify: `backend/src/optimal-timing/v2/prompts/examples/canonical-recipes.json` (every recipe gets `vibes`, bump `_schema_version`)
- Test: `backend/tests/v2-canonical-recipes.test.ts` (new)

- [ ] **Step 1: Write failing test**

Create `backend/tests/v2-canonical-recipes.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests, expect FAIL**

```bash
cd backend && npx jest v2-canonical-recipes -v
```

Expected: every recipe fails Zod validation because `vibes` is missing.

- [ ] **Step 3: Update canonical-recipes.json**

Read the file first to get exact structure, then for each of the 5 recipes:
1. Add `"vibes"` array after `"weighted_conditions"` and before `"metadata"`
2. Update top-level `"_schema_version"` to `"1.1.0"`
3. Update each recipe's `metadata.schema_version` to `"1.1.0"`

Vibes per recipe:

`business_launch`:
```json
"vibes": [
  { "id": "aggressive_growth", "label": "aggressive growth", "emoji": "🚀" },
  { "id": "sustainable_build", "label": "sustainable build", "emoji": "🌱" },
  { "id": "signal_to_market", "label": "signal to market", "emoji": "📣" },
  { "id": "quiet_start", "label": "quiet start", "emoji": "🤫" }
]
```

`marriage_relationship`:
```json
"vibes": [
  { "id": "public_celebration", "label": "public celebration", "emoji": "🎉" },
  { "id": "intimate_bond", "label": "intimate bond", "emoji": "💞" },
  { "id": "family_legacy", "label": "family legacy", "emoji": "🏛️" },
  { "id": "spiritual_union", "label": "spiritual union", "emoji": "✨" }
]
```

`mercury_matters`:
```json
"vibes": [
  { "id": "analytical_focus", "label": "analytical focus", "emoji": "🔍" },
  { "id": "persuasive_pitch", "label": "persuasive pitch", "emoji": "🎤" },
  { "id": "careful_negotiation", "label": "careful negotiation", "emoji": "🤝" },
  { "id": "creative_brainstorm", "label": "creative brainstorm", "emoji": "💡" }
]
```

`mars_matters`:
```json
"vibes": [
  { "id": "competitive_drive", "label": "competitive drive", "emoji": "⚔️" },
  { "id": "disciplined_execution", "label": "disciplined execution", "emoji": "🎯" },
  { "id": "breakthrough_attempt", "label": "breakthrough attempt", "emoji": "💥" },
  { "id": "measured_assertion", "label": "measured assertion", "emoji": "🛡️" }
]
```

`jupiter_matters`:
```json
"vibes": [
  { "id": "expansive_growth", "label": "expansive growth", "emoji": "🌍" },
  { "id": "philosophical_journey", "label": "philosophical journey", "emoji": "📚" },
  { "id": "risk_taking", "label": "risk taking", "emoji": "🎲" },
  { "id": "generous_giving", "label": "generous giving", "emoji": "🎁" }
]
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
cd backend && npx jest v2-canonical -v
```

Expected: 7 tests pass (1 schema version + 1 count + 5 per-recipe).

- [ ] **Step 5: Re-run vibes test to confirm no regression**

```bash
cd backend && npx jest v2-dsl-vibes v2-canonical -v
```

Expected: all tests still pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/optimal-timing/v2/prompts/examples/canonical-recipes.json backend/tests/v2-canonical-recipes.test.ts
git commit -m "feat(v2/canonical): add 4 vibes per recipe, bump to schema 1.1.0"
```

---

## Task 3: Rename `recipe.v1.md` → `recipe.v2.md`, instruct LLM to emit vibes

**Files:**
- Rename: `backend/src/optimal-timing/v2/prompts/recipe.v1.md` → `recipe.v2.md` (via `git mv`)
- Modify: `backend/src/optimal-timing/v2/prompts/recipe.v2.md` (add vibes instruction)
- Modify: `backend/src/optimal-timing/v2/llm/recipe-generator.ts:25` (`PROMPT_VERSION`), `:54` (path constant)
- Test: extend `backend/tests/v2-dsl-vibes.test.ts` with prompt-content sanity check

- [ ] **Step 1: Rename the file with `git mv` to preserve history**

```bash
git mv backend/src/optimal-timing/v2/prompts/recipe.v1.md backend/src/optimal-timing/v2/prompts/recipe.v2.md
```

- [ ] **Step 2: Update the prompt content**

Open `backend/src/optimal-timing/v2/prompts/recipe.v2.md`. After the existing instructions about `disqualifiers` / `weighted_conditions`, insert a new section before the few-shot examples:

```markdown
## Vibes — alternative framings

After the recipe predicates, propose 2-4 distinct **vibes** — alternative
framings someone might bring to the same intent with different intentions or
expectations. Examples:

- For "open a coffee shop" — `aggressive_growth`, `sustainable_build`,
  `signal_to_market`, `quiet_start`. Same event, different aspirations.
- For "поездка на дачу" — `nostalgic_return`, `practical_cleanup`,
  `first_greens`. Same trip, different reasons to go.

Each vibe has:
- `id` — stable snake_case ASCII handle (will key UI state and cache)
- `label` — short user-facing string in the user's language (≤60 chars)
- `emoji` — optional decorative single emoji

Vibes are NOT alternative recipes — they are reading lenses applied to the
same ranked days afterward by a separate stage. Don't make them
contradictory; make them complementary angles on the same event.

Output the vibes as a JSON array under the `vibes` key, alongside `intent`,
`rationale`, `disqualifiers`, `weighted_conditions`, `metadata`.
```

Update the JSON-shape example in the file to include `vibes`:

```json
{
  "intent": "...",
  "rationale": "...",
  "disqualifiers": [...],
  "weighted_conditions": [...],
  "vibes": [
    { "id": "aggressive_growth", "label": "aggressive growth", "emoji": "🚀" },
    { "id": "sustainable_build", "label": "sustainable build", "emoji": "🌱" }
  ],
  "metadata": {...}
}
```

- [ ] **Step 3: Bump constants in `recipe-generator.ts`**

Edit `backend/src/optimal-timing/v2/llm/recipe-generator.ts`:

Line 25:
```typescript
const PROMPT_VERSION = 'recipe.v2';
```

Line 54:
```typescript
const RECIPE_PROMPT_PATH = path.join(PROMPT_DIR, 'recipe.v2.md');
```

(The canonical recipes path stays the same; only the markdown template moves.)

- [ ] **Step 4: Add a sanity test for the prompt content**

Append to `backend/tests/v2-dsl-vibes.test.ts`:

```typescript
import * as fsx from 'fs';
import * as pathx from 'path';

describe('recipe.v2.md prompt template', () => {
  const promptPath = pathx.join(
    __dirname, '..', 'src', 'optimal-timing', 'v2', 'prompts', 'recipe.v2.md',
  );
  const text = fsx.readFileSync(promptPath, 'utf8');

  it('exists and is non-trivial', () => {
    expect(text.length).toBeGreaterThan(500);
  });

  it('mentions vibes by name', () => {
    expect(text.toLowerCase()).toContain('vibes');
  });

  it('shows the vibes JSON shape with id and label', () => {
    expect(text).toMatch(/"id":\s*"[a-z_]+"/);
    expect(text).toMatch(/"label":/);
  });

  it('still has the canonical recipes injection placeholder', () => {
    expect(text).toMatch(/\[CANONICAL RECIPES INSERTED HERE/);
  });
});
```

- [ ] **Step 5: Run tests, expect PASS**

```bash
cd backend && npx jest v2-dsl-vibes -v
```

Expected: all original tests + 4 new prompt sanity tests pass. If "still has the canonical recipes injection placeholder" fails, locate the pattern in the existing prompt (it lives there as a placeholder string the runtime fills) and ensure the rename + edits left it intact.

- [ ] **Step 6: Verify the build still resolves the renamed file**

```bash
cd backend && npm run build 2>&1 | tail
```

Expected: build succeeds. The `build:assets` step (added in PR #21) copies `prompts/` recursively, so `recipe.v2.md` lands in `dist/` automatically.

- [ ] **Step 7: Commit**

```bash
git add backend/src/optimal-timing/v2/prompts/recipe.v2.md \
        backend/src/optimal-timing/v2/llm/recipe-generator.ts \
        backend/tests/v2-dsl-vibes.test.ts
git commit -m "feat(v2/llm): rename recipe.v1.md → v2, instruct LLM to emit vibes"
```

---

## Task 4: Define narrative bundle types and Zod schema

**Files:**
- Create: `backend/src/optimal-timing/v2/schema/narratives.ts`
- Test: `backend/tests/v2-narratives-schema.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/v2-narratives-schema.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests, expect FAIL**

```bash
cd backend && npx jest v2-narratives-schema -v
```

Expected: cannot find module — file doesn't exist yet.

- [ ] **Step 3: Create the schema file**

Create `backend/src/optimal-timing/v2/schema/narratives.ts`:

```typescript
/**
 * Optimal Timing v2 — Narrative Bundle schema
 *
 * The output of the renderNarratives stage. Maps each top-N day (by ISO
 * date) to a per-vibe narrative text. Validated against this schema after
 * the LLM returns; rejection triggers one retry then throws.
 */

import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const NarrativeBundleSchema = z.object({
    narratives: z.record(
        z.string().regex(ISO_DATE, 'narrative key must be YYYY-MM-DD'),
        z.record(
            z.string().regex(/^[a-z][a-z0-9_]*$/, 'vibe id must be snake_case ascii'),
            z.string().min(1).max(1000),
        ),
    ),
});

export type NarrativeBundle = z.infer<typeof NarrativeBundleSchema>;

/**
 * Safe parse helper. Returns the parsed bundle or null on validation failure.
 * Mirrors `tryParseRecipe` in dsl.ts.
 */
export function tryParseNarrativeBundle(raw: unknown): NarrativeBundle | null {
    const r = NarrativeBundleSchema.safeParse(raw);
    return r.success ? r.data : null;
}
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
cd backend && npx jest v2-narratives-schema -v
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/optimal-timing/v2/schema/narratives.ts backend/tests/v2-narratives-schema.test.ts
git commit -m "feat(v2/narratives): add NarrativeBundle Zod schema"
```

---

## Task 5: Write `narratives.v1.md` prompt template

**Files:**
- Create: `backend/src/optimal-timing/v2/prompts/narratives.v1.md`
- Test: extend `backend/tests/v2-narratives-schema.test.ts` with file existence sanity check

- [ ] **Step 1: Write failing test**

Append to `backend/tests/v2-narratives-schema.test.ts`:

```typescript
import * as fsP from 'fs';
import * as pathP from 'path';

describe('narratives.v1.md prompt', () => {
  const promptPath = pathP.join(
    __dirname, '..', 'src', 'optimal-timing', 'v2', 'prompts', 'narratives.v1.md',
  );

  it('exists', () => {
    expect(fsP.existsSync(promptPath)).toBe(true);
  });

  it('contains required structural markers', () => {
    const text = fsP.readFileSync(promptPath, 'utf8');
    expect(text.length).toBeGreaterThan(400);
    expect(text.toLowerCase()).toContain('narrative');
    expect(text.toLowerCase()).toContain('vibe');
    // Mentions both with-natal and without-natal modes
    expect(text.toLowerCase()).toContain('natal');
    // Asks for JSON-only output
    expect(text.toLowerCase()).toMatch(/json|valid json/);
    // Shows the {date: {vibe_id: text}} shape
    expect(text).toMatch(/\d{4}-\d{2}-\d{2}|YYYY-MM-DD/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd backend && npx jest v2-narratives-schema -v
```

Expected: file existence assertion fails.

- [ ] **Step 3: Create the prompt file**

Create `backend/src/optimal-timing/v2/prompts/narratives.v1.md`:

```markdown
# Narrative-rendering prompt — v1

You are an electional astrologer producing short, concrete day-readings. For
each of the supplied DAYS, write a 1-3 sentence narrative under each of the
supplied VIBES. The narrative must be **grounded in the day's astrological
data** — name the planets, signs, aspects, or matched predicates that are
actually present in the day's snapshot. Do not write generic prose.

## Inputs

The user message contains:

- `INTENT` — the user's free-text reason for asking
- `LANGUAGE` — `ru` or `en`; write narratives in this language
- `RECIPE` — the recipe object that ranked these days, including its
  `rationale` so you understand the strategy
- `VIBES` — array of `{id, label, emoji?}`. Each `id` is your output key.
- `DAYS` — array of objects with `date` (YYYY-MM-DD), `ephemeris_snapshot`
  (moon sign/phase, sun sign, retrograde planets), and `matched_predicates`
  (the predicates from the recipe that fired on this day, with weights)
- `NATAL_CHART` — optional. If present, includes the user's natal planet
  positions in zodiac longitude. When you write narratives, reference natal
  placements where transit makes meaningful contact (e.g., "transiting Moon
  trines your natal Mercury → clear thinking on this day"). Without the
  natal, keep narratives strictly about the transit.

## Output

Return JSON only. No prose, no markdown fences. Shape:

```json
{
  "narratives": {
    "2026-05-19": {
      "nostalgic_return": "Луна в Раке…",
      "practical_cleanup": "Земная воля Девы…"
    },
    "2026-05-20": {
      "nostalgic_return": "Утро вторника…",
      "practical_cleanup": "Длинный день для разборки…"
    }
  }
}
```

The outer keys are exactly the `date` strings from the DAYS array. The
inner keys are exactly the `vibe.id` values. Every (date, vibe_id) pair
must have a non-empty narrative ≤ 1000 characters.

## Style

- 1-3 sentences per narrative, conversational but specific.
- Quote the actual planet/sign/aspect from the snapshot — that's what
  separates this from generic horoscope text.
- Don't repeat the same astrological fact across vibes for the same day —
  rotate which placement each vibe leans into.
- For natal-aware mode: at least half the narratives in the bundle should
  reference a specific natal placement when one is available.
- Avoid clichés ("the universe wants you…"). Stay practical.

If you cannot ground a narrative for a particular (date, vibe) — for
example, the vibe is not really applicable to the day — still produce a
short text, but make it explicit: "В этот день вайб X выражен слабо;
астрологически нейтрально."
```

- [ ] **Step 4: Run, expect PASS**

```bash
cd backend && npx jest v2-narratives-schema -v
```

Expected: 8 tests pass (6 schema + 2 prompt).

- [ ] **Step 5: Verify build copies the asset**

```bash
cd backend && rm -rf dist && npm run build && ls dist/optimal-timing/v2/prompts/narratives.v1.md
```

Expected: file exists in dist after build (the build:assets step from PR #21 copies the whole `prompts/` tree).

- [ ] **Step 6: Commit**

```bash
git add backend/src/optimal-timing/v2/prompts/narratives.v1.md backend/tests/v2-narratives-schema.test.ts
git commit -m "feat(v2/narratives): add narratives.v1.md prompt template"
```

---

## Task 6: Implement `renderNarratives` (no natal, no cache)

**Files:**
- Create: `backend/src/optimal-timing/v2/llm/narratives-generator.ts`
- Test: `backend/tests/v2-narratives-generator.test.ts`

- [ ] **Step 1: Write failing tests with mocked NIM**

Create `backend/tests/v2-narratives-generator.test.ts`:

```typescript
import { renderNarratives } from '../src/optimal-timing/v2/llm/narratives-generator';
import type { Recipe } from '../src/optimal-timing/v2/schema/dsl';
import type { ScoredDay } from '../src/optimal-timing/v2/schema/trace';

const mockRecipe = (vibes: Array<{ id: string; label: string }>): Recipe => ({
  intent: 'поездка на дачу',
  rationale: 'inspection visit',
  disqualifiers: [],
  weighted_conditions: [{ predicate: { type: 'moon_waxing' }, weight: 5 }],
  vibes,
  metadata: {
    schema_version: '1.1.0',
    generated_by: { model: 'mock', prompt_template_version: 'recipe.v2' },
    generated_at: '2026-05-05T00:00:00.000Z',
  },
});

const mockDay = (date: string): ScoredDay => ({
  date,
  raw_score: 50,
  rank: 1,
  predicates_fired: [],
  ephemeris_snapshot: {
    moon: { sign: 'Cancer', phase: 'waxing_crescent', illumination: 0.1, void_of_course: false },
    sun_sign: 'Taurus',
    retrograde_planets: [],
    notable_aspects: [],
  },
});

beforeEach(() => {
  process.env.NVIDIA_API_KEY = 'nvapi-test-key-for-mock';
});

describe('renderNarratives', () => {
  it('happy path: returns narratives for every (date, vibe) pair', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: JSON.stringify({
            narratives: {
              '2026-05-19': { nostalgic_return: 'Луна в Раке…', practical_cleanup: 'Земная Луна…' },
              '2026-05-20': { nostalgic_return: 'Тёплый вторник…', practical_cleanup: 'Отлично для уборки…' },
            },
          }) },
        }],
      }),
    }));
    (global as any).fetch = fetchMock;

    const result = await renderNarratives({
      intent: 'поездка на дачу',
      recipe: mockRecipe([
        { id: 'nostalgic_return', label: 'возвращение' },
        { id: 'practical_cleanup', label: 'уборка' },
      ]),
      windows: [mockDay('2026-05-19'), mockDay('2026-05-20')],
      language: 'ru',
    });

    expect(result.narratives['2026-05-19'].nostalgic_return).toMatch(/Луна/);
    expect(result.narratives['2026-05-20'].practical_cleanup).toMatch(/уборки/);
    expect(result.llm.cached).toBe(false);
    expect(result.llm.model).toBeTruthy();
    expect(result.attempts).toBe(1);
  });

  it('retries once on invalid JSON, then succeeds', async () => {
    let call = 0;
    (global as any).fetch = jest.fn(async () => {
      call++;
      const content = call === 1
        ? 'not json at all'
        : JSON.stringify({ narratives: { '2026-05-19': { v1: 'ok' } } });
      return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) };
    });

    const result = await renderNarratives({
      intent: 'x',
      recipe: mockRecipe([{ id: 'v1', label: 'one' }, { id: 'v2', label: 'two' }]),
      windows: [mockDay('2026-05-19')],
    });

    expect(result.attempts).toBe(2);
    expect(result.narratives['2026-05-19'].v1).toBe('ok');
  });

  it('throws after 2 invalid responses', async () => {
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'still not json' } }] }),
    }));

    await expect(
      renderNarratives({
        intent: 'x',
        recipe: mockRecipe([{ id: 'v1', label: 'one' }, { id: 'v2', label: 'two' }]),
        windows: [mockDay('2026-05-19')],
      }),
    ).rejects.toThrow(/narrative|JSON/i);
  });

  it('throws on HTTP error', async () => {
    (global as any).fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'server error',
    }));

    await expect(
      renderNarratives({
        intent: 'x',
        recipe: mockRecipe([{ id: 'v1', label: 'one' }, { id: 'v2', label: 'two' }]),
        windows: [mockDay('2026-05-19')],
      }),
    ).rejects.toThrow(/NIM HTTP 500/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd backend && npx jest v2-narratives-generator -v
```

Expected: cannot find module.

- [ ] **Step 3: Implement the generator**

Create `backend/src/optimal-timing/v2/llm/narratives-generator.ts`:

```typescript
/**
 * LLM-driven narrative rendering for top-N ranked days.
 *
 * Stage 2 of the v2 pipeline (after recipe/scoring/ranking). Takes the
 * recipe (with its vibes) plus the ranked days plus an optional natal
 * chart, asks the model to write 1-3 sentence narratives per (day, vibe).
 *
 * Mirrors recipe-generator.ts patterns: NIM HTTP, prompt cache, two-attempt
 * retry on JSON/schema failures, in-memory LRU cache (added in Task 8).
 */

import fs from 'node:fs';
import path from 'node:path';
import { tryParseNarrativeBundle } from '../schema/narratives';
import type { NarrativeBundle } from '../schema/narratives';
import type { Recipe } from '../schema/dsl';
import type { ScoredDay } from '../schema/trace';

const NIM_BASE_URL = process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1';
const NIM_MODEL = process.env.NVIDIA_MODEL ?? 'nvidia/llama-3.3-nemotron-super-49b-v1.5';
const PROMPT_VERSION = 'narratives.v1';

// ─── API key resolution (shared pattern with recipe-generator) ────────────────
let _cachedApiKey: string | null = null;
function getApiKey(): string {
    if (_cachedApiKey) return _cachedApiKey;
    const fromEnv = process.env.NVIDIA_API_KEY;
    if (fromEnv && fromEnv.length > 10) {
        _cachedApiKey = fromEnv;
        return fromEnv;
    }
    const home = process.env.HOME ?? '';
    const fallback = path.join(home, '.config', 'nvidia', 'api-key');
    if (fs.existsSync(fallback)) {
        const key = fs.readFileSync(fallback, 'utf8').trim();
        if (key.startsWith('nvapi-')) {
            _cachedApiKey = key;
            return key;
        }
    }
    throw new Error(
        'NVIDIA_API_KEY not in env and ~/.config/nvidia/api-key not found.',
    );
}

// ─── Prompt loading ───────────────────────────────────────────────────────────
const PROMPT_PATH = path.join(__dirname, '..', 'prompts', 'narratives.v1.md');
let _systemPromptCache: string | null = null;
function getSystemPrompt(): string {
    if (_systemPromptCache) return _systemPromptCache;
    _systemPromptCache = fs.readFileSync(PROMPT_PATH, 'utf8');
    return _systemPromptCache;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Optional natal chart payload. Loose typing — accepts the repository result. */
export interface NarrativeNatalChart {
    id: string;
    planets: Array<{ name: string; longitude: number; zodiacSign?: string; degree_in_sign?: number }>;
    [key: string]: unknown;
}

export interface RenderNarrativesInput {
    intent: string;
    recipe: Recipe;
    windows: ScoredDay[];
    natal_chart?: NarrativeNatalChart | null;
    language?: 'ru' | 'en' | 'auto';
}

export interface RenderNarrativesResult extends NarrativeBundle {
    llm: {
        model: string;
        prompt_version: string;
        latency_ms: number;
        cost_usd: number;
        cached: boolean;
        input_tokens: number;
        output_tokens: number;
    };
    attempts: number;
    raw_response?: string;
}

function buildUserMessage(input: RenderNarrativesInput): string {
    const lang = input.language ?? 'auto';
    // Compact day projections — only what the prompt needs.
    const days = input.windows.map((w) => ({
        date: w.date,
        ephemeris_snapshot: w.ephemeris_snapshot,
        matched_predicates: w.predicates_fired
            .filter((p) => p.matched && p.weight !== null)
            .map((p) => ({
                type: p.predicate_type,
                weight: p.weight,
                details: p.match_details,
            })),
    }));
    const payload: Record<string, unknown> = {
        INTENT: input.intent,
        LANGUAGE: lang,
        RECIPE: {
            intent: input.recipe.intent,
            rationale: input.recipe.rationale,
            disqualifiers: input.recipe.disqualifiers,
            weighted_conditions: input.recipe.weighted_conditions,
        },
        VIBES: input.recipe.vibes,
        DAYS: days,
    };
    if (input.natal_chart) {
        payload.NATAL_CHART = input.natal_chart;
    }
    return JSON.stringify(payload, null, 2);
}

function stripJsonFence(s: string): string {
    return s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

export async function renderNarratives(
    input: RenderNarrativesInput,
): Promise<RenderNarrativesResult> {
    const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: buildUserMessage(input) },
    ];

    const startedAt = Date.now();
    let attempts = 0;
    let lastRaw = '';
    let lastError: string | null = null;
    const MAX_ATTEMPTS = 2;

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        const body = {
            model: NIM_MODEL,
            messages,
            temperature: 0.4,
            top_p: 0.95,
            max_tokens: 4096,
        };

        const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${getApiKey()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`NIM HTTP ${res.status}: ${text.slice(0, 500)}`);
        }

        const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const raw = data.choices?.[0]?.message?.content ?? '';
        lastRaw = raw;
        const stripped = stripJsonFence(raw);

        let parsedJson: unknown;
        try {
            parsedJson = JSON.parse(stripped);
        } catch (e) {
            lastError = `narrative response was not valid JSON: ${(e as Error).message}`;
            messages.push({ role: 'assistant', content: raw });
            messages.push({
                role: 'user',
                content:
                    `Your previous reply was not valid JSON (${lastError}). ` +
                    `Reply with ONLY the JSON object, no prose, no markdown fences.`,
            });
            continue;
        }

        const bundle = tryParseNarrativeBundle(parsedJson);
        if (bundle) {
            return {
                narratives: bundle.narratives,
                llm: {
                    model: NIM_MODEL,
                    prompt_version: PROMPT_VERSION,
                    latency_ms: Date.now() - startedAt,
                    cost_usd: 0,
                    cached: false,
                    input_tokens: data.usage?.prompt_tokens ?? 0,
                    output_tokens: data.usage?.completion_tokens ?? 0,
                },
                attempts,
                raw_response: raw,
            };
        }

        lastError = 'narrative JSON did not match NarrativeBundleSchema';
        messages.push({ role: 'assistant', content: raw });
        messages.push({
            role: 'user',
            content:
                `Your reply did not match the expected NarrativeBundle schema (${lastError}). ` +
                `Return JSON of shape {"narratives": {"YYYY-MM-DD": {"vibe_id": "text", ...}}}, nothing else.`,
        });
    }

    throw new Error(
        `renderNarratives failed after ${attempts} attempts: ${lastError}. Raw: ${lastRaw.slice(0, 300)}`,
    );
}
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
cd backend && npx jest v2-narratives-generator -v
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/optimal-timing/v2/llm/narratives-generator.ts backend/tests/v2-narratives-generator.test.ts
git commit -m "feat(v2/narratives): implement renderNarratives stage with retry"
```

---

## Task 7: Add natal-chart support to `renderNarratives`

**Files:**
- Modify: `backend/src/optimal-timing/v2/llm/narratives-generator.ts:buildUserMessage` (already takes natal; verify behavior with test)
- Test: extend `backend/tests/v2-narratives-generator.test.ts`

- [ ] **Step 1: Add tests for natal-chart inclusion in user message**

Append to `backend/tests/v2-narratives-generator.test.ts`:

```typescript
describe('renderNarratives natal handling', () => {
  it('includes NATAL_CHART in user message when provided', async () => {
    let capturedBody: any = null;
    (global as any).fetch = jest.fn(async (_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            narratives: { '2026-05-19': { v1: 'ok', v2: 'ok2' } },
          }) } }],
        }),
      };
    });

    await renderNarratives({
      intent: 'x',
      recipe: mockRecipe([
        { id: 'v1', label: 'one' },
        { id: 'v2', label: 'two' },
      ]),
      windows: [mockDay('2026-05-19')],
      natal_chart: {
        id: 'natal-1',
        planets: [{ name: 'Sun', longitude: 168.34, zodiacSign: 'Virgo' }],
      },
    });

    const userMsg = capturedBody.messages.find((m: any) => m.role === 'user').content;
    expect(userMsg).toMatch(/NATAL_CHART/);
    expect(userMsg).toMatch(/natal-1/);
    expect(userMsg).toMatch(/Virgo/);
  });

  it('omits NATAL_CHART when not provided', async () => {
    let capturedBody: any = null;
    (global as any).fetch = jest.fn(async (_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            narratives: { '2026-05-19': { v1: 'x', v2: 'y' } },
          }) } }],
        }),
      };
    });

    await renderNarratives({
      intent: 'x',
      recipe: mockRecipe([
        { id: 'v1', label: 'one' },
        { id: 'v2', label: 'two' },
      ]),
      windows: [mockDay('2026-05-19')],
    });

    const userMsg = capturedBody.messages.find((m: any) => m.role === 'user').content;
    expect(userMsg).not.toMatch(/NATAL_CHART/);
  });
});
```

- [ ] **Step 2: Run, expect PASS without changes** (the implementation already supports this; this is a contract test)

```bash
cd backend && npx jest v2-narratives-generator -v
```

Expected: all tests pass — Task 6's `buildUserMessage` already conditionally adds `NATAL_CHART`. If they don't pass, fix the implementation: ensure `payload.NATAL_CHART` is set only when `input.natal_chart` truthy.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/v2-narratives-generator.test.ts
git commit -m "test(v2/narratives): cover natal-chart inclusion in user message"
```

---

## Task 8: Add narratives L2 cache

**Files:**
- Modify: `backend/src/optimal-timing/v2/llm/narratives-generator.ts` (add LRU cache)
- Test: extend `backend/tests/v2-narratives-generator.test.ts`

- [ ] **Step 1: Add cache test**

Append to `backend/tests/v2-narratives-generator.test.ts`:

```typescript
describe('renderNarratives L2 cache', () => {
  it('serves identical second call from cache without invoking fetch', async () => {
    let calls = 0;
    (global as any).fetch = jest.fn(async () => {
      calls++;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            narratives: { '2026-05-19': { v1: 'first call', v2: 'first call too' } },
          }) } }],
        }),
      };
    });

    const inputArgs = {
      intent: 'cache test',
      recipe: mockRecipe([
        { id: 'v1', label: 'one' },
        { id: 'v2', label: 'two' },
      ]),
      windows: [mockDay('2026-05-19')],
    };

    const a = await renderNarratives(inputArgs);
    const b = await renderNarratives(inputArgs);

    expect(calls).toBe(1);
    expect(a.llm.cached).toBe(false);
    expect(b.llm.cached).toBe(true);
    expect(b.narratives['2026-05-19'].v1).toBe('first call');
  });

  it('different natal_chart_id misses the cache', async () => {
    let calls = 0;
    (global as any).fetch = jest.fn(async () => {
      calls++;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            narratives: { '2026-05-19': { v1: 'x', v2: 'y' } },
          }) } }],
        }),
      };
    });

    const base = {
      intent: 'natal cache test',
      recipe: mockRecipe([
        { id: 'v1', label: 'one' },
        { id: 'v2', label: 'two' },
      ]),
      windows: [mockDay('2026-05-19')],
    };

    await renderNarratives(base);
    await renderNarratives({
      ...base,
      natal_chart: { id: 'natal-A', planets: [] },
    });
    await renderNarratives({
      ...base,
      natal_chart: { id: 'natal-B', planets: [] },
    });

    expect(calls).toBe(3);
  });

  it('bypassCache forces a fresh call', async () => {
    let calls = 0;
    (global as any).fetch = jest.fn(async () => {
      calls++;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            narratives: { '2026-05-19': { v1: 'x', v2: 'y' } },
          }) } }],
        }),
      };
    });

    const base = {
      intent: 'bypass test',
      recipe: mockRecipe([
        { id: 'v1', label: 'one' },
        { id: 'v2', label: 'two' },
      ]),
      windows: [mockDay('2026-05-19')],
    };

    await renderNarratives(base);
    await renderNarratives({ ...base, bypassCache: true } as any);

    expect(calls).toBe(2);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (no cache yet; second call also hits fetch)

```bash
cd backend && npx jest v2-narratives-generator -v
```

Expected: cache test fails because fetch is called twice.

- [ ] **Step 3: Add cache to `narratives-generator.ts`**

Right after the `getSystemPrompt` block in `narratives-generator.ts`, insert:

```typescript
// ─── Cache (in-memory LRU) ────────────────────────────────────────────────────
const CACHE_MAX = 100;
const cache = new Map<string, RenderNarrativesResult>();

function cacheKeyFor(input: RenderNarrativesInput): string {
    // Stable hash inputs: language, intent (normalized), date list (sorted),
    // natal_chart.id, vibe ids (so a recipe edit invalidates cache).
    const lang = input.language ?? 'auto';
    const intent = input.intent.trim().toLowerCase().replace(/\s+/g, ' ');
    const dates = input.windows.map((w) => w.date).sort().join(',');
    const natalId = input.natal_chart?.id ?? '';
    const vibeIds = input.recipe.vibes.map((v) => v.id).sort().join(',');
    return `${lang}|${intent}|${dates}|${natalId}|${vibeIds}`;
}

function cacheGet(key: string): RenderNarrativesResult | undefined {
    const hit = cache.get(key);
    if (hit) {
        cache.delete(key);
        cache.set(key, hit);
    }
    return hit;
}

function cachePut(key: string, value: RenderNarrativesResult): void {
    if (cache.size >= CACHE_MAX) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
    }
    cache.set(key, value);
}
```

Add `bypassCache` to `RenderNarrativesInput`:

```typescript
export interface RenderNarrativesInput {
    intent: string;
    recipe: Recipe;
    windows: ScoredDay[];
    natal_chart?: NarrativeNatalChart | null;
    language?: 'ru' | 'en' | 'auto';
    /** When true, skip the cache (forces a fresh LLM call). */
    bypassCache?: boolean;
}
```

In `renderNarratives`, before the `messages` array is built, add:

```typescript
const cacheKey = cacheKeyFor(input);
if (!input.bypassCache) {
    const hit = cacheGet(cacheKey);
    if (hit) {
        return {
            ...hit,
            llm: { ...hit.llm, cached: true, latency_ms: 0 },
        };
    }
}
```

In the success branch (where `tryParseNarrativeBundle` succeeds), before the `return`, add:

```typescript
const result: RenderNarrativesResult = {
    narratives: bundle.narratives,
    llm: { /* ...same as before... */ },
    attempts,
    raw_response: raw,
};
cachePut(cacheKey, result);
return result;
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
cd backend && npx jest v2-narratives-generator -v
```

Expected: all 9 tests pass (4 from Task 6 + 2 from Task 7 + 3 cache).

- [ ] **Step 5: Commit**

```bash
git add backend/src/optimal-timing/v2/llm/narratives-generator.ts backend/tests/v2-narratives-generator.test.ts
git commit -m "feat(v2/narratives): add L2 LRU cache keyed by intent+dates+natal+vibes"
```

---

## Task 9: Extend `TraceRecord` with `stage_render_narratives`

**Files:**
- Modify: `backend/src/optimal-timing/v2/schema/trace.ts` (add new stage type, extend `TraceRecord`)
- Test: `backend/tests/v2-trace-record.test.ts` (new)

- [ ] **Step 1: Write failing test**

Create `backend/tests/v2-trace-record.test.ts`:

```typescript
import type { TraceRecord, StageRenderNarratives } from '../src/optimal-timing/v2/schema/trace';

describe('TraceRecord stage_render_narratives', () => {
  it('compiles with new stage and is JSON-serializable', () => {
    const stage: StageRenderNarratives = {
      model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
      provider: 'nim',
      prompt_template_version: 'narratives.v1',
      latency_ms: 2400,
      cost_usd: 0,
      input_tokens: 1500,
      output_tokens: 800,
      output: {
        narratives: {
          '2026-05-19': { nostalgic_return: 'Луна в Раке…' },
        },
      },
      cache_hit: false,
      natal_chart_id: 'natal-1',
    };
    const round = JSON.parse(JSON.stringify(stage));
    expect(round.output.narratives['2026-05-19'].nostalgic_return).toMatch(/Луна/);
    expect(round.natal_chart_id).toBe('natal-1');
  });

  it('TraceRecord type accepts optional stage_render_narratives', () => {
    // Compile-time check: building a partial TraceRecord that omits the field
    const partial: Partial<TraceRecord> = {
      request_id: 'r-1',
    };
    expect(partial.request_id).toBe('r-1');

    const withStage: Partial<TraceRecord> = {
      request_id: 'r-2',
      stage_render_narratives: undefined,
    };
    expect(withStage.request_id).toBe('r-2');
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (compile error: `StageRenderNarratives` doesn't exist)

```bash
cd backend && npx jest v2-trace-record -v
```

- [ ] **Step 3: Extend `trace.ts`**

In `backend/src/optimal-timing/v2/schema/trace.ts`, add the `import` for `NarrativeBundle`:

```typescript
import type { NarrativeBundle } from './narratives';
```

Add a new exported type after `LLMStage`:

```typescript
/**
 * Stage 6 (added in 1.1.0): per-day per-vibe narrative rendering.
 * Optional on TraceRecord — old traces and requests that didn't request
 * narratives leave this field undefined.
 */
export interface StageRenderNarratives extends LLMStage<NarrativeBundle> {
    /** Echo of the natal chart id used to ground narratives, or null. */
    natal_chart_id: string | null;
}
```

Modify the `TraceRecord` interface to include the optional new field. Find the line `stage_output: StageOutput;` and add right after:

```typescript
    /** New in 1.1.0: per-day per-vibe narratives. Undefined for v1.0.x traces. */
    stage_render_narratives?: StageRenderNarratives;
```

- [ ] **Step 4: Run, expect PASS**

```bash
cd backend && npx jest v2-trace-record -v
```

Expected: 2 tests pass.

- [ ] **Step 5: Verify the rest of the suite still compiles**

```bash
cd backend && npx jest 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/optimal-timing/v2/schema/trace.ts backend/tests/v2-trace-record.test.ts
git commit -m "feat(v2/trace): add stage_render_narratives to TraceRecord (1.1.0)"
```

---

## Task 10: Wire controller `findWithIntent` to call `renderNarratives`

**Files:**
- Modify: `backend/src/optimal-timing/v2/api/controller.ts:findWithIntent` (accept `natal_chart_id`, fetch natal, call `renderNarratives`, embed narratives in response)
- Modify: `backend/src/optimal-timing/v2/pipeline/index.ts` (re-export `renderNarratives`)
- Test: `backend/tests/v2-controller-find-with-intent.test.ts` (new)

- [ ] **Step 1: Write failing controller integration test**

Create `backend/tests/v2-controller-find-with-intent.test.ts`:

```typescript
import express from 'express';
import request from 'supertest';
import { OptimalTimingV2Controller } from '../src/optimal-timing/v2/api/controller';

// Mock NIM HTTP for both LLM stages
let recipeCallCount = 0;
let narrativesCallCount = 0;

beforeEach(() => {
  recipeCallCount = 0;
  narrativesCallCount = 0;
  process.env.NVIDIA_API_KEY = 'nvapi-test-mock-key';

  (global as any).fetch = jest.fn(async (url: string, init: any) => {
    const body = JSON.parse(init.body);
    const isNarrativeCall = body.messages.find((m: any) =>
      m.role === 'system' && m.content.includes('Narrative-rendering prompt')
    );

    if (isNarrativeCall) {
      narrativesCallCount++;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            narratives: {
              // Match whatever days the controller passed in; use a wildcard
              // strategy: read DAYS from user msg and echo first one back.
              ...(() => {
                const userMsg = body.messages.find((m: any) => m.role === 'user').content;
                const days = JSON.parse(userMsg).DAYS as Array<{ date: string }>;
                const out: Record<string, Record<string, string>> = {};
                for (const d of days) {
                  out[d.date] = { test_vibe_a: 'narrative A', test_vibe_b: 'narrative B' };
                }
                return out;
              })(),
            },
          }) } }],
        }),
      };
    }

    // Recipe call
    recipeCallCount++;
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          intent: 'mocked',
          rationale: 'mocked rationale',
          disqualifiers: [],
          weighted_conditions: [
            { predicate: { type: 'moon_waxing' }, weight: 5 },
          ],
          vibes: [
            { id: 'test_vibe_a', label: 'A' },
            { id: 'test_vibe_b', label: 'B' },
          ],
          metadata: {
            schema_version: '1.1.0',
            generated_by: { model: 'mock', prompt_template_version: 'recipe.v2' },
            generated_at: '2026-05-05T00:00:00.000Z',
          },
        }) } }],
      }),
    };
  });
});

function makeApp() {
  const app = express();
  app.use(express.json());
  const ctrl = new OptimalTimingV2Controller();
  app.post('/find-with-intent', (req, res) => ctrl.findWithIntent(req, res));
  return app;
}

describe('POST /find-with-intent (vibes + narratives)', () => {
  it('returns vibes and per-day vibe_narratives', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/find-with-intent')
      .send({
        intent: 'тест',
        start_date: '2026-05-05',
        end_date: '2026-05-08',
        top_n: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.generated_recipe.vibes).toHaveLength(2);
    expect(res.body.generated_recipe.vibes[0].id).toBe('test_vibe_a');
    expect(res.body.windows.length).toBeGreaterThan(0);
    for (const w of res.body.windows) {
      expect(w.vibe_narratives).toBeDefined();
      expect(w.vibe_narratives.test_vibe_a).toMatch(/narrative A/);
      expect(w.vibe_narratives.test_vibe_b).toMatch(/narrative B/);
    }
    expect(recipeCallCount).toBe(1);
    expect(narrativesCallCount).toBe(1);
  });

  it('embeds natal_chart in response when natal_chart_id provided', async () => {
    // The controller fetches via natalChartRepository — we'll spy it
    const { natalChartRepository } = await import('../src/database/repositories');
    jest.spyOn(natalChartRepository, 'findById').mockResolvedValue({
      id: 'natal-test',
      planets: [{ name: 'Sun', longitude: 168, zodiacSign: 'Virgo' }],
    } as any);

    const app = makeApp();
    const res = await request(app)
      .post('/find-with-intent')
      .send({
        intent: 'with natal',
        start_date: '2026-05-05',
        end_date: '2026-05-06',
        top_n: 1,
        natal_chart_id: 'natal-test',
      });

    expect(res.status).toBe(200);
    expect(res.body.natal_chart).toBeDefined();
    expect(res.body.natal_chart.id).toBe('natal-test');
    expect(natalChartRepository.findById).toHaveBeenCalledWith('natal-test');
  });

  it('continues without natal embedding when natal_chart_id missing in DB', async () => {
    const { natalChartRepository } = await import('../src/database/repositories');
    jest.spyOn(natalChartRepository, 'findById').mockResolvedValue(null);

    const app = makeApp();
    const res = await request(app)
      .post('/find-with-intent')
      .send({
        intent: 'missing natal',
        start_date: '2026-05-05',
        end_date: '2026-05-06',
        top_n: 1,
        natal_chart_id: 'does-not-exist',
      });

    expect(res.status).toBe(200);
    expect(res.body.natal_chart).toBeNull();
    expect(res.body.windows[0].vibe_narratives).toBeDefined();
  });
});
```

Note: this test depends on `supertest`. If not installed, add it: `cd backend && npm install --save-dev supertest @types/supertest`.

- [ ] **Step 2: Install supertest if missing**

```bash
cd backend && npm ls supertest 2>&1 | head
```

If "(empty)" or missing, run:

```bash
cd backend && npm install --save-dev supertest @types/supertest
```

- [ ] **Step 3: Run, expect FAIL** (response has no `vibe_narratives` field)

```bash
cd backend && npx jest v2-controller-find-with-intent -v
```

- [ ] **Step 4: Wire `renderNarratives` into the controller**

In `backend/src/optimal-timing/v2/api/controller.ts`, add imports near the top:

```typescript
import { renderNarratives } from '../llm/narratives-generator';
import { natalChartRepository } from '../../../database/repositories';
```

Find `findWithIntent`. After the existing call to `findWithFixedRecipe` (which produces `result`), insert before the `res.json(...)` block:

```typescript
            // Stage 4: optional natal chart fetch
            let natal: Awaited<ReturnType<typeof natalChartRepository.findById>> = null;
            if (typeof natal_chart_id === 'string' && natal_chart_id.length > 0) {
                try {
                    natal = await natalChartRepository.findById(natal_chart_id);
                } catch (e) {
                    console.warn('[v2] failed to fetch natal chart, continuing without:', e);
                }
            }

            // Stage 5: per-day per-vibe narratives.
            // result.windows is already the ranked survivors (ScoredDay[] with non-null rank),
            // produced by rankWindows in pipeline/index.ts.
            let narrativeResult: Awaited<ReturnType<typeof renderNarratives>> | null = null;
            try {
                narrativeResult = await renderNarratives({
                    intent,
                    recipe: generation.recipe,
                    windows: result.windows,
                    natal_chart: natal as any,
                    language,
                });
            } catch (e) {
                console.warn('[v2] renderNarratives failed, continuing with empty narratives:', e);
            }
```

Destructure `natal_chart_id` from `req.body` near where other fields are pulled (`intent`, `start_date`, etc.):

```typescript
const {
    intent,
    start_date,
    end_date,
    location,
    top_n = 10,
    debug = false,
    language,
    bypass_cache = false,
    natal_chart_id,        // ← new
} = req.body ?? {};
```

Replace the `windows: result.windows.map(...)` block in the response with one that adds `vibe_narratives`:

```typescript
            res.json({
                request_id: result.trace.request_id,
                intent,
                date_range: { start: start_date, end: end_date },
                generated_recipe: {
                    intent: generation.recipe.intent,
                    rationale: generation.recipe.rationale,
                    disqualifiers: generation.recipe.disqualifiers,
                    weighted_conditions: generation.recipe.weighted_conditions,
                    vibes: generation.recipe.vibes,                       // ← new
                    metadata: generation.recipe.metadata,
                },
                llm: {
                    model: generation.model,
                    prompt_version: generation.promptVersion,
                    cached: generation.cached,
                    attempts: generation.attempts,
                },
                narratives_llm: narrativeResult ? {
                    model: narrativeResult.llm.model,
                    prompt_version: narrativeResult.llm.prompt_version,
                    cached: narrativeResult.llm.cached,
                    attempts: narrativeResult.attempts,
                    latency_ms: narrativeResult.llm.latency_ms,
                } : null,
                summary: result.trace.stage_output.response_summary,
                windows: result.windows.map((w) => ({
                    date: w.date,
                    score: w.raw_score,
                    rank: w.rank,
                    matched_predicates: w.predicates_fired
                        .filter((p) => p.matched && p.weight !== null)
                        .map((p) => ({ type: p.predicate_type, weight: p.weight, details: p.match_details })),
                    moon: w.ephemeris_snapshot.moon,
                    sun_sign: w.ephemeris_snapshot.sun_sign,
                    retrograde_planets: w.ephemeris_snapshot.retrograde_planets,
                    vibe_narratives: narrativeResult?.narratives[w.date] ?? {},  // ← new
                })),
                natal_chart: natal,                                              // ← new
                disqualified_days: result.trace.stage_scoring.days_disqualified,
                cost: { total_usd: result.trace.total_cost_usd, latency_ms: result.trace.total_latency_ms },
                trace: debug ? result.trace : undefined,
            });
```

The shape of `result.windows` is `ScoredDay[]` with non-null `rank` — the same array embedded in the response. `renderNarratives` accepts exactly this shape.

- [ ] **Step 5: Run, expect PASS**

```bash
cd backend && npx jest v2-controller-find-with-intent -v
```

Expected: 3 tests pass.

- [ ] **Step 6: Re-run full backend suite**

```bash
cd backend && npx jest 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 7: Smoke-test against the actual ephemeris API** (sanity check, not automated)

Start the backend dev server with the dev infra running, then:

```bash
cd backend && PORT=3001 npm run dev > /tmp/backend.log 2>&1 &
until curl -sf http://localhost:3001/health > /dev/null 2>&1; do sleep 2; done

curl -sX POST http://localhost:3001/api/optimal-timing/v2/find-with-intent \
  -H 'Content-Type: application/json' \
  -d '{"intent":"тест вайбов","start_date":"2026-05-10","end_date":"2026-05-15","top_n":3,"language":"ru"}' \
  | python3 -m json.tool | head -40

pkill -f "tsx watch src/index.ts"
```

Expected: response contains `generated_recipe.vibes` (≥2 entries) and each `windows[i].vibe_narratives` has text for each vibe id.

- [ ] **Step 8: Commit**

```bash
git add backend/src/optimal-timing/v2/api/controller.ts \
        backend/tests/v2-controller-find-with-intent.test.ts \
        backend/package.json backend/package-lock.json
git commit -m "feat(v2/api): wire renderNarratives into find-with-intent, return vibes + narratives"
```

---

## Task 11: Update API documentation comment in controller

**Files:**
- Modify: `backend/src/optimal-timing/v2/api/controller.ts:1-19` (the doc-block at the top)

- [ ] **Step 1: Update the JSDoc comment**

Replace the doc-block at the top of `controller.ts` with:

```typescript
/**
 * v2 HTTP controller — phase 1 + 2 + Phase A vibes/narratives.
 *
 * Endpoints:
 *   POST /api/optimal-timing/v2/find-with-fixed-recipe
 *     Run scoring against one of the 5 canonical recipes by id, or an
 *     inline recipe object. Use to validate the engine without LLM.
 *
 *   POST /api/optimal-timing/v2/find-with-intent
 *     Free-text intent → LLM-generated Recipe (with vibes) → scoring →
 *     LLM-rendered per-day per-vibe narratives. Optional natal_chart_id
 *     in the request grounds narratives in the user's natal chart and
 *     embeds the chart in the response for biwheel rendering on the
 *     client.
 *
 *     Request body:
 *       {
 *         intent: string,                    // free-text user prompt
 *         start_date: string,                // YYYY-MM-DD
 *         end_date: string,                  // YYYY-MM-DD
 *         top_n?: number,                    // default 10
 *         language?: 'ru' | 'en' | 'auto',
 *         natal_chart_id?: string,           // optional UUID
 *         bypass_cache?: boolean,
 *         debug?: boolean,
 *       }
 *
 *     Response includes generated_recipe.vibes,
 *     windows[i].vibe_narratives { [vibeId]: text }, and
 *     natal_chart (full chart object or null).
 *
 *   GET /api/optimal-timing/v2/traces/:id
 *     Fetch a persisted TraceRecord.
 *
 *   GET /api/optimal-timing/v2/recipes
 *     List available canonical recipe ids.
 */
```

- [ ] **Step 2: Run tests to confirm no regression**

```bash
cd backend && npx jest 2>&1 | tail
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/optimal-timing/v2/api/controller.ts
git commit -m "docs(v2/api): update controller doc-block for vibes/narratives"
```

---

## Verification

After all tasks complete:

- [ ] **Run full backend test suite:** `cd backend && npx jest`
- [ ] **Run typecheck:** `cd backend && npm run build` (build:assets must succeed)
- [ ] **Visual verification on dev:** start backend, hit `/find-with-intent` with a real intent, confirm response shape:
  - `generated_recipe.vibes` — 2-4 entries
  - `windows[i].vibe_narratives` — populated with non-empty strings for each vibe id
  - `natal_chart` — present when `natal_chart_id` valid, null otherwise

After verification — open a PR. Phase A is complete; frontend remains unchanged and continues to ignore the new fields. Phase B (frontend) builds on this.
