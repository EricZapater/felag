import { create } from 'zustand';
import { communityApi } from './api';
import {
  Comment,
  CommunityReportRequest,
  CreateLiveMomentRequest,
  CreateRecommendationRequest,
  DestinationDetail,
  DestinationSummary,
  LiveMoment,
  OriginFilter,
  PhotoSharingMode,
  Recommendation,
  RecommendationCategoryFilter,
  SortOrder,
} from './types';

interface CommunityState {
  destinations: DestinationSummary[];
  currentDestination: DestinationDetail | null;
  recommendations: Recommendation[];
  commentsByRecId: Record<string, Comment[]>;
  selectedCategory: RecommendationCategoryFilter;
  selectedOriginFilter: OriginFilter;
  selectedSort: SortOrder;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  fetchDestinations: (q?: string) => Promise<void>;
  fetchDestinationDetail: (id: string) => Promise<void>;
  fetchRecommendations: (
    destinationId: string,
    category?: RecommendationCategoryFilter,
    originFilter?: OriginFilter,
    sort?: SortOrder
  ) => Promise<void>;
  createRecommendation: (
    destinationId: string,
    req: CreateRecommendationRequest
  ) => Promise<Recommendation>;
  toggleVote: (recommendationId: string) => Promise<void>;
  fetchComments: (recommendationId: string) => Promise<void>;
  addComment: (recommendationId: string, content: string) => Promise<Comment>;
  reportContent: (req: CommunityReportRequest) => Promise<void>;
  updatePhotoSharing: (tripId: string, mode: PhotoSharingMode) => Promise<void>;

  setCategory: (cat: RecommendationCategoryFilter) => void;
  setOriginFilter: (filter: OriginFilter) => void;
  setSort: (sort: SortOrder) => void;
  setSearchQuery: (q: string) => void;
  clearError: () => void;
  clearCurrentDestination: () => void;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  destinations: [],
  currentDestination: null,
  recommendations: [],
  commentsByRecId: {},
  selectedCategory: 'all',
  selectedOriginFilter: 'all',
  selectedSort: 'useful',
  searchQuery: '',
  isLoading: false,
  error: null,

  fetchDestinations: async (q?: string) => {
    set({ isLoading: true, error: null });
    try {
      const destinations = await communityApi.getDestinations(q);
      set({ destinations, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || err.response?.data?.message || 'Error carregant les destinacions',
        isLoading: false,
      });
    }
  },

  fetchDestinationDetail: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const destination = await communityApi.getDestination(id);
      set({ currentDestination: destination, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || err.response?.data?.message || 'Error carregant el detall de la destinació',
        isLoading: false,
      });
    }
  },

  fetchRecommendations: async (
    destinationId: string,
    category?: RecommendationCategoryFilter,
    originFilter?: OriginFilter,
    sort?: SortOrder
  ) => {
    const activeCat = category !== undefined ? category : get().selectedCategory;
    const activeOrigin = originFilter !== undefined ? originFilter : get().selectedOriginFilter;
    const activeSort = sort !== undefined ? sort : get().selectedSort;

    set({ isLoading: true, error: null });
    try {
      const recommendations = await communityApi.getRecommendations(destinationId, {
        category: activeCat,
        origin_filter: activeOrigin,
        sort: activeSort,
      });
      set({ recommendations, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || err.response?.data?.message || 'Error carregant les recomanacions',
        isLoading: false,
      });
    }
  },

  createRecommendation: async (
    destinationId: string,
    req: CreateRecommendationRequest
  ): Promise<Recommendation> => {
    set({ isLoading: true, error: null });
    try {
      const created = await communityApi.createRecommendation(destinationId, req);
      set((state) => ({
        recommendations: [created, ...state.recommendations],
        isLoading: false,
      }));
      return created;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error creant la recomanació';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  toggleVote: async (recommendationId: string) => {
    try {
      const res = await communityApi.voteRecommendation(recommendationId);
      set((state) => ({
        recommendations: state.recommendations.map((r) =>
          r.id === recommendationId
            ? { ...r, user_has_voted: res.voted, useful_votes_count: res.useful_votes_count }
            : r
        ),
      }));
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error votant la recomanació';
      set({ error: msg });
    }
  },

  fetchComments: async (recommendationId: string) => {
    try {
      const comments = await communityApi.getComments(recommendationId);
      set((state) => ({
        commentsByRecId: {
          ...state.commentsByRecId,
          [recommendationId]: comments,
        },
      }));
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error carregant els comentaris';
      set({ error: msg });
    }
  },

  addComment: async (recommendationId: string, content: string): Promise<Comment> => {
    try {
      const comment = await communityApi.addComment(recommendationId, { content });
      set((state) => {
        const existing = state.commentsByRecId[recommendationId] || [];
        return {
          commentsByRecId: {
            ...state.commentsByRecId,
            [recommendationId]: [...existing, comment],
          },
          recommendations: state.recommendations.map((r) =>
            r.id === recommendationId
              ? { ...r, comments_count: (r.comments_count || 0) + 1 }
              : r
          ),
        };
      });
      return comment;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error afegint el comentari';
      set({ error: msg });
      throw err;
    }
  },

  reportContent: async (req: CommunityReportRequest) => {
    try {
      await communityApi.reportContent(req);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error enviant la denúncia';
      set({ error: msg });
      throw err;
    }
  },

  updatePhotoSharing: async (tripId: string, mode: PhotoSharingMode) => {
    try {
      await communityApi.updatePhotoSharing(tripId, mode);
      if (get().currentDestination) {
        set((state) => ({
          currentDestination: state.currentDestination
            ? { ...state.currentDestination, user_photo_sharing_mode: mode }
            : null,
        }));
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error actualitzant la privadesa de fotos';
      set({ error: msg });
      throw err;
    }
  },

  setCategory: (category: RecommendationCategoryFilter) => {
    set({ selectedCategory: category });
  },

  setOriginFilter: (originFilter: OriginFilter) => {
    set({ selectedOriginFilter: originFilter });
  },

  setSort: (sort: SortOrder) => {
    set({ selectedSort: sort });
  },

  setSearchQuery: (searchQuery: string) => {
    set({ searchQuery });
  },

  clearError: () => set({ error: null }),
  clearCurrentDestination: () => set({ currentDestination: null, recommendations: [] }),
}));

interface LiveFeedState {
  moments: LiveMoment[];
  activeFelagisCount: number;
  isLoading: boolean;
  error: string | null;
  isForbidden: boolean;

  fetchLiveFeed: (destinationId: string) => Promise<void>;
  postMoment: (destinationId: string, req: CreateLiveMomentRequest) => Promise<LiveMoment>;
  clearLiveFeed: () => void;
}

export const useLiveFeedStore = create<LiveFeedState>((set) => ({
  moments: [],
  activeFelagisCount: 0,
  isLoading: false,
  error: null,
  isForbidden: false,

  fetchLiveFeed: async (destinationId: string) => {
    set({ isLoading: true, error: null, isForbidden: false });
    try {
      const res = await communityApi.getLiveFeed(destinationId);
      set({
        moments: res.moments || [],
        activeFelagisCount: res.active_felagis_count || 0,
        isLoading: false,
        isForbidden: false,
      });
    } catch (err: any) {
      if (err.response?.status === 403) {
        set({
          isForbidden: true,
          isLoading: false,
          error: 'No tens un viatge actiu a aquesta destinació o tens la privadesa restringida.',
        });
      } else {
        set({
          error: err.response?.data?.error || err.response?.data?.message || 'Error carregant el feed en viu',
          isLoading: false,
        });
      }
    }
  },

  postMoment: async (destinationId: string, req: CreateLiveMomentRequest): Promise<LiveMoment> => {
    set({ isLoading: true, error: null });
    try {
      const moment = await communityApi.postLiveMoment(destinationId, req);
      set((state) => ({
        moments: [moment, ...state.moments],
        isLoading: false,
      }));
      return moment;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error publicant la foto';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  clearLiveFeed: () => set({ moments: [], activeFelagisCount: 0, error: null, isForbidden: false }),
}));
