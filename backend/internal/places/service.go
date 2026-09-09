package places

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type Service interface {
	Autocomplete(ctx context.Context, input, language, countryCode string, types []string) ([]AutocompletePrediction, error)
	ResolvePlace(ctx context.Context, googlePlaceID, language string) (*Place, error)
	GetPlaceByID(ctx context.Context, id string) (*Place, error)
	GetPlaceByGoogleID(ctx context.Context, googlePlaceID string) (*Place, error)
	SearchLocalPlaces(ctx context.Context, query string, limit int) ([]Place, error)
	GetUsageKPIs(ctx context.Context) (*GooglePlacesUsageKPI, error)
}

type service struct {
	repo   Repository
	client *GooglePlacesClient
}

func NewService(repo Repository, client *GooglePlacesClient) Service {
	return &service{
		repo:   repo,
		client: client,
	}
}

func (s *service) Autocomplete(ctx context.Context, input, language, countryCode string, types []string) ([]AutocompletePrediction, error) {
	input = strings.TrimSpace(input)
	if len(input) < 2 {
		return []AutocompletePrediction{}, nil
	}

	start := time.Now()
	preds, statusCode, duration, err := s.client.Autocomplete(ctx, input, language, countryCode, types)

	// Log the external call for admin usage & cost audit
	var errMsg string
	if err != nil {
		errMsg = err.Error()
	}
	_ = s.repo.LogAPICall(ctx, &ExternalAPILog{
		Provider:     "google_places",
		Endpoint:     "autocomplete",
		StatusCode:   statusCode,
		DurationMS:   duration,
		Cached:       false,
		ErrorMessage: errMsg,
		CreatedAt:    start,
	})

	if err != nil {
		// Fallback to local cached places in PostgreSQL
		localPlaces, localErr := s.repo.SearchLocalPlaces(ctx, input, 10)
		if localErr == nil && len(localPlaces) > 0 {
			var fallbackPreds []AutocompletePrediction
			for _, lp := range localPlaces {
				secText := lp.AdministrativeArea
				if lp.CountryName != "" {
					if secText != "" {
						secText += ", " + lp.CountryName
					} else {
						secText = lp.CountryName
					}
				}
				fallbackPreds = append(fallbackPreds, AutocompletePrediction{
					GooglePlaceID: lp.GooglePlaceID,
					MainText:      lp.Name,
					SecondaryText: secText,
					FullText:      lp.FormattedAddress,
					Types:         lp.PlaceTypes,
				})
			}
			return fallbackPreds, nil
		}
		// If both Google Places and local fail, return empty list gracefully instead of 500 error
		return []AutocompletePrediction{}, nil
	}

	return preds, nil
}

func (s *service) ResolvePlace(ctx context.Context, googlePlaceID, language string) (*Place, error) {
	cleanPlaceID := strings.TrimPrefix(strings.TrimSpace(googlePlaceID), "places/")
	if cleanPlaceID == "" {
		return nil, fmt.Errorf("invalid google place id")
	}

	start := time.Now()

	// 1. Check local database cache first
	cachedPlace, err := s.repo.GetByGooglePlaceID(ctx, cleanPlaceID)
	if err == nil && cachedPlace != nil {
		// Log cache hit (zero-cost API call!)
		_ = s.repo.LogAPICall(ctx, &ExternalAPILog{
			Provider:   "google_places",
			Endpoint:   "details",
			StatusCode: 200,
			DurationMS: int(time.Since(start).Milliseconds()),
			Cached:     true,
			CreatedAt:  start,
		})
		return cachedPlace, nil
	}

	// 2. Cache miss: Fetch details from Google Places API (New)
	rawDetails, rawBytes, statusCode, duration, err := s.client.FetchPlaceDetails(ctx, cleanPlaceID, language)
	var errMsg string
	if err != nil {
		errMsg = err.Error()
	}
	_ = s.repo.LogAPICall(ctx, &ExternalAPILog{
		Provider:     "google_places",
		Endpoint:     "details",
		StatusCode:   statusCode,
		DurationMS:   duration,
		Cached:       false,
		ErrorMessage: errMsg,
		CreatedAt:    start,
	})

	if err != nil {
		return nil, fmt.Errorf("failed fetching place details from google: %w", err)
	}

	// 3. Parse and extract structured fields
	placeName := rawDetails.DisplayName.Text
	if placeName == "" {
		placeName = rawDetails.FormattedAddress
	}

	var countryCode, countryName, adminArea, locality, postalCode string
	for _, comp := range rawDetails.AddressComponents {
		for _, t := range comp.Types {
			switch t {
			case "country":
				countryCode = comp.ShortText
				countryName = comp.LongText
			case "administrative_area_level_1":
				adminArea = comp.LongText
			case "locality", "postal_town":
				if locality == "" {
					locality = comp.LongText
				}
			case "postal_code":
				postalCode = comp.LongText
			}
		}
	}

	var photoRef string
	if len(rawDetails.Photos) > 0 {
		photoRef = rawDetails.Photos[0].Name
	}

	var neLat, neLng, swLat, swLng *float64
	if rawDetails.Viewport.High.Latitude != 0 || rawDetails.Viewport.High.Longitude != 0 {
		hLat := rawDetails.Viewport.High.Latitude
		hLng := rawDetails.Viewport.High.Longitude
		lLat := rawDetails.Viewport.Low.Latitude
		lLng := rawDetails.Viewport.Low.Longitude
		neLat, neLng = &hLat, &hLng
		swLat, swLng = &lLat, &lLng
	}

	p := &Place{
		GooglePlaceID:      cleanPlaceID,
		Name:               placeName,
		FormattedAddress:   rawDetails.FormattedAddress,
		CountryCode:        strings.ToUpper(countryCode),
		CountryName:        countryName,
		AdministrativeArea: adminArea,
		Locality:           locality,
		PostalCode:         postalCode,
		Latitude:           rawDetails.Location.Latitude,
		Longitude:          rawDetails.Location.Longitude,
		ViewportNELat:      neLat,
		ViewportNELng:      neLng,
		ViewportSWLat:      swLat,
		ViewportSWLng:      swLng,
		PlaceTypes:         rawDetails.Types,
		PrimaryType:        rawDetails.PrimaryType,
		GoogleMapsURI:      rawDetails.GoogleMapsURI,
		PhotoReference:     photoRef,
		UTCOffsetMinutes:   rawDetails.UTCOffsetMinutes,
		RawData:            json.RawMessage(rawBytes),
	}

	// 4. Save into local PostgreSQL places table
	savedPlace, err := s.repo.UpsertPlace(ctx, p)
	if err != nil {
		return nil, fmt.Errorf("failed saving place to database: %w", err)
	}

	return savedPlace, nil
}

func (s *service) GetPlaceByID(ctx context.Context, id string) (*Place, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *service) GetPlaceByGoogleID(ctx context.Context, googlePlaceID string) (*Place, error) {
	return s.repo.GetByGooglePlaceID(ctx, googlePlaceID)
}

func (s *service) SearchLocalPlaces(ctx context.Context, query string, limit int) ([]Place, error) {
	return s.repo.SearchLocalPlaces(ctx, query, limit)
}

func (s *service) GetUsageKPIs(ctx context.Context) (*GooglePlacesUsageKPI, error) {
	return s.repo.GetUsageKPIs(ctx)
}
