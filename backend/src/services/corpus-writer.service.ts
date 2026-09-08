/**
 * LLM corpus rewriter via NVIDIA NIM.
 *
 * Rewrites copyrighted astrology interpretation text into original Russian prose
 * with author/source attribution. Disabled by default (CORPUS_WRITER_ENABLED).
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const NIM_BASE_URL = process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1';
const NIM_MODEL = process.env.NVIDIA_MODEL ?? 'nvidia/llama-3.3-nemotron-super-49b-v1.5';

export const CORPUS_WRITER_ENABLED = process.env.CORPUS_WRITER_ENABLED === 'true';

export interface CorpusRewriteInput {
  body: string;
  author: string;
  source_title: string;
  label?: string;
}

export interface CorpusRewriteOutputEntry extends CorpusRewriteInput {
  rewritten_body: string;
  note?: string;
  cached?: boolean;
}

export interface CorpusRewriteResult {
  entries: CorpusRewriteOutputEntry[];
  sources: Array<{ author: string; source_title: string }>;
  enabled: boolean;
}

const SYSTEM_PROMPT = `Ты переписываешь астрологические интерпретации из защищённых авторским правом источников.

Правила:
- Пиши только на русском языке, своими словами; никогда не копируй исходный текст дословно.
- Сохраняй астрологический смысл, ключевые темы и нюансы.
- В конце добавь строку атрибуции: «Автор: {author}. Источник: {source_title}» — подставь переданные author и source_title.
- Ответ — только переписанный текст с атрибуцией, без пояснений и markdown.`;

// ─── API key resolution (same pattern as recipe-generator) ───────────────────
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

// ─── Cache (in-memory LRU, key = sha256(body)) ───────────────────────────────
const CACHE_MAX = 200;
const cache = new Map<string, string>();

function bodyHash(body: string): string {
  return crypto.createHash('sha256').update(body).digest('hex');
}

function cacheGet(key: string): string | undefined {
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit;
}

function cachePut(key: string, rewritten: string): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, rewritten);
}

function collectSources(entries: CorpusRewriteInput[]): Array<{ author: string; source_title: string }> {
  const seen = new Set<string>();
  const sources: Array<{ author: string; source_title: string }> = [];
  for (const e of entries) {
    const key = `${e.author}\0${e.source_title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ author: e.author, source_title: e.source_title });
  }
  return sources;
}

async function rewriteOne(entry: CorpusRewriteInput): Promise<{ rewritten_body: string; cached: boolean }> {
  const key = bodyHash(entry.body);
  const hit = cacheGet(key);
  if (hit) {
    return { rewritten_body: hit, cached: true };
  }

  const userMessage = [
    `author: ${entry.author}`,
    `source_title: ${entry.source_title}`,
    entry.label ? `label: ${entry.label}` : null,
    '',
    'Исходный текст:',
    entry.body,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: NIM_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      top_p: 0.95,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NIM HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rewritten = (data.choices?.[0]?.message?.content ?? '').trim();
  if (!rewritten) {
    throw new Error('NIM returned empty rewrite');
  }

  cachePut(key, rewritten);
  return { rewritten_body: rewritten, cached: false };
}

export async function rewriteCorpusEntries(entries: CorpusRewriteInput[]): Promise<CorpusRewriteResult> {
  const sources = collectSources(entries);

  if (!CORPUS_WRITER_ENABLED) {
    return {
      enabled: false,
      sources,
      entries: entries.map((e) => ({
        ...e,
        rewritten_body: e.body,
        note: 'pass-through',
      })),
    };
  }

  const out: CorpusRewriteOutputEntry[] = [];
  for (const entry of entries) {
    const { rewritten_body, cached } = await rewriteOne(entry);
    out.push({ ...entry, rewritten_body, cached });
  }

  return { enabled: true, sources, entries: out };
}

export const __testing__ = { bodyHash, cacheGet, cachePut, SYSTEM_PROMPT };
