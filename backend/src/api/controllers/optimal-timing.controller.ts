import { Request, Response } from 'express';
import { createEphemerisCalculator } from '../../core/ephemeris';
import { CelestialEventsDetector } from '../../services/celestial-events-detector';
import { OptimalTimingService } from '../../services/optimal-timing.service';
import { DateTime, IntentionCategory } from '@adaptive-astro/shared/types/astrology';

export class OptimalTimingController {
    private ephemeris = createEphemerisCalculator();
    private detector = new CelestialEventsDetector(this.ephemeris);
    private service = new OptimalTimingService(this.detector);

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
                limit = 20
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

            const start: DateTime = {
                date: new Date(startDate),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const end: DateTime = {
                date: new Date(endDate),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const windows = await this.service.findOptimalWindows(
                intention as IntentionCategory,
                start,
                end,
                limit
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
