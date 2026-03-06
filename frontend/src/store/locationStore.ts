import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserLocation {
    latitude: number;
    longitude: number;
    timezone: string;
    city?: string;
    country?: string;
    countryCode?: string; // ISO 3166-1 alpha-2 for flag emoji
}

// Москва — дефолт
const DEFAULT_LOCATION: UserLocation = {
    latitude: 55.7558,
    longitude: 37.6173,
    timezone: 'Europe/Moscow',
    city: 'Moscow',
    country: 'Russia',
    countryCode: 'RU',
};

interface LocationStore {
    location: UserLocation;
    isDetecting: boolean;
    detectionError: string | null;

    // Actions
    setLocation: (location: UserLocation) => void;
    setDetecting: (value: boolean) => void;
    setDetectionError: (error: string | null) => void;
    resetToDefault: () => void;
}

export const useLocationStore = create<LocationStore>()(
    persist(
        (set) => ({
            location: DEFAULT_LOCATION,
            isDetecting: false,
            detectionError: null,

            setLocation: (location: UserLocation) =>
                set({ location, detectionError: null }),

            setDetecting: (value: boolean) =>
                set({ isDetecting: value }),

            setDetectionError: (error: string | null) =>
                set({ detectionError: error, isDetecting: false }),

            resetToDefault: () =>
                set({ location: DEFAULT_LOCATION, detectionError: null }),
        }),
        {
            name: 'ag-user-location', // localStorage key
        }
    )
);

export { DEFAULT_LOCATION };
