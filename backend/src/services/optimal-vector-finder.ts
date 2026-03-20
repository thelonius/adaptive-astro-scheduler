import { NatalChart, DateTime, House } from '@adaptive-astro/shared/types';
import { IEphemerisCalculator } from '../core/ephemeris/interface';
import { TravelAnalyzer, LocationScore } from './travel-analyzer';
import tzlookup from 'tz-lookup';

export interface VectorNode {
    latitude: number;
    longitude: number;
    score: number;
    pros: string[];
    warnings: string[];
    primaryAspect: 'Career' | 'Relationships' | 'Stability' | 'Fortune' | 'Misc';
}

export interface OptimalZonesResult {
    highestScoreZones: VectorNode[];
    recommendations: {
        career: VectorNode | null;
        personal: VectorNode | null;
        wealth: VectorNode | null;
    };
}

export class OptimalVectorFinder {
    constructor(
        private ephemeris: IEphemerisCalculator,
        private travelAnalyzer: TravelAnalyzer
    ) { }

    /**
     * Scans the world map in a grid to find nodes with high astrological scores
     */
    async findOptimalZones(natalChart: NatalChart): Promise<OptimalZonesResult> {
        const nodes: VectorNode[] = [];

        // Denser scan for full globe coverage
        // Latitude -60 to 80 (skipping extreme pole)
        const latSteps = Array.from({ length: 15 }, (_, i) => -60 + i * 10);
        // Longitude -180 to 180 (steps of 10 degrees) 
        const lonSteps = Array.from({ length: 36 }, (_, i) => -180 + i * 10);

        for (const lat of latSteps) {
            for (const lon of lonSteps) {
                try {
                    const timezone = tzlookup(lat, lon);
                    const relocationDateTime: DateTime = {
                        date: natalChart.birthDateTime.date,
                        timezone: timezone,
                        location: { latitude: lat, longitude: lon }
                    };

                    const apiHouses = await this.ephemeris.getHouses(relocationDateTime);

                    const relocatedHouses: { [key: number]: House } = {};
                    apiHouses.houses.forEach((h: any) => {
                        relocatedHouses[h.number] = {
                            number: h.number,
                            cusp: h.cusp,
                            sign: { name: h.zodiacSign } as any
                        };
                    });

                    const locationScore = this.travelAnalyzer.analyzeStaticLocation({
                        originalChart: natalChart,
                        relocatedHouses,
                        location: { city: `Zone ${lat},${lon}`, latitude: lat, longitude: lon, timezone, country: 'Scan' }
                    });

                    // Keep nodes with some significance (>40) to build a decent heatmap
                    if (locationScore.score > 40) {
                        nodes.push({
                            latitude: lat,
                            longitude: lon,
                            score: locationScore.score,
                            pros: locationScore.pros,
                            warnings: locationScore.warnings,
                            primaryAspect: this.determinePrimaryAspect(natalChart, relocatedHouses)
                        });
                    }
                } catch (e) {
                    continue;
                }
            }
        }

        const sortedNodes = [...nodes].sort((a, b) => b.score - a.score);

        return {
            highestScoreZones: nodes, // Return full grid for heatmap
            recommendations: {
                career: sortedNodes.find(n => n.primaryAspect === 'Career') || null,
                personal: sortedNodes.find(n => n.primaryAspect === 'Relationships') || null,
                wealth: sortedNodes.find(n => n.primaryAspect === 'Fortune') || null
            }
        };
    }

    private determinePrimaryAspect(natalChart: NatalChart, relocatedHouses: { [key: number]: House }): VectorNode['primaryAspect'] {
        const planets = natalChart.planets;
        const getHouse = (deg: number) => {
            for (let i = 1; i <= 12; i++) {
                const c = relocatedHouses[i].cusp;
                const n = relocatedHouses[i === 12 ? 1 : i + 1].cusp;
                if (c < n) { if (deg >= c && deg < n) return i; }
                else { if (deg >= c || deg < n) return i; }
            }
            return 1;
        };

        const jupiterHouse = getHouse(planets.jupiter.longitude);
        const sunHouse = getHouse(planets.sun.longitude);
        const venusHouse = getHouse(planets.venus.longitude);

        if (jupiterHouse === 10 || sunHouse === 10) return 'Career';
        if (venusHouse === 7 || venusHouse === 1) return 'Relationships';
        if (jupiterHouse === 2 || jupiterHouse === 8) return 'Fortune';
        if (sunHouse === 4) return 'Stability';

        return 'Misc';
    }
}
