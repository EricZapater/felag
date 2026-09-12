import { apiClient } from '@/api/client';
import {
  AuthResponse,
  DeviceSummary,
  LoginRequest,
  OTPRequest,
  OTPVerifyRequest,
  RegisterRequest,
  TokenResponse,
  User,
} from './types';

export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/v1/auth/register', data);
    return res.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/v1/auth/login', data);
    return res.data;
  },

  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    });
    return res.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout', { refresh_token: refreshToken });
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await apiClient.get<User>('/api/v1/auth/me');
    return res.data;
  },

  requestOTP: async (data: OTPRequest): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/api/v1/auth/otp/request', data);
    return res.data;
  },

  verifyOTP: async (data: OTPVerifyRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/v1/auth/otp/verify', data);
    return res.data;
  },

  listDevices: async (): Promise<DeviceSummary[]> => {
    const res = await apiClient.get<DeviceSummary[]>('/api/v1/auth/devices');
    return res.data;
  },

  revokeDevice: async (deviceId: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/api/v1/auth/devices/${deviceId}`);
    return res.data;
  },
};
