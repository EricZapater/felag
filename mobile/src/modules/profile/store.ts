import { create } from 'zustand';
import { Country, Profile, Region, Town } from './types';
import { profileApi } from './api';

interface ProfileState {
  profile: Profile | null;
  countries: Country[];
  regions: Region[];
  towns: Town[];
  isLoading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (name: string, phoneNumber: string, bio: string) => Promise<void>;
  updateOrigin: (townId: string) => Promise<void>;
  fetchCountries: () => Promise<void>;
  fetchRegions: (countryId: string) => Promise<void>;
  fetchTowns: (regionId: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  countries: [],
  regions: [],
  towns: [],
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileApi.getProfile();
      set({ profile, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error?.message || 'Error carregant el perfil', isLoading: false });
    }
  },

  updateProfile: async (name, phoneNumber, bio) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileApi.updateProfile({ name, phone_number: phoneNumber, bio });
      set({ profile, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error?.message || 'Error actualitzant el perfil', isLoading: false });
      throw err;
    }
  },

  updateOrigin: async (townId) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileApi.updateOrigin(townId);
      set({ profile, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error?.message || 'Error actualitzant l’origen', isLoading: false });
      throw err;
    }
  },

  fetchCountries: async () => {
    try {
      const countries = await profileApi.getCountries();
      set({ countries });
    } catch (err) {
      // Ignore
    }
  },

  fetchRegions: async (countryId) => {
    try {
      const regions = await profileApi.getRegions(countryId);
      set({ regions, towns: [] });
    } catch (err) {
      // Ignore
    }
  },

  fetchTowns: async (regionId) => {
    try {
      const towns = await profileApi.getTowns(regionId);
      set({ towns });
    } catch (err) {
      // Ignore
    }
  },
}));
