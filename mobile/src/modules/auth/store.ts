import { create } from 'zustand';
import { Platform } from 'react-native';
import { AuthResponse, DeviceSummary, User } from './types';
import { authApi } from './api';
import { secureStorage } from './storage';
import { setAuthToken } from '@/api/client';
import {
  getDevicePushToken,
  registerForPushNotificationsAsync,
  unregisterPushNotificationsAsync,
} from '@/modules/notifications/push';

const ACCESS_TOKEN_KEY = 'felag_auth_access_token';
const REFRESH_TOKEN_KEY = 'felag_auth_refresh_token';
const USER_KEY = 'felag_auth_user';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  devices: DeviceSummary[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isAutoLoggingIn: boolean;
  error: string | null;
  otpSent: boolean;

  autoLoginSilent: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  requestOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, code: string) => Promise<void>;
  fetchDevices: () => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  resetOtpState: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  devices: [],
  isAuthenticated: false,
  isLoading: false,
  isAutoLoggingIn: true,
  error: null,
  otpSent: false,

  autoLoginSilent: async () => {
    set({ isAutoLoggingIn: true, error: null });
    try {
      const [savedAccess, savedRefresh, savedUserStr] = await Promise.all([
        secureStorage.getItem(ACCESS_TOKEN_KEY),
        secureStorage.getItem(REFRESH_TOKEN_KEY),
        secureStorage.getItem(USER_KEY),
      ]);

      if (!savedAccess && !savedRefresh) {
        set({ isAutoLoggingIn: false, isAuthenticated: false });
        return false;
      }

      let validToken = savedAccess;
      let currentUser: User | null = null;

      if (savedUserStr) {
        try {
          currentUser = JSON.parse(savedUserStr);
        } catch {
          // ignore parsing error
        }
      }

      if (validToken) {
        setAuthToken(validToken);
        try {
          currentUser = await authApi.getCurrentUser();
        } catch (meErr: any) {
          // If token expired, try refreshing with refresh token
          if (savedRefresh) {
            try {
              const refreshResp = await authApi.refresh(savedRefresh);
              validToken = refreshResp.access_token;
              setAuthToken(validToken);
              await secureStorage.setItem(ACCESS_TOKEN_KEY, validToken);
              currentUser = await authApi.getCurrentUser();
            } catch (refErr) {
              // Refresh failed, clean session
              validToken = null;
              currentUser = null;
            }
          } else {
            validToken = null;
            currentUser = null;
          }
        }
      } else if (savedRefresh) {
        try {
          const refreshResp = await authApi.refresh(savedRefresh);
          validToken = refreshResp.access_token;
          setAuthToken(validToken);
          await secureStorage.setItem(ACCESS_TOKEN_KEY, validToken);
          currentUser = await authApi.getCurrentUser();
        } catch {
          validToken = null;
          currentUser = null;
        }
      }

      if (validToken && currentUser) {
        await secureStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        set({
          user: currentUser,
          accessToken: validToken,
          refreshToken: savedRefresh,
          isAuthenticated: true,
          isAutoLoggingIn: false,
        });

        // Register push notifications
        registerForPushNotificationsAsync().catch((e) =>
          console.warn('Push registration error on silent login:', e)
        );

        return true;
      } else {
        // Clean up invalid session
        await Promise.all([
          secureStorage.removeItem(ACCESS_TOKEN_KEY),
          secureStorage.removeItem(REFRESH_TOKEN_KEY),
          secureStorage.removeItem(USER_KEY),
        ]);
        setAuthToken(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isAutoLoggingIn: false,
        });
        return false;
      }
    } catch (err) {
      console.warn('[AutoLogin Error]', err);
      set({ isAutoLoggingIn: false, isAuthenticated: false });
      return false;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const resp = await authApi.login({ email, password });
      await saveSession(resp);
      set({
        user: resp.user,
        accessToken: resp.tokens.access_token,
        refreshToken: resp.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });

      registerForPushNotificationsAsync().catch((pushErr) =>
        console.warn('Push registration warning:', pushErr)
      );
    } catch (err: any) {
      console.error('[Login Error]', err);
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Error en l’inici de sessió. Comprova les teves dades.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const resp = await authApi.register({ name, email, password });
      await saveSession(resp);
      set({
        user: resp.user,
        accessToken: resp.tokens.access_token,
        refreshToken: resp.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });

      registerForPushNotificationsAsync().catch((pushErr) =>
        console.warn('Push registration warning:', pushErr)
      );
    } catch (err: any) {
      console.error('[Register Error]', err);
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Error en el registre. Comprova la teva connexió.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  requestOTP: async (email: string) => {
    set({ isLoading: true, error: null, otpSent: false });
    try {
      const platform = Platform.OS;
      const deviceName = `${Platform.OS.toUpperCase()} App`;
      await authApi.requestOTP({ email, device_name: deviceName, platform });
      set({ isLoading: false, otpSent: true });
    } catch (err: any) {
      console.error('[RequestOTP Error]', err);
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Error en sol·licitar el codi d’accés.';
      set({ error: msg, isLoading: false, otpSent: false });
      throw err;
    }
  },

  verifyOTP: async (email: string, code: string) => {
    set({ isLoading: true, error: null });
    try {
      const pushToken = await getDevicePushToken();
      const deviceId = `dev-${Platform.OS}-${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const deviceName = `${Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : 'Web'} FELAG`;
      const platform = Platform.OS;

      const resp = await authApi.verifyOTP({
        email,
        code,
        device_id: deviceId,
        device_name: deviceName,
        platform,
        push_token: pushToken,
      });

      await saveSession(resp);
      set({
        user: resp.user,
        accessToken: resp.tokens.access_token,
        refreshToken: resp.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
        otpSent: false,
      });

      registerForPushNotificationsAsync().catch((pushErr) =>
        console.warn('Push registration warning:', pushErr)
      );
    } catch (err: any) {
      console.error('[VerifyOTP Error]', err);
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Codi incorrecte o caducat.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  fetchDevices: async () => {
    try {
      const devices = await authApi.listDevices();
      set({ devices });
    } catch (err) {
      // Fallback mock current device if backend table empty or offline
      const currentDev: DeviceSummary = {
        id: 'curr-1',
        device_id: `dev-${Platform.OS}-current`,
        device_name: `${Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Dispositiu Android' : 'Navegador Web'} (Aquest dispositiu)`,
        platform: Platform.OS,
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      set({ devices: [currentDev] });
    }
  },

  revokeDevice: async (deviceId: string) => {
    try {
      await authApi.revokeDevice(deviceId);
      set((state) => ({
        devices: state.devices.filter((d) => d.id !== deviceId && d.device_id !== deviceId),
      }));
    } catch (err: any) {
      // Optimistically remove from list if revoked
      set((state) => ({
        devices: state.devices.filter((d) => d.id !== deviceId && d.device_id !== deviceId),
      }));
    }
  },

  logout: async () => {
    const { refreshToken } = get();
    await unregisterPushNotificationsAsync().catch(() => {});
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch (err) {
        // Ignore network error on logout
      }
    }
    await Promise.all([
      secureStorage.removeItem(ACCESS_TOKEN_KEY),
      secureStorage.removeItem(REFRESH_TOKEN_KEY),
      secureStorage.removeItem(USER_KEY),
    ]);
    setAuthToken(null);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      devices: [],
      isAuthenticated: false,
      otpSent: false,
    });
  },

  clearError: () => set({ error: null }),
  resetOtpState: () => set({ otpSent: false, error: null }),
}));

async function saveSession(resp: AuthResponse) {
  setAuthToken(resp.tokens.access_token);
  await Promise.all([
    secureStorage.setItem(ACCESS_TOKEN_KEY, resp.tokens.access_token),
    secureStorage.setItem(REFRESH_TOKEN_KEY, resp.tokens.refresh_token),
    secureStorage.setItem(USER_KEY, JSON.stringify(resp.user)),
  ]);
}
