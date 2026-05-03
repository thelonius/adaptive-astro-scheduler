import { Request, Response } from 'express';
import { getSharedEphemerisCalculator } from '../../core/ephemeris';
import { CelestialEventsDetector } from '../../services/celestial-events-detector';
import { OptimalTimingService } from '../../services/optimal-timing.service';
import { CalendarGenerator } from '../../services/calendar-generator';
import { OpportunityScannerService } from '../../services/opportunity-scanner';
import { DateExtractor } from '../../utils/date-extractor';
import { DateTime, IntentionCategory } from '@adaptive-astro/shared/types/astrology';

export class OptimalTimingController {
    private ephemeris = getSharedEphemerisCalculator();
    private detector = new CelestialEventsDetector(this.ephemeris);
    private service = new OptimalTimingService(this.detector, this.ephemeris);
    private calendarGenerator = new CalendarGenerator(this.ephemeris);
    private opportunityScanner = new OpportunityScannerService(this.calendarGenerator);

    /**
     * POST /optimal-timing/find
     * Find optimal windows for a specific intention
     */
    async find(req: Request, res: Response): Promise<void> {
        try {
            const {
                intention,
                startDate,
                endDate,
                limit = 20,
                natalChartId,
                location,
            } = req.body;

            if (!intention || !startDate || !endDate) {
                res.status(400).json({
                    error: 'Missing required parameters: intention, startDate, endDate'
                });
                return;
            }

            const validIntentions: IntentionCategory[] = [
                'drop-habits', 'start-project', 'make-decision', 'relationship',
                'career-change', 'health-wellness', 'financial', 'creative', 'spiritual'
            ];

            if (!validIntentions.includes(intention as IntentionCategory)) {
                res.status(400).json({
                    error: 'Invalid intention category',
                    validIntentions
                });
                return;
            }

            const lat = location?.latitude ?? 0;
            const lon = location?.longitude ?? 0;
            const tz = location?.timezone ?? 'UTC';

            const start: DateTime = {
                date: new Date(startDate),
                timezone: tz,
                location: { latitude: lat, longitude: lon }
            };

            const end: DateTime = {
                date: new Date(endDate),
                timezone: tz,
                location: { latitude: lat, longitude: lon }
            };

            const windows = await this.service.findOptimalWindows(
                intention as IntentionCategory,
                start,
                end,
                limit,
                natalChartId
            );

            res.json({
                intention,
                count: windows.length,
                windows
            });

        } catch (error) {
            console.error('Error finding optimal timing:', error);
            res.status(500).json({
                error: 'Failed to find optimal timing windows',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Map free-text intent to the closest IntentionCategory using keyword matching.
     * Falls back to 'start-project' when nothing matches.
     */
    private classifyIntent(prompt: string): IntentionCategory {
        const p = prompt.toLowerCase();
        const rules: Array<[IntentionCategory, string[]]> = [
            ['start-project',   ['проект', 'запуск', 'начать', 'старт', 'launch', 'start', 'project', 'initiative', 'бизнес', 'дело']],
            ['career-change',   ['карьер', 'работ', 'уволь', 'профессия', 'должность', 'career', 'job', 'promotion']],
            ['relationship',    ['отношен', 'любов', 'партнёр', 'свидан', 'знакомств', 'relationship', 'love', 'dating']],
            ['financial',       ['деньг', 'инвест', 'финанс', 'кредит', 'сделк', 'money', 'invest', 'financial']],
            ['health-wellness', ['здоровь', 'спорт', 'диет', 'лечен', 'здоров', 'health', 'wellness', 'fitness']],
            ['creative',        ['творч', 'искусств', 'music', 'art', 'creative', 'write', 'писать', 'рисовать']],
            ['make-decision',   ['решен', 'выбор', 'decide', 'decision', 'choice']],
            ['drop-habits',     ['бросить', 'избавить', 'привычк', 'quit', 'stop', 'habit', 'курить']],
            ['spiritual',       ['духовн', 'медитац', 'spiritual', 'meditation', 'mindful']],
        ];
        for (const [category, keywords] of rules) {
            if (keywords.some(kw => p.includes(kw))) return category;
        }
        return 'start-project';
    }

    /**
     * POST /optimal-timing/find-ai
     * Find optimal windows for a natural-language intention.
     * Uses rule-based astrological scoring (OptimalTimingService) for meaningful scores,
     * then enriches top results with ML transit descriptions for context.
     */
    async findAI(req: Request, res: Response): Promise<void> {
        try {
            const { prompt } = req.body;

            if (!prompt) {
                res.status(400).json({ error: 'Missing required parameter: prompt' });
                return;
            }

            // 1. Classify intent from free text
            const intention = this.classifyIntent(prompt);

            // 2. Extract date range from the prompt; fall back to today + 30 days
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const extracted = DateExtractor.extract(prompt, today);

            let start: Date;
            let end: Date;
            let wasExtracted = false;

            if (extracted) {
                start = extracted.startDate;
                // Single-day extraction → scan from that day for 30 days
                end = extracted.startDate.getTime() === extracted.endDate.getTime()
                    ? new Date(new Date(start).setDate(start.getDate() + 30))
                    : extracted.endDate;
                wasExtracted = true;
            } else {
                start = today;
                end = new Date(today);
                end.setDate(end.getDate() + 30);
            }

            const startDT: DateTime = {
                date: start,
                timezone: 'UTC',
                location: { latitude: 55.7558, longitude: 37.6173 }
            };
            const endDT: DateTime = {
                date: end,
                timezone: 'UTC',
                location: { latitude: 55.7558, longitude: 37.6173 }
            };

            // 3. Score days with real astrological rules
            const windows = await this.service.findOptimalWindows(intention, startDT, endDT, 20);

            // 4. Map to frontend format
            const result = windows.map((w, idx) => ({
                id: `ai-${idx}`,
                startTime: w.date.date.toISOString(),
                endTime: w.date.date.toISOString(),
                score: w.score / 100,
                interpretation: w.summary + ((w.suggestions ?? []).length
                    ? ' · ' + (w.suggestions ?? []).slice(0, 2).join('. ')
                    : ''),
                factors: [
                    ...(w.suggestions ?? []).map(s => ({ name: s, influence: 1, type: 'positive' as const })),
                    ...(w.warnings ?? []).map(s => ({ name: s, influence: -1, type: 'negative' as const })),
                ],
                moonPhase: w.moonPhase,
                moonSign: w.moonSign,
            }));

            res.json({
                prompt,
                detectedIntention: intention,
                strategy: 'Astrological Rule Engine',
                count: result.length,
                windows: result,
                extractedRange: {
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    wasExtracted,
                },
            });

        } catch (error) {
            console.error('Error in AI optimal timing:', error);
            res.status(500).json({
                error: 'Failed to process AI request',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /optimal-timing/intentions
     * Get list of supported intention categories
     */
    async getIntentions(req: Request, res: Response): Promise<void> {
        const intentions: IntentionCategory[] = [
            'drop-habits',
            'start-project',
            'make-decision',
            'relationship',
            'career-change',
            'health-wellness',
            'financial',
            'creative',
            'spiritual'
        ];

        res.json({ intentions });
    }
}
