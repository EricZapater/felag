import { create } from 'zustand';
import { notificationsApi } from './api';
import { Notification } from './types';
import { registerPushTokenService } from './services/pushTokenService';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: (limit?: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  registerPushToken: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const notifications = await notificationsApi.listNotifications(limit);
      const unreadCount = notifications.filter((n) => !n.read).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error en carregar les notificacions';
      set({ error: msg, isLoading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      await notificationsApi.markNotificationAsRead(notificationId);
      const updated = get().notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      const unreadCount = updated.filter((n) => !n.read).length;
      set({ notifications: updated, unreadCount });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error en marcar la notificació com a llegida';
      set({ error: msg });
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllNotificationsAsRead();
      const updated = get().notifications.map((n) => ({ ...n, read: true }));
      set({ notifications: updated, unreadCount: 0 });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error en marcar totes com a llegides';
      set({ error: msg });
    }
  },

  registerPushToken: async () => {
    await registerPushTokenService();
  },
}));
