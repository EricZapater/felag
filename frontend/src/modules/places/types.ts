export interface AutocompletePrediction {
  google_place_id: string;
  main_text: string;
  secondary_text: string;
  full_text: string;
  types: string[];
}

export interface AutocompleteResponse {
  predictions: AutocompletePrediction[];
}

export interface Place {
  id: string;
  google_place_id: string;
  name: string;
  formatted_address: string;
  country_code: string;
  country_name: string;
  administrative_area: string;
  locality: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  viewport_ne_lat?: number;
  viewport_ne_lng?: number;
  viewport_sw_lat?: number;
  viewport_sw_lng?: number;
  place_types: string[];
  primary_type?: string;
  google_maps_uri?: string;
  photo_reference?: string;
  utc_offset_minutes: number;
  slug: string;
}
