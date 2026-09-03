import { apiClient } from '@/api/client';
import {
  Notification,
  PushTokenRequest,
  SuccessResponse,
} from './types';

export const notificationsApi = {
  listNotifications: async (limit: number = 20): Promise<Notification[]> => {
    const response = await apiClient.get<Notification[]>('/api/v1/notifications', {
      params: { limit },
    });
    return response.data;
  },

  markNotificationAsRead: async (notificationId: string): Promise<SuccessResponse> => {
    const response = await apiClient.put<SuccessResponse>(
      `/api/v1/notifications/${notificationId}/read`
    );
    return response.data;
  },

  markAllNotificationsAsRead: async (): Promise<SuccessResponse> => {
    const response = await apiClient.put<SuccessResponse>('/api/v1/notifications/read-all');
    return response.data;
  },

  registerPushToken: async (data: PushTokenRequest): Promise<SuccessResponse> => {
    const response = await apiClient.post<SuccessResponse>(
      '/api/v1/notifications/push-token',
      data
    );
    return response.data;
  },

  unregisterPushToken: async (data: PushTokenRequest): Promise<SuccessResponse> => {
    const response = await apiClient.delete<SuccessResponse>(
      '/api/v1/notifications/push-token',
      { data }
    );
    return response.data;
  },
};
