import { createEphemerisCalculator } from '../src/core/ephemeris';
import { RelocationCalculator } from '../src/services/relocation-calculator';
import { TransitCalculator } from '../src/services/transit-calculator';
import { TravelAnalyzer } from '../src/services/travel-analyzer';
import { NatalChart } from '@adaptive-astro/shared/types';

async function tracePath() {
    const ephemeris = createEphemerisCalculator('http://localhost:8000', false);
    const relocationCalculator = new RelocationCalculator(ephemeris);
    const transitCalculator = new TransitCalculator(ephemeris);
    const travelAnalyzer = new TravelAnalyzer(relocationCalculator, transitCalculator);

    const natalChart: any = {
        userId: 'test-user',
        birthDateTime: {
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

    console.log('📈 ТРАССИРОВКА ПУТИ: МОСКВА (37°E) ➡️ ПЕРТ (115°E)');
    console.log('--------------------------------------------------');
    console.log('Долгота | Балл | Ключевые аспекты / Варнинги');
    console.log('--------------------------------------------------');

    for (let lon = 35; lon <= 115; lon += 5) {
        try {
            // Линейная интерполяция широты: Москва (55.7) -> Перт (-31.9)
            const lat = 55.7 + (lon - 37.6) * (-31.9 - 55.7) / (115.8 - 37.6);

            const relocation = await relocationCalculator.calculateRelocationByCoords(natalChart as NatalChart, lat, lon, `WayPoint ${lon}E`);
            const score = travelAnalyzer.analyzeStaticLocation(relocation);

            let indicator = '⚪';
            if (score.score >= 85) indicator = '💎';
            else if (score.score >= 70) indicator = '🟢';
            else if (score.score <= 50) indicator = '🔴';

            const note = score.pros.length > 0 ? score.pros[0].substring(0, 45) : (score.warnings[0] || '').substring(0, 45);
            console.log(`${lon}°E \t| ${score.score} | ${indicator} ${note}`);
        } catch (e) {
            console.error(`Error at ${lon}E:`, e);
            continue;
        }
    }
}

tracePath();
