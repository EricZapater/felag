import { create } from 'zustand';
import { exploreApi } from './api';
import { ExploreDestinationItem } from './types';

interface ExploreState {
  recommendations: ExploreDestinationItem[];
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  fetchRecommendations: () => Promise<void>;
  setSearchQuery: (q: string) => void;
  clearError: () => void;
}

export const useExploreStore = create<ExploreState>((set) => ({
  recommendations: [],
  searchQuery: '',
  isLoading: false,
  error: null,

  fetchRecommendations: async () => {
    set({ isLoading: true, error: null });
    try {
      const recs = await exploreApi.getRecommendations();
      set({ recommendations: recs, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || err.response?.data?.message || 'Error carregant recomanacions d’exploració',
        isLoading: false,
      });
    }
  },

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  clearError: () => set({ error: null }),
}));
