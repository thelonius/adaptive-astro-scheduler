import { createEphemerisCalculator } from '../src/core/ephemeris';
import { RelocationCalculator } from '../src/services/relocation-calculator';
import { TransitCalculator } from '../src/services/transit-calculator';
import { TravelAnalyzer } from '../src/services/travel-analyzer';
import { OptimalVectorFinder } from '../src/services/optimal-vector-finder';
import { NatalChart } from '@adaptive-astro/shared/types';

async function testOptimalVectors() {
    const ephemeris = createEphemerisCalculator('http://localhost:8000', false);
    const relocationCalculator = new RelocationCalculator(ephemeris);
    const transitCalculator = new TransitCalculator(ephemeris);
    const travelAnalyzer = new TravelAnalyzer(relocationCalculator, transitCalculator);
    const finder = new OptimalVectorFinder(ephemeris, travelAnalyzer);

    // User data from birth
    const natalChart: any = {
        userId: 'test-user',
        birthDateTime: {
            // Sep 11, 1984, 01:40 MSK (UTC+3)
            date: new Date('1984-09-11T01:40:00+03:00'),
            timezone: 'Europe/Moscow',
            location: { latitude: 55.75, longitude: 37.62 }
        },
        planets: {
            sun: { longitude: 168.7, name: 'Sun' },
            moon: { longitude: 356.5, name: 'Moon' },
            mercury: { longitude: 151.4, name: 'Mercury' },
            venus: { longitude: 192.3, name: 'Venus' },
            mars: { longitude: 254.3, name: 'Mars' },
            jupiter: { longitude: 273.6, name: 'Jupiter' },
            saturn: { longitude: 222.7, name: 'Saturn' },
            uranus: { longitude: 250.0, name: 'Uranus' },
            neptune: { longitude: 268.9, name: 'Neptune' },
            pluto: { longitude: 210.6, name: 'Pluto' }
        }
    };

    console.log('🚀 Searching global optimal zones (Tree-scanning nodes)...');
    try {
        const result = await finder.findOptimalZones(natalChart as NatalChart);

        console.log('\n🌟 TOP 5 REGION CANDIDATES:');
        result.highestScoreZones.forEach((node, i) => {
            console.log(`${i + 1}. Lat: ${node.latitude}, Lon: ${node.longitude} | Score: ${node.score} | Type: ${node.primaryAspect}`);
        });

        console.log('\n📍 RECOMMENDED VECTORS:');
        console.log(`- CARER VECTOR: ${result.recommendations.career?.latitude}, ${result.recommendations.career?.longitude} (Score: ${result.recommendations.career?.score})`);
        console.log(`- WEALTH VECTOR: ${result.recommendations.wealth?.latitude}, ${result.recommendations.wealth?.longitude} (Score: ${result.recommendations.wealth?.score})`);
        console.log(`- PERSONAL VECTOR: ${result.recommendations.personal?.latitude}, ${result.recommendations.personal?.longitude} (Score: ${result.recommendations.personal?.score})`);

        process.exit(0);
    } catch (e) {
        console.error('❌ Error during optimization scan:', e);
        process.exit(1);
    }
}

testOptimalVectors();
