import { apiClient } from '@/api/client';
import {
  AddCompanionRequest,
  CreateTripRequest,
  FelagiUserSummary,
  Trip,
  TripCompanion,
  TripFilter,
  UpdateTripRequest,
} from './types';

export const tripsApi = {
  listMyTrips: async (filter?: TripFilter): Promise<Trip[]> => {
    const params = filter && filter !== 'all' ? { filter } : {};
    const res = await apiClient.get<Trip[]>('/api/v1/trips', { params });
    return res.data;
  },

  getTripById: async (tripId: string): Promise<Trip> => {
    const res = await apiClient.get<Trip>(`/api/v1/trips/${tripId}`);
    return res.data;
  },

  createTrip: async (data: CreateTripRequest): Promise<Trip> => {
    const res = await apiClient.post<Trip>('/api/v1/trips', data);
    return res.data;
  },

  updateTrip: async (tripId: string, data: UpdateTripRequest): Promise<Trip> => {
    const res = await apiClient.put<Trip>(`/api/v1/trips/${tripId}`, data);
    return res.data;
  },

  deleteTrip: async (tripId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/trips/${tripId}`);
  },

  listCompanions: async (tripId: string): Promise<TripCompanion[]> => {
    const res = await apiClient.get<TripCompanion[]>(`/api/v1/trips/${tripId}/companions`);
    return res.data;
  },

  addCompanion: async (tripId: string, userId: string): Promise<TripCompanion> => {
    const res = await apiClient.post<TripCompanion>(`/api/v1/trips/${tripId}/companions`, {
      user_id: userId,
    });
    return res.data;
  },

  removeCompanion: async (tripId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/trips/${tripId}/companions/${userId}`);
  },

  searchUsers: async (query: string): Promise<FelagiUserSummary[]> => {
    const res = await apiClient.get<FelagiUserSummary[]>('/api/v1/users/search', {
      params: { q: query },
    });
    return res.data;
  },
};
