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
    /** When true, skip the cache (forces a fresh LLM call). */
    bypassCache?: boolean;
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
            const result: RenderNarrativesResult = {
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
            cachePut(cacheKey, result);
            return result;
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

export const __testing__ = {
    cacheKeyFor,
    clearCache: () => cache.clear(),
};
