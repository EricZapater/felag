import { create } from 'zustand';
import { CreateTripRequest, Trip, TripFilter, UpdateTripRequest } from './types';
import { tripsApi } from './api';

interface TripState {
  trips: Trip[];
  currentTrip: Trip | null;
  isLoading: boolean;
  error: string | null;
  filter: TripFilter;

  setFilter: (filter: TripFilter) => void;
  fetchTrips: (filter?: TripFilter) => Promise<void>;
  fetchTripById: (tripId: string) => Promise<void>;
  createTrip: (data: CreateTripRequest) => Promise<Trip>;
  updateTrip: (tripId: string, data: UpdateTripRequest) => Promise<Trip>;
  deleteTrip: (tripId: string) => Promise<void>;
  clearCurrentTrip: () => void;
  clearError: () => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  currentTrip: null,
  isLoading: false,
  error: null,
  filter: 'all',

  setFilter: (filter: TripFilter) => {
    set({ filter });
  },

  fetchTrips: async (filter?: TripFilter) => {
    const activeFilter = filter !== undefined ? filter : get().filter;
    set({ isLoading: true, error: null });
    try {
      const trips = await tripsApi.listTrips(activeFilter);
      set({ trips, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.response?.data?.error?.message || 'Error carregant els viatges',
        isLoading: false,
      });
    }
  },

  fetchTripById: async (tripId: string) => {
    set({ isLoading: true, error: null });
    try {
      const currentTrip = await tripsApi.getTripById(tripId);
      set({ currentTrip, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.response?.data?.error?.message || 'Error carregant el detall del viatge',
        isLoading: false,
      });
    }
  },

  createTrip: async (data: CreateTripRequest): Promise<Trip> => {
    set({ isLoading: true, error: null });
    try {
      const createdTrip = await tripsApi.createTrip(data);
      set((state) => ({
        trips: [createdTrip, ...state.trips],
        isLoading: false,
      }));
      return createdTrip;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || 'Error creant el viatge';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  updateTrip: async (tripId: string, data: UpdateTripRequest): Promise<Trip> => {
    set({ isLoading: true, error: null });
    try {
      const updatedTrip = await tripsApi.updateTrip(tripId, data);
      set((state) => ({
        trips: state.trips.map((t) => (t.id === tripId ? updatedTrip : t)),
        currentTrip: state.currentTrip?.id === tripId ? updatedTrip : state.currentTrip,
        isLoading: false,
      }));
      return updatedTrip;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || 'Error actualitzant el viatge';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  deleteTrip: async (tripId: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      await tripsApi.deleteTrip(tripId);
      set((state) => ({
        trips: state.trips.filter((t) => t.id !== tripId),
        currentTrip: state.currentTrip?.id === tripId ? null : state.currentTrip,
        isLoading: false,
      }));
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || 'Error eliminant el viatge';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  clearCurrentTrip: () => set({ currentTrip: null }),
  clearError: () => set({ error: null }),
}));
