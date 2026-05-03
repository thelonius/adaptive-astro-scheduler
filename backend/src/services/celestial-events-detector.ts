import type { DateTime, CelestialEvent, CelestialEventType } from '@adaptive-astro/shared/types';
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

    /**
     * Get all celestial events in a date range
     */
    async getAllEvents(
        startDate: DateTime,
        endDate: DateTime
    ): Promise<CelestialEvent[]> {
        const events: CelestialEvent[] = [];

        // Detect all event types
        const [
            lunarPhases,
            eclipses,
            occultations,
            alignments,
            retrogrades,
            ingresses,
            voidMoons,
            generalAspects
        ] = await Promise.all([
            this.detectLunarPhases(startDate, endDate),
            this.detectEclipses(startDate, endDate),
            this.detectOccultations(startDate, endDate),
            this.detectPlanetaryAlignments(startDate, endDate),
            this.detectRetrogrades(startDate, endDate),
            this.detectIngresses(startDate, endDate),
            this.detectVoidMoons(startDate, endDate),
            this.detectGeneralAspects(startDate, endDate)
        ]);

        events.push(...lunarPhases);
        events.push(...eclipses);
        events.push(...occultations);
        events.push(...alignments);
        events.push(...retrogrades);
        events.push(...ingresses);
        events.push(...voidMoons);
        events.push(...generalAspects);

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
        endDate: DateTime
    ): Promise<CelestialEvent[]> {
        const dates: Date[] = [];
        const curr = new Date(startDate.date);
        const end = new Date(endDate.date);
        
        while (curr <= end) {
            dates.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }

        const CHUNK_SIZE = 20;
        const results: CelestialEvent[][] = [];
        
        for (let i = 0; i < dates.length; i += CHUNK_SIZE) {
            const chunk = dates.slice(i, i + CHUNK_SIZE);
            const chunkResults = await Promise.all(chunk.map(async (date) => {
                const dayEvents: CelestialEvent[] = [];
                const dateTime: DateTime = {
                    date,
                    timezone: 'UTC',
                    location: { latitude: 0, longitude: 0 }
                };

                const planets = await this.ephemeris.getPlanetsPositions(dateTime);
                const sun = planets.planets.find(p => p.name === 'Sun');
                const moon = planets.planets.find(p => p.name === 'Moon');

                if (sun && moon) {
                    const phase = this.calculateLunarPhase(sun.longitude, moon.longitude);
                    const dateStr = date.toISOString().split('T')[0];

                    if (Math.abs(phase.angle) < 1) {
                        dayEvents.push({
                            id: `new-moon-${dateStr}`,
                            type: 'lunar-phase',
                            name: 'New Moon',
                            description: 'Moon and Sun conjunct - new beginnings, fresh starts',
                            date: dateTime,
                            planets: ['Moon', 'Sun'],
                            rarity: 'common',
                            significance: 'Time for setting intentions and starting new projects'
                        });
                    } else if (Math.abs(phase.angle - 180) < 1) {
                        dayEvents.push({
                            id: `full-moon-${dateStr}`,
                            type: 'lunar-phase',
                            name: 'Full Moon',
                            description: 'Moon opposite Sun - culmination, illumination, release',
                            date: dateTime,
                            planets: ['Moon', 'Sun'],
                            rarity: 'common',
                            significance: 'Peak energy, revelations, completion of cycles'
                        });
                    } else if (Math.abs(phase.angle - 90) < 1) {
                        dayEvents.push({
                            id: `first-quarter-${dateStr}`,
                            type: 'lunar-phase',
                            name: 'First Quarter Moon',
                            description: 'Moon square Sun - action, decision-making',
                            date: dateTime,
                            planets: ['Moon', 'Sun'],
                            rarity: 'common',
                            significance: 'Time to take action and overcome obstacles'
                        });
                    } else if (Math.abs(phase.angle - 270) < 1) {
                        dayEvents.push({
                            id: `last-quarter-${dateStr}`,
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
                return dayEvents;
            }));
            results.push(...chunkResults);
        }

        return results.flat();
    }

    /**
     * Detect planetary alignments (3+ planets within 30°)
     */
    private async detectPlanetaryAlignments(
        startDate: DateTime,
        endDate: DateTime
    ): Promise<CelestialEvent[]> {
        const rawDetections: { date: DateTime; planets: any[]; arc: number }[] = [];
        const dates: Date[] = [];
        const curr = new Date(startDate.date);
        const end = new Date(endDate.date);

        // Sample every 2 days for precision vs speed
        while (curr <= end) {
            dates.push(new Date(curr));
            curr.setDate(curr.getDate() + 2);
        }

        const CHUNK_SIZE = 20;
        for (let i = 0; i < dates.length; i += CHUNK_SIZE) {
            const chunk = dates.slice(i, i + CHUNK_SIZE);
            const chunkResults = await Promise.all(chunk.map(async (date) => {
                const dateTime: DateTime = {
                    date,
                    timezone: 'UTC',
                    location: { latitude: 0, longitude: 0 }
                };

                const planets = await this.ephemeris.getPlanetsPositions(dateTime);
                const majorPlanets = planets.planets.filter(p =>
                    ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(p.name)
                );

                const alignmentArc = 30;
                for (let k = 0; k < majorPlanets.length - 2; k++) {
                    const cluster = [majorPlanets[k]];
                    let maxDist = 0;

                    for (let j = k + 1; j < majorPlanets.length; j++) {
                        const distance = this.angularDistance(
                            majorPlanets[k].longitude,
                            majorPlanets[j].longitude
                        );

                        if (distance <= alignmentArc) {
                            cluster.push(majorPlanets[j]);
                            maxDist = Math.max(maxDist, distance);
                        }
                    }

                    if (cluster.length >= 3) {
                        return { date: dateTime, planets: cluster, arc: maxDist };
                    }
                }
                return null;
            }));

            rawDetections.push(...chunkResults.filter((r): r is { date: DateTime; planets: any[]; arc: number } => r !== null));
        }

        // Group RAW detections into sessions
        const finalEvents: CelestialEvent[] = [];
        let currentSession: typeof rawDetections = [];

        for (const det of rawDetections) {
            if (currentSession.length === 0) {
                currentSession.push(det);
                continue;
            }

            const prevDet = currentSession[currentSession.length - 1];
            const daysDiff = (det.date.date.getTime() - prevDet.date.date.getTime()) / (1000 * 3600 * 24);
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
        endDate: DateTime
    ): Promise<CelestialEvent[]> {
        const events: CelestialEvent[] = [];
        const retrogradeablePlanets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        const previousStates = new Map<string, boolean>();

        const dates: Date[] = [];
        const curr = new Date(startDate.date);
        const end = new Date(endDate.date);
        while (curr <= end) {
            dates.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }

        // 1. Pre-fetch positions in parallel
        const CHUNK_SIZE = 30;
        for (let i = 0; i < dates.length; i += CHUNK_SIZE) {
            const chunk = dates.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(date => 
                this.ephemeris.getPlanetsPositions({ 
                    date, timezone: 'UTC', location: { latitude: 0, longitude: 0 } 
                })
            ));
        }

        // 2. Process sequentially
        for (const date of dates) {
            const dateTime: DateTime = {
                date,
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const planets = await this.ephemeris.getPlanetsPositions(dateTime);

            for (const planetName of retrogradeablePlanets) {
                const planet = planets.planets.find(p => p.name === planetName);
                if (!planet) continue;

                const wasRetrograde = previousStates.get(planetName);
                const isRetrograde = planet.isRetrograde;

                if (wasRetrograde !== undefined && wasRetrograde !== isRetrograde) {
                    const dateStr = date.toISOString().split('T')[0];
                    if (isRetrograde) {
                        events.push({
                            id: `${planetName.toLowerCase()}-rx-${dateStr}`,
                            type: 'retrograde-start',
                            name: `${planetName} Retrograde`,
                            description: `${planetName} stations retrograde - time for review and reflection`,
                            date: dateTime,
                            planets: [planetName],
                            rarity: planetName === 'Mercury' ? 'common' : 'moderate',
                            significance: `Review, revise, and reconsider matters related to ${planetName}`
                        });
                    } else {
                        events.push({
                            id: `${planetName.toLowerCase()}-direct-${dateStr}`,
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
        }

        return events;
    }

    /**
     * Detect sign ingresses (planet entering new zodiac sign)
     */
    private async detectIngresses(
        startDate: DateTime,
        endDate: DateTime
    ): Promise<CelestialEvent[]> {
        const events: CelestialEvent[] = [];
        const trackedPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
        const previousSigns = new Map<string, string>();

        const dates: Date[] = [];
        const curr = new Date(startDate.date);
        const end = new Date(endDate.date);
        while (curr <= end) {
            dates.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }

        // 1. Pre-fetch positions in parallel to populate the shared cache
        const CHUNK_SIZE = 30;
        for (let i = 0; i < dates.length; i += CHUNK_SIZE) {
            const chunk = dates.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(date => 
                this.ephemeris.getPlanetsPositions({ 
                    date, timezone: 'UTC', location: { latitude: 0, longitude: 0 } 
                })
            ));
        }

        // 2. Process sequentially (now instant due to cache)
        for (const date of dates) {
            const dateTime: DateTime = {
                date,
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const planets = await this.ephemeris.getPlanetsPositions(dateTime);

            for (const planetName of trackedPlanets) {
                const planet = planets.planets.find(p => p.name === planetName);
                if (!planet) continue;

                const currentSign = planet.zodiacSign;
                const previousSign = previousSigns.get(planetName);

                if (previousSign && previousSign !== currentSign) {
                    events.push({
                        id: `${planetName.toLowerCase()}-ingress-${currentSign.toLowerCase()}-${date.toISOString().split('T')[0]}`,
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
        }

        return events;
    }

    /**
     * Detect eclipses (solar and lunar)
     */
    private async detectEclipses(
        startDate: DateTime,
        endDate: DateTime
    ): Promise<CelestialEvent[]> {
        const dates: Date[] = [];
        const curr = new Date(startDate.date);
        const end = new Date(endDate.date);
        while (curr <= end) {
            dates.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }

        const CHUNK_SIZE = 20;
        const results: CelestialEvent[][] = [];
        for (let i = 0; i < dates.length; i += CHUNK_SIZE) {
            const chunk = dates.slice(i, i + CHUNK_SIZE);
            const chunkResults = await Promise.all(chunk.map(async (date) => {
                const dayEvents: CelestialEvent[] = [];
                const dateTime: DateTime = {
                    date,
                    timezone: 'UTC',
                    location: { latitude: 0, longitude: 0 }
                };

                const planets = await this.ephemeris.getPlanetsPositions(dateTime);
                const sun = planets.planets.find(p => p.name === 'Sun');
                const moon = planets.planets.find(p => p.name === 'Moon');

                if (sun && moon) {
                    const phase = this.calculateLunarPhase(sun.longitude, moon.longitude);
                    const angularDist = this.angularDistance(sun.longitude, moon.longitude);
                    const dateStr = date.toISOString().split('T')[0];

                    if (Math.abs(phase.angle) < 1.0) { // New Moon
                        if (Math.abs(moon.latitude) < 1.5) {
                            const moonDistance = moon.distanceAU * 149597870.7;
                            const avgMoonDistance = 384400;

                            let eclipseType: 'total' | 'annular' | 'partial';
                            let eclipseName: string;
                            let rarity: 'common' | 'moderate' | 'rare' | 'very-rare';

                            if (angularDist < 0.5) {
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

                            dayEvents.push({
                                id: `solar-eclipse-${eclipseType}-${dateStr}`,
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

                    if (Math.abs(phase.angle - 180) < 1.0) { // Full Moon
                        if (Math.abs(moon.latitude) < 1.5) {
                            let eclipseType: 'total' | 'partial' | 'penumbral';
                            let eclipseName: string;
                            let rarity: 'common' | 'moderate' | 'rare' | 'very-rare';

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

                            dayEvents.push({
                                id: `lunar-eclipse-${eclipseType}-${dateStr}`,
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
                return dayEvents;
            }));
            results.push(...chunkResults);
        }

        return results.flat();
    }

    /**
     * Detect occultations (Moon or planet blocking another celestial body)
     */
    private async detectOccultations(
        startDate: DateTime,
        endDate: DateTime
    ): Promise<CelestialEvent[]> {
        const dates: Date[] = [];
        const curr = new Date(startDate.date);
        const end = new Date(endDate.date);
        
        // Sample every 6 hours
        while (curr <= end) {
            dates.push(new Date(curr));
            curr.setHours(curr.getHours() + 6);
        }

        const CHUNK_SIZE = 40;
        const results: CelestialEvent[][] = [];
        for (let i = 0; i < dates.length; i += CHUNK_SIZE) {
            const chunk = dates.slice(i, i + CHUNK_SIZE);
            const chunkResults = await Promise.all(chunk.map(async (date) => {
                const dayEvents: CelestialEvent[] = [];
                const dateTime: DateTime = {
                    date,
                    timezone: 'UTC',
                    location: { latitude: 0, longitude: 0 }
                };

                const planets = await this.ephemeris.getPlanetsPositions(dateTime);
                const moon = planets.planets.find(p => p.name === 'Moon');

                if (moon) {
                    const innerPlanets = ['Mercury', 'Venus', 'Mars'];
                    for (const planetName of innerPlanets) {
                        const planet = planets.planets.find(p => p.name === planetName);
                        if (!planet) continue;

                        const separation = this.calculateAngularSeparation(
                            moon.longitude,
                            moon.latitude,
                            planet.longitude,
                            planet.latitude
                        );

                        const moonRadius = 0.25;
                        const planetRadius = 0.01;

                        if (separation < (moonRadius + planetRadius)) {
                            dayEvents.push({
                                id: `occultation-moon-${planetName.toLowerCase()}-${date.toISOString().split('T')[0]}`,
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
                return dayEvents;
            }));
            results.push(...chunkResults);
        }

        return results.flat();
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
        const events: CelestialEvent[] = [];
        let currentDate = new Date(startDate.date);
        const endDay = new Date(endDate.date);

        // Check every day - if void of course is active, fetch the window
        while (currentDate <= endDay) {
            const dateTime: DateTime = {
                date: new Date(currentDate),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            try {
                const voidData = await this.ephemeris.getVoidOfCourseMoon(dateTime);
                if (voidData.isVoidOfCourse && voidData.voidPeriod) {
                    const start = new Date(voidData.voidPeriod.startTime);
                    const eventEnd = new Date(voidData.voidPeriod.endTime);
                    
                    events.push({
                        id: `void-moon-${voidData.voidPeriod.startTime}`,
                        type: 'void-moon',
                        name: 'Void of Course Moon',
                        description: `Moon is void of course from ${start.toLocaleTimeString()} to ${eventEnd.toLocaleTimeString()}`,
                        date: { ...dateTime, date: start },
                        endDate: { ...dateTime, date: eventEnd },
                        planets: ['Moon'],
                        rarity: 'common',
                        significance: 'Traditional period of "nothing comes of it" - avoid important new beginnings',
                        durationDays: voidData.voidPeriod.durationHours / 24,
                        eventRange: {
                            start,
                            end: eventEnd
                        }
                    });
                    
                    // Jump past the end of this void period to avoid redundant detections
                    currentDate = new Date(eventEnd.getTime() + 1000 * 3600); // 1 hour buffer
                } else {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            } catch (error) {
                console.error('Failed to detect void moons for date:', currentDate, error);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        return events;
    }
    /**
     * Detect general planetary aspects (Sun, Moon, Mercury, etc.)
     */
    private async detectGeneralAspects(
        startDate: DateTime,
        endDate: DateTime
    ): Promise<CelestialEvent[]> {
        const peaks = new Map<string, { event: CelestialEvent; minOrb: number }>();
        const dates: Date[] = [];
        const curr = new Date(startDate.date);
        const end = new Date(endDate.date);

        // Track peaks using 12h resolution
        while (curr <= end) {
            dates.push(new Date(curr));
            curr.setHours(curr.getHours() + 12);
        }

        const CHUNK_SIZE = 20;
        for (let i = 0; i < dates.length; i += CHUNK_SIZE) {
            const chunk = dates.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(async (date) => {
                const dateTime: DateTime = {
                    date,
                    timezone: 'UTC',
                    location: { latitude: 0, longitude: 0 }
                };

                const aspectsData = await this.ephemeris.getAspects(dateTime, 5);
                
                for (const aspect of aspectsData.aspects) {
                    const aspectType = aspect.type || aspect.aspect_type;
                    if (!aspectType) continue;

                    if (!['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(aspectType)) {
                        continue;
                    }

                    const isMoon = aspect.planet1 === 'Moon' || aspect.planet2 === 'Moon';
                    const dateKey = isMoon 
                        ? date.toISOString().split('T')[0] 
                        : Math.floor(date.getTime() / (1000 * 3600 * 72)).toString();

                    const key = `${aspect.planet1}-${aspect.planet2}-${aspectType}-${dateKey}`;
                    const existing = peaks.get(key);
                    
                    if (!existing || aspect.orb < existing.minOrb) {
                        const rarity = this.getAspectRarity(aspect.planet1, aspect.planet2);
                        peaks.set(key, {
                            minOrb: aspect.orb,
                            event: {
                                id: `aspect-${aspect.planet1}-${aspect.planet2}-${aspectType}-${date.toISOString().split('T')[0]}`,
                                type: aspectType as any,
                                name: `${aspect.planet1} ${aspectType} ${aspect.planet2}`,
                                description: `${aspect.planet1} forms a ${aspectType} aspect with ${aspect.planet2}`,
                                date: dateTime,
                                planets: [aspect.planet1, aspect.planet2],
                                rarity,
                                significance: `Exact peak of ${aspect.planet1} ${aspectType} ${aspect.planet2}.`
                            }
                        });
                    }
                }
            }));
        }

        return Array.from(peaks.values()).map(p => p.event);
    }

    /**
     * Helper: Get aspect rarity based on involved planets
     */
    private getAspectRarity(p1: string, p2: string): 'common' | 'moderate' | 'rare' | 'very-rare' {
        const outerPlanets = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        const isP1Outer = outerPlanets.includes(p1);
        const isP2Outer = outerPlanets.includes(p2);

        if (isP1Outer && isP2Outer) return 'rare';
        if (isP1Outer || isP2Outer) return 'moderate';
        return 'common';
    }
}
