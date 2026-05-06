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
