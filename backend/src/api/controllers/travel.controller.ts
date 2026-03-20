import { Request, Response } from 'express';
import { createEphemerisCalculator } from '../../core/ephemeris';
import { RelocationCalculator } from '../../services/relocation-calculator';
import { TravelAnalyzer } from '../../services/travel-analyzer';
import { TransitCalculator } from '../../services/transit-calculator';
import { NatalChart } from '@adaptive-astro/shared/types';
import { OptimalVectorFinder } from '../../services/optimal-vector-finder';

export class TravelController {
    private ephemeris = createEphemerisCalculator();
    private transitCalculator = new TransitCalculator(this.ephemeris);
    private relocationCalculator = new RelocationCalculator(this.ephemeris);
    private travelAnalyzer = new TravelAnalyzer(this.relocationCalculator, this.transitCalculator);
    private optimalFinder = new OptimalVectorFinder(this.ephemeris, this.travelAnalyzer);

    /**
     * POST /api/v1/travel/relocation
     * Get relocation houses for a destination city
     */
    async getRelocation(req: Request, res: Response): Promise<void> {
        try {
            const { natalChart, destinationCity } = req.body;

            if (!natalChart || !destinationCity) {
                res.status(400).json({ error: 'Missing required parameters: natalChart, destinationCity' });
                return;
            }

            const relocation = await this.relocationCalculator.calculateRelocation(natalChart as NatalChart, destinationCity as string);

            if (!relocation) {
                res.status(404).json({ error: `Could not resolve location for city: ${destinationCity}` });
                return;
            }

            res.json(relocation);
        } catch (error) {
            console.error('Error generating relocation chart:', error);
            res.status(500).json({
                error: 'Failed to generate relocation chart',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * POST /api/v1/travel/analyze
     * Analyze a trip to a single destination (with optional date transits)
     */
    async analyzeTrip(req: Request, res: Response): Promise<void> {
        try {
            const { natalChart, destinationCity, startDate, endDate } = req.body;

            if (!natalChart || !destinationCity) {
                res.status(400).json({ error: 'Missing required parameters: natalChart, destinationCity' });
                return;
            }

            const parsedStartDate = startDate ? new Date(startDate) : undefined;
            const parsedEndDate = endDate ? new Date(endDate) : undefined;

            const analysis = await this.travelAnalyzer.analyzeTrip(
                natalChart as NatalChart,
                destinationCity as string,
                parsedStartDate,
                parsedEndDate
            );

            res.json(analysis);
        } catch (error) {
            console.error('Error analyzing trip:', error);
            res.status(500).json({
                error: 'Failed to analyze trip',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * POST /api/v1/travel/compare
     * Rank multiple destinations by static location score
     */
    async compareDestinations(req: Request, res: Response): Promise<void> {
        try {
            const { natalChart, cities } = req.body;

            if (!natalChart || !cities || !Array.isArray(cities)) {
                res.status(400).json({ error: 'Missing required parameters: natalChart, cities[]' });
                return;
            }

            const rankings = await this.travelAnalyzer.rankDestinations(natalChart as NatalChart, cities as string[]);

            res.json({
                count: rankings.length,
                rankings
            });
        } catch (error) {
            console.error('Error comparing destinations:', error);
            res.status(500).json({
                error: 'Failed to compare destinations',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * POST /api/v1/travel/scan
     * Scan the globe for optimal zones
     */
    async scanGlobalZones(req: Request, res: Response): Promise<void> {
        try {
            const { natalChart } = req.body;
            if (!natalChart) {
                res.status(400).json({ error: 'Missing natalChart' });
                return;
            }
            const result = await this.optimalFinder.findOptimalZones(natalChart as NatalChart);
            res.json(result);
        } catch (error) {
            console.error('Error scanning zones:', error);
            res.status(500).json({
                error: 'Failed to scan zones',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
