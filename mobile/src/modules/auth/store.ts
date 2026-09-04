import { create } from 'zustand';
import { User } from './types';
import { authApi } from './api';
import { setAuthToken } from '@/api/client';
import {
  registerPushTokenService,
  unregisterPushTokenService,
} from '@/modules/notifications/services/pushTokenService';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const resp = await authApi.login({ email, password });
      setAuthToken(resp.tokens.access_token);
      set({
        user: resp.user,
        accessToken: resp.tokens.access_token,
        refreshToken: resp.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
      // Register push token after successful login
      try {
        await registerPushTokenService();
      } catch (pushErr) {
        console.warn('Push registration warning:', pushErr);
      }
    } catch (err: any) {
      console.error('[Login Error]', err);
      const msg = err.response?.data?.error?.message || err.message || 'Error en l’inici de sessió. Comprova la teva connexió.';
      set({ error: msg, isLoading: false });
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const resp = await authApi.register({ name, email, password });
      setAuthToken(resp.tokens.access_token);
      set({
        user: resp.user,
        accessToken: resp.tokens.access_token,
        refreshToken: resp.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
      // Register push token after successful registration
      try {
        await registerPushTokenService();
      } catch (pushErr) {
        console.warn('Push registration warning:', pushErr);
      }
    } catch (err: any) {
      console.error('[Register Error]', err);
      const msg = err.response?.data?.error?.message || err.message || 'Error en el registre. Comprova la teva connexió.';
      set({ error: msg, isLoading: false });
    }
  },

  logout: async () => {
    const { refreshToken } = get();
    await unregisterPushTokenService();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch (err) {
        // Ignore network errors
      }
    }
    setAuthToken(null);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));
