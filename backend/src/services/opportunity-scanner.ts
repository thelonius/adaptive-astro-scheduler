import { CalendarGenerator } from './calendar-generator';
import { RedisService } from '../infrastructure/redis';
import { Logger } from '../utils/logger';
import { query } from '../database/connection';
import type { CalendarDay, DateTime } from '@adaptive-astro/shared/types';
import { DateExtractor } from '../utils/date-extractor';
import mlAdapter from './ml-adapter';

interface ScanResult {
  date: string;
  score: number;
  advice: string;
  isGood: boolean;
  transits: string[];
  /** Raw transit tags (ZET codes) — kept for NIM post-synthesis */
  activeTags?: string[];
}

interface OpportunityScanResponse {
  intent: string;
  startDate: string;
  endDate: string;
  extractedRange: { startDate: string; endDate: string; wasExtracted: boolean };
  opportunities: ScanResult[];
  fromCache: boolean;
}

/**
 * Opportunity Scanner Service
 * 
 * Scans date ranges to find the best astrological opportunities
 * for specific user intents.
 */
export class OpportunityScannerService {
  private redis = RedisService.getInstance();
  private logger = new Logger('OpportunityScannerService');

  constructor(private calendarGenerator: CalendarGenerator) {}

  /**
   * Scan a range of days for a specific intent
   */
  async scanRange(
    userId: string,
    intent: string,
    centerDate: Date,
    rangeDays: number = 7,
    location: { latitude: number; longitude: number },
    timezone: string = 'UTC'
  ): Promise<OpportunityScanResponse> {
    // 1. Check for temporal intent in the prompt
    // Always use today as reference — centerDate is a UI hint, not the user's "now"
    const extracted = DateExtractor.extract(intent, new Date());
    
    let startDate: Date;
    let endDate: Date;

    if (extracted) {
      this.logger.info(`📅 Temporal intent detected in prompt: "${intent}". Using extracted range.`);
      startDate = extracted.startDate;
      endDate = extracted.endDate;
    } else {
      // No date in prompt — scan from today for rangeDays
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.max(rangeDays * 2, 30));
    }

    this.logger.info(`🔍 Scanning opportunities for intent: "${intent}" from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const datesToScan: Date[] = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
      datesToScan.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    const intentHash = Buffer.from(intent).toString('base64').substring(0, 16);
    const scanResults: ScanResult[] = [];
    const CHUNK_SIZE = 3;

    for (let i = 0; i < datesToScan.length; i += CHUNK_SIZE) {
      const chunk = datesToScan.slice(i, i + CHUNK_SIZE);
      try {
        const chunkResults = await Promise.all(chunk.map(async (date) => {
          const dateStr = date.toISOString().split('T')[0];
          const cacheKey = `opp:v2:day:${intentHash}:${dateStr}`;
          
          // Redis is optional — if unavailable, skip the cache gracefully
          let cached: ScanResult | null = null;
          try {
            cached = await this.redis.get<ScanResult>(cacheKey);
          } catch (redisErr) {
            this.logger.warn(`⚠️ Redis unavailable, skipping cache read for ${dateStr}`);
          }
          if (cached) {
            return cached;
          }

          const dateTime: DateTime = {
            date: new Date(date),
            timezone,
            location,
          };

          const dayData = await this.calendarGenerator.generateDay(dateTime, intent);
          const aiAdvice = (dayData as any).aiAdvice;

          const result: ScanResult = {
            date: dateStr,
            score: aiAdvice?.score || 50,
            advice: aiAdvice?.text || 'No specific neural interpretations found for this day.',
            isGood: (aiAdvice?.score || 50) >= 70,
            transits: aiAdvice?.reasoning ? [aiAdvice.reasoning] : [],
            activeTags: (aiAdvice as any)?.allInterpretations?.map((r: any) => r.metadata?.tag).filter(Boolean) || [],
          };

          this.logger.info(`📝 Result for ${dateStr}: score=${result.score}, advice=${result.advice.substring(0, 50)}...`);

          try {
            await this.redis.set(cacheKey, result, 86400);
          } catch (redisErr) {
            this.logger.warn(`⚠️ Redis unavailable, skipping cache write for ${dateStr}`);
          }
          return result;
        }));
        scanResults.push(...chunkResults);
      } catch (err) {
        this.logger.error('❌ AI Scanner failed during chunk processing:', err);
        throw new Error('AI Analysis Engine is temporarily unavailable. Please try again later.');
      }
    }

    // Sort: Highest score first
    const sorted = [...scanResults].sort((a, b) => b.score - a.score);

    // NIM post-synthesis: enhance top-3 results with precise, intention-specific interpretation.
    // Sequential to avoid rate limits — adds ~3-6s but only for the results the user actually sees.
    if (mlAdapter.hasNIM()) {
      const TOP_N = 3;
      for (const result of sorted.slice(0, TOP_N)) {
        try {
          const nimResponse = await mlAdapter.getAdvice({
            prompt: intent,
            active_transits: result.activeTags || result.transits,
            date: result.date,
          });
          if (nimResponse.success && nimResponse.results?.[0]) {
            const r = nimResponse.results[0];
            result.advice = r.text;
            result.score = Math.round(r.score * 100);
            result.isGood = result.score >= 65;
          }
        } catch {
          // Keep ML-derived advice if NIM synthesis fails for this day
        }
      }
      // Re-sort after NIM rescoring
      sorted.sort((a, b) => b.score - a.score);
    }

    // Optional: Background save to Postgres history if we found something really good (>75)
    if (sorted.length > 0 && sorted[0].score > 75) {
       this.archiveSearchRequest(userId, intent, startDate, endDate, sorted).catch(err =>
         this.logger.error('Failed to archive search history:', err)
       );
    }

    return {
      intent,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      extractedRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        wasExtracted: !!extracted,
      },
      opportunities: sorted,
      fromCache: false
    };
  }

  /**
   * Save search results to archival history in Postgres
   */
  private async archiveSearchRequest(
    userId: string, 
    intent: string, 
    start: Date, 
    end: Date, 
    results: ScanResult[]
  ): Promise<void> {
    const sql = `
      INSERT INTO astro_search_history (user_id, intent, start_date, end_date, results_json)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await query(sql, [userId, intent, start, end, JSON.stringify(results)]);
  }
}
