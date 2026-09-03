import { create } from 'zustand';
import { Notification, PushTokenRequest } from './types';
import { notificationsApi } from './api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: (limit?: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  registerPushToken: (data: PushTokenRequest) => Promise<void>;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (limit?: number) => {
    set({ isLoading: true, error: null });
    try {
      const notifications = await notificationsApi.listNotifications(limit);
      const unreadCount = notifications.filter((n) => !n.read).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.response?.data?.error?.message || 'Error carregant les notificacions',
        isLoading: false,
      });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      await notificationsApi.markNotificationAsRead(notificationId);
      const updated = get().notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
      const unreadCount = updated.filter((n) => !n.read).length;
      set({ notifications: updated, unreadCount });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.response?.data?.error?.message || 'Error marcant com a llegida',
      });
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllNotificationsAsRead();
      const updated = get().notifications.map((n) => ({ ...n, read: true }));
      set({ notifications: updated, unreadCount: 0 });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.response?.data?.error?.message || 'Error marcant totes com a llegides',
      });
    }
  },

  registerPushToken: async (data: PushTokenRequest) => {
    try {
      await notificationsApi.registerPushToken(data);
    } catch (err: any) {
      // push token registration failure
    }
  },

  clearError: () => set({ error: null }),
}));
