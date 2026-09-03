import { create } from 'zustand';
import { Match } from './types';
import { matchingApi } from './api';

interface MatchingState {
  matches: Match[];
  currentMatch: Match | null;
  isLoading: boolean;
  error: string | null;

  fetchTripMatches: (tripId: string) => Promise<void>;
  fetchMatchById: (matchId: string) => Promise<void>;
  clearMatches: () => void;
  clearError: () => void;
}

export const useMatchingStore = create<MatchingState>((set) => ({
  matches: [],
  currentMatch: null,
  isLoading: false,
  error: null,

  fetchTripMatches: async (tripId: string) => {
    set({ isLoading: true, error: null });
    try {
      const matches = await matchingApi.getTripMatches(tripId);
      set({ matches, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.response?.data?.error?.message || 'Error carregant les coincidències',
        isLoading: false,
      });
    }
  },

  fetchMatchById: async (matchId: string) => {
    set({ isLoading: true, error: null });
    try {
      const currentMatch = await matchingApi.getMatchById(matchId);
      set({ currentMatch, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.response?.data?.error?.message || 'Error carregant el detall de la coincidència',
        isLoading: false,
      });
    }
  },

  clearMatches: () => set({ matches: [], currentMatch: null }),
  clearError: () => set({ error: null }),
}));
