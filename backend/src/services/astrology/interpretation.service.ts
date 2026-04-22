import * as fs from 'fs';
import * as path from 'path';
import type { 
    LunarDay, 
    LunarEnergyType, 
    LunarPhaseType, 
    PlanetName 
} from '@adaptive-astro/shared/types/astrology';

interface LunarDayData {
    lunar_day: number;
    base_colors: string[];
    affected_organs: string[];
    affected_body_parts: string[];
    health_tips: string[];
    recommended: string[];
    not_recommended: string[];
    dominant_planet: string;
    additional_influences: string[];
    planetary_description: string;
    general_description: string;
}

interface LocalizationData {
    moon_phases: Record<string, string>;
    health_organs: Record<string, string>;
    health_body_parts: Record<string, string>;
    health_tips: Record<string, string>;
    recommendations: Record<string, string>;
    planets: Record<string, string>;
}

/**
 * Astrology Interpretation Service
 * 
 * Centralized service for mapping raw astronomical data to 
 * human-readable interpretations, symbols, and characteristics.
 */
export class InterpretationService {
    private lunarDays: LunarDayData[] = [];
    private ruLocalization: LocalizationData | null = null;
    private dataPath: string;

    constructor() {
        // Resolve data path relative to the root or current directory
        this.dataPath = path.resolve(process.cwd(), 'data/astrology');
        this.loadData();
    }

    private loadData() {
        try {
            const lunarDaysFile = path.join(this.dataPath, 'lunar_days.json');
            if (fs.existsSync(lunarDaysFile)) {
                const raw = fs.readFileSync(lunarDaysFile, 'utf8');
                this.lunarDays = JSON.parse(raw).lunar_days;
            }

            const ruLocFile = path.join(this.dataPath, 'i18n-ru.json');
            if (fs.existsSync(ruLocFile)) {
                const raw = fs.readFileSync(ruLocFile, 'utf8');
                this.ruLocalization = JSON.parse(raw);
            }
        } catch (error) {
            console.error('❌ Failed to load interpretation data:', error);
        }
    }

    /**
     * Get enriched lunar day data
     */
    public getLunarDay(num: number, phase: LunarPhaseType): LunarDay {
        const data = this.lunarDays.find(d => d.lunar_day === num);
        
        // Basic mapping if data not found
        if (!data) {
            return {
                number: num,
                symbol: '',
                energy: this.getEnergyType(num, phase),
                lunarPhase: phase,
                characteristics: { spiritual: '', practical: '', avoided: [] }
            };
        }

        return {
            number: num,
            symbol: this.getTraditionalSymbol(num),
            energy: this.getEnergyType(num, phase),
            lunarPhase: phase,
            colorPalette: {
                base_colors: data.base_colors,
                gradient: [data.base_colors[0], data.base_colors[1] || data.base_colors[0]]
            },
            characteristics: {
                spiritual: data.general_description,
                practical: data.recommended.join(', '),
                avoided: data.not_recommended
            }
        };
    }

    /**
     * Map lunar day + phase to energy type (Light/Dark/Neutral)
     */
    private getEnergyType(num: number, _phase: LunarPhaseType): LunarEnergyType {
        const darkDays = [9, 15, 23, 29];
        if (darkDays.includes(num)) return 'Dark';
        
        // Waxing moon (days 1-15) is generally Light
        if (num >= 1 && num <= 15) return 'Light';
        
        // Waning moon (days 16-30) is generally Neutral/Dark-ish but we classify as Neutral here
        return 'Neutral';
    }

    /**
     * Get traditional symbol for lunar day
     */
    private getTraditionalSymbol(num: number): string {
        const symbols: Record<number, string> = {
            1: 'Lamp', 2: 'Mouth', 3: 'Leopard', 4: 'Tree of Knowledge', 5: 'Unicorn',
            6: 'Crane', 7: 'Scepter', 8: 'Phoenix', 9: 'Bat', 10: 'Fountain',
            11: 'Crown', 12: 'Chalice', 13: 'Wheel', 14: 'Trumpet', 15: 'Serpent',
            16: 'Dove', 17: 'Grape Cluster', 18: 'Mirror', 19: 'Spider', 20: 'Eagle',
            21: 'Horse', 22: 'Elephant', 23: 'Crocodile', 24: 'Bear', 25: 'Turtle',
            26: 'Toad', 27: 'Trident', 28: 'Lotus', 29: 'Octopus', 30: 'Golden Swan'
        };
        return symbols[num] || '';
    }

    /**
     * Translate planet name
     */
    public translatePlanet(name: PlanetName, lang: string = 'en'): string {
        if (lang === 'ru' && this.ruLocalization) {
            return this.ruLocalization.planets[name] || name;
        }
        return name;
    }
}

// Singleton instance
export const interpretationService = new InterpretationService();
