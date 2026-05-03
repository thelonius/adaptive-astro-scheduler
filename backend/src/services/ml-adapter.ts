import axios from 'axios';
import { OpenAI } from 'openai';
import { Logger } from '../utils/logger';

interface MlAdviceRequest {
  prompt: string;
  active_transits?: string[];
  top_k?: number;
  date?: string; // ISO date string, e.g. "2026-04-22"
}

interface MlInterpretation {
  text: string;
  metadata: {
    author: string;
    tag: string;
    subject: string;
    source: string;
  };
  relevance: 'transit_fuzzy_match' | 'semantic_fallback' | 'llm_generated';
  score: number;
  vector?: number[];
}

interface MlAdviceResponse {
  success: boolean;
  results?: MlInterpretation[];
  error?: string;
}

export class MLServiceAdapter {
  private static instance: MLServiceAdapter;
  private readonly baseUrl: string;
  private readonly logger = new Logger('MLServiceAdapter');
  private nim: OpenAI | null = null;

  private constructor() {
    this.baseUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';

    if (process.env.NVIDIA_NIM_API_KEY) {
      this.nim = new OpenAI({
        apiKey: process.env.NVIDIA_NIM_API_KEY,
        baseURL: process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      });
      this.logger.info('🟢 NVIDIA NIM fallback configured');
    }
  }

  public static getInstance(): MLServiceAdapter {
    if (!MLServiceAdapter.instance) {
      MLServiceAdapter.instance = new MLServiceAdapter();
    }
    return MLServiceAdapter.instance;
  }

  /**
   * Fast ML-only advice (no NIM). Used for bulk scanning of many dates.
   * Returns raw transit interpretations from the Python ML service.
   */
  async getAdviceFast(params: MlAdviceRequest): Promise<MlAdviceResponse> {
    try {
      const response = await axios.post<MlAdviceResponse>(
        `${this.baseUrl}/predict`,
        {
          prompt: params.prompt,
          active_transits: params.active_transits || [],
          top_k: params.top_k || 3,
        },
        { timeout: 5000 }
      );
      return response.data;
    } catch (error: any) {
      this.logger.warn(`⚠️ ML Service unavailable (${error.code || error.message})`);
      throw new Error('AI Analysis Engine is temporarily unavailable. Please try again later.');
    }
  }

  /**
   * Full NIM synthesis for a single day — used for top results only.
   * Combines ML transit knowledge with LLM reasoning to produce
   * a precise, intention-specific interpretation and calibrated score.
   */
  async getAdvice(params: MlAdviceRequest): Promise<MlAdviceResponse> {
    this.logger.info(`🔮 Requesting ML advice for: "${params.prompt}"`, {
      transitsCount: params.active_transits?.length,
    });

    // Stage 1: Try Python ML service for transit knowledge retrieval
    let mlResults: MlInterpretation[] | undefined;
    try {
      const response = await axios.post<MlAdviceResponse>(
        `${this.baseUrl}/predict`,
        {
          prompt: params.prompt,
          active_transits: params.active_transits || [],
          top_k: params.top_k || 5,
        },
        { timeout: 5000 }
      );
      mlResults = response.data.results;
    } catch (error: any) {
      this.logger.warn(`⚠️ ML Service unavailable (${error.code || error.message})`);
    }

    // Stage 2: NIM synthesis with ML context
    if (this.nim) {
      return this.synthesizeWithNIM(params, mlResults);
    }

    // NIM not configured: return raw ML results
    if (mlResults) {
      return { success: true, results: mlResults };
    }

    this.logger.error('❌ No ML backend available (ML service down, NIM not configured)');
    throw new Error('AI Analysis Engine is temporarily unavailable. Please try again later.');
  }

  /**
   * Decode machine-readable transit codes into human-readable descriptions.
   * Examples: "SU.000.VE" → "Sun conjunct Venus", "ME.R" → "Mercury retrograde", "[15]" → "Lunar day 15"
   */
  private decodeTransits(raw: string[]): string[] {
    const PLANETS: Record<string, string> = {
      SU: 'Sun', MO: 'Moon', ME: 'Mercury', VE: 'Venus', MA: 'Mars',
      JU: 'Jupiter', SA: 'Saturn', UR: 'Uranus', NE: 'Neptune', PL: 'Pluto',
    };
    const ASPECTS: Record<string, string> = {
      '000': 'conjunct ☌', '060': 'sextile ⚹', '090': 'square □',
      '120': 'trine △', '180': 'opposition ☍',
    };

    return raw.map(tag => {
      // Lunar day: [N]
      const lunarMatch = tag.match(/^\[(\d+)\]$/);
      if (lunarMatch) return `Lunar day ${lunarMatch[1]}`;

      // Retrograde: PL.R
      const retroMatch = tag.match(/^([A-Z]{2})\.R$/);
      if (retroMatch) {
        const planet = PLANETS[retroMatch[1]] || retroMatch[1];
        return `${planet} retrograde ℞`;
      }

      // Aspect: P1.aspect.P2
      const aspectMatch = tag.match(/^([A-Z]{2})\.(\d{3})\.([A-Z]{2})$/);
      if (aspectMatch) {
        const p1 = PLANETS[aspectMatch[1]] || aspectMatch[1];
        const asp = ASPECTS[aspectMatch[2]] || aspectMatch[2] + '°';
        const p2 = PLANETS[aspectMatch[3]] || aspectMatch[3];
        return `${p1} ${asp} ${p2}`;
      }

      return tag; // fallback: return as-is
    });
  }

  private async synthesizeWithNIM(
    params: MlAdviceRequest,
    mlContext?: MlInterpretation[]
  ): Promise<MlAdviceResponse> {
    const model = process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.1-70b-instruct';
    const decodedTransits = this.decodeTransits(params.active_transits || []);
    const transitList = decodedTransits.length > 0
      ? decodedTransits.map(t => `• ${t}`).join('\n')
      : '• No major transits detected';
    const dateLabel = params.date || 'the requested day';

    // Build optional knowledge context from ML service results
    const knowledgeContext = mlContext && mlContext.length > 0
      ? `\nAstrological knowledge base (retrieved interpretations for active transits):\n${
          mlContext.slice(0, 3).map(r => `- ${r.text.substring(0, 200)}`).join('\n')
        }`
      : '';

    const systemPrompt = `You are an expert electional astrologer helping users plan activities at the most auspicious cosmic moment.
Your task: assess how the current planetary configuration supports a specific user intention, then provide a brief, practical, personalized interpretation.

Scoring rubric:
- 0.85–1.0: Exceptional — rare, powerful alignment directly supporting the intention
- 0.65–0.84: Favorable — clear astrological support; a good day to act
- 0.45–0.64: Neutral — mixed signals; proceed mindfully
- 0.25–0.44: Challenging — notable friction; better to wait or adjust approach
- 0.0–0.24: Unfavorable — significant obstacles; avoid key actions

Always respond with valid JSON only, no markdown.`;

    const userPrompt = `Date: ${dateLabel}
User's intention: "${params.prompt}"

Active planetary configuration:
${transitList}
${knowledgeContext}

Evaluate how auspicious ${dateLabel} is for "${params.prompt}". Keep "text" under 200 characters: name the key transit, explain why it matters for the intention, give one action.

Respond with JSON (no extra text):
{"score":<0.0-1.0>,"text":"<interpretation>","tag":"<key transit code>"}`;

    // Hard timeout: NIM must respond within 8 seconds or we skip synthesis
    const NIM_TIMEOUT_MS = 8000;
    try {
      const completionPromise = this.nim!.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 250,
        temperature: 0.3,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`NIM timeout after ${NIM_TIMEOUT_MS}ms`)), NIM_TIMEOUT_MS)
      );
      const completion = await Promise.race([completionPromise, timeoutPromise]);

      const raw = completion.choices[0]?.message?.content || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in NIM response');

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        results: [
          {
            text: parsed.text || 'No interpretation available.',
            score: Math.min(1, Math.max(0, Number(parsed.score) || 0.5)),
            relevance: 'llm_generated',
            metadata: {
              author: model,
              tag: parsed.tag || (params.active_transits?.[0] ?? ''),
              subject: params.prompt,
              source: 'nvidia-nim',
            },
          },
        ],
      };
    } catch (err) {
      this.logger.error('❌ NIM fallback failed:', err);
      throw new Error('AI Analysis Engine is temporarily unavailable. Please try again later.');
    }
  }

  /** True if NIM is configured and can synthesize interpretations */
  public hasNIM(): boolean {
    return !!this.nim;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 2000 });
      return response.data.status === 'healthy';
    } catch {
      return !!this.nim;
    }
  }
}

export default MLServiceAdapter.getInstance();
