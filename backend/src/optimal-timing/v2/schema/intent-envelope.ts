/**
 * Stage 1 output: the IntentEnvelope.
 *
 * The LLM's first job is to read the raw user prompt and extract a
 * structured envelope describing what the user actually wants. This
 * is intentionally separate from the Recipe (Stage 3): the envelope
 * is "what / when / where", the recipe is "how to score it".
 *
 * The envelope is shown back to the user as "here's what I understood"
 * before the heavier recipe-generation step runs.
 */

import { z } from 'zod';

export const IntentEnvelopeSchema = z.object({
    /**
     * The activity the user is choosing a time for, in normalized
     * English form. Examples: "open coffee shop", "sign apartment
     * lease", "have surgery", "propose marriage".
     */
    activity: z.string().min(1).max(200),

    /**
     * Free-text location if the user mentioned one. Resolved to
     * coordinates downstream by existing geo utilities. Null if
     * unspecified — caller falls back to user's stored location.
     */
    location: z.string().max(200).nullable(),

    /**
     * Date-range hints extracted by the LLM from the prompt.
     * These are SUGGESTIONS — the deterministic regex extractor
     * (Stage 2) is the source of truth and overrides this.
     * Kept here for diagnostics and as a fallback.
     *
     * Date format: ISO YYYY-MM-DD. Using regex rather than
     * `z.string().date()` to keep zod ^3.22 compatibility.
     */
    date_hint: z.object({
        raw_phrase: z.string().max(200).nullable(),
        approximate_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
        approximate_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    }),

    /**
     * User-supplied constraints in free form, normalized to short tags.
     * Examples: "weekday_only", "morning_only", "avoid_full_moon",
     * "must_be_within_2_weeks". The recipe generator may convert these
     * to additional disqualifiers downstream.
     */
    constraints: z.array(z.string().max(60)).default([]),

    /**
     * Confidence 0..1 that the prompt is actually an electional query.
     * Low confidence (<0.4) means the user might be asking something
     * else entirely; the API should respond with a clarifying message
     * rather than running the full pipeline.
     */
    confidence: z.number().min(0).max(1),
});
export type IntentEnvelope = z.infer<typeof IntentEnvelopeSchema>;

export function parseIntentEnvelope(raw: unknown): IntentEnvelope {
    return IntentEnvelopeSchema.parse(raw);
}
