import express from 'express';
import request from 'supertest';

// Use mock ephemeris adapter so the pipeline runs without a live ephemeris API.
process.env.USE_MOCK_EPHEMERIS = 'true';
process.env.NVIDIA_API_KEY = 'nvapi-test-mock-key';

import { OptimalTimingV2Controller } from '../src/optimal-timing/v2/api/controller';
import { __testing__ as narrativesTesting } from '../src/optimal-timing/v2/llm/narratives-generator';

// Mock NIM HTTP for both LLM stages
let recipeCallCount = 0;
let narrativesCallCount = 0;

beforeEach(() => {
  recipeCallCount = 0;
  narrativesCallCount = 0;
  process.env.NVIDIA_API_KEY = 'nvapi-test-mock-key';
  narrativesTesting.clearCache();

  (global as any).fetch = jest.fn(async (_url: string, init: any) => {
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
        debug: true,
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

    // I1 regression: stage_render_narratives must be on the persisted trace.
    expect(res.body.trace).toBeDefined();
    expect(res.body.trace.stage_render_narratives).toBeDefined();
    expect(res.body.trace.stage_render_narratives.provider).toBe('nim');
    expect(res.body.trace.stage_render_narratives.output).toBeDefined();
    const firstWindowDate = res.body.windows[0].date;
    expect(
      res.body.trace.stage_render_narratives.output.narratives[firstWindowDate].test_vibe_a,
    ).toMatch(/narrative A/);
  });

  it('embeds natal_chart in response when natal_chart_id provided', async () => {
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
    expect(res.body.natal_chart.planets).toBeDefined();
    expect(natalChartRepository.findById).toHaveBeenCalledWith('natal-test');
  });

  it('strips PII fields from natal_chart in response', async () => {
    const { natalChartRepository } = await import('../src/database/repositories');
    jest.spyOn(natalChartRepository, 'findById').mockResolvedValue({
      id: 'natal-test',
      user_id: 'user-x',
      name: 'Mr Sensitive',
      birth_date: '1984-09-11',
      birth_time: '01:40:00',
      birth_location: { latitude: 55.75, longitude: 37.62 },
      planets: [{ name: 'Sun', longitude: 168, zodiacSign: 'Virgo' }],
      houses: [],
      aspects: [],
    } as any);

    const app = makeApp();
    const res = await request(app)
      .post('/find-with-intent')
      .send({
        intent: 'with sensitive natal',
        start_date: '2026-05-05',
        end_date: '2026-05-06',
        top_n: 1,
        natal_chart_id: 'natal-test',
      });

    expect(res.status).toBe(200);
    expect(res.body.natal_chart).toBeDefined();
    expect(res.body.natal_chart.id).toBe('natal-test');
    expect(res.body.natal_chart.planets).toBeDefined();
    // PII fields must NOT be in the response
    expect(res.body.natal_chart.user_id).toBeUndefined();
    expect(res.body.natal_chart.birth_date).toBeUndefined();
    expect(res.body.natal_chart.birth_time).toBeUndefined();
    expect(res.body.natal_chart.birth_location).toBeUndefined();
    expect(res.body.natal_chart.name).toBeUndefined();
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
