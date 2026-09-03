import { apiClient } from '@/api/client';
import { Match } from './types';

export const matchingApi = {
  getTripMatches: async (tripId: string): Promise<Match[]> => {
    const res = await apiClient.get<Match[]>(`/api/v1/trips/${tripId}/matches`);
    return res.data;
  },

  getMatchById: async (matchId: string): Promise<Match> => {
    const res = await apiClient.get<Match>(`/api/v1/matches/${matchId}`);
    return res.data;
  },
};
