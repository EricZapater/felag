import { create } from 'zustand';
import { CreateTripRequest, Trip, TripFilter, UpdateTripRequest } from './types';
import { tripsApi } from './api';

interface TripsState {
  trips: Trip[];
  currentTrip: Trip | null;
  isLoading: boolean;
  error: string | null;
  filter: TripFilter;

  setFilter: (filter: TripFilter) => void;
  clearError: () => void;
  fetchTrips: (filter?: TripFilter) => Promise<void>;
  fetchTripById: (tripId: string) => Promise<Trip>;
  createTrip: (data: CreateTripRequest) => Promise<Trip>;
  updateTrip: (tripId: string, data: UpdateTripRequest) => Promise<Trip>;
  deleteTrip: (tripId: string) => Promise<void>;
}

export const useTripsStore = create<TripsState>((set, get) => ({
  trips: [],
  currentTrip: null,
  isLoading: false,
  error: null,
  filter: 'all',

  setFilter: (filter: TripFilter) => {
    set({ filter });
    get().fetchTrips(filter);
  },

  clearError: () => {
    set({ error: null });
  },

  fetchTrips: async (filter?: TripFilter) => {
    const activeFilter = filter !== undefined ? filter : get().filter;
    set({ isLoading: true, error: null });
    try {
      const trips = await tripsApi.listMyTrips(activeFilter);
      set({ trips, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.response?.data?.error?.message || 'Error carregant els viatges',
        isLoading: false,
      });
    }
  },

  fetchTripById: async (tripId: string): Promise<Trip> => {
    set({ isLoading: true, error: null });
    try {
      const trip = await tripsApi.getTripById(tripId);
      set({ currentTrip: trip, isLoading: false });
      return trip;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.response?.data?.error?.message || 'Error obtenint el viatge',
        isLoading: false,
      });
      throw err;
    }
  },

  createTrip: async (data: CreateTripRequest): Promise<Trip> => {
    set({ isLoading: true, error: null });
    try {
      const newTrip = await tripsApi.createTrip(data);
      set((state) => ({
        trips: [newTrip, ...state.trips],
        currentTrip: newTrip,
        isLoading: false,
      }));
      return newTrip;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.response?.data?.error?.message || 'Error creant el viatge',
        isLoading: false,
      });
      throw err;
    }
  },

  updateTrip: async (tripId: string, data: UpdateTripRequest): Promise<Trip> => {
    set({ isLoading: true, error: null });
    try {
      const updatedTrip = await tripsApi.updateTrip(tripId, data);
      set((state) => ({
        trips: state.trips.map((t) => (t.id === tripId ? updatedTrip : t)),
        currentTrip: updatedTrip,
        isLoading: false,
      }));
      return updatedTrip;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.response?.data?.error?.message || 'Error actualitzant el viatge',
        isLoading: false,
      });
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
      set({
        error: err.response?.data?.message || err.response?.data?.error?.message || 'Error eliminant el viatge',
        isLoading: false,
      });
      throw err;
    }
  },
}));
