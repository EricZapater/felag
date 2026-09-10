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

/**
 * Formats a destination name with its country in parentheses if not already present.
 * Example: "Breda", "Països Baixos" -> "Breda (Països Baixos)"
 * Example: "Barcelona", "Catalunya, Espanya" -> "Barcelona (Espanya)"
 * Example: "Girona (Catalunya)" -> "Girona (Catalunya)" (already has parens)
 */
export function formatDestinationWithCountry(
  name: string,
  countryName?: string,
  countryCode?: string,
  secondaryText?: string
): string {
  const trimmedName = (name || '').trim();
  if (!trimmedName) return '';

  // If already formatted with parentheses, do not duplicate
  if (trimmedName.includes('(') && trimmedName.includes(')')) {
    return trimmedName;
  }

  let country = countryName?.trim();
  if (!country && secondaryText) {
    const parts = secondaryText.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      country = parts[parts.length - 1];
    }
  }

  if (!country && countryCode) {
    country = countryCode.trim().toUpperCase();
  }

  if (country && !trimmedName.toLowerCase().includes(country.toLowerCase())) {
    return `${trimmedName} (${country})`;
  }

  return trimmedName;
}

