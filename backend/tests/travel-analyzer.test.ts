import { TravelAnalyzer } from '../src/services/travel-analyzer';
import { RelocationCalculator } from '../src/services/relocation-calculator';
import { TransitCalculator } from '../src/services/transit-calculator';
import { IEphemerisCalculator } from '../src/core/ephemeris/interface';
import { DateTime, NatalChart, PlanetApiData } from '@adaptive-astro/shared/types';

// Mock the EphemerisCalculator
class MockEphemeris implements IEphemerisCalculator {
    async getHouses(dateTime: DateTime) {
        if (dateTime.location.latitude === 35.68501691) {
            // Mock houses for Tokyo. Assume angles are:
            return {
                date: dateTime.date.toISOString(),
                location: dateTime.location,
                system: 'placidus',
                houses: [
                    { number: 1, cusp: 180, zodiacSign: 'Libra', degree: 0 },
                    { number: 2, cusp: 210, zodiacSign: 'Scorpio', degree: 0 },
                    { number: 3, cusp: 240, zodiacSign: 'Sagittarius', degree: 0 },
                    { number: 4, cusp: 270, zodiacSign: 'Capricorn', degree: 0 },
                    { number: 5, cusp: 300, zodiacSign: 'Aquarius', degree: 0 },
                    { number: 6, cusp: 330, zodiacSign: 'Pisces', degree: 0 },
                    { number: 7, cusp: 0, zodiacSign: 'Aries', degree: 0 },
                    { number: 8, cusp: 30, zodiacSign: 'Taurus', degree: 0 },
                    { number: 9, cusp: 60, zodiacSign: 'Gemini', degree: 0 },
                    { number: 10, cusp: 90, zodiacSign: 'Cancer', degree: 0 },
                    { number: 11, cusp: 120, zodiacSign: 'Leo', degree: 0 },
                    { number: 12, cusp: 150, zodiacSign: 'Virgo', degree: 0 }
                ]
            } as any;
        }
        return { houses: [] } as any;
    }

    async getPlanetsPositions(dateTime: DateTime) {
        // Mock transiting planets for March 10, 2026
        if (dateTime.date.toISOString().startsWith('2026-03-10')) {
            return {
                planets: [
                    // Mars is moving through 280°. The 4th house cusp in our mock is 270°-300°. 
                    // It's in the 4th house!
                    { name: 'Mars', longitude: 280, speed: 1, isRetrograde: false } as PlanetApiData,

                    // Jupiter is at 100°. The 10th house is 90°-120°.
                    // 10th house benefic!
                    { name: 'Jupiter', longitude: 100, speed: 1, isRetrograde: false } as PlanetApiData
                ]
            } as any;
        }
        return { planets: [] } as any;
    }

    // Stubs for other interface methods
    async getAspects() { return {} as any; }
    async getPlanetaryHours() { return {} as any; }
    async getRetrogradePlanets() { return { retrogradePlanets: [] } as any; }
    async getMoonPhase() { return 0; }
    async getLunarDay() { return {} as any; }
    async getVoidOfCourseMoon() { return {} as any; }
}

describe('Travel Analyzer & Relocation Calculator', () => {
    let travelAnalyzer: TravelAnalyzer;

    beforeEach(() => {
        const mockEphemeris = new MockEphemeris();
        const relocationCalc = new RelocationCalculator(mockEphemeris);
        const transitCalc = new TransitCalculator(mockEphemeris);
        travelAnalyzer = new TravelAnalyzer(relocationCalc, transitCalc);
    });

    it('resolves city correctly', async () => {
        const mockEphemeris = new MockEphemeris();
        const relocationCalc = new RelocationCalculator(mockEphemeris);
        const loc = relocationCalc.resolveLocation('Tokyo');
        expect(loc).toBeDefined();
        expect(loc?.city).toBe('Tokyo');
        expect(loc?.country).toBe('Japan');
        expect(loc?.timezone).toBe('Asia/Tokyo');
    });

    it('analyzes static location and date transits correctly', async () => {
        // Mock a basic natal chart
        const dummyNatal = {
            userId: '123',
            birthDateTime: {
                date: new Date('1990-01-01T12:00:00Z'),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            },
            birth_location: { latitude: 0, longitude: 0, timezone: 'UTC' } as any,
            planets: {
                // Natal sun is at 280... transiting mars is also at 280 -> conjunction!
                sun: { name: 'Sun', longitude: 280 } as any,
                moon: { name: 'Moon', longitude: 350 } as any,
                mercury: { name: 'Mercury', longitude: 270 } as any,
                venus: { name: 'Venus', longitude: 10 } as any,
                mars: { name: 'Mars', longitude: 240 } as any,
                jupiter: { name: 'Jupiter', longitude: 100 } as any,
                saturn: { name: 'Saturn', longitude: 140 } as any,
                uranus: { name: 'Uranus', longitude: 275 } as any,
                neptune: { name: 'Neptune', longitude: 282 } as any,
                pluto: { name: 'Pluto', longitude: 225 } as any
            },
            houses: {}, aspects: [],
            moonDayAtBirth: { number: 1, symbol: '', energy: 'Neutral', lunarPhase: 'New', characteristics: { spiritual: '', practical: '', avoided: [] } },
            createdAt: new Date(), updatedAt: new Date()
        };

        const tripDate = new Date('2026-03-10T12:00:00Z');
        const endDate = new Date('2026-03-20T12:00:00Z');

        const result = await travelAnalyzer.analyzeTrip(dummyNatal as any, 'Tokyo', tripDate, endDate);

        expect(result.destination).toBe('Tokyo');
        expect(result.staticLocationScore.score).toBe(95);
        expect(result.dateAnalysis).toBeDefined();

        const transits = result.dateAnalysis!;

        // Mars is in 4th house (Malefic in angular relocated house): -10 score, throws a warning
        expect(transits.transitWarnings).toContain(
            "Transiting Mars is moving through your relocated 4th house. This could bring sudden challenges or stress at the destination."
        );
        // And transiting Mars is CONJUNCT Natal Sun! (280 and 280) -> -15 score
        expect(transits.transitWarnings).toContain(
            "Transiting Mars is in a hard conjunction to your Natal Sun during the trip. Prepare for potential delays or emotional tension."
        );

        // Jupiter is in 10th house (Benefic in angular): +10 score, gives a pro
        expect(transits.transitPros).toContain(
            "Transiting Jupiter is moving through your relocated 10th house, bringing positive energy, luck, or comfort."
        );

        // Net score modifier = -10 (house) - 15 (sun conj) - 15 (venus sq) + 10 (jupiter) = -30
        expect(transits.transitScore).toBe(-30);
    });
});
