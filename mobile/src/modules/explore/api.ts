import { apiClient } from '@/api/client';
import { ExploreDestinationItem } from './types';

export const exploreApi = {
  getRecommendedDestinations: async (): Promise<ExploreDestinationItem[]> => {
    const res = await apiClient.get<ExploreDestinationItem[]>('/api/v1/explore/recommendations');
    return res.data;
  },
};
