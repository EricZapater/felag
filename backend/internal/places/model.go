package places

import (
	"encoding/json"
	"time"
)

// Place represents a canonical destination / location stored in the database
type Place struct {
	ID                 string          `json:"id"`
	GooglePlaceID      string          `json:"google_place_id"`
	Name               string          `json:"name"`
	FormattedAddress   string          `json:"formatted_address"`
	CountryCode        string          `json:"country_code"`
	CountryName        string          `json:"country_name"`
	AdministrativeArea string          `json:"administrative_area"`
	Locality           string          `json:"locality"`
	PostalCode         string          `json:"postal_code"`
	Latitude           float64         `json:"latitude"`
	Longitude          float64         `json:"longitude"`
	ViewportNELat      *float64        `json:"viewport_ne_lat,omitempty"`
	ViewportNELng      *float64        `json:"viewport_ne_lng,omitempty"`
	ViewportSWLat      *float64        `json:"viewport_sw_lat,omitempty"`
	ViewportSWLng      *float64        `json:"viewport_sw_lng,omitempty"`
	PlaceTypes         []string        `json:"place_types"`
	PrimaryType        string          `json:"primary_type"`
	GoogleMapsURI      string          `json:"google_maps_uri,omitempty"`
	PhotoReference     string          `json:"photo_reference,omitempty"`
	UTCOffsetMinutes   int             `json:"utc_offset_minutes,omitempty"`
	RawData            json.RawMessage `json:"raw_data,omitempty"`
	Slug               string          `json:"slug"`
	CreatedAt          time.Time       `json:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

// AutocompletePrediction represents a search prediction from Google Places (New)
type AutocompletePrediction struct {
	GooglePlaceID string   `json:"google_place_id"`
	MainText      string   `json:"main_text"`
	SecondaryText string   `json:"secondary_text"`
	FullText      string   `json:"full_text"`
	Types         []string `json:"types"`
}

// AutocompleteResponse is the client response for autocomplete queries
type AutocompleteResponse struct {
	Predictions []AutocompletePrediction `json:"predictions"`
}

// ResolvePlaceRequest is the payload to resolve or cache a place by Google Place ID
type ResolvePlaceRequest struct {
	GooglePlaceID string `json:"google_place_id" binding:"required"`
	Language      string `json:"language,omitempty"`
}

// ExternalAPILog represents a log entry for external API calls
type ExternalAPILog struct {
	ID           string    `json:"id"`
	Provider     string    `json:"provider"`
	Endpoint     string    `json:"endpoint"`
	StatusCode   int       `json:"status_code"`
	DurationMS   int       `json:"duration_ms"`
	Cached       bool      `json:"cached"`
	ErrorMessage string    `json:"error_message,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// GooglePlacesUsageKPI represents API consumption metrics for the admin panel
type GooglePlacesUsageKPI struct {
	TotalCallsCount     int `json:"total_calls_count"`
	TodayCallsCount     int `json:"today_calls_count"`
	ThisMonthCallsCount int `json:"this_month_calls_count"`
	AutocompleteCount   int `json:"autocomplete_count"`
	DetailsCount        int `json:"details_count"`
	SearchCount         int `json:"search_count"`
	CacheHitsCount      int `json:"cache_hits_count"`
	TotalPlacesCached   int `json:"total_places_cached"`
}
