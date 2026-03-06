import { EphemerisAdapter } from './src/core/ephemeris/adapter';
import { TransitCalculator } from './src/services/transit-calculator';
import { RelocationCalculator } from './src/services/relocation-calculator';
import { TravelAnalyzer } from './src/services/travel-analyzer';
import { DateTime, NatalChart, CelestialBody } from '@adaptive-astro/shared/types';

async function run() {
    try {
        console.log("Loading modules...");
        const ephemeris = new EphemerisAdapter('http://localhost:8000');
        const transitCalculator = new TransitCalculator(ephemeris);
        const relocationCalculator = new RelocationCalculator(ephemeris);
        const travelAnalyzer = new TravelAnalyzer(relocationCalculator, transitCalculator);

        // 1. Details from user (Friend born Dec 17, 1986 in Moscow)
        const birthDateStr = '1986-12-17T09:00:00Z'; // 12:00 MSK = 09:00 UTC
        const birthLat = 55.7558;
        const birthLng = 37.6173;
        const birthTz = 'Europe/Moscow';

        const birthDateTime: DateTime = {
            date: new Date(birthDateStr),
            timezone: birthTz,
            location: { latitude: birthLat, longitude: birthLng }
        };

        console.log("1. Fetching ephemeris data to build natal chart for", birthDateStr);
        const [planetsData, housesData, lunarDayData] = await Promise.all([
            ephemeris.getPlanetsPositions(birthDateTime),
            ephemeris.getHouses(birthDateTime, 'placidus'),
            ephemeris.getLunarDay(birthDateTime)
        ]);

        // Build planets
        const planetsParams: any = {};
        for (const p of planetsData.planets) {
            const lowerName = p.name.toLowerCase();
            planetsParams[lowerName] = { ...p };
        }

        // Quick fallback for formatting
        const dummyNatalChart = {
            userId: 'test',
            birthDateTime,
            birth_location: { latitude: birthLat, longitude: birthLng, timezone: birthTz } as any,
            planets: planetsParams,
            houses: housesData.houses,
            aspects: [],
            moonDayAtBirth: lunarDayData,
            createdAt: new Date(),
            updatedAt: new Date()
        } as unknown as NatalChart;

        // 2. Define travel destinations and dates
        const destinations = ['Tokyo', 'London', 'Moscow', 'Vladivostok', 'Denpasar'];
        console.log("2. Comparing static destinations for user:", destinations);

        const rankings = await travelAnalyzer.rankDestinations(dummyNatalChart, destinations);

        console.log("\n====== STATIC DESTINATION RANKING ======");
        rankings.forEach((r, idx) => {
            console.log(`${idx + 1}. ${r.destination} (Ascendant: ${r.relocationData.relocatedHouses[1].cusp.toFixed(2)}°, Score: ${r.staticLocationScore.score})`);
            if (r.staticLocationScore.pros.length > 0) {
                console.log(`   Pros: ${r.staticLocationScore.pros.join(' | ')}`);
            }
            if (r.staticLocationScore.warnings.length > 0) {
                console.log(`   Warnings: ${r.staticLocationScore.warnings.join(' | ')}`);
            }
        });

        // 3. Test specific trip transit
        const destination = 'Tokyo';
        const tripStart = new Date('2026-03-24T12:00:00Z');
        const tripEnd = new Date('2026-04-05T12:00:00Z');

        console.log(`\n3. Analyzing Trip to ${destination} for dates: ${tripStart.toISOString().split('T')[0]} to ${tripEnd.toISOString().split('T')[0]}`);

        const tripAnalysis = await travelAnalyzer.analyzeTrip(dummyNatalChart, destination, tripStart, tripEnd);

        console.log('\n====== DYNAMIC DATE ANALYSIS ======');
        const dateA = tripAnalysis.dateAnalysis!;
        console.log(`Date Score Modifier: ${dateA.transitScore}`);
        console.log(`Combined Trip Score: ${tripAnalysis.staticLocationScore.score + dateA.transitScore}`);

        if (dateA.transitPros.length > 0) {
            console.log(`Travel Pros for these dates:\n  - ${dateA.transitPros.join('\n  - ')}`);
        }
        if (dateA.transitWarnings.length > 0) {
            console.log(`Travel Warnings for these dates:\n  - ${dateA.transitWarnings.join('\n  - ')}`);
        }
        console.log("===================================");

    } catch (e) {
        console.error("Test failed", e);
    }
}

run();
