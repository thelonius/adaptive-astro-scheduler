import { RelocationCalculator } from './src/services/relocation-calculator';
import { TravelAnalyzer } from './src/services/travel-analyzer';
import { EphemerisAdapter } from './src/core/ephemeris/adapter';
import { TransitCalculator } from './src/services/transit-calculator';
import { NatalChart, DateTime } from '@adaptive-astro/shared/types';

async function run() {
  const adapter = new EphemerisAdapter();
  const transitCalculator = new TransitCalculator(adapter);
  const relocationCalc = new RelocationCalculator(adapter);
  const travelAnalyzer = new TravelAnalyzer(relocationCalc, transitCalculator);

  // Mock a basic natal chart
  const dummyNatal: NatalChart = {
    userId: '123',
    birthDateTime: {
      date: new Date('1990-01-01T12:00:00Z'),
      timezone: 'UTC',
      location: { latitude: 0, longitude: 0 }
    },
    planets: {
      sun: { name: 'Sun', longitude: 280, latitude: 0, zodiacSign: { id: 10, name: 'Козерог', element: 'Земля', quality: 'Кардинальный', rulingPlanet: 'Saturn', symbol: '♑', dateRange: [20, 18] }, speed: 1, isRetrograde: false, distanceAU: 1 },
      moon: { name: 'Moon', longitude: 350, latitude: 0, zodiacSign: { id: 12, name: 'Рыбы', element: 'Вода', quality: 'Мутабельный', rulingPlanet: 'Neptune', symbol: '♓', dateRange: [19, 20] }, speed: 13, isRetrograde: false, distanceAU: 0 },
      mercury: { name: 'Mercury', longitude: 270, latitude: 0, zodiacSign: { id: 10, name: 'Козерог', element: 'Земля', quality: 'Кардинальный', rulingPlanet: 'Saturn', symbol: '♑', dateRange: [20, 18] }, speed: 1.5, isRetrograde: false, distanceAU: 1 },
      venus: { name: 'Venus', longitude: 290, latitude: 0, zodiacSign: { id: 10, name: 'Козерог', element: 'Земля', quality: 'Кардинальный', rulingPlanet: 'Saturn', symbol: '♑', dateRange: [20, 18] }, speed: 1.2, isRetrograde: false, distanceAU: 1 },
      mars: { name: 'Mars', longitude: 240, latitude: 0, zodiacSign: { id: 9, name: 'Стрелец', element: 'Огонь', quality: 'Мутабельный', rulingPlanet: 'Jupiter', symbol: '♐', dateRange: [22, 19] }, speed: 0.5, isRetrograde: false, distanceAU: 1.5 },
      jupiter: { name: 'Jupiter', longitude: 90, latitude: 0, zodiacSign: { id: 4, name: 'Рак', element: 'Вода', quality: 'Кардинальный', rulingPlanet: 'Moon', symbol: '♋', dateRange: [21, 22] }, speed: 0.1, isRetrograde: false, distanceAU: 5 },
      saturn: { name: 'Saturn', longitude: 280, latitude: 0, zodiacSign: { id: 10, name: 'Козерог', element: 'Земля', quality: 'Кардинальный', rulingPlanet: 'Saturn', symbol: '♑', dateRange: [20, 18] }, speed: 0.03, isRetrograde: false, distanceAU: 9 },
      uranus: { name: 'Uranus', longitude: 275, latitude: 0, zodiacSign: { id: 10, name: 'Козерог', element: 'Земля', quality: 'Кардинальный', rulingPlanet: 'Saturn', symbol: '♑', dateRange: [20, 18] }, speed: 0.01, isRetrograde: false, distanceAU: 19 },
      neptune: { name: 'Neptune', longitude: 282, latitude: 0, zodiacSign: { id: 10, name: 'Козерог', element: 'Земля', quality: 'Кардинальный', rulingPlanet: 'Saturn', symbol: '♑', dateRange: [20, 18] }, speed: 0.005, isRetrograde: false, distanceAU: 30 },
      pluto: { name: 'Pluto', longitude: 225, latitude: 0, zodiacSign: { id: 8, name: 'Скорпион', element: 'Вода', quality: 'Фиксированный', rulingPlanet: 'Mars', symbol: '♏', dateRange: [23, 21] }, speed: 0.003, isRetrograde: false, distanceAU: 40 }
    },
    houses: {},
    aspects: [],
    moonDayAtBirth: { number: 1, symbol: '', energy: 'Neutral', lunarPhase: 'New', characteristics: { spiritual: '', practical: '', avoided: [] } },
    createdAt: new Date(),
    updatedAt: new Date(),
    birth_location: { latitude: 0, longitude: 0, timezone: 'UTC' } as any
  };

  try {
    const tripToTokyo = await travelAnalyzer.analyzeTrip(
        dummyNatal,
        'Tokyo',
        new Date('2026-03-10T00:00:00Z'),
        new Date('2026-03-20T00:00:00Z')
    );

    console.log("✈️  Trip Analysis for Tokyo");
    console.log("-----------------------------------------");
    console.log("Static Score for Tokyo:", tripToTokyo.staticLocationScore.score);
    console.log("Static Pros:", tripToTokyo.staticLocationScore.pros);
    console.log("Static Warnings:", tripToTokyo.staticLocationScore.warnings);
    
    console.log("\n📆 Date specific transits (March 10-20, 2026)");
    console.log("Transit Score Modifier:", tripToTokyo.dateAnalysis?.transitScore);
    console.log("Transit Pros:", tripToTokyo.dateAnalysis?.transitPros);
    console.log("Transit Warnings:", tripToTokyo.dateAnalysis?.transitWarnings);

  } catch (err) {
    console.error(err);
  }
}

run();
