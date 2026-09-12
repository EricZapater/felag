import { create } from 'zustand';
import { inspirationApi, INSPIRATION_CATEGORIES } from './api';
import {
  GetInspirationParams,
  InspirationCategory,
  InspirationCategoryOption,
  InspirationItem,
} from './types';

interface InspirationState {
  items: InspirationItem[];
  categories: InspirationCategoryOption[];
  selectedCategory: InspirationCategory;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  fetchInspiration: (params?: GetInspirationParams) => Promise<void>;
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
  error: null,

  fetchInspiration: async (params?: GetInspirationParams) => {
    set({ isLoading: true, error: null });
    try {
      const q = params?.q !== undefined ? params.q : get().searchQuery;
      const category =
        params?.category !== undefined ? params.category : get().selectedCategory;

      const response = await inspirationApi.getInspirationFeed({
        q: q || undefined,
        category: category !== 'all' ? category : undefined,
        country_code: params?.country_code,
        limit: params?.limit,
        offset: params?.offset,
      });

      set({
        items: response.items,
        categories: response.categories || INSPIRATION_CATEGORIES,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Error en carregar la font d’inspiració',
      });
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
      // Revert if error
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
