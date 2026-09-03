import { create } from 'zustand';
import {
  Conversation,
  Message,
  BlockedUser,
  ReportUserReason,
} from './types';
import { chatApi } from './api';
import { chatWsClient } from './wsClient';

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  blockedUsers: BlockedUser[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  wsConnected: boolean;

  fetchConversations: () => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<Message | null>;
  createOrGetConversation: (recipientId: string, matchId?: string) => Promise<Conversation>;
  markAsRead: (conversationId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  fetchBlockedUsers: () => Promise<void>;
  reportUser: (userId: string, reason: ReportUserReason, details: string) => Promise<void>;
  handleIncomingMessage: (message: Message) => void;
  initWebSocket: () => () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  blockedUsers: [],
  isLoading: false,
  isSending: false,
  error: null,
  wsConnected: false,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await chatApi.listConversations();
      set({ conversations, isLoading: false });
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error en carregar les converses',
        isLoading: false,
      });
    }
  },

  setActiveConversation: (conversation: Conversation | null) => {
    set({ activeConversation: conversation });
    if (conversation) {
      get().markAsRead(conversation.id);
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const messages = await chatApi.getConversationMessages(conversationId);
      set({ messages, isLoading: false });
      // Mark as read when messages are loaded
      get().markAsRead(conversationId);
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error en carregar els missatges',
        isLoading: false,
      });
    }
  },

  sendMessage: async (conversationId: string, content: string) => {
    if (!content.trim()) return null;
    set({ isSending: true, error: null });
    try {
      const message = await chatApi.sendMessage(conversationId, { content });

      // Add to messages list if currently in this conversation
      const currentMessages = get().messages;
      if (!currentMessages.some((m) => m.id === message.id)) {
        set({ messages: [...currentMessages, message] });
      }

      // Update conversations list preview
      const conversations = get().conversations.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            last_message_preview: content,
            last_message_at: message.created_at || new Date().toISOString(),
          };
        }
        return c;
      });

      // Sort conversations so the latest is at top
      conversations.sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      set({ conversations, isSending: false });
      return message;
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        'Error en enviar el missatge';
      set({ error: msg, isSending: false });
      throw new Error(msg);
    }
  },

  createOrGetConversation: async (recipientId: string, matchId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const conversation = await chatApi.createOrGetConversation({
        recipient_id: recipientId,
        match_id: matchId,
      });

      // Update conversations list
      const existingIndex = get().conversations.findIndex((c) => c.id === conversation.id);
      if (existingIndex >= 0) {
        const updated = [...get().conversations];
        updated[existingIndex] = conversation;
        set({ conversations: updated, activeConversation: conversation, isLoading: false });
      } else {
        set({
          conversations: [conversation, ...get().conversations],
          activeConversation: conversation,
          isLoading: false,
        });
      }

      return conversation;
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        'Error en crear la conversa';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  markAsRead: async (conversationId: string) => {
    try {
      await chatApi.markConversationAsRead(conversationId);
      // Update unread count locally
      set({
        conversations: get().conversations.map((c) =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        ),
      });
    } catch (err) {
      // Ignore read marking failure
    }
  },

  blockUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      await chatApi.blockUser(userId);
      // Remove conversation with blocked user if present
      set({
        conversations: get().conversations.filter((c) => c.other_participant.id !== userId),
        isLoading: false,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        'Error en bloquejar l’usuari';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  unblockUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      await chatApi.unblockUser(userId);
      set({
        blockedUsers: get().blockedUsers.filter((u) => u.user_id !== userId),
        isLoading: false,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        'Error en desbloquejar l’usuari';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchBlockedUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const blockedUsers = await chatApi.listBlockedUsers();
      set({ blockedUsers, isLoading: false });
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error en carregar els usuaris bloquejats',
        isLoading: false,
      });
    }
  },

  reportUser: async (userId: string, reason: ReportUserReason, details: string) => {
    set({ isLoading: true, error: null });
    try {
      await chatApi.reportUser(userId, { reason, details });
      set({ isLoading: false });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        'Error en trametre la denúncia';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  handleIncomingMessage: (message: Message) => {
    const { activeConversation, messages, conversations } = get();

    // If currently active conversation matches message
    if (activeConversation && activeConversation.id === message.conversation_id) {
      if (!messages.some((m) => m.id === message.id)) {
        set({ messages: [...messages, message] });
      }
      // Auto mark as read
      get().markAsRead(message.conversation_id);
    }

    // Update conversation list
    const updatedConversations = conversations.map((c) => {
      if (c.id === message.conversation_id) {
        const isCurrent = activeConversation?.id === message.conversation_id;
        return {
          ...c,
          last_message_preview: message.content,
          last_message_at: message.created_at,
          unread_count: isCurrent ? 0 : c.unread_count + 1,
        };
      }
      return c;
    });

    // Reorder
    updatedConversations.sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    set({ conversations: updatedConversations });
  },

  initWebSocket: () => {
    chatWsClient.connect();

    const unsubStatus = chatWsClient.onStatusChange((connected) => {
      set({ wsConnected: connected });
    });

    const unsubMessage = chatWsClient.onMessage((msg) => {
      get().handleIncomingMessage(msg);
    });

    return () => {
      unsubStatus();
      unsubMessage();
    };
  },

  clearError: () => set({ error: null }),
}));
