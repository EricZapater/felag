import { create } from 'zustand';
import {
  ActiveTripHubResponse,
  AddTripPhotoRequest,
  CelebrationCard,
  CreateCelebrationCardRequest,
  StoriesCardData,
  SuccessResponse,
  TripFeedbackRequest,
  TripPhoto,
  WrapupStatus,
} from './types';
import { postTripApi } from './api';

interface PostTripState {
  activeHub: ActiveTripHubResponse | null;
  photos: TripPhoto[];
  celebrationCards: CelebrationCard[];
  wrapupStatus: WrapupStatus | null;
  storiesCardData: StoriesCardData | null;
  isLoading: boolean;
  isUploadingPhoto: boolean;
  isCreatingCard: boolean;
  isSubmittingFeedback: boolean;
  error: string | null;

  clearError: () => void;
  fetchActiveHub: () => Promise<ActiveTripHubResponse>;
  fetchPhotos: (tripId: string) => Promise<TripPhoto[]>;
  addPhoto: (tripId: string, data: AddTripPhotoRequest) => Promise<TripPhoto>;
  togglePhotoFeatured: (tripId: string, photoId: string) => Promise<TripPhoto>;
  deletePhoto: (tripId: string, photoId: string) => Promise<void>;
  fetchCelebrationCards: (tripId: string) => Promise<CelebrationCard[]>;
  createCelebrationCard: (
    tripId: string,
    data: CreateCelebrationCardRequest
  ) => Promise<CelebrationCard>;
  fetchWrapupStatus: (tripId: string) => Promise<WrapupStatus>;
  submitFeedback: (tripId: string, data: TripFeedbackRequest) => Promise<SuccessResponse>;
  fetchStoriesCardData: (tripId: string) => Promise<StoriesCardData>;
}

export const usePostTripStore = create<PostTripState>((set) => ({
  activeHub: null,
  photos: [],
  celebrationCards: [],
  wrapupStatus: null,
  storiesCardData: null,
  isLoading: false,
  isUploadingPhoto: false,
  isCreatingCard: false,
  isSubmittingFeedback: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchActiveHub: async (): Promise<ActiveTripHubResponse> => {
    set({ isLoading: true, error: null });
    try {
      const activeHub = await postTripApi.getActiveTripHub();
      set({ activeHub, isLoading: false });
      return activeHub;
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error carregant el resum del viatge actiu',
        isLoading: false,
      });
      throw err;
    }
  },

  fetchPhotos: async (tripId: string): Promise<TripPhoto[]> => {
    set({ isLoading: true, error: null });
    try {
      const photos = await postTripApi.listPhotos(tripId);
      set({ photos, isLoading: false });
      return photos;
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error carregant la galeria de fotos',
        isLoading: false,
      });
      throw err;
    }
  },

  addPhoto: async (tripId: string, data: AddTripPhotoRequest): Promise<TripPhoto> => {
    set({ isUploadingPhoto: true, error: null });
    try {
      const newPhoto = await postTripApi.addPhoto(tripId, data);
      set((state) => ({
        photos: [newPhoto, ...state.photos],
        isUploadingPhoto: false,
      }));
      return newPhoto;
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error afegint la foto',
        isUploadingPhoto: false,
      });
      throw err;
    }
  },

  togglePhotoFeatured: async (tripId: string, photoId: string): Promise<TripPhoto> => {
    set({ error: null });
    try {
      const updatedPhoto = await postTripApi.togglePhotoFeatured(tripId, photoId);
      set((state) => ({
        photos: state.photos.map((p) => (p.id === photoId ? updatedPhoto : p)),
      }));
      return updatedPhoto;
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error destacant la foto',
      });
      throw err;
    }
  },

  deletePhoto: async (tripId: string, photoId: string): Promise<void> => {
    set({ error: null });
    try {
      await postTripApi.deletePhoto(tripId, photoId);
      set((state) => ({
        photos: state.photos.filter((p) => p.id !== photoId),
      }));
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error eliminant la foto',
      });
      throw err;
    }
  },

  fetchCelebrationCards: async (tripId: string): Promise<CelebrationCard[]> => {
    set({ isLoading: true, error: null });
    try {
      const celebrationCards = await postTripApi.listCelebrationCards(tripId);
      set({ celebrationCards, isLoading: false });
      return celebrationCards;
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error carregant les Celebration Cards',
        isLoading: false,
      });
      throw err;
    }
  },

  createCelebrationCard: async (
    tripId: string,
    data: CreateCelebrationCardRequest
  ): Promise<CelebrationCard> => {
    set({ isCreatingCard: true, error: null });
    try {
      const newCard = await postTripApi.createCelebrationCard(tripId, data);
      set((state) => ({
        celebrationCards: [newCard, ...state.celebrationCards],
        isCreatingCard: false,
      }));
      return newCard;
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error creant la Celebration Card',
        isCreatingCard: false,
      });
      throw err;
    }
  },

  fetchWrapupStatus: async (tripId: string): Promise<WrapupStatus> => {
    set({ isLoading: true, error: null });
    try {
      const wrapupStatus = await postTripApi.getWrapupStatus(tripId);
      set({ wrapupStatus, isLoading: false });
      return wrapupStatus;
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error obtenint l estat de tancament',
        isLoading: false,
      });
      throw err;
    }
  },

  submitFeedback: async (
    tripId: string,
    data: TripFeedbackRequest
  ): Promise<SuccessResponse> => {
    set({ isSubmittingFeedback: true, error: null });
    try {
      const res = await postTripApi.submitFeedback(tripId, data);
      set((state) => ({
        isSubmittingFeedback: false,
        wrapupStatus: state.wrapupStatus
          ? { ...state.wrapupStatus, feedback_completed: true }
          : null,
      }));
      return res;
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error enviant la valoració del viatge',
        isSubmittingFeedback: false,
      });
      throw err;
    }
  },

  fetchStoriesCardData: async (tripId: string): Promise<StoriesCardData> => {
    set({ isLoading: true, error: null });
    try {
      const storiesCardData = await postTripApi.getStoriesCardData(tripId);
      set({ storiesCardData, isLoading: false });
      return storiesCardData;
    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Error carregant les dades de stories',
        isLoading: false,
      });
      throw err;
    }
  },
}));
