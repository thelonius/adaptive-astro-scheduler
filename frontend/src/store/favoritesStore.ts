import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoriteDay {
    date: string;        // ISO date string (YYYY-MM-DD)
    title?: string;      // User-provided title for the day
    note?: string;       // Optional user note
    createdAt: string;   // ISO timestamp
    summary?: {
        lunarDay: number;
        moonPhase: string;
        quality?: string;
    };
}

interface FavoritesStore {
    favorites: FavoriteDay[];

    // Actions
    addFavorite: (date: string, title?: string, note?: string, summary?: FavoriteDay['summary']) => void;
    removeFavorite: (date: string) => void;
    updateTitle: (date: string, title: string) => void;
    updateNote: (date: string, note: string) => void;
    updateSummary: (date: string, summary: FavoriteDay['summary']) => void;
    isFavorite: (date: string) => boolean;
    getFavorite: (date: string) => FavoriteDay | undefined;
    clearAll: () => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
    persist(
        (set, get) => ({
            favorites: [],

            addFavorite: (date: string, title?: string, note?: string, summary?: FavoriteDay['summary']) => {
                const existing = get().favorites.find(f => f.date === date);
                if (existing) return; // Already exists

                set(state => ({
                    favorites: [
                        ...state.favorites,
                        {
                            date,
                            title: title || `Event ${date}`,
                            note,
                            summary,
                            createdAt: new Date().toISOString(),
                        },
                    ].sort((a, b) => a.date.localeCompare(b.date)), // Keep sorted by date
                }));
            },

            removeFavorite: (date: string) => {
                set(state => ({
                    favorites: state.favorites.filter(f => f.date !== date),
                }));
            },

            updateTitle: (date: string, title: string) => {
                set(state => ({
                    favorites: state.favorites.map(f =>
                        f.date === date ? { ...f, title } : f
                    ),
                }));
            },

            updateNote: (date: string, note: string) => {
                set(state => ({
                    favorites: state.favorites.map(f =>
                        f.date === date ? { ...f, note } : f
                    ),
                }));
            },

            updateSummary: (date: string, summary: FavoriteDay['summary']) => {
                set(state => ({
                    favorites: state.favorites.map(f =>
                        f.date === date ? { ...f, summary } : f
                    ),
                }));
            },

            isFavorite: (date: string) => {
                return get().favorites.some(f => f.date === date);
            },

            getFavorite: (date: string) => {
                return get().favorites.find(f => f.date === date);
            },

            clearAll: () => {
                set({ favorites: [] });
            },
        }),
        {
            name: 'astro-favorites', // localStorage key
        }
    )
);
