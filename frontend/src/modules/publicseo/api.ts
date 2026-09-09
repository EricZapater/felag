import { apiClient } from '@/api/client';
import { PublicDestinationGuide, PublicDestinationsResponse } from './types';

export const publicSeoApi = {
  getPublicDestinations: async (params?: {
    q?: string;
    country_code?: string;
    sort?: string;
    page?: number;
    limit?: number;
    lang?: string;
  }): Promise<PublicDestinationsResponse> => {
    const res = await apiClient.get<PublicDestinationsResponse>('/api/v1/public/destinations', {
      params,
    });
    return res.data;
  },

  getPublicDestinationGuide: async (
    slugOrId: string,
    lang?: string
  ): Promise<PublicDestinationGuide> => {
    const res = await apiClient.get<PublicDestinationGuide>(
      `/api/v1/public/destinations/${encodeURIComponent(slugOrId)}`,
      {
        params: { lang },
      }
    );
    return res.data;
  },
};
