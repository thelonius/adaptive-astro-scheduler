
import { EphemerisAdapter } from '../src/core/ephemeris/adapter';
import { CelestialEventsDetector } from '../src/services/celestial-events-detector';
import { OptimalTimingService } from '../src/services/optimal-timing.service';
import { DateTime } from '@adaptive-astro/shared/types';

async function main() {
    // Setting up the services
    const adapter = new EphemerisAdapter('http://176.123.166.252:8000');
    const detector = new CelestialEventsDetector(adapter);
    const service = new OptimalTimingService(detector);

    // Current time from metadata: 2026-03-20T12:00:00+03:00
    const start = new Date('2026-03-20T00:00:00Z');
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);

    const startDate: DateTime = {
        date: start,
        timezone: 'Europe/Moscow',
        location: { latitude: 55.8893, longitude: 37.4450 } // Khimki
    };

    const endDate: DateTime = {
        date: end,
        timezone: 'Europe/Moscow',
        location: { latitude: 55.8893, longitude: 37.4450 }
    };

    console.log('\n--- 🌌 MONTHLY ASTROLOGICAL ADVISOR 🌌 ---');
    console.log(`Current Date: ${startDate.date.toDateString()}`);
    console.log(`Analysis Period: ${startDate.date.toDateString()} - ${endDate.date.toDateString()}`);
    console.log('-------------------------------------------\n');

    // 1. Current Moon Cycle Info
    try {
        const moonPhase = await adapter.getMoonPhase(startDate);
        const lunarDay = await adapter.getLunarDay(startDate);
        const planets = await adapter.getPlanetsPositions(startDate);
        const moon = planets.planets.find(p => p.name === 'Moon');

        console.log('🌙 CURRENT MOON STATE');
        console.log(`Phase Illumination: ${(moonPhase * 100).toFixed(1)}%`);
        console.log(`Lunar Day: ${lunarDay.number} (${lunarDay.lunarPhase})`);
        console.log(`Moon Sign: ${moon?.zodiacSign || 'Unknown'}`);
        console.log('-------------------------------------------\n');
    } catch (e) {
        console.log('⚠️ Could not fetch current moon state. API might be unreachable.');
    }

    // 2. Best Days for Activities
    const intentions = [
        { key: 'career-change', label: 'Job Search & Career' },
        { key: 'start-project', label: 'New Projects & Initiatives' },
        { key: 'financial', label: 'Financial Decisions' },
        { key: 'creative', label: 'Creative Work' },
        { key: 'health-wellness', label: 'Wellness & Health' }
    ];

    for (const intent of intentions) {
        console.log(`\n### 🗓️ BEST DAYS FOR: ${intent.label.toUpperCase()} ###`);
        try {
            const windows = await service.findOptimalWindows(intent.key as any, startDate, endDate, 5);

            if (windows.length === 0) {
                console.log('  No highly favorable days found in this period.');
            }

            windows.forEach(w => {
                console.log(`📍 ${w.date.date.toDateString()} (Score: ${w.score}/100)`);
                if (w.suggestions.length > 0) console.log(`   ✅ Favorable: ${w.suggestions.join(', ')}`);
                if (w.warnings.length > 0) console.log(`   ⚠️ Precautions: ${w.warnings.join(', ')}`);
                if (w.moonSign) console.log(`   🌙 Moon in ${w.moonSign}`);
            });
        } catch (e) {
            console.log(`  Failed to calculate for ${intent.label}.`);
        }
    }

    // 3. General Precautions
    console.log('\n\n--- ⚠️ GENERAL COSMIC PRECAUTIONS ---');
    try {
        const events = await detector.getAllEvents(startDate, endDate);
        const precautionsByDate = events.filter(e =>
            e.type.includes('retrograde') ||
            e.type.includes('eclipse') ||
            e.type === 'occultation' ||
            (e.type === 'lunar-phase' && (e.name === 'Full Moon' || e.name === 'New Moon'))
        );

        if (precautionsByDate.length === 0) {
            console.log('No major challenging celestial events detected.');
        }

        precautionsByDate.forEach(e => {
            console.log(`📅 ${e.date.date.toDateString()}: ${e.name}`);
            console.log(`   ${e.description}`);
            console.log(`   Significance: ${e.significance}`);
        });
    } catch (e) {
        console.log('  Failed to fetch general precautions.');
    }
}

main().catch(error => {
    console.error('Fatal error running analysis:', error);
});
