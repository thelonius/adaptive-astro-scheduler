import { renderNarratives, __testing__ } from '../src/optimal-timing/v2/llm/narratives-generator';
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
    moon: {
      sign: 'Cancer',
      phase: 'waxing_crescent',
      illumination: 0.1,
      void_of_course: false,
      longitude: 102.4,
      waxing: true,
    },
    sun_sign: 'Taurus',
    retrograde_planets: [],
    planets: [
      { planet: 'Sun', sign: 'Taurus', degree_in_sign: 28.6, longitude: 58.6, speed: 0.96, retrograde: false },
      { planet: 'Moon', sign: 'Cancer', degree_in_sign: 12.4, longitude: 102.4, speed: 12.8, retrograde: false },
      { planet: 'Mercury', sign: 'Taurus', degree_in_sign: 4.1, longitude: 34.1, speed: 1.24, retrograde: false },
      { planet: 'Mars', sign: 'Pisces', degree_in_sign: 9.2, longitude: 339.2, speed: 0.71, retrograde: false },
    ],
    aspects: [
      { from: 'Moon', to: 'Mars', type: 'trine', orb_deg: 2.1, applying: true },
    ],
    notable_aspects: [
      { from: 'Moon', to: 'Mars', type: 'trine', orb_deg: 2.1, applying: true },
    ],
  },
});

beforeEach(() => {
  process.env.NVIDIA_API_KEY = 'nvapi-test-key-for-mock';
  __testing__.clearCache();
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

describe('renderNarratives fact verification', () => {
  const vibes = [{ id: 'calm', label: 'спокойствие' }];

  const respond = (narratives: Record<string, Record<string, string>>) => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ narratives }) } }],
    }),
  });

  it('sends the contradicted cell back to the model and keeps the repaired text', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(respond({ '2026-05-19': { calm: 'Меркурий ретроградный, тормози.' } }))
      .mockResolvedValueOnce(respond({ '2026-05-19': { calm: 'Луна в Раке, тормози спокойно.' } }));
    (global as any).fetch = fetchMock;

    const result = await renderNarratives({
      intent: 'отдых',
      recipe: mockRecipe(vibes),
      windows: [mockDay('2026-05-19')],
      language: 'ru',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.narratives['2026-05-19'].calm).toContain('Луна в Раке');
    expect(result.verification.contradicted).toBe(0);
    expect(result.verification.fell_back).toEqual([]);

    // The repair round must name the real motion, not just say "wrong".
    const repairBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    const repairText = repairBody.messages[repairBody.messages.length - 1].content;
    expect(repairText).toContain('Mercury is direct');
  });

  it('replaces a cell with a fact sentence when the model keeps misreading the sky', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(respond({ '2026-05-19': { calm: 'Луна во Льве, Сатурн ретрограден.' } }));
    (global as any).fetch = fetchMock;

    const result = await renderNarratives({
      intent: 'отдых',
      recipe: mockRecipe(vibes),
      windows: [mockDay('2026-05-19')],
      language: 'ru',
    });

    expect(result.narratives['2026-05-19'].calm).toContain('Луна в Раке');
    expect(result.verification.contradicted).toBeGreaterThan(0);
    expect(result.verification.fell_back).toHaveLength(1);
    expect(result.verification.fell_back[0]).toMatchObject({ date: '2026-05-19', vibe_id: 'calm' });
  });

  it('does not serve a cached narrative to a day whose ephemeris differs', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(respond({ '2026-05-19': { calm: 'Луна в Раке, тихо.' } }));
    (global as any).fetch = fetchMock;

    const input = {
      intent: 'отдых',
      recipe: mockRecipe(vibes),
      windows: [mockDay('2026-05-19')],
      language: 'ru' as const,
    };
    await renderNarratives(input);
    await renderNarratives(input);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const elsewhere = mockDay('2026-05-19');
    elsewhere.ephemeris_snapshot = {
      ...elsewhere.ephemeris_snapshot,
      moon: { ...elsewhere.ephemeris_snapshot.moon, longitude: 118.9 },
    };
    await renderNarratives({ ...input, windows: [elsewhere] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
