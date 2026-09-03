import { create } from 'zustand';
import { usersApi } from './api';
import { PublicProfile } from './types';

interface PublicProfileState {
  profile: PublicProfile | null;
  isLoading: boolean;
  error: string | null;

  fetchPublicProfile: (userId: string) => Promise<PublicProfile>;
  clearProfile: () => void;
}

export const usePublicProfileStore = create<PublicProfileState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchPublicProfile: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await usersApi.getPublicProfile(userId);
      set({ profile, isLoading: false });
      return profile;
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Error en carregar el perfil públic';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  clearProfile: () => {
    set({ profile: null, isLoading: false, error: null });
  },
}));
