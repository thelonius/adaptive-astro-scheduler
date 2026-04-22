import { NatalChart } from '@adaptive-astro/shared/types';
import { RelocationCalculator, RelocationResult } from './relocation-calculator';
import { TransitCalculator, Transit, HouseTransit } from './transit-calculator';

export interface LocationScore {
    score: number; // 0 to 100
    pros: string[];
    warnings: string[];
}

export interface TransitAnalysisForDates {
    startDate: string;
    endDate: string;
    importantTransits: Transit[];
    relocationHouseTransits: HouseTransit[];
    transitWarnings: string[];
    transitPros: string[];
    transitScore: number; // Modifies the base score for these specific dates
}

export interface TravelAnalysisResult {
    destination: string;
    staticLocationScore: LocationScore;
    relocationData: RelocationResult;
    dateAnalysis?: TransitAnalysisForDates;
}

export class TravelAnalyzer {
    constructor(
        private relocationCalculator: RelocationCalculator,
        private transitCalculator: TransitCalculator
    ) { }

    /**
     * Determine the static score of a location based on where natal planets fall in the relocated houses
     */
    public analyzeStaticLocation(relocation: RelocationResult): LocationScore {
        let score = 50; // Base neutral score
        const pros: string[] = [];
        const warnings: string[] = [];

        const { originalChart, relocatedHouses } = relocation;

        // Simplified algorithm: 
        // Which house do planets fall into?
        const planets = originalChart.planets;

        // Helper to find which house a degree falls into
        // (A real implementation needs to handle the 360-wraparound)
        const getHouseForDegree = (degree: number): number | null => {
            for (let i = 1; i <= 12; i++) {
                const currentCusp = relocatedHouses[i]?.cusp;
                const nextCusp = relocatedHouses[i === 12 ? 1 : i + 1]?.cusp;
                if (currentCusp === undefined || nextCusp === undefined) continue;

                if (currentCusp < nextCusp) {
                    if (degree >= currentCusp && degree < nextCusp) return i;
                } else {
                    // Wraparound around Aries 0
                    if (degree >= currentCusp || degree < nextCusp) return i;
                }
            }
            return null;
        };
        // Check Jupiter & Venus (Benefics)
        const jupiterHouse = getHouseForDegree(planets.jupiter.longitude);
        const venusHouse = getHouseForDegree(planets.venus.longitude);
        const sunHouse = getHouseForDegree(planets.sun.longitude);

        // Angular houses generally give power
        const angularHouses = [1, 4, 7, 10];

        if (angularHouses.includes(jupiterHouse as number)) {
            score += 20;
            pros.push(`Jupiter in the ${jupiterHouse}th house brings strong luck and expansion in this location.`);
        }

        if (angularHouses.includes(venusHouse as number)) {
            score += 15;
            pros.push(`Venus in the ${venusHouse}th house brings harmony and positive social/romantic energy.`);
        }

        if (angularHouses.includes(sunHouse as number)) {
            score += 10;
            pros.push(`Sun in the ${sunHouse}th house brings vitality and visibility.`);
        }

        // Check Saturn, Mars, Pluto (Malefics)
        const saturnHouse = getHouseForDegree(planets.saturn.longitude);
        const marsHouse = getHouseForDegree(planets.mars.longitude);

        if (angularHouses.includes(saturnHouse as number)) {
            score -= 20;
            warnings.push(`Saturn in the ${saturnHouse}th house might bring heavy responsibilities, delays, or hardship here.`);
        }

        if (angularHouses.includes(marsHouse as number)) {
            score -= 15;
            warnings.push(`Mars in the ${marsHouse}th house could indicate conflict or stress.`);
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        return { score, pros, warnings };
    }

    /**
     * Analyze transits for a specific date range at the destination
     */
    public async analyzeDatesForRelocation(
        natalChart: NatalChart,
        relocation: RelocationResult,
        startDate: Date,
        endDate: Date
    ): Promise<TransitAnalysisForDates> {
        const warnings: string[] = [];
        const pros: string[] = [];
        const importantTransits: Transit[] = [];
        const houseTransits: HouseTransit[] = [];
        let transitScoreMod = 0; // Starts neutral

        // We only check the start date to keep it simple for now,
        // A robust implementation would check transits for every day in the range or at least look for peak transits.
        // Use the TransitCalculator for the startDate at the destination location.

        const destLocationParams = {
            latitude: relocation.location.latitude,
            longitude: relocation.location.longitude,
        };

        // Calculate transits for the start of the trip using the new location
        // We pass a modified NatalChart where the houses are the relocation houses
        const relocatedNatalChart = {
            ...natalChart,
            houses: Object.values(relocation.relocatedHouses)
        };

        const transitAnalysis = await this.transitCalculator.calculateTransits(
            relocatedNatalChart as any,
            startDate,
            destLocationParams
        );

        // 1. Analyze Transiting Planets to Relocated Houses
        // We look for Malefics or Benefics hitting angular relocated houses (mostly house 1 and 4 for travel/stay)
        // The transitCalculator gives us house transits out of the box.
        const transitingMalefics = ['Saturn', 'Mars', 'Uranus', 'Pluto', 'Saturn', 'Mars', 'Uranus', 'Pluto', 'saturn', 'mars', 'uranus', 'pluto'];
        const transitingBenefics = ['Jupiter', 'Venus', 'Sun', 'jupiter', 'venus', 'sun'];

        for (const ht of transitAnalysis.houseTransits) {
            // Did it enter the 1st or 4th house of the relocated chart?
            if (ht.transitHouse === 1 || ht.transitHouse === 4 || ht.transitHouse === 10) {
                if (transitingMalefics.includes(ht.planet)) {
                    warnings.push(`Transiting ${ht.planet} is moving through your relocated ${ht.transitHouse}th house. This could bring sudden challenges or stress at the destination.`);
                    transitScoreMod -= 10;
                }
                if (transitingBenefics.includes(ht.planet)) {
                    pros.push(`Transiting ${ht.planet} is moving through your relocated ${ht.transitHouse}th house, bringing positive energy, luck, or comfort.`);
                    transitScoreMod += 10;
                }
            }

            houseTransits.push(ht);
        }

        // 2. Analyze Hard Transits to Natal Planets
        // Look for squares or oppositions from slow planets (Saturn, Uranus, Pluto) to personal planets (Moon, Sun, Venus, Mercury)
        const personalPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'sun', 'moon', 'mercury', 'venus'];

        for (const st of transitAnalysis.significantTransits) {
            if (transitingMalefics.includes(st.transitingPlanet) && personalPlanets.includes(st.natalPlanet)) {
                if (st.aspectType === 'square' || st.aspectType === 'opposition' || st.aspectType === 'conjunction') {
                    warnings.push(`Transiting ${st.transitingPlanet} is in a hard ${st.aspectType} to your Natal ${st.natalPlanet} during the trip. Prepare for potential delays or emotional tension.`);
                    transitScoreMod -= 15;
                }
            }
            if (transitingBenefics.includes(st.transitingPlanet) && personalPlanets.includes(st.natalPlanet)) {
                if (st.aspectType === 'trine' || st.aspectType === 'sextile' || st.aspectType === 'conjunction') {
                    pros.push(`Transiting ${st.transitingPlanet} is forming a supportive ${st.aspectType} with your Natal ${st.natalPlanet}, suggesting flow and enjoyment.`);
                    transitScoreMod += 10;
                }
            }
            importantTransits.push(st);
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            importantTransits,
            relocationHouseTransits: houseTransits,
            transitWarnings: warnings,
            transitPros: pros,
            transitScore: transitScoreMod
        };
    }

    /**
     * Main entrypoint for travel analysis
     */
    async analyzeTrip(natalChart: NatalChart, destinationCity: string, startDate?: Date, endDate?: Date): Promise<TravelAnalysisResult> {
        const relocation = await this.relocationCalculator.calculateRelocation(natalChart, destinationCity);

        if (!relocation) {
            throw new Error(`Failed to calculate relocation for ${destinationCity}`);
        }

        const staticLocationScore = this.analyzeStaticLocation(relocation);
        let dateAnalysis = undefined;

        if (startDate && endDate) {
            dateAnalysis = await this.analyzeDatesForRelocation(natalChart, relocation, startDate, endDate);
        }

        return {
            destination: destinationCity,
            staticLocationScore,
            relocationData: relocation,
            dateAnalysis
        };
    }

    /**
     * Compare multiple cities and rank them by static score
     */
    async rankDestinations(natalChart: NatalChart, cities: string[]): Promise<TravelAnalysisResult[]> {
        const promises = cities.map(city =>
            this.analyzeTrip(natalChart, city).catch(err => {
                console.error(`Error analyzing city ${city}:`, err);
                return null;
            })
        );

        const results = await Promise.all(promises);
        const validResults = results.filter(r => r !== null) as TravelAnalysisResult[];

        // Sort by static score descending
        return validResults.sort((a, b) => b.staticLocationScore.score - a.staticLocationScore.score);
    }
}
