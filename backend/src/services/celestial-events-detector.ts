import type { DateTime, CelestialEvent } from '@adaptive-astro/shared/types';
import type { IEphemerisCalculator } from '../core/ephemeris';

/**
 * Celestial Events Detector Service
 * 
 * Detects various astronomical events including:
 * - Lunar phases (New Moon, Full Moon, Quarters)
 * - Planetary alignments (3+ planets in narrow arc)
 * - Retrogrades and stations
 * - Sign ingresses
 */
export class CelestialEventsDetector {
    constructor(private ephemeris: IEphemerisCalculator) { }

    /** Prefetch planet positions for all dates in range in parallel batches. */
    private async prefetchPlanets(
        start: Date,
        end: Date,
        stepDays: number = 1
    ): Promise<Map<string, any>> {
        const dates: Date[] = [];
        const cur = new Date(start);
        while (cur <= end) {
            dates.push(new Date(cur));
            cur.setDate(cur.getDate() + stepDays);
        }
        const cache = new Map<string, any>();
        const BATCH = 12;
        for (let i = 0; i < dates.length; i += BATCH) {
            const batch = dates.slice(i, i + BATCH);
            const results = await Promise.all(
                batch.map(date =>
                    this.ephemeris.getPlanetsPositions({ date, timezone: 'UTC', location: { latitude: 0, longitude: 0 } })
                        .catch(() => null)
                )
            );
            for (let j = 0; j < batch.length; j++) {
                if (results[j]) cache.set(batch[j].toISOString().split('T')[0], results[j]);
            }
        }
        return cache;
    }

    /**
     * Get all celestial events in a date range
     */
    async getAllEvents(
        startDate: DateTime,
        endDate: DateTime
    ): Promise<CelestialEvent[]> {
        const events: CelestialEvent[] = [];

        // Prefetch all daily planet positions once, share across all detectors
        const planetsCache = await this.prefetchPlanets(
            new Date(startDate.date),
            new Date(endDate.date),
            1
        );

        // Detect all event types
        const [
            lunarPhases,
            eclipses,
            occultations,
            alignments,
            retrogrades,
            ingresses,
            voidMoons
        ] = await Promise.all([
            this.detectLunarPhases(startDate, endDate, planetsCache),
            this.detectEclipses(startDate, endDate, planetsCache),
            this.detectOccultations(startDate, endDate, planetsCache),
            this.detectPlanetaryAlignments(startDate, endDate, planetsCache),
            this.detectRetrogrades(startDate, endDate, planetsCache),
            this.detectIngresses(startDate, endDate, planetsCache),
            this.detectVoidMoons(startDate, endDate)
        ]);

        events.push(...lunarPhases);
        events.push(...eclipses);
        events.push(...occultations);
        events.push(...alignments);
        events.push(...retrogrades);
        events.push(...ingresses);
        events.push(...voidMoons);

        // Deduplicate events to ensure only one entry per unique event per day
        // This prevents multiple cards for the same eclipse or occultation detected in multiple windows
        const uniqueEventsMap = new Map<string, CelestialEvent>();
        for (const event of events) {
            const dateStr = event.date.date.toISOString().split('T')[0];
            const key = `${event.type}-${event.name}-${dateStr}`;
            if (!uniqueEventsMap.has(key)) {
                uniqueEventsMap.set(key, event);
            }
        }
        const dedupedEvents = Array.from(uniqueEventsMap.values());

        // Post-process rare events to find next occurrence
        const rareEvents = dedupedEvents.filter(e => e.rarity === 'rare' || e.rarity === 'very-rare');
        await Promise.all(rareEvents.map(async (event) => {
            event.nextOccurrence = await this.findNextSameEvent(event);
        }));

        // Sort by date
        return dedupedEvents.sort((a, b) =>
            a.date.date.getTime() - b.date.date.getTime()
        );
    }

    /**
     * Find the next occurrence of the same event
     */
    private async findNextSameEvent(event: CelestialEvent): Promise<DateTime | undefined> {
        // Look ahead up to 5 years for rare events
        const maxYears = 5;
        const searchStart = new Date(event.date.date);

        // Skip ahead to avoid finding the same event's next day
        // For slow-moving events like eclipses and alignments, use a larger skip
        // For fast events like Moon ingress or occultations, 1 day is enough
        let skipDays = 1;
        if (event.type.includes('eclipse') || event.type === 'planetary-alignment') {
            skipDays = 20; // Skip current window but catch next eclipse (approx 6 mo)
        } else if (event.type.includes('retrograde')) {
            skipDays = 5; // Skip current station shadow
        }

        searchStart.setDate(searchStart.getDate() + skipDays);

        const searchEnd = new Date(searchStart);
        searchEnd.setFullYear(searchEnd.getFullYear() + maxYears);

        const startDt: DateTime = {
            date: searchStart,
            timezone: 'UTC',
            location: { latitude: 0, longitude: 0 }
        };

        const endDt: DateTime = {
            date: searchEnd,
            timezone: 'UTC',
            location: { latitude: 0, longitude: 0 }
        };

        let foundEvents: CelestialEvent[] = [];

        // Specific detection based on type
        switch (event.type) {
            case 'solar-eclipse':
            case 'lunar-eclipse':
                foundEvents = await this.detectEclipses(startDt, endDt);
                break;
            case 'planetary-alignment':
                foundEvents = await this.detectPlanetaryAlignments(startDt, endDt);
                break;
            case 'occultation':
                foundEvents = await this.detectOccultations(startDt, endDt);
                break;
            case 'retrograde-start':
            case 'retrograde-end':
                foundEvents = await this.detectRetrogrades(startDt, endDt);
                break;
            case 'ingress':
                foundEvents = await this.detectIngresses(startDt, endDt);
                break;
            default:
                return undefined;
        }

        // Filter for the "same" event
        const sameEvent = foundEvents.find(e => {
            if (e.type !== event.type) return false;

            // For eclipses, check name (Total, Annular, etc.)
            if (e.type.includes('eclipse')) {
                return e.name === event.name;
            }

            // For alignments, check same number of planets or same planets
            if (e.type === 'planetary-alignment') {
                return e.planets?.length === event.planets?.length;
            }

            // For occultations/retrogrades/ingress, check same planets
            if (e.planets && event.planets) {
                return e.planets[0] === event.planets[0];
            }

            return e.name === event.name;
        });

        return sameEvent?.date;
    }

    /**
     * Detect lunar phases in date range
     */
    private async detectLunarPhases(
        startDate: DateTime,
        endDate: DateTime,
        cache: Map<string, any> = new Map()
    ): Promise<CelestialEvent[]> {
        const events: CelestialEvent[] = [];
        const currentDate = new Date(startDate.date);
        const end = new Date(endDate.date);

        // Check each day for lunar phase transitions
        while (currentDate <= end) {
            const dateTime: DateTime = {
                date: new Date(currentDate),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const key = currentDate.toISOString().split('T')[0];
            const planets = cache.get(key) ?? await this.ephemeris.getPlanetsPositions(dateTime);
            const sun = planets.planets.find((p: any) => p.name ==='Sun');
            const moon = planets.planets.find((p: any) => p.name ==='Moon');

            if (sun && moon) {
                const phase = this.calculateLunarPhase(sun.longitude, moon.longitude);

                // Detect phase transitions (within 1° of exact)
                if (Math.abs(phase.angle) < 1) {
                    events.push({
                        id: `new-moon-${dateTime.date.toISOString().split('T')[0]}`,
                        type: 'lunar-phase',
                        name: 'New Moon',
                        description: 'Moon and Sun conjunct - new beginnings, fresh starts',
                        date: dateTime,
                        planets: ['Moon', 'Sun'],
                        rarity: 'common',
                        significance: 'Time for setting intentions and starting new projects'
                    });
                } else if (Math.abs(phase.angle - 180) < 1) {
                    events.push({
                        id: `full-moon-${dateTime.date.toISOString().split('T')[0]}`,
                        type: 'lunar-phase',
                        name: 'Full Moon',
                        description: 'Moon opposite Sun - culmination, illumination, release',
                        date: dateTime,
                        planets: ['Moon', 'Sun'],
                        rarity: 'common',
                        significance: 'Peak energy, revelations, completion of cycles'
                    });
                } else if (Math.abs(phase.angle - 90) < 1) {
                    events.push({
                        id: `first-quarter-${dateTime.date.toISOString().split('T')[0]}`,
                        type: 'lunar-phase',
                        name: 'First Quarter Moon',
                        description: 'Moon square Sun - action, decision-making',
                        date: dateTime,
                        planets: ['Moon', 'Sun'],
                        rarity: 'common',
                        significance: 'Time to take action and overcome obstacles'
                    });
                } else if (Math.abs(phase.angle - 270) < 1) {
                    events.push({
                        id: `last-quarter-${dateTime.date.toISOString().split('T')[0]}`,
                        type: 'lunar-phase',
                        name: 'Last Quarter Moon',
                        description: 'Moon square Sun - release, letting go',
                        date: dateTime,
                        planets: ['Moon', 'Sun'],
                        rarity: 'common',
                        significance: 'Time to release what no longer serves'
                    });
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return events;
    }

    /**
     * Detect planetary alignments (3+ planets within 30°)
     */
    private async detectPlanetaryAlignments(
        startDate: DateTime,
        endDate: DateTime,
        cache: Map<string, any> = new Map()
    ): Promise<CelestialEvent[]> {
        const rawDetections: { date: DateTime; planets: any[]; arc: number }[] = [];
        const currentDate = new Date(startDate.date);
        const end = new Date(endDate.date);

        // Sample every 2 days for precision
        while (currentDate <= end) {
            const dateTime: DateTime = {
                date: new Date(currentDate),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const key = currentDate.toISOString().split('T')[0];
            const planets = cache.get(key) ?? await this.ephemeris.getPlanetsPositions(dateTime);
            const majorPlanets = planets.planets.filter(p =>
                ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(p.name)
            );

            const alignmentArc = 30;
            for (let i = 0; i < majorPlanets.length - 2; i++) {
                const cluster = [majorPlanets[i]];
                let maxDist = 0;

                for (let j = i + 1; j < majorPlanets.length; j++) {
                    const distance = this.angularDistance(
                        majorPlanets[i].longitude,
                        majorPlanets[j].longitude
                    );

                    if (distance <= alignmentArc) {
                        cluster.push(majorPlanets[j]);
                        maxDist = Math.max(maxDist, distance);
                    }
                }

                if (cluster.length >= 3) {
                    rawDetections.push({ date: dateTime, planets: cluster, arc: maxDist });
                    i += cluster.length - 1;
                    break;
                }
            }
            currentDate.setDate(currentDate.getDate() + 2);
        }

        // Group RAW detections into sessions (contiguous periods)
        const finalEvents: CelestialEvent[] = [];
        let currentSession: typeof rawDetections = [];

        for (let i = 0; i < rawDetections.length; i++) {
            const det = rawDetections[i];

            if (currentSession.length === 0) {
                currentSession.push(det);
                continue;
            }

            const prevDet = currentSession[currentSession.length - 1];
            const daysDiff = (det.date.date.getTime() - prevDet.date.date.getTime()) / (1000 * 3600 * 24);

            // Compare planets in current session vs new detection
            const samePlanets = det.planets.length === prevDet.planets.length &&
                det.planets.every(p => prevDet.planets.some(prevP => prevP.name === p.name));

            if (daysDiff <= 4 && samePlanets) {
                currentSession.push(det);
            } else {
                finalEvents.push(this.processAlignmentSession(currentSession));
                currentSession = [det];
            }
        }

        if (currentSession.length > 0) {
            finalEvents.push(this.processAlignmentSession(currentSession));
        }

        return finalEvents;
    }

    /**
     * Process a session of alignment detections and create a single representative event
     */
    private processAlignmentSession(session: { date: DateTime; planets: any[]; arc: number }[]): CelestialEvent {
        // Find peak day (day with the tightest grouping/smallest arc)
        const peak = session.reduce((min, current) => current.arc < min.arc ? current : min, session[0]);

        const planetNames = peak.planets.map(p => p.name);
        const startDate = session[0].date.date;
        const endDate = session[session.length - 1].date.date;
        const durationDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;

        return {
            id: `alignment-peak-${peak.date.date.toISOString().split('T')[0]}-${planetNames.join('-')}`,
            type: 'planetary-alignment',
            name: `${peak.planets.length}-Planet Alignment (Peak)`,
            description: `A grouping of ${planetNames.join(', ')} within a tight ${peak.arc.toFixed(1)}° arc.`,
            date: peak.date,
            planets: planetNames,
            rarity: peak.planets.length >= 5 ? 'very-rare' : peak.planets.length >= 4 ? 'rare' : 'moderate',
            significance: `This long-term planetary alignment reaches its peak today. It creates a major concentration of cosmic power, focusing the combined energies of ${planetNames.join(', ')}. Perfect for intensive focused activity.`,
            durationDays,
            isPeak: true,
            eventRange: {
                start: startDate,
                end: endDate
            }
        };
    }

    /**
     * Detect retrograde periods and stations
     */
    private async detectRetrogrades(
        startDate: DateTime,
        endDate: DateTime,
        cache: Map<string, any> = new Map()
    ): Promise<CelestialEvent[]> {
        const events: CelestialEvent[] = [];
        const currentDate = new Date(startDate.date);
        const end = new Date(endDate.date);

        const retrogradeablePlanets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        const previousStates = new Map<string, boolean>();

        // Check every day for retrograde changes
        while (currentDate <= end) {
            const dateTime: DateTime = {
                date: new Date(currentDate),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const key = currentDate.toISOString().split('T')[0];
            const planets = cache.get(key) ?? await this.ephemeris.getPlanetsPositions(dateTime);

            for (const planetName of retrogradeablePlanets) {
                const planet = planets.planets.find((p: any) => p.name ===planetName);
                if (!planet) continue;

                const wasRetrograde = previousStates.get(planetName);
                const isRetrograde = planet.isRetrograde;

                // Detect station (change in retrograde status)
                if (wasRetrograde !== undefined && wasRetrograde !== isRetrograde) {
                    if (isRetrograde) {
                        // Station Retrograde
                        events.push({
                            id: `${planetName.toLowerCase()}-rx-${dateTime.date.toISOString().split('T')[0]}`,
                            type: 'retrograde-start',
                            name: `${planetName} Retrograde`,
                            description: `${planetName} stations retrograde - time for review and reflection`,
                            date: dateTime,
                            planets: [planetName],
                            rarity: planetName === 'Mercury' ? 'common' : 'moderate',
                            significance: `Review, revise, and reconsider matters related to ${planetName}`
                        });
                    } else {
                        // Station Direct
                        events.push({
                            id: `${planetName.toLowerCase()}-direct-${dateTime.date.toISOString().split('T')[0]}`,
                            type: 'retrograde-end',
                            name: `${planetName} Direct`,
                            description: `${planetName} stations direct - forward momentum resumes`,
                            date: dateTime,
                            planets: [planetName],
                            rarity: planetName === 'Mercury' ? 'common' : 'moderate',
                            significance: `Move forward with clarity on ${planetName} themes`
                        });
                    }
                }

                previousStates.set(planetName, isRetrograde);
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return events;
    }

    /**
     * Detect sign ingresses (planet entering new zodiac sign)
     */
    private async detectIngresses(
        startDate: DateTime,
        endDate: DateTime,
        cache: Map<string, any> = new Map()
    ): Promise<CelestialEvent[]> {
        const events: CelestialEvent[] = [];
        const currentDate = new Date(startDate.date);
        const end = new Date(endDate.date);

        const trackedPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
        const previousSigns = new Map<string, string>();

        // Check every day for sign changes
        while (currentDate <= end) {
            const dateTime: DateTime = {
                date: new Date(currentDate),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const key = currentDate.toISOString().split('T')[0];
            const planets = cache.get(key) ?? await this.ephemeris.getPlanetsPositions(dateTime);

            for (const planetName of trackedPlanets) {
                const planet = planets.planets.find((p: any) => p.name ===planetName);
                if (!planet) continue;

                const currentSign = planet.zodiacSign;
                const previousSign = previousSigns.get(planetName);

                // Detect ingress (sign change)
                if (previousSign && previousSign !== currentSign) {
                    events.push({
                        id: `${planetName.toLowerCase()}-ingress-${currentSign.toLowerCase()}-${dateTime.date.toISOString().split('T')[0]}`,
                        type: 'ingress',
                        name: `${planetName} enters ${currentSign}`,
                        description: `${planetName} moves into ${currentSign}`,
                        date: dateTime,
                        planets: [planetName],
                        rarity: planetName === 'Moon' ? 'common' : planetName === 'Sun' ? 'common' : 'moderate',
                        significance: `New ${planetName} energy in ${currentSign}`
                    });
                }

                previousSigns.set(planetName, currentSign);
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return events;
    }

    /**
     * Detect eclipses (solar and lunar)
     */
    private async detectEclipses(
        startDate: DateTime,
        endDate: DateTime,
        cache: Map<string, any> = new Map()
    ): Promise<CelestialEvent[]> {
        const events: CelestialEvent[] = [];
        const currentDate = new Date(startDate.date);
        const end = new Date(endDate.date);

        // Check every day for eclipse conditions
        while (currentDate <= end) {
            const dateTime: DateTime = {
                date: new Date(currentDate),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const key = currentDate.toISOString().split('T')[0];
            const planets = cache.get(key) ?? await this.ephemeris.getPlanetsPositions(dateTime);
            const sun = planets.planets.find((p: any) => p.name ==='Sun');
            const moon = planets.planets.find((p: any) => p.name ==='Moon');

            if (sun && moon) {
                const phase = this.calculateLunarPhase(sun.longitude, moon.longitude);
                const angularDistance = this.angularDistance(sun.longitude, moon.longitude);

                // Solar Eclipse: New Moon + Sun-Moon close alignment
                // Solar Eclipse: New Moon day + Sun-Moon close alignment
                if (Math.abs(phase.angle) < 1.0) { // Must be New Moon day
                    // Check if Moon is near ecliptic (low latitude)
                    if (Math.abs(moon.latitude) < 1.5) {
                        // Determine eclipse type based on Moon's distance
                        const moonDistance = moon.distanceAU * 149597870.7; // Convert AU to km
                        const avgMoonDistance = 384400; // km

                        let eclipseType: 'total' | 'annular' | 'partial';
                        let eclipseName: string;
                        let rarity: 'common' | 'moderate' | 'rare' | 'very-rare';

                        if (angularDistance < 0.5) {
                            if (moonDistance < avgMoonDistance * 0.95) {
                                eclipseType = 'total';
                                eclipseName = 'Total Solar Eclipse';
                                rarity = 'very-rare';
                            } else {
                                eclipseType = 'annular';
                                eclipseName = 'Annular Solar Eclipse';
                                rarity = 'rare';
                            }
                        } else {
                            eclipseType = 'partial';
                            eclipseName = 'Partial Solar Eclipse';
                            rarity = 'moderate';
                        }

                        events.push({
                            id: `solar-eclipse-${eclipseType}-${dateTime.date.toISOString().split('T')[0]}`,
                            type: 'solar-eclipse',
                            name: eclipseName,
                            description: `${eclipseName} - Moon passes between Earth and Sun`,
                            date: dateTime,
                            planets: ['Sun', 'Moon'],
                            rarity,
                            visibility: 'visible',
                            significance: `Powerful new beginning energy, shadow work, transformation`
                        });
                    }
                }

                // Lunar Eclipse: Full Moon + Sun-Moon-Earth alignment
                // Lunar Eclipse: Full Moon day + Sun-Moon-Earth alignment
                if (Math.abs(phase.angle - 180) < 1.0) { // Must be Full Moon day
                    // Check if Moon is near ecliptic
                    if (Math.abs(moon.latitude) < 1.5) {
                        let eclipseType: 'total' | 'partial' | 'penumbral';
                        let eclipseName: string;
                        let rarity: 'common' | 'moderate' | 'rare' | 'very-rare';

                        // Determine eclipse type based on alignment precision
                        if (Math.abs(moon.latitude) < 0.5) {
                            eclipseType = 'total';
                            eclipseName = 'Total Lunar Eclipse';
                            rarity = 'rare';
                        } else if (Math.abs(moon.latitude) < 1.0) {
                            eclipseType = 'partial';
                            eclipseName = 'Partial Lunar Eclipse';
                            rarity = 'moderate';
                        } else {
                            eclipseType = 'penumbral';
                            eclipseName = 'Penumbral Lunar Eclipse';
                            rarity = 'common';
                        }

                        events.push({
                            id: `lunar-eclipse-${eclipseType}-${dateTime.date.toISOString().split('T')[0]}`,
                            type: 'lunar-eclipse',
                            name: eclipseName,
                            description: `${eclipseName} - Earth's shadow falls on the Moon`,
                            date: dateTime,
                            planets: ['Moon', 'Sun'],
                            rarity,
                            visibility: 'visible',
                            significance: `Emotional culmination, release, revelation of hidden truths`
                        });
                    }
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return events;
    }

    /**
     * Detect occultations (Moon or planet blocking another celestial body)
     */
    private async detectOccultations(
        startDate: DateTime,
        endDate: DateTime,
        cache: Map<string, any> = new Map()
    ): Promise<CelestialEvent[]> {
        const events: CelestialEvent[] = [];
        const currentDate = new Date(startDate.date);
        const end = new Date(endDate.date);

        // Check daily (occultations are rare enough that daily resolution is sufficient)
        while (currentDate <= end) {
            const dateTime: DateTime = {
                date: new Date(currentDate),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const key = currentDate.toISOString().split('T')[0];
            const planets = cache.get(key) ?? await this.ephemeris.getPlanetsPositions(dateTime);
            const moon = planets.planets.find((p: any) => p.name ==='Moon');

            if (moon) {
                // Check Moon-planet occultations
                const innerPlanets = ['Mercury', 'Venus', 'Mars'];

                for (const planetName of innerPlanets) {
                    const planet = planets.planets.find((p: any) => p.name ===planetName);
                    if (!planet) continue;

                    // Calculate angular separation
                    const separation = this.calculateAngularSeparation(
                        moon.longitude,
                        moon.latitude,
                        planet.longitude,
                        planet.latitude
                    );

                    // Moon's apparent radius is ~0.25°
                    // Occultation occurs when separation < Moon radius + planet radius
                    const moonRadius = 0.25;
                    const planetRadius = 0.01; // Approximate for inner planets

                    if (separation < (moonRadius + planetRadius)) {
                        events.push({
                            id: `occultation-moon-${planetName.toLowerCase()}-${dateTime.date.toISOString().split('T')[0]}`,
                            type: 'occultation',
                            name: `Lunar Occultation of ${planetName}`,
                            description: `Moon passes in front of ${planetName}, blocking it from view`,
                            date: dateTime,
                            planets: ['Moon', planetName],
                            rarity: 'rare',
                            visibility: 'visible',
                            significance: `Rare celestial alignment - ${planetName} energy temporarily obscured by lunar influence`
                        });
                    }
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return events;
    }

    /**
     * Helper: Calculate angular separation between two celestial bodies
     */
    private calculateAngularSeparation(
        lon1: number,
        lat1: number,
        lon2: number,
        lat2: number
    ): number {
        // Convert to radians
        const lon1Rad = (lon1 * Math.PI) / 180;
        const lat1Rad = (lat1 * Math.PI) / 180;
        const lon2Rad = (lon2 * Math.PI) / 180;
        const lat2Rad = (lat2 * Math.PI) / 180;

        // Haversine formula for angular separation
        const dLon = lon2Rad - lon1Rad;
        const dLat = lat2Rad - lat1Rad;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        // Convert back to degrees
        return (c * 180) / Math.PI;
    }

    /**
     * Helper: Calculate lunar phase angle
     */
    private calculateLunarPhase(sunLon: number, moonLon: number): { angle: number; phase: string } {
        let angle = moonLon - sunLon;
        if (angle < 0) angle += 360;

        let phase = 'New Moon';
        if (angle >= 45 && angle < 90) phase = 'Waxing Crescent';
        else if (angle >= 90 && angle < 135) phase = 'First Quarter';
        else if (angle >= 135 && angle < 180) phase = 'Waxing Gibbous';
        else if (angle >= 180 && angle < 225) phase = 'Full Moon';
        else if (angle >= 225 && angle < 270) phase = 'Waning Gibbous';
        else if (angle >= 270 && angle < 315) phase = 'Last Quarter';
        else if (angle >= 315) phase = 'Waning Crescent';

        return { angle, phase };
    }

    /**
     * Helper: Calculate angular distance between two longitudes
     */
    private angularDistance(lon1: number, lon2: number): number {
        let diff = Math.abs(lon1 - lon2);
        if (diff > 180) diff = 360 - diff;
        return diff;
    }

    /**
     * Detect Void of Course Moon periods
     */
    private async detectVoidMoons(
        startDate: DateTime,
        endDate: DateTime
    ): Promise<CelestialEvent[]> {
        // Build list of dates to check
        const dates: Date[] = [];
        const cur = new Date(startDate.date);
        const endDay = new Date(endDate.date);
        while (cur <= endDay) {
            dates.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }

        // Fetch all VoC data in parallel batches
        const BATCH = 10;
        const seen = new Set<string>();
        const events: CelestialEvent[] = [];

        for (let i = 0; i < dates.length; i += BATCH) {
            const batch = dates.slice(i, i + BATCH);
            const results = await Promise.all(
                batch.map(date => {
                    const dateTime: DateTime = { date, timezone: 'UTC', location: { latitude: 0, longitude: 0 } };
                    return this.ephemeris.getVoidOfCourseMoon(dateTime).catch(() => null);
                })
            );
            for (const voidData of results) {
                if (!voidData?.isVoidOfCourse || !voidData.voidPeriod) continue;
                const id = `void-moon-${voidData.voidPeriod.startTime}`;
                if (seen.has(id)) continue;
                seen.add(id);
                const start = new Date(voidData.voidPeriod.startTime);
                const eventEnd = new Date(voidData.voidPeriod.endTime);
                const dateTime: DateTime = { date: start, timezone: 'UTC', location: { latitude: 0, longitude: 0 } };
                events.push({
                    id,
                    type: 'void-moon',
                    name: 'Void of Course Moon',
                    description: `Moon is void of course from ${start.toLocaleTimeString()} to ${eventEnd.toLocaleTimeString()}`,
                    date: dateTime,
                    endDate: { ...dateTime, date: eventEnd },
                    planets: ['Moon'],
                    rarity: 'common',
                    significance: 'Traditional period of "nothing comes of it" - avoid important new beginnings',
                    durationDays: voidData.voidPeriod.durationHours / 24,
                    eventRange: { start, end: eventEnd }
                });
            }
        }

        return events;
    }
}
