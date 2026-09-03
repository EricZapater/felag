import { create } from 'zustand';
import { ExploreDestinationItem } from './types';
import { exploreApi } from './api';

interface ExploreState {
  recommendations: ExploreDestinationItem[];
  isLoading: boolean;
  error: string | null;

  clearError: () => void;
  fetchRecommendations: () => Promise<ExploreDestinationItem[]>;
}

export const useExploreStore = create<ExploreState>((set) => ({
  recommendations: [],
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchRecommendations: async (): Promise<ExploreDestinationItem[]> => {
    set({ isLoading: true, error: null });
    try {
      const recommendations = await exploreApi.getRecommendedDestinations();
      set({ recommendations, isLoading: false });
      return recommendations;
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error carregant les recomanacions de destins',
        isLoading: false,
      });
      throw err;
    }
  },
}));
