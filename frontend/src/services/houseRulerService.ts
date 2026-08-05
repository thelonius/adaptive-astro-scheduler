import axios from 'axios';

import { API_BASE_URL } from '../config';
import type { CorpusEntry } from './corpusService';

export interface HouseRulerPlacement {
    house: number;
    sign: string;
    ruler: string;
    rulerHouse: number;
    isSelfContained: boolean;
    corpusTag: string;
    interpretations: CorpusEntry[];
}

export interface HouseRulersResponse {
    system: 'traditional' | 'modern';
    placements: HouseRulerPlacement[];
}

/**
 * Управители домов и их размещение.
 *
 * Отличается от цепей диспозиций: там планета отсылает к управителю своего
 * знака, здесь дом отсылает к дому — куда утекают дела конкретной сферы.
 */
export const houseRulerService = {
    async get(
        date: Date,
        latitude: number,
        longitude: number,
        system: 'traditional' | 'modern' = 'traditional',
    ): Promise<HouseRulersResponse> {
        const { data } = await axios.get<HouseRulersResponse>(
            `${API_BASE_URL}/api/ephemeris/house-rulers`,
            {
                params: {
                    date: date.toISOString().split('T')[0],
                    time: date.toISOString().split('T')[1]?.slice(0, 8) ?? '12:00:00',
                    latitude,
                    longitude,
                    system,
                },
            },
        );
        return data;
    },
};
