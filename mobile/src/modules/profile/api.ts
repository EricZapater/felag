import { apiClient } from '@/api/client';
import { Country, Profile, Region, Town, UpdateProfileRequest } from './types';

export const profileApi = {
  getProfile: async (): Promise<Profile> => {
    const res = await apiClient.get<Profile>('/api/v1/profile');
    return res.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<Profile> => {
    const res = await apiClient.put<Profile>('/api/v1/profile', data);
    return res.data;
  },

  updateOrigin: async (townId: string): Promise<Profile> => {
    const res = await apiClient.put<Profile>('/api/v1/profile/origin', { town_id: townId });
    return res.data;
  },

  getCountries: async (): Promise<Country[]> => {
    const res = await apiClient.get<Country[]>('/api/v1/origins/countries');
    return res.data;
  },

  getRegions: async (countryId: string): Promise<Region[]> => {
    const res = await apiClient.get<Region[]>(`/api/v1/origins/countries/${countryId}/regions`);
    return res.data;
  },

  getTowns: async (regionId: string): Promise<Town[]> => {
    const res = await apiClient.get<Town[]>(`/api/v1/origins/regions/${regionId}/towns`);
    return res.data;
  },
};
