import { apiClient } from '@/api/client';
import {
  Conversation,
  CreateConversationRequest,
  Message,
  SendMessageRequest,
  SuccessResponse,
  BlockedUser,
  ReportUserRequest,
} from './types';

export const chatApi = {
  listConversations: async (): Promise<Conversation[]> => {
    const response = await apiClient.get<Conversation[]>('/api/v1/conversations');
    return response.data;
  },

  createOrGetConversation: async (data: CreateConversationRequest): Promise<Conversation> => {
    const response = await apiClient.post<Conversation>('/api/v1/conversations', data);
    return response.data;
  },

  getConversationMessages: async (conversationId: string, limit = 50): Promise<Message[]> => {
    const response = await apiClient.get<Message[]>(
      `/api/v1/conversations/${conversationId}/messages`,
      { params: { limit } }
    );
    return response.data;
  },

  sendMessage: async (conversationId: string, data: SendMessageRequest): Promise<Message> => {
    const response = await apiClient.post<Message>(
      `/api/v1/conversations/${conversationId}/messages`,
      data
    );
    return response.data;
  },

  markConversationAsRead: async (conversationId: string): Promise<SuccessResponse> => {
    const response = await apiClient.put<SuccessResponse>(
      `/api/v1/conversations/${conversationId}/read`
    );
    return response.data;
  },

  blockUser: async (userId: string): Promise<SuccessResponse> => {
    const response = await apiClient.post<SuccessResponse>(`/api/v1/users/${userId}/block`);
    return response.data;
  },

  unblockUser: async (userId: string): Promise<SuccessResponse> => {
    const response = await apiClient.delete<SuccessResponse>(`/api/v1/users/${userId}/block`);
    return response.data;
  },

  listBlockedUsers: async (): Promise<BlockedUser[]> => {
    const response = await apiClient.get<BlockedUser[]>('/api/v1/users/blocked');
    return response.data;
  },

  reportUser: async (userId: string, data: ReportUserRequest): Promise<SuccessResponse> => {
    const response = await apiClient.post<SuccessResponse>(
      `/api/v1/users/${userId}/report`,
      data
    );
    return response.data;
  },
};
