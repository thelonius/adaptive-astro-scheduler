import axios from 'axios';
import { TimingWindow, IntentionCategory } from '@adaptive-astro/shared/types/astrology';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface FindOptimalTimingParams {
    intention: IntentionCategory;
    startDate: Date;
    endDate: Date;
    limit?: number;
}

export interface OptimalTimingResponse {
    intention: IntentionCategory;
    count: number;
    windows: TimingWindow[];
}

class OptimalTimingService {
    private baseUrl = `${API_URL}/api/optimal-timing`;

    async findWindows(params: FindOptimalTimingParams): Promise<OptimalTimingResponse> {
        const response = await axios.post(`${this.baseUrl}/find`, {
            ...params,
            startDate: params.startDate.toISOString(),
            endDate: params.endDate.toISOString()
        });
        return response.data;
    }

    async getIntentions(): Promise<IntentionCategory[]> {
        const response = await axios.get(`${this.baseUrl}/intentions`);
        return response.data.intentions;
    }
}

export const optimalTimingService = new OptimalTimingService();
