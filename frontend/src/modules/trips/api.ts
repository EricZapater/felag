import { apiClient } from '@/api/client';
import { CreateTripRequest, Trip, TripFilter, UpdateTripRequest } from './types';

export const tripsApi = {
  listTrips: async (filter?: TripFilter): Promise<Trip[]> => {
    const params = filter && filter !== 'all' ? { filter } : undefined;
    const res = await apiClient.get<Trip[]>('/api/v1/trips', { params });
    return res.data;
  },

  createTrip: async (data: CreateTripRequest): Promise<Trip> => {
    const res = await apiClient.post<Trip>('/api/v1/trips', data);
    return res.data;
  },

  getTripById: async (tripId: string): Promise<Trip> => {
    const res = await apiClient.get<Trip>(`/api/v1/trips/${tripId}`);
    return res.data;
  },

  updateTrip: async (tripId: string, data: UpdateTripRequest): Promise<Trip> => {
    const res = await apiClient.put<Trip>(`/api/v1/trips/${tripId}`, data);
    return res.data;
  },

  deleteTrip: async (tripId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/trips/${tripId}`);
  },
};
