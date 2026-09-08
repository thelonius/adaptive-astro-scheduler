import { OptimalTimingService } from '../../../src/services/optimal-timing.service';
import { CelestialEventsDetector } from '../../../src/services/celestial-events-detector';
import { natalChartRepository } from '../../../src/database/repositories/natal-chart.repository';
import { PersonalizedAnalyticsService } from '../../../src/services/personalized-analytics';

// Mock dependencies
jest.mock('../../../src/database/repositories/natal-chart.repository');
jest.mock('../../../src/services/personalized-analytics');
jest.mock('../../../src/services/celestial-events-detector');

describe('OptimalTimingService Personalized Scoring', () => {
    let service: OptimalTimingService;
    let mockDetector: jest.Mocked<CelestialEventsDetector>;
    let mockNatalRepo: jest.Mocked<typeof natalChartRepository>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockDetector = {
            getAllEvents: jest.fn().mockResolvedValue([])
        } as any;

        service = new OptimalTimingService(mockDetector);
        mockNatalRepo = natalChartRepository as any;
    });

    it('should combine universal and personal scores when natalChartId is provided', async () => {
        const startDate = { date: new Date('2026-03-01'), timezone: 'UTC', location: { latitude: 0, longitude: 0 } };
        const endDate = { date: new Date('2026-03-02'), timezone: 'UTC', location: { latitude: 0, longitude: 0 } };
        
        // Mock universal events
        mockDetector.getAllEvents.mockResolvedValue([
            {
                id: 'event-1',
                type: 'lunar-phase',
                name: 'New Moon',
                description: 'New Moon description',
                rarity: 'common',
                significance: 5,
                date: { date: new Date('2026-03-01T12:00:00Z'), timezone: 'UTC', location: { latitude: 0, longitude: 0 } }
            } as any
        ]);

        // Mock natal chart
        const mockChart = { id: 'test-chart', name: 'Test' };
        mockNatalRepo.findById.mockResolvedValue(mockChart as any);

        // Mock personal analytics result
        const mockPersonalResult = {
            overallScore: 80,
            personalSummary: 'Great day for you!',
            personalTransits: { significantTransits: [] }
        };
        
        // Access the mocked instance from the service
        const mockAnalyticsInstance = (service as any).personalizedAnalytics;
        mockAnalyticsInstance.generateDayAnalytics.mockResolvedValue(mockPersonalResult);

        const windows = await service.findOptimalWindows('start-project', startDate, endDate, 10, 'test-chart');

        expect(windows.length).toBeGreaterThan(0);
        expect(windows[0].score).toBeDefined();
        expect(windows[0].summary).toBe('Great day for you!');
        
        // Final score calculation verification:
        // Universal for start-project usually defaults to 50 + rule weights.
        // Rule for New Moon/start-project: weight +15? 
        // scoreDay starts at 50. If New Moon matches, it becomes 65.
        // finalScore = (65 * 0.6) + (80 * 0.4) = 39 + 32 = 71.
        expect(windows[0].score).toBe(71);
    });
});
