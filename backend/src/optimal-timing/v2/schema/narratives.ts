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
