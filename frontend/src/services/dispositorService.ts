import axios from 'axios';
import { API_BASE_URL } from '../config';
import type { DispositorChainsResponse } from '@adaptive-astro/shared/types/astrology';

export const dispositorService = {
    async getChains(
        date: Date,
        latitude: number,
        longitude: number,
        system: 'traditional' | 'modern' = 'traditional'
    ): Promise<DispositorChainsResponse> {
        const params = {
            date: date.toISOString().split('T')[0],
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            system,
        };
        const { data } = await axios.get(`${API_BASE_URL}/api/ephemeris/dispositors`, { params });
        return data;
    },
};
