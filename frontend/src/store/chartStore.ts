import { create } from 'zustand';
import { SavedChart } from '../types/chart';
import { chartService } from '../services/chartService';

interface ChartStore {
  charts: SavedChart[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadCharts: () => Promise<void>;
  addChart: (chart: SavedChart) => void;
  updateChart: (id: string, updates: Partial<SavedChart>) => void;
  deleteChart: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useChartStore = create<ChartStore>((set, get) => ({
  charts: [],
  isLoading: false,
  error: null,

  loadCharts: async () => {
    set({ isLoading: true, error: null });
    try {
      const charts = await chartService.getCharts();
      set({ charts, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load charts',
        isLoading: false 
      });
    }
  },

  addChart: (chart: SavedChart) => {
    set(state => ({
      charts: [...state.charts, chart]
    }));
  },

  updateChart: (id: string, updates: Partial<SavedChart>) => {
    set(state => ({
      charts: state.charts.map(chart => 
        chart.id === id ? { ...chart, ...updates } : chart
      )
    }));
  },

  deleteChart: async (id: string) => {
    try {
      await chartService.deleteChart(id);
      set(state => ({
        charts: state.charts.filter(chart => chart.id !== id)
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete chart'
      });
    }
  },

  clearError: () => set({ error: null })
}));