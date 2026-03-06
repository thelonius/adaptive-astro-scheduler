import { EphemerisAdapter } from './backend/src/core/ephemeris/adapter';
import { CelestialEventsDetector } from './backend/src/services/celestial-events-detector';

async function main() {
    const adapter = new EphemerisAdapter('http://localhost:8000');
    const detector = new CelestialEventsDetector(adapter);

    // Dates for March 2026
    const start = { date: new Date('2026-03-01T00:00:00Z'), timezone: 'UTC', location: { latitude: 55.7558, longitude: 37.6173 } };
    const end = { date: new Date('2026-03-31T23:59:59Z'), timezone: 'UTC', location: { latitude: 55.7558, longitude: 37.6173 } };

    const events = await detector.getAllEvents(start, end);
    const specific = events.filter(e => e.type.includes('eclipse') || e.type.includes('retrograde') || e.type.includes('lunar-phase'));
    console.log(JSON.stringify(specific, null, 2));
}

main().catch(console.error);
