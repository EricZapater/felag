import { apiClient } from '@/api/client';
import { PublicProfile } from './types';

export const usersApi = {
  getPublicProfile: async (userId: string): Promise<PublicProfile> => {
    const response = await apiClient.get<PublicProfile>(`/api/v1/users/${userId}/public-profile`);
    return response.data;
  },
};
