import { create } from 'zustand';
import { postTripApi } from './api';
import {
  ActiveTripHubResponse,
  AddTripPhotoRequest,
  CelebrationCard,
  CreateCelebrationCardRequest,
  StoriesCardData,
  TripFeedbackRequest,
  TripPhoto,
  WrapupStatus,
} from './types';

interface PostTripState {
  activeHub: ActiveTripHubResponse | null;
  photos: TripPhoto[];
  celebrationCards: CelebrationCard[];
  wrapupStatus: WrapupStatus | null;
  storiesCardData: StoriesCardData | null;
  isLoading: boolean;
  error: string | null;

  fetchActiveHub: () => Promise<ActiveTripHubResponse | null>;
  fetchTripPhotos: (tripId: string) => Promise<void>;
  addTripPhoto: (tripId: string, req: AddTripPhotoRequest) => Promise<TripPhoto>;
  togglePhotoFeatured: (tripId: string, photoId: string) => Promise<void>;
  deleteTripPhoto: (tripId: string, photoId: string) => Promise<void>;
  fetchCelebrationCards: (tripId: string) => Promise<void>;
  createCelebrationCard: (
    tripId: string,
    req: CreateCelebrationCardRequest
  ) => Promise<CelebrationCard>;
  fetchWrapupStatus: (tripId: string) => Promise<void>;
  submitTripFeedback: (tripId: string, req: TripFeedbackRequest) => Promise<void>;
  fetchStoriesCardData: (tripId: string) => Promise<void>;
  clearError: () => void;
}

export const usePostTripStore = create<PostTripState>((set) => ({
  activeHub: null,
  photos: [],
  celebrationCards: [],
  wrapupStatus: null,
  storiesCardData: null,
  isLoading: false,
  error: null,

  fetchActiveHub: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await postTripApi.getActiveHub();
      set({ activeHub: data, isLoading: false });
      return data;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || err.response?.data?.message || 'Error carregant el hub de viatge actiu',
        isLoading: false,
      });
      return null;
    }
  },

  fetchTripPhotos: async (tripId: string) => {
    set({ isLoading: true, error: null });
    try {
      const photos = await postTripApi.getTripPhotos(tripId);
      set({ photos, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || err.response?.data?.message || 'Error carregant les fotos del viatge',
        isLoading: false,
      });
    }
  },

  addTripPhoto: async (tripId: string, req: AddTripPhotoRequest) => {
    set({ isLoading: true, error: null });
    try {
      const photo = await postTripApi.addTripPhoto(tripId, req);
      set((state) => ({
        photos: [photo, ...state.photos],
        isLoading: false,
      }));
      return photo;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error afegint la foto';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  togglePhotoFeatured: async (tripId: string, photoId: string) => {
    try {
      const updated = await postTripApi.togglePhotoFeatured(tripId, photoId);
      set((state) => ({
        photos: state.photos.map((p) => (p.id === photoId ? updated : p)),
      }));
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error actualitzant estat destacat';
      set({ error: msg });
      throw err;
    }
  },

  deleteTripPhoto: async (tripId: string, photoId: string) => {
    try {
      await postTripApi.deleteTripPhoto(tripId, photoId);
      set((state) => ({
        photos: state.photos.filter((p) => p.id !== photoId),
      }));
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error eliminant la foto';
      set({ error: msg });
      throw err;
    }
  },

  fetchCelebrationCards: async (tripId: string) => {
    set({ isLoading: true, error: null });
    try {
      const cards = await postTripApi.getCelebrationCards(tripId);
      set({ celebrationCards: cards, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || err.response?.data?.message || 'Error carregant targetes de celebració',
        isLoading: false,
      });
    }
  },

  createCelebrationCard: async (tripId: string, req: CreateCelebrationCardRequest) => {
    set({ isLoading: true, error: null });
    try {
      const card = await postTripApi.createCelebrationCard(tripId, req);
      set((state) => ({
        celebrationCards: [card, ...state.celebrationCards],
        isLoading: false,
      }));
      return card;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error creant la targeta de celebració';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  fetchWrapupStatus: async (tripId: string) => {
    set({ isLoading: true, error: null });
    try {
      const status = await postTripApi.getWrapupStatus(tripId);
      set({ wrapupStatus: status, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || err.response?.data?.message || 'Error carregant estat de tancament',
        isLoading: false,
      });
    }
  },

  submitTripFeedback: async (tripId: string, req: TripFeedbackRequest) => {
    set({ isLoading: true, error: null });
    try {
      await postTripApi.submitTripFeedback(tripId, req);
      set((state) => ({
        wrapupStatus: state.wrapupStatus
          ? { ...state.wrapupStatus, feedback_completed: true }
          : null,
        isLoading: false,
      }));
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error enviant feedback';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  fetchStoriesCardData: async (tripId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await postTripApi.getStoriesCardData(tripId);
      set({ storiesCardData: data, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || err.response?.data?.message || 'Error carregant dades del reportatge 9:16',
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
