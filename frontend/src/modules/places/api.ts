import { apiClient } from '@/api/client';
import { AutocompletePrediction, AutocompleteResponse, Place } from './types';

export const placesApi = {
  autocomplete: async (
    input: string,
    lang: string = 'ca',
    country?: string
  ): Promise<AutocompletePrediction[]> => {
    try {
      const res = await apiClient.get<{ success: boolean; data: AutocompleteResponse }>(
        '/api/v1/places/autocomplete',
        {
          params: {
            input,
            lang,
            country: country || undefined,
          },
        }
      );
      return res.data?.data?.predictions || [];
    } catch {
      return [];
    }
  },

  resolvePlace: async (googlePlaceId: string, lang: string = 'ca'): Promise<Place | null> => {
    try {
      const res = await apiClient.post<{ success: boolean; data: Place }>(
        '/api/v1/places/resolve',
        {
          google_place_id: googlePlaceId,
          language: lang,
        }
      );
      return res.data?.data || null;
    } catch {
      return null;
    }
  },

  getPlaceById: async (id: string): Promise<Place | null> => {
    try {
      const res = await apiClient.get<{ success: boolean; data: Place }>(
        `/api/v1/places/id/${encodeURIComponent(id)}`
      );
      return res.data?.data || null;
    } catch {
      return null;
    }
  },
};
