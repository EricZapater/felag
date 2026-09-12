import { create } from 'zustand';
import { inspirationApi, INSPIRATION_CATEGORIES } from './api';
import {
  GetInspirationParams,
  InspirationCategory,
  InspirationCategoryOption,
  InspirationItem,
} from './types';

const PAGE_SIZE = 15;

interface InspirationState {
  items: InspirationItem[];
  categories: InspirationCategoryOption[];
  selectedCategory: InspirationCategory;
  searchQuery: string;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  total: number;
  error: string | null;

  fetchInspiration: (params?: GetInspirationParams, isRefresh?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  setCategory: (category: InspirationCategory) => void;
  setSearchQuery: (query: string) => void;
  toggleVote: (itemId: string) => Promise<void>;
  clearError: () => void;
}

export const useInspirationStore = create<InspirationState>((set, get) => ({
  items: [],
  categories: INSPIRATION_CATEGORIES,
  selectedCategory: 'all',
  searchQuery: '',
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  hasMore: true,
  total: 0,
  error: null,

  fetchInspiration: async (params?: GetInspirationParams, isRefresh = false) => {
    if (isRefresh) {
      set({ isRefreshing: true, error: null });
    } else {
      set({ isLoading: true, error: null });
    }

    try {
      const q = params?.q !== undefined ? params.q : get().searchQuery;
      const category =
        params?.category !== undefined ? params.category : get().selectedCategory;

      const response = await inspirationApi.getInspirationFeed({
        q: q || undefined,
        category: category !== 'all' ? category : undefined,
        country_code: params?.country_code,
        limit: params?.limit || PAGE_SIZE,
        offset: 0,
      });

      const total = response.total ?? response.items.length;
      const hasMore = response.items.length < total;

      set({
        items: response.items,
        total,
        hasMore,
        categories: response.categories || INSPIRATION_CATEGORIES,
        isLoading: false,
        isRefreshing: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        isRefreshing: false,
        error: err.message || 'Error en carregar les propostes d’inspiració',
      });
    }
  },

  loadMore: async () => {
    const { items, total, hasMore, isLoadingMore, isLoading, isRefreshing, searchQuery, selectedCategory } =
      get();
    if (isLoadingMore || isLoading || isRefreshing || !hasMore || items.length >= total) {
      return;
    }

    set({ isLoadingMore: true });
    try {
      const response = await inspirationApi.getInspirationFeed({
        q: searchQuery || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        limit: PAGE_SIZE,
        offset: items.length,
      });

      const newItems = response.items.filter(
        (newItem) => !items.some((existing) => existing.id === newItem.id)
      );
      const combined = [...items, ...newItems];
      const newTotal = response.total ?? combined.length;

      set({
        items: combined,
        total: newTotal,
        hasMore: combined.length < newTotal && newItems.length > 0,
        isLoadingMore: false,
      });
    } catch (err: any) {
      set({ isLoadingMore: false });
    }
  },

  setCategory: (category: InspirationCategory) => {
    set({ selectedCategory: category });
    get().fetchInspiration({ category });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    get().fetchInspiration({ q: query });
  },

  toggleVote: async (itemId: string) => {
    const rawId = itemId.startsWith('rec-') ? itemId.replace('rec-', '') : itemId;
    const currentItems = get().items;
    const item = currentItems.find((i) => i.id === itemId);
    if (!item || item.type !== 'recommendation') return;

    // Optimistic UI update
    const previousVoted = !!item.user_has_voted;
    const previousCount = item.useful_votes_count || 0;
    const nextVoted = !previousVoted;
    const nextCount = nextVoted ? previousCount + 1 : Math.max(0, previousCount - 1);

    set({
      items: currentItems.map((i) =>
        i.id === itemId
          ? { ...i, user_has_voted: nextVoted, useful_votes_count: nextCount }
          : i
      ),
    });

    try {
      const res = await inspirationApi.voteRecommendation(rawId);
      set({
        items: get().items.map((i) =>
          i.id === itemId
            ? { ...i, user_has_voted: res.voted, useful_votes_count: res.useful_votes_count }
            : i
        ),
      });
    } catch {
      // Revert on failure
      set({
        items: get().items.map((i) =>
          i.id === itemId
            ? { ...i, user_has_voted: previousVoted, useful_votes_count: previousCount }
            : i
        ),
      });
    }
  },

  clearError: () => set({ error: null }),
}));
