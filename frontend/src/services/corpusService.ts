import axios from 'axios';

import { API_BASE_URL } from '../config';

export interface CorpusEntry {
    id: number;
    code: string;
    author: string | null;
    sourceTitle: string;
    label: string | null;
    body: string;
    bodyLength: number;
    decodeSource: string | null;
    decodeScore: number | null;
}

export interface AspectKey {
    planet1: string;
    planet2: string;
    /** Угол в градусах либо имя аспекта ('square', 'trine'). */
    aspect: number | string;
}

export interface AspectBundle {
    key: { planet1: string; planet2: string; aspectDeg: number };
    entries: CorpusEntry[];
}

/** Ключ для сопоставления ответа с аспектом на колесе. Пара несимметрична в
 *  запросе, но симметрична по смыслу, поэтому имена сортируются. */
export function aspectKeyOf(planet1: string, planet2: string, aspectDeg: number): string {
    const [a, b] = [planet1.toUpperCase(), planet2.toUpperCase()].sort();
    return `${a}|${b}|${aspectDeg}`;
}

/**
 * Толкования корпуса ZET.
 *
 * Запрос пакетный: колесо рисует до полутора десятков аспектов, и по одному
 * это столько же round-trip'ов. Ответ приходит сгруппированным по аспекту,
 * до `limit` авторов на каждый, по одной записи от автора.
 */
export const corpusService = {
    async aspects(keys: AspectKey[], limit = 4): Promise<Map<string, CorpusEntry[]>> {
        if (keys.length === 0) return new Map();

        const { data } = await axios.post<{ success: boolean; bundles: AspectBundle[] }>(
            `${API_BASE_URL}/api/corpus/aspects`,
            { aspects: keys, limit },
        );

        const out = new Map<string, CorpusEntry[]>();
        for (const bundle of data.bundles ?? []) {
            out.set(
                aspectKeyOf(bundle.key.planet1, bundle.key.planet2, bundle.key.aspectDeg),
                bundle.entries,
            );
        }
        return out;
    },

    async planetInSign(planet: string, sign: string, limit = 4): Promise<CorpusEntry[]> {
        const { data } = await axios.get<{ entries: CorpusEntry[] }>(`${API_BASE_URL}/api/corpus/planet`, {
            params: { planet, sign, limit },
        });
        return data.entries ?? [];
    },

    async planetInHouse(planet: string, house: number, limit = 4): Promise<CorpusEntry[]> {
        const { data } = await axios.get<{ entries: CorpusEntry[] }>(`${API_BASE_URL}/api/corpus/planet`, {
            params: { planet, house, limit },
        });
        return data.entries ?? [];
    },

    async degree(absoluteDegree: number, limit = 4): Promise<CorpusEntry[]> {
        const { data } = await axios.get<{ entries: CorpusEntry[] }>(`${API_BASE_URL}/api/corpus/degree`, {
            params: { absolute: absoluteDegree, limit },
        });
        return data.entries ?? [];
    },
};
