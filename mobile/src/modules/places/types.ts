export interface PlacePrediction {
  place_id?: string;
  google_place_id: string;
  full_text: string;
  main_text: string;
  secondary_text: string;
  types: string[];
}

export interface PlaceDetails {
  place_id: string;
  google_place_id: string;
  name: string;
  formatted_address: string;
  country_code: string;
  country_name: string;
  region_name?: string;
  latitude: number;
  longitude: number;
  town_id?: string;
  region_id?: string;
}
