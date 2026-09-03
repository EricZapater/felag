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
  TownSearchResult,
  VoteResponse,
} from './types';

export const communityApi = {
  getDestinations: async (q?: string, limit: number = 20): Promise<DestinationSummary[]> => {
    const params: Record<string, string | number> = { limit };
    if (q) params.q = q;
    const res = await apiClient.get<DestinationSummary[]>('/api/v1/destinations', { params });
    return res.data;
  },

  getDestination: async (id: string): Promise<DestinationDetail> => {
    const res = await apiClient.get<DestinationDetail>(`/api/v1/destinations/${encodeURIComponent(id)}`);
    return res.data;
  },

  getRecommendations: async (
    destinationId: string,
    params?: {
      category?: string;
      origin_filter?: string;
      sort?: string;
    }
  ): Promise<Recommendation[]> => {
    const queryParams: Record<string, string> = {};
    if (params?.category && params.category !== 'all') {
      queryParams.category = params.category;
    }
    if (params?.origin_filter && params.origin_filter !== 'all') {
      queryParams.origin_filter = params.origin_filter;
    }
    if (params?.sort) {
      queryParams.sort = params.sort;
    }
    const res = await apiClient.get<Recommendation[]>(
      `/api/v1/destinations/${encodeURIComponent(destinationId)}/recommendations`,
      { params: queryParams }
    );
    return res.data;
  },

  createRecommendation: async (
    destinationId: string,
    data: CreateRecommendationRequest
  ): Promise<Recommendation> => {
    const res = await apiClient.post<Recommendation>(
      `/api/v1/destinations/${encodeURIComponent(destinationId)}/recommendations`,
      data
    );
    return res.data;
  },

  voteRecommendation: async (recommendationId: string): Promise<VoteResponse> => {
    const res = await apiClient.post<VoteResponse>(
      `/api/v1/recommendations/${encodeURIComponent(recommendationId)}/vote`
    );
    return res.data;
  },

  getComments: async (recommendationId: string): Promise<Comment[]> => {
    const res = await apiClient.get<Comment[]>(
      `/api/v1/recommendations/${encodeURIComponent(recommendationId)}/comments`
    );
    return res.data;
  },

  addComment: async (
    recommendationId: string,
    data: CreateCommentRequest
  ): Promise<Comment> => {
    const res = await apiClient.post<Comment>(
      `/api/v1/recommendations/${encodeURIComponent(recommendationId)}/comments`,
      data
    );
    return res.data;
  },

  getLiveFeed: async (destinationId: string): Promise<LiveFeedResponse> => {
    const res = await apiClient.get<LiveFeedResponse>(
      `/api/v1/destinations/${encodeURIComponent(destinationId)}/live-feed`
    );
    return res.data;
  },

  postLiveMoment: async (
    destinationId: string,
    data: CreateLiveMomentRequest
  ): Promise<LiveMoment> => {
    const res = await apiClient.post<LiveMoment>(
      `/api/v1/destinations/${encodeURIComponent(destinationId)}/live-feed`,
      data
    );
    return res.data;
  },

  updatePhotoSharing: async (
    tripId: string,
    mode: PhotoSharingMode
  ): Promise<SuccessResponse> => {
    const res = await apiClient.put<SuccessResponse>(
      `/api/v1/trips/${encodeURIComponent(tripId)}/photo-sharing`,
      { photo_sharing_mode: mode }
    );
    return res.data;
  },

  reportContent: async (data: CommunityReportRequest): Promise<SuccessResponse> => {
    const res = await apiClient.post<SuccessResponse>('/api/v1/community/report', data);
    return res.data;
  },

  searchTowns: async (q: string): Promise<TownSearchResult[]> => {
    try {
      const res = await apiClient.get<TownSearchResult[]>('/api/v1/geo/towns', {
        params: { search: q },
      });
      return res.data;
    } catch {
      // Fallback to /api/v1/destinations if /geo/towns is not available
      const res = await apiClient.get<DestinationSummary[]>('/api/v1/destinations', {
        params: { q },
      });
      return res.data.map((d) => ({
        id: d.id,
        name: d.name,
        region_name: d.region_name,
        country_name: d.country_name,
        country_code: d.country_code,
      }));
    }
  },
};
