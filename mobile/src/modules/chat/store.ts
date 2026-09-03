import { create } from 'zustand';
import { chatApi } from './api';
import { wsClient } from './wsClient';
import {
  BlockedUser,
  Conversation,
  Message,
  ReportReason,
} from './types';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Record<string, Message[]>;
  blockedUsers: BlockedUser[];
  totalUnreadCount: number;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  isWsConnected: boolean;
  error: string | null;

  fetchConversations: () => Promise<void>;
  createOrGetConversation: (recipientId: string, matchId?: string) => Promise<Conversation>;
  fetchMessages: (conversationId: string, limit?: number) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<Message>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  handleIncomingMessage: (message: Message) => void;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  fetchBlockedUsers: () => Promise<void>;
  reportUser: (userId: string, reason: ReportReason, details: string) => Promise<void>;
  initWebSocket: (token: string) => void;
  closeWebSocket: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: {},
  blockedUsers: [],
  totalUnreadCount: 0,
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSending: false,
  isWsConnected: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoadingConversations: true, error: null });
    try {
      const conversations = await chatApi.listConversations();
      const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
      set({
        conversations,
        totalUnreadCount: totalUnread,
        isLoadingConversations: false,
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error en carregar les converses';
      set({ error: msg, isLoadingConversations: false });
    }
  },

  createOrGetConversation: async (recipientId: string, matchId?: string) => {
    set({ error: null });
    try {
      const conversation = await chatApi.createOrGetConversation({
        recipient_id: recipientId,
        match_id: matchId,
      });
      // Add or replace in conversations array
      const existing = get().conversations;
      const index = existing.findIndex((c) => c.id === conversation.id);
      let updated: Conversation[];
      if (index >= 0) {
        updated = [...existing];
        updated[index] = conversation;
      } else {
        updated = [conversation, ...existing];
      }
      set({ conversations: updated });
      return conversation;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error en iniciar la conversa';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  fetchMessages: async (conversationId: string, limit: number = 50) => {
    set({ isLoadingMessages: true, currentConversationId: conversationId, error: null });
    try {
      const msgs = await chatApi.getConversationMessages(conversationId, limit);
      // Sort messages chronologically (oldest first)
      const sorted = [...msgs].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: sorted,
        },
        isLoadingMessages: false,
      }));
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error en carregar els missatges';
      set({ error: msg, isLoadingMessages: false });
    }
  },

  sendMessage: async (conversationId: string, content: string) => {
    if (!content.trim()) {
      throw new Error('El missatge no pot estar buit');
    }
    set({ isSending: true, error: null });
    try {
      const sent = await chatApi.sendMessage(conversationId, { content: content.trim() });
      set((state) => {
        const currentMsgs = state.messages[conversationId] || [];
        // Avoid duplicate if received via WS
        const exists = currentMsgs.some((m) => m.id === sent.id);
        const updatedMsgs = exists ? currentMsgs : [...currentMsgs, sent];

        // Update conversation last_message_preview and last_message_at
        const updatedConvs = state.conversations.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              last_message_preview: sent.content,
              last_message_at: sent.created_at,
            };
          }
          return c;
        });

        return {
          messages: {
            ...state.messages,
            [conversationId]: updatedMsgs,
          },
          conversations: updatedConvs,
          isSending: false,
        };
      });
      return sent;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error en enviar el missatge';
      set({ error: msg, isSending: false });
      throw new Error(msg);
    }
  },

  markConversationAsRead: async (conversationId: string) => {
    try {
      await chatApi.markConversationAsRead(conversationId);
      set((state) => {
        const updatedConvs = state.conversations.map((c) => {
          if (c.id === conversationId) {
            return { ...c, unread_count: 0 };
          }
          return c;
        });
        const totalUnread = updatedConvs.reduce((acc, c) => acc + (c.unread_count || 0), 0);
        return {
          conversations: updatedConvs,
          totalUnreadCount: totalUnread,
        };
      });
    } catch (err) {
      // Non-critical, ignore silent fail
    }
  },

  handleIncomingMessage: (message: Message) => {
    set((state) => {
      const convId = message.conversation_id;
      const currentMsgs = state.messages[convId] || [];
      if (currentMsgs.some((m) => m.id === message.id)) {
        return state;
      }
      const updatedMsgs = [...currentMsgs, message].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const isCurrentActive = state.currentConversationId === convId;

      const updatedConvs = state.conversations.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            last_message_preview: message.content,
            last_message_at: message.created_at,
            unread_count: isCurrentActive ? 0 : (c.unread_count || 0) + 1,
          };
        }
        return c;
      });

      const totalUnread = updatedConvs.reduce((acc, c) => acc + (c.unread_count || 0), 0);

      return {
        messages: {
          ...state.messages,
          [convId]: updatedMsgs,
        },
        conversations: updatedConvs,
        totalUnreadCount: totalUnread,
      };
    });
  },

  blockUser: async (userId: string) => {
    set({ error: null });
    try {
      await chatApi.blockUser(userId);
      // Remove or refresh blocked users
      await get().fetchBlockedUsers();
      // Optionally remove related conversations
      set((state) => ({
        conversations: state.conversations.filter(
          (c) => c.other_participant.id !== userId
        ),
      }));
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error en bloquejar l’usuari';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  unblockUser: async (userId: string) => {
    set({ error: null });
    try {
      await chatApi.unblockUser(userId);
      await get().fetchBlockedUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error en desbloquejar l’usuari';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  fetchBlockedUsers: async () => {
    try {
      const blocked = await chatApi.listBlockedUsers();
      set({ blockedUsers: blocked });
    } catch (err) {
      // Silent fail
    }
  },

  reportUser: async (userId: string, reason: ReportReason, details: string) => {
    set({ error: null });
    try {
      await chatApi.reportUser(userId, { reason, details });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error en denunciar l’usuari';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  initWebSocket: (token: string) => {
    wsClient.connect(token);
    wsClient.addMessageListener((msg) => {
      get().handleIncomingMessage(msg);
    });
    wsClient.addStatusListener((connected) => {
      set({ isWsConnected: connected });
    });
  },

  closeWebSocket: () => {
    wsClient.disconnect();
    set({ isWsConnected: false });
  },
}));
