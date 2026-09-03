import { apiClient } from '@/api/client';
import {
  Comment,
  CommunityReportRequest,
  CreateCommentRequest,
  CreateLiveMomentRequest,
  CreateRecommendationRequest,
  DestinationDetail,
  DestinationSummary,
  LiveFeedResponse,
  LiveMoment,
  PhotoSharingMode,
  Recommendation,
  SuccessResponse,
  VoteResponse,
} from './types';

export const communityApi = {
  searchDestinations: async (q?: string, limit: number = 20): Promise<DestinationSummary[]> => {
    const params: Record<string, any> = { limit };
    if (q && q.trim()) {
      params.q = q.trim();
    }
    const res = await apiClient.get<DestinationSummary[]>('/api/v1/destinations', { params });
    return res.data;
  },

  getDestinationDetail: async (id: string): Promise<DestinationDetail> => {
    const res = await apiClient.get<DestinationDetail>(`/api/v1/destinations/${id}`);
    return res.data;
  },

  getRecommendations: async (
    destinationId: string,
    filters?: {
      category?: string;
      origin_filter?: string;
      sort?: string;
    }
  ): Promise<Recommendation[]> => {
    const params: Record<string, any> = {};
    if (filters?.category && filters.category !== 'all') {
      params.category = filters.category;
    }
    if (filters?.origin_filter && filters.origin_filter !== 'all') {
      params.origin_filter = filters.origin_filter;
    }
    if (filters?.sort) {
      params.sort = filters.sort;
    }
    const res = await apiClient.get<Recommendation[]>(
      `/api/v1/destinations/${destinationId}/recommendations`,
      { params }
    );
    return res.data;
  },

  createRecommendation: async (
    destinationId: string,
    data: CreateRecommendationRequest
  ): Promise<Recommendation> => {
    const res = await apiClient.post<Recommendation>(
      `/api/v1/destinations/${destinationId}/recommendations`,
      data
    );
    return res.data;
  },

  toggleVote: async (recommendationId: string): Promise<VoteResponse> => {
    const res = await apiClient.post<VoteResponse>(
      `/api/v1/recommendations/${recommendationId}/vote`
    );
    return res.data;
  },

  getComments: async (recommendationId: string): Promise<Comment[]> => {
    const res = await apiClient.get<Comment[]>(
      `/api/v1/recommendations/${recommendationId}/comments`
    );
    return res.data;
  },

  createComment: async (
    recommendationId: string,
    data: CreateCommentRequest
  ): Promise<Comment> => {
    const res = await apiClient.post<Comment>(
      `/api/v1/recommendations/${recommendationId}/comments`,
      data
    );
    return res.data;
  },

  getLiveFeed: async (destinationId: string): Promise<LiveFeedResponse> => {
    const res = await apiClient.get<LiveFeedResponse>(
      `/api/v1/destinations/${destinationId}/live-feed`
    );
    return res.data;
  },

  createLiveMoment: async (
    destinationId: string,
    data: CreateLiveMomentRequest
  ): Promise<LiveMoment> => {
    const res = await apiClient.post<LiveMoment>(
      `/api/v1/destinations/${destinationId}/live-feed`,
      data
    );
    return res.data;
  },

  updatePhotoSharingMode: async (
    tripId: string,
    mode: PhotoSharingMode
  ): Promise<SuccessResponse> => {
    const res = await apiClient.put<SuccessResponse>(`/api/v1/trips/${tripId}/photo-sharing`, {
      photo_sharing_mode: mode,
    });
    return res.data;
  },

  reportContent: async (data: CommunityReportRequest): Promise<SuccessResponse> => {
    const res = await apiClient.post<SuccessResponse>('/api/v1/community/report', data);
    return res.data;
  },
};
