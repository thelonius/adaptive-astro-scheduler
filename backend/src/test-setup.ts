/**
 * Setup Test Script
 *
 * Quick test to verify the backend is working
 */

import { createEphemerisCalculator } from './core/ephemeris';
import { CalendarGenerator } from './services/calendar-generator';
import type { DateTime } from '@adaptive-astro/shared/types';

async function testSetup() {
  console.log('🧪 Testing Adaptive Astro-Scheduler Setup...\n');

  try {
    // 1. Test ephemeris adapter
    console.log('1️⃣  Testing Ephemeris Adapter...');
    const ephemeris = createEphemerisCalculator();

    const testDate: DateTime = {
      date: new Date('2026-01-15'),
      timezone: 'Europe/Moscow',
      location: {
        latitude: 55.7558,
        longitude: 37.6173,
      },
    };

    const lunarDay = await ephemeris.getLunarDay(testDate);
    console.log(`   ✅ Lunar Day: ${lunarDay.number} (${lunarDay.symbol})`);

    const moonPhase = await ephemeris.getMoonPhase(testDate);
    console.log(`   ✅ Moon Phase: ${(moonPhase * 100).toFixed(1)}% illumination`);

    // 2. Test calendar generator
    console.log('\n2️⃣  Testing Calendar Generator...');
    const generator = new CalendarGenerator(ephemeris);

    const calendarDay = await generator.generateDay(testDate);
    console.log(`   ✅ Generated CalendarDay for ${testDate.date.toISOString().split('T')[0]}`);
    console.log(`   📅 Lunar Day: ${calendarDay.lunarDay.number}`);
    console.log(`   🌙 Lunar Phase: ${calendarDay.lunarDay.lunarPhase}`);
    console.log(`   ⚡ Energy: ${calendarDay.lunarDay.energy}`);
    console.log(`   💪 Strength: ${(calendarDay.recommendations.strength * 100).toFixed(0)}%`);

    // 3. Test best days finder
    console.log('\n3️⃣  Testing Best Days Finder...');
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-01-31');

    const bestDays = await generator.findBestDaysFor(
      'new beginnings',
      startDate,
      endDate,
      testDate.location,
      testDate.timezone,
      0.6
    );

    console.log(`   ✅ Found ${bestDays.length} favorable days for "new beginnings" in January 2026`);
    if (bestDays.length > 0) {
      console.log(`   🏆 Best day: ${bestDays[0].date.date.toISOString().split('T')[0]} (strength: ${(bestDays[0].recommendations.strength * 100).toFixed(0)}%)`);
    }

    console.log('\n✨ All tests passed! Backend is working correctly.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testSetup();
