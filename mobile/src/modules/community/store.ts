import { create } from 'zustand';
import { communityApi } from './api';
import {
  Comment,
  CommunityReportRequest,
  CreateCommentRequest,
  CreateLiveMomentRequest,
  CreateRecommendationRequest,
  DestinationDetail,
  DestinationSummary,
  LiveMoment,
  OriginFilter,
  PhotoSharingMode,
  Recommendation,
  RecommendationCategory,
  SortBy,
} from './types';

interface CommunityState {
  destinations: DestinationSummary[];
  currentDestination: DestinationDetail | null;
  recommendations: Recommendation[];
  selectedCategory: RecommendationCategory;
  originFilter: OriginFilter;
  sortBy: SortBy;
  isLoading: boolean;
  error: string | null;

  searchDestinations: (q?: string) => Promise<void>;
  fetchDestinationDetail: (id: string) => Promise<void>;
  fetchRecommendations: (destinationId: string) => Promise<void>;
  createRecommendation: (
    destinationId: string,
    data: CreateRecommendationRequest
  ) => Promise<Recommendation>;
  toggleVote: (recommendationId: string) => Promise<void>;
  fetchComments: (recommendationId: string) => Promise<Comment[]>;
  addComment: (recommendationId: string, content: string) => Promise<Comment>;
  reportContent: (data: CommunityReportRequest) => Promise<void>;
  setSelectedCategory: (cat: RecommendationCategory) => void;
  setOriginFilter: (filter: OriginFilter) => void;
  setSortBy: (sort: SortBy) => void;
  clearError: () => void;
  clearDestination: () => void;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  destinations: [],
  currentDestination: null,
  recommendations: [],
  selectedCategory: 'all',
  originFilter: 'all',
  sortBy: 'useful',
  isLoading: false,
  error: null,

  searchDestinations: async (q?: string) => {
    set({ isLoading: true, error: null });
    try {
      const destinations = await communityApi.searchDestinations(q);
      set({ destinations, isLoading: false });
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error en cercar destinacions';
      set({ error: msg, isLoading: false });
    }
  },

  fetchDestinationDetail: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const currentDestination = await communityApi.getDestinationDetail(id);
      set({ currentDestination, isLoading: false });
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error en carregar el detall de la destinació';
      set({ error: msg, isLoading: false });
    }
  },

  fetchRecommendations: async (destinationId: string) => {
    const { selectedCategory, originFilter, sortBy } = get();
    set({ isLoading: true, error: null });
    try {
      const recommendations = await communityApi.getRecommendations(destinationId, {
        category: selectedCategory,
        origin_filter: originFilter,
        sort: sortBy,
      });
      set({ recommendations, isLoading: false });
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error en carregar recomanacions';
      set({ error: msg, isLoading: false });
    }
  },

  createRecommendation: async (
    destinationId: string,
    data: CreateRecommendationRequest
  ): Promise<Recommendation> => {
    set({ isLoading: true, error: null });
    try {
      const created = await communityApi.createRecommendation(destinationId, data);
      set((state) => ({
        recommendations: [created, ...state.recommendations],
        isLoading: false,
      }));
      return created;
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error en crear la recomanació';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  toggleVote: async (recommendationId: string) => {
    try {
      const res = await communityApi.toggleVote(recommendationId);
      set((state) => ({
        recommendations: state.recommendations.map((rec) =>
          rec.id === recommendationId
            ? {
                ...rec,
                user_has_voted: res.voted,
                useful_votes_count: res.useful_votes_count,
              }
            : rec
        ),
      }));
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error en votar';
      set({ error: msg });
    }
  },

  fetchComments: async (recommendationId: string) => {
    try {
      return await communityApi.getComments(recommendationId);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error en carregar comentaris';
      set({ error: msg });
      return [];
    }
  },

  addComment: async (recommendationId: string, content: string) => {
    try {
      const comment = await communityApi.createComment(recommendationId, { content });
      set((state) => ({
        recommendations: state.recommendations.map((rec) =>
          rec.id === recommendationId
            ? { ...rec, comments_count: (rec.comments_count || 0) + 1 }
            : rec
        ),
      }));
      return comment;
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error en afegir comentari';
      set({ error: msg });
      throw err;
    }
  },

  reportContent: async (data: CommunityReportRequest) => {
    try {
      await communityApi.reportContent(data);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error en enviar la denúncia';
      set({ error: msg });
      throw err;
    }
  },

  setSelectedCategory: (selectedCategory: RecommendationCategory) => {
    set({ selectedCategory });
  },

  setOriginFilter: (originFilter: OriginFilter) => {
    set({ originFilter });
  },

  setSortBy: (sortBy: SortBy) => {
    set({ sortBy });
  },

  clearError: () => set({ error: null }),

  clearDestination: () =>
    set({
      currentDestination: null,
      recommendations: [],
      error: null,
      isLoading: false,
    }),
}));

interface LiveFeedState {
  moments: LiveMoment[];
  activeFelagisCount: number;
  isLoading: boolean;
  isPosting: boolean;
  error: string | null;

  fetchLiveFeed: (destinationId: string) => Promise<void>;
  createLiveMoment: (
    destinationId: string,
    data: CreateLiveMomentRequest
  ) => Promise<LiveMoment>;
  updatePhotoSharingMode: (tripId: string, mode: PhotoSharingMode) => Promise<void>;
  clearError: () => void;
  clearFeed: () => void;
}

export const useLiveFeedStore = create<LiveFeedState>((set) => ({
  moments: [],
  activeFelagisCount: 0,
  isLoading: false,
  isPosting: false,
  error: null,

  fetchLiveFeed: async (destinationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await communityApi.getLiveFeed(destinationId);
      set({
        moments: res.moments,
        activeFelagisCount: res.active_felagis_count,
        isLoading: false,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error en carregar el feed en viu';
      set({ error: msg, isLoading: false, moments: [] });
    }
  },

  createLiveMoment: async (
    destinationId: string,
    data: CreateLiveMomentRequest
  ): Promise<LiveMoment> => {
    set({ isPosting: true, error: null });
    try {
      const moment = await communityApi.createLiveMoment(destinationId, data);
      set((state) => ({
        moments: [moment, ...state.moments],
        isPosting: false,
      }));
      return moment;
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error en publicar al feed en viu';
      set({ error: msg, isPosting: false });
      throw err;
    }
  },

  updatePhotoSharingMode: async (tripId: string, mode: PhotoSharingMode) => {
    set({ isLoading: true, error: null });
    try {
      await communityApi.updatePhotoSharingMode(tripId, mode);
      set({ isLoading: false });
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error en actualitzar la privadesa de fotos';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),

  clearFeed: () =>
    set({
      moments: [],
      activeFelagisCount: 0,
      error: null,
      isLoading: false,
      isPosting: false,
    }),
}));
