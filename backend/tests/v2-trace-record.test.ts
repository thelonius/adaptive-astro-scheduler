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
