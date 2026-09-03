import { apiClient } from '@/api/client';
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

export const postTripApi = {
  getActiveTripHub: async (): Promise<ActiveTripHubResponse> => {
    const res = await apiClient.get<ActiveTripHubResponse>('/api/v1/trips/active-hub');
    return res.data;
  },

  listPhotos: async (tripId: string): Promise<TripPhoto[]> => {
    const res = await apiClient.get<TripPhoto[]>(`/api/v1/trips/${tripId}/photos`);
    return res.data;
  },

  addPhoto: async (tripId: string, data: AddTripPhotoRequest): Promise<TripPhoto> => {
    const res = await apiClient.post<TripPhoto>(`/api/v1/trips/${tripId}/photos`, data);
    return res.data;
  },

  togglePhotoFeatured: async (tripId: string, photoId: string): Promise<TripPhoto> => {
    const res = await apiClient.put<TripPhoto>(`/api/v1/trips/${tripId}/photos/${photoId}/feature`);
    return res.data;
  },

  deletePhoto: async (tripId: string, photoId: string): Promise<SuccessResponse> => {
    const res = await apiClient.delete<SuccessResponse>(`/api/v1/trips/${tripId}/photos/${photoId}`);
    return res.data;
  },

  listCelebrationCards: async (tripId: string): Promise<CelebrationCard[]> => {
    const res = await apiClient.get<CelebrationCard[]>(`/api/v1/trips/${tripId}/celebration-cards`);
    return res.data;
  },

  createCelebrationCard: async (
    tripId: string,
    data: CreateCelebrationCardRequest
  ): Promise<CelebrationCard> => {
    const res = await apiClient.post<CelebrationCard>(
      `/api/v1/trips/${tripId}/celebration-cards`,
      data
    );
    return res.data;
  },

  getWrapupStatus: async (tripId: string): Promise<WrapupStatus> => {
    const res = await apiClient.get<WrapupStatus>(`/api/v1/trips/${tripId}/wrapup-status`);
    return res.data;
  },

  submitFeedback: async (tripId: string, data: TripFeedbackRequest): Promise<SuccessResponse> => {
    const res = await apiClient.post<SuccessResponse>(`/api/v1/trips/${tripId}/feedback`, data);
    return res.data;
  },

  getStoriesCardData: async (tripId: string): Promise<StoriesCardData> => {
    const res = await apiClient.get<StoriesCardData>(`/api/v1/trips/${tripId}/stories-card-data`);
    return res.data;
  },
};
