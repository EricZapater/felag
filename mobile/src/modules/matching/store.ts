import { create } from 'zustand';
import { matchingApi } from './api';
import { Match } from './types';

interface MatchingState {
  matches: Match[];
  currentMatch: Match | null;
  isLoading: boolean;
  error: string | null;

  fetchTripMatches: (tripId: string) => Promise<void>;
  fetchMatchById: (matchId: string) => Promise<void>;
  clearMatches: () => void;
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
      const msg = err.response?.data?.message || err.message || 'Error en carregar les coincidències';
      set({ error: msg, isLoading: false, matches: [] });
    }
  },

  fetchMatchById: async (matchId: string) => {
    set({ isLoading: true, error: null });
    try {
      const match = await matchingApi.getMatchById(matchId);
      set({ currentMatch: match, isLoading: false });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error en carregar la coincidència';
      set({ error: msg, isLoading: false });
    }
  },

  clearMatches: () => {
    set({ matches: [], currentMatch: null, error: null, isLoading: false });
  },
}));
