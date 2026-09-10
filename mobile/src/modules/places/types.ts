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

