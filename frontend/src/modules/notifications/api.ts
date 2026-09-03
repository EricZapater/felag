import { apiClient } from '@/api/client';
import { Notification, PushTokenRequest, SuccessResponse } from './types';

export const notificationsApi = {
  listNotifications: async (limit: number = 20): Promise<Notification[]> => {
    const res = await apiClient.get<Notification[]>('/api/v1/notifications', {
      params: { limit },
    });
    return res.data;
  },

  markNotificationAsRead: async (notificationId: string): Promise<SuccessResponse> => {
    const res = await apiClient.put<SuccessResponse>(`/api/v1/notifications/${notificationId}/read`);
    return res.data;
  },

  markAllNotificationsAsRead: async (): Promise<SuccessResponse> => {
    const res = await apiClient.put<SuccessResponse>('/api/v1/notifications/read-all');
    return res.data;
  },

  registerPushToken: async (data: PushTokenRequest): Promise<SuccessResponse> => {
    const res = await apiClient.post<SuccessResponse>('/api/v1/notifications/push-token', data);
    return res.data;
  },

  unregisterPushToken: async (data: PushTokenRequest): Promise<SuccessResponse> => {
    const res = await apiClient.delete<SuccessResponse>('/api/v1/notifications/push-token', {
      data,
    });
    return res.data;
  },
};
