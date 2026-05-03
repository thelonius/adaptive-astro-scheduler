/**
 * LLM-driven Recipe generation via NVIDIA NIM.
 *
 * Takes free-form intent → returns a validated Recipe DSL object.
 * Pipeline:
 *   1. Build system prompt from recipe.v1.md + canonical-recipes.json
 *   2. Build user message (INTENT/LOCATION/TODAY/LANGUAGE_HINT)
 *   3. Call NIM /v1/chat/completions (OpenAI-compatible)
 *   4. Parse JSON, validate via Zod tryParseRecipe
 *   5. On schema fail: retry once with error feedback
 *   6. Cache (in-memory LRU, key = lang|lower(intent))
 *
 * MVP uses prompt-only output constraint. To upgrade to schema-guaranteed
 * output, add `nvext.guided_json` to the request body once a Zod →
 * JSON Schema converter is wired in.
 */

import fs from 'node:fs';
import path from 'node:path';
import { tryParseRecipe } from '../schema/dsl';
import type { Recipe } from '../schema/dsl';

const NIM_BASE_URL = process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1';
const NIM_MODEL = process.env.NVIDIA_MODEL ?? 'nvidia/llama-3.3-nemotron-super-49b-v1.5';
const PROMPT_VERSION = 'recipe.v1';

// ─── API key resolution ───────────────────────────────────────────────────────
// Env wins. Fallback: ~/.config/nvidia/api-key (chmod 600 stash).
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
        'NVIDIA_API_KEY not in env and ~/.config/nvidia/api-key not found. ' +
        'Set NVIDIA_API_KEY or create the key file (chmod 600).',
    );
}

// ─── Prompt assembly ──────────────────────────────────────────────────────────
const PROMPT_DIR = path.join(__dirname, '..', 'prompts');
const RECIPE_PROMPT_PATH = path.join(PROMPT_DIR, 'recipe.v1.md');
const CANONICAL_RECIPES_PATH = path.join(PROMPT_DIR, 'examples', 'canonical-recipes.json');

let _systemPromptCache: string | null = null;
function buildSystemPrompt(): string {
    if (_systemPromptCache) return _systemPromptCache;

    const template = fs.readFileSync(RECIPE_PROMPT_PATH, 'utf8');
    const canonicalRaw = JSON.parse(fs.readFileSync(CANONICAL_RECIPES_PATH, 'utf8')) as {
        recipes: Array<Record<string, unknown>>;
    };

    // Strip _comment / _id / _intent_examples prefixed keys (per prompt instructions)
    const cleaned = canonicalRaw.recipes.map((r) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
            if (!k.startsWith('_')) out[k] = v;
        }
        return out;
    });

    const recipesBlock = '```json\n' + JSON.stringify(cleaned, null, 2) + '\n```';
    const filled = template.replace(
        /\[CANONICAL RECIPES INSERTED HERE[^\]]*\]/s,
        recipesBlock,
    );

    _systemPromptCache = filled;
    return filled;
}

// ─── Cache (in-memory LRU) ────────────────────────────────────────────────────
const CACHE_MAX = 100;
const cache = new Map<string, Recipe>();
function cacheKey(intent: string, language: string): string {
    return `${language}|${intent.trim().toLowerCase().replace(/\s+/g, ' ')}`;
}
function cacheGet(key: string): Recipe | undefined {
    const hit = cache.get(key);
    if (hit) {
        // LRU touch: re-insert
        cache.delete(key);
        cache.set(key, hit);
    }
    return hit;
}
function cachePut(key: string, recipe: Recipe): void {
    if (cache.size >= CACHE_MAX) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
    }
    cache.set(key, recipe);
}

// ─── Public API ───────────────────────────────────────────────────────────────
export interface GenerateRecipeOptions {
    intent: string;
    locationContext?: string;
    today?: string; // YYYY-MM-DD
    language?: string; // 'ru', 'en', 'auto'
    /** When true, skip the cache (forces a fresh LLM call). */
    bypassCache?: boolean;
}

export interface GenerateRecipeResult {
    recipe: Recipe;
    cached: boolean;
    model: string;
    promptVersion: string;
    attempts: number;
    rawResponse?: string;
}

export async function generateRecipe(opts: GenerateRecipeOptions): Promise<GenerateRecipeResult> {
    if (!opts.intent || !opts.intent.trim()) {
        throw new Error('intent must be a non-empty string');
    }
    const language = opts.language ?? 'auto';
    const key = cacheKey(opts.intent, language);

    if (!opts.bypassCache) {
        const hit = cacheGet(key);
        if (hit) {
            return {
                recipe: hit,
                cached: true,
                model: NIM_MODEL,
                promptVersion: PROMPT_VERSION,
                attempts: 0,
            };
        }
    }

    const today = opts.today ?? new Date().toISOString().slice(0, 10);
    const userMessage = [
        `INTENT: ${opts.intent.trim()}`,
        `LOCATION_CONTEXT: ${opts.locationContext ?? 'unknown'}`,
        `TODAY: ${today}`,
        `LANGUAGE_HINT: ${language}`,
    ].join('\n');

    const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: userMessage },
    ];

    let attempts = 0;
    let lastRaw = '';
    let lastError: string | null = null;
    const MAX_ATTEMPTS = 2;

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        const body = {
            model: NIM_MODEL,
            messages,
            temperature: 0.2,
            top_p: 0.95,
            max_tokens: 2048,
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
        };
        const raw = data.choices?.[0]?.message?.content ?? '';
        lastRaw = raw;

        // Models sometimes wrap JSON in ```json ... ``` despite instructions.
        const stripped = stripJsonFence(raw);

        let parsedJson: unknown;
        try {
            parsedJson = JSON.parse(stripped);
        } catch (e) {
            lastError = `LLM returned non-JSON content: ${(e as Error).message}`;
            messages.push({ role: 'assistant', content: raw });
            messages.push({
                role: 'user',
                content:
                    `Your previous reply was not valid JSON (${lastError}). ` +
                    `Reply with ONLY the JSON Recipe object, no prose, no markdown fences.`,
            });
            continue;
        }

        const recipe = tryParseRecipe(parsedJson);
        if (recipe) {
            cachePut(key, recipe);
            return {
                recipe,
                cached: false,
                model: NIM_MODEL,
                promptVersion: PROMPT_VERSION,
                attempts,
                rawResponse: raw,
            };
        }

        lastError = 'JSON did not match Recipe schema (RecipeSchema validation failed)';
        messages.push({ role: 'assistant', content: raw });
        messages.push({
            role: 'user',
            content:
                `${lastError}. Common issues: invalid predicate type, ` +
                `unknown planet/sign name, missing required field, weight outside expected range. ` +
                `Re-read the predicate vocabulary and Recipe structure sections of the system message ` +
                `and reply with a valid JSON Recipe.`,
        });
    }

    throw new Error(
        `Recipe generation failed after ${attempts} attempts. Last error: ${lastError ?? 'unknown'}. ` +
        `Last raw output: ${lastRaw.slice(0, 300)}`,
    );
}

function stripJsonFence(s: string): string {
    const trimmed = s.trim();
    if (trimmed.startsWith('```')) {
        const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
        if (m) return m[1];
    }
    return trimmed;
}

export const __testing__ = { buildSystemPrompt, cacheKey };
