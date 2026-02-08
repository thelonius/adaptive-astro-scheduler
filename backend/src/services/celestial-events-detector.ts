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
            ingresses
        ] = await Promise.all([
            this.detectLunarPhases(startDate, endDate),
            this.detectEclipses(startDate, endDate),
            this.detectOccultations(startDate, endDate),
            this.detectPlanetaryAlignments(startDate, endDate),
            this.detectRetrogrades(startDate, endDate),
            this.detectIngresses(startDate, endDate)
        ]);

        events.push(...lunarPhases);
        events.push(...eclipses);
        events.push(...occultations);
        events.push(...alignments);
        events.push(...retrogrades);
        events.push(...ingresses);

        // Sort by date
        return events.sort((a, b) =>
            a.date.date.getTime() - b.date.date.getTime()
        );
    }

    /**
     * Detect lunar phases in date range
     */
    private async detectLunarPhases(
        startDate: DateTime,
        endDate: DateTime
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

            const planets = await this.ephemeris.getPlanetsPositions(dateTime);
            const sun = planets.planets.find(p => p.name === 'Sun');
            const moon = planets.planets.find(p => p.name === 'Moon');

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
        endDate: DateTime
    ): Promise<CelestialEvent[]> {
        const events: CelestialEvent[] = [];
        const currentDate = new Date(startDate.date);
        const end = new Date(endDate.date);

        // Check every 7 days (alignments are slow-moving)
        while (currentDate <= end) {
            const dateTime: DateTime = {
                date: new Date(currentDate),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const planets = await this.ephemeris.getPlanetsPositions(dateTime);
            const majorPlanets = planets.planets.filter(p =>
                ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(p.name)
            );

            // Check for alignments (planets within 30° arc)
            const alignmentArc = 30;
            for (let i = 0; i < majorPlanets.length - 2; i++) {
                const cluster = [majorPlanets[i]];

                for (let j = i + 1; j < majorPlanets.length; j++) {
                    const distance = this.angularDistance(
                        majorPlanets[i].longitude,
                        majorPlanets[j].longitude
                    );

                    if (distance <= alignmentArc) {
                        cluster.push(majorPlanets[j]);
                    }
                }

                if (cluster.length >= 3) {
                    const planetNames = cluster.map(p => p.name);
                    events.push({
                        id: `alignment-${dateTime.date.toISOString().split('T')[0]}-${planetNames.join('-')}`,
                        type: 'planetary-alignment',
                        name: `${cluster.length}-Planet Alignment`,
                        description: `${planetNames.join(', ')} aligned within ${alignmentArc}°`,
                        date: dateTime,
                        planets: planetNames,
                        rarity: cluster.length >= 5 ? 'very-rare' : cluster.length >= 4 ? 'rare' : 'moderate',
                        significance: `Concentrated planetary energy - major cosmic event affecting ${planetNames.join(', ')}`
                    });

                    // Skip planets in this cluster
                    i += cluster.length - 1;
                    break;
                }
            }

            currentDate.setDate(currentDate.getDate() + 7);
        }

        return events;
    }

    /**
     * Detect retrograde periods and stations
     */
    private async detectRetrogrades(
        startDate: DateTime,
        endDate: DateTime
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

            const planets = await this.ephemeris.getPlanetsPositions(dateTime);

            for (const planetName of retrogradeablePlanets) {
                const planet = planets.planets.find(p => p.name === planetName);
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
        endDate: DateTime
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

            const planets = await this.ephemeris.getPlanetsPositions(dateTime);

            for (const planetName of trackedPlanets) {
                const planet = planets.planets.find(p => p.name === planetName);
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
        endDate: DateTime
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

            const planets = await this.ephemeris.getPlanetsPositions(dateTime);
            const sun = planets.planets.find(p => p.name === 'Sun');
            const moon = planets.planets.find(p => p.name === 'Moon');

            if (sun && moon) {
                const phase = this.calculateLunarPhase(sun.longitude, moon.longitude);
                const angularDistance = this.angularDistance(sun.longitude, moon.longitude);

                // Solar Eclipse: New Moon + Sun-Moon close alignment
                if (Math.abs(phase.angle) < 15) { // Within 15° of New Moon
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
                if (Math.abs(phase.angle - 180) < 15) { // Within 15° of Full Moon
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
        endDate: DateTime
    ): Promise<CelestialEvent[]> {
        const events: CelestialEvent[] = [];
        const currentDate = new Date(startDate.date);
        const end = new Date(endDate.date);

        // Check every 6 hours (occultations are brief events)
        while (currentDate <= end) {
            const dateTime: DateTime = {
                date: new Date(currentDate),
                timezone: 'UTC',
                location: { latitude: 0, longitude: 0 }
            };

            const planets = await this.ephemeris.getPlanetsPositions(dateTime);
            const moon = planets.planets.find(p => p.name === 'Moon');

            if (moon) {
                // Check Moon-planet occultations
                const innerPlanets = ['Mercury', 'Venus', 'Mars'];

                for (const planetName of innerPlanets) {
                    const planet = planets.planets.find(p => p.name === planetName);
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

            // Advance by 6 hours
            currentDate.setHours(currentDate.getHours() + 6);
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
}
