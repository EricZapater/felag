import { create } from 'zustand';
import { PublicProfile } from './types';
import { usersApi } from './api';

interface PublicProfileState {
  profile: PublicProfile | null;
  isLoading: boolean;
  error: string | null;

  fetchPublicProfile: (userId: string) => Promise<void>;
  clearProfile: () => void;
  clearError: () => void;
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
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error en carregar el perfil del viatger',
        isLoading: false,
      });
    }
  },

  clearProfile: () => set({ profile: null }),
  clearError: () => set({ error: null }),
}));
