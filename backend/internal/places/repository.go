package places

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

type Repository interface {
	GetByGooglePlaceID(ctx context.Context, googlePlaceID string) (*Place, error)
	GetByID(ctx context.Context, id string) (*Place, error)
	UpsertPlace(ctx context.Context, p *Place) (*Place, error)
	SearchLocalPlaces(ctx context.Context, query string, limit int) ([]Place, error)
	LogAPICall(ctx context.Context, log *ExternalAPILog) error
	GetUsageKPIs(ctx context.Context) (*GooglePlacesUsageKPI, error)
}

type postgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) GetByGooglePlaceID(ctx context.Context, googlePlaceID string) (*Place, error) {
	query := `
		SELECT id, google_place_id, name, COALESCE(formatted_address, ''), COALESCE(country_code, ''), 
		       COALESCE(country_name, ''), COALESCE(administrative_area, ''), COALESCE(locality, ''), 
		       COALESCE(postal_code, ''), latitude, longitude, viewport_ne_lat, viewport_ne_lng, 
		       viewport_sw_lat, viewport_sw_lng, place_types, COALESCE(primary_type, ''), 
		       COALESCE(google_maps_uri, ''), COALESCE(photo_reference, ''), COALESCE(utc_offset_minutes, 0), 
		       raw_data, COALESCE(slug, ''), created_at, updated_at
		FROM public.places
		WHERE google_place_id = $1;
	`
	row := r.db.QueryRowContext(ctx, query, strings.TrimPrefix(googlePlaceID, "places/"))
	return scanPlace(row)
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*Place, error) {
	query := `
		SELECT id, google_place_id, name, COALESCE(formatted_address, ''), COALESCE(country_code, ''), 
		       COALESCE(country_name, ''), COALESCE(administrative_area, ''), COALESCE(locality, ''), 
		       COALESCE(postal_code, ''), latitude, longitude, viewport_ne_lat, viewport_ne_lng, 
		       viewport_sw_lat, viewport_sw_lng, place_types, COALESCE(primary_type, ''), 
		       COALESCE(google_maps_uri, ''), COALESCE(photo_reference, ''), COALESCE(utc_offset_minutes, 0), 
		       raw_data, COALESCE(slug, ''), created_at, updated_at
		FROM public.places
		WHERE id = $1;
	`
	row := r.db.QueryRowContext(ctx, query, id)
	return scanPlace(row)
}

func (r *postgresRepository) UpsertPlace(ctx context.Context, p *Place) (*Place, error) {
	if p.Slug == "" {
		p.Slug = generateSlug(p.Name)
	}

	query := `
		INSERT INTO public.places (
			google_place_id, name, formatted_address, country_code, country_name,
			administrative_area, locality, postal_code, latitude, longitude,
			viewport_ne_lat, viewport_ne_lng, viewport_sw_lat, viewport_sw_lng,
			place_types, primary_type, google_maps_uri, photo_reference, utc_offset_minutes,
			raw_data, slug, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, $14,
			$15, $16, $17, $18, $19,
			$20, $21, CURRENT_TIMESTAMP
		)
		ON CONFLICT (google_place_id) DO UPDATE SET
			name = EXCLUDED.name,
			formatted_address = EXCLUDED.formatted_address,
			country_code = EXCLUDED.country_code,
			country_name = EXCLUDED.country_name,
			administrative_area = EXCLUDED.administrative_area,
			locality = EXCLUDED.locality,
			postal_code = EXCLUDED.postal_code,
			latitude = EXCLUDED.latitude,
			longitude = EXCLUDED.longitude,
			viewport_ne_lat = EXCLUDED.viewport_ne_lat,
			viewport_ne_lng = EXCLUDED.viewport_ne_lng,
			viewport_sw_lat = EXCLUDED.viewport_sw_lat,
			viewport_sw_lng = EXCLUDED.viewport_sw_lng,
			place_types = EXCLUDED.place_types,
			primary_type = EXCLUDED.primary_type,
			google_maps_uri = EXCLUDED.google_maps_uri,
			photo_reference = EXCLUDED.photo_reference,
			utc_offset_minutes = EXCLUDED.utc_offset_minutes,
			raw_data = EXCLUDED.raw_data,
			slug = EXCLUDED.slug,
			updated_at = CURRENT_TIMESTAMP
		RETURNING id, google_place_id, name, formatted_address, country_code, country_name,
		          administrative_area, locality, postal_code, latitude, longitude,
		          viewport_ne_lat, viewport_ne_lng, viewport_sw_lat, viewport_sw_lng,
		          place_types, primary_type, google_maps_uri, photo_reference, utc_offset_minutes,
		          raw_data, slug, created_at, updated_at;
	`

	var rawBytes []byte
	if len(p.RawData) > 0 {
		rawBytes = p.RawData
	} else {
		rawBytes = []byte("{}")
	}

	cleanGooglePlaceID := strings.TrimPrefix(p.GooglePlaceID, "places/")

	row := r.db.QueryRowContext(ctx, query,
		cleanGooglePlaceID, p.Name, p.FormattedAddress, p.CountryCode, p.CountryName,
		p.AdministrativeArea, p.Locality, p.PostalCode, p.Latitude, p.Longitude,
		p.ViewportNELat, p.ViewportNELng, p.ViewportSWLat, p.ViewportSWLng,
		pq.Array(p.PlaceTypes), p.PrimaryType, p.GoogleMapsURI, p.PhotoReference, p.UTCOffsetMinutes,
		rawBytes, p.Slug,
	)

	return scanPlace(row)
}

func (r *postgresRepository) SearchLocalPlaces(ctx context.Context, query string, limit int) ([]Place, error) {
	if limit <= 0 {
		limit = 10
	}

	sqlQuery := `
		SELECT id, google_place_id, name, COALESCE(formatted_address, ''), COALESCE(country_code, ''), 
		       COALESCE(country_name, ''), COALESCE(administrative_area, ''), COALESCE(locality, ''), 
		       COALESCE(postal_code, ''), latitude, longitude, viewport_ne_lat, viewport_ne_lng, 
		       viewport_sw_lat, viewport_sw_lng, place_types, COALESCE(primary_type, ''), 
		       COALESCE(google_maps_uri, ''), COALESCE(photo_reference, ''), COALESCE(utc_offset_minutes, 0), 
		       raw_data, COALESCE(slug, ''), created_at, updated_at
		FROM public.places
		WHERE LOWER(name) ILIKE $1 OR LOWER(locality) ILIKE $1 OR LOWER(formatted_address) ILIKE $1
		ORDER BY created_at DESC
		LIMIT $2;
	`
	rows, err := r.db.QueryContext(ctx, sqlQuery, "%"+strings.ToLower(query)+"%", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var places []Place
	for rows.Next() {
		p, err := scanPlaceFromRows(rows)
		if err == nil && p != nil {
			places = append(places, *p)
		}
	}
	return places, nil
}

func (r *postgresRepository) LogAPICall(ctx context.Context, log *ExternalAPILog) error {
	query := `
		INSERT INTO public.external_api_logs (
			provider, endpoint, status_code, duration_ms, cached, error_message, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP);
	`
	_, err := r.db.ExecContext(ctx, query,
		log.Provider, log.Endpoint, log.StatusCode, log.DurationMS, log.Cached, log.ErrorMessage,
	)
	return err
}

func (r *postgresRepository) GetUsageKPIs(ctx context.Context) (*GooglePlacesUsageKPI, error) {
	var kpi GooglePlacesUsageKPI

	// 1. External API logs aggregates
	query := `
		SELECT 
			COUNT(*) as total_calls,
			COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_calls,
			COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as month_calls,
			COUNT(*) FILTER (WHERE endpoint = 'autocomplete') as autocomplete_calls,
			COUNT(*) FILTER (WHERE endpoint = 'details') as details_calls,
			COUNT(*) FILTER (WHERE endpoint = 'search_text') as search_calls,
			COUNT(*) FILTER (WHERE cached = true) as cache_hits
		FROM public.external_api_logs
		WHERE provider = 'google_places';
	`
	err := r.db.QueryRowContext(ctx, query).Scan(
		&kpi.TotalCallsCount,
		&kpi.TodayCallsCount,
		&kpi.ThisMonthCallsCount,
		&kpi.AutocompleteCount,
		&kpi.DetailsCount,
		&kpi.SearchCount,
		&kpi.CacheHitsCount,
	)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	// 2. Count total cached places in database
	_ = r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM public.places;").Scan(&kpi.TotalPlacesCached)

	return &kpi, nil
}

type scannable interface {
	Scan(dest ...interface{}) error
}

func scanPlace(s scannable) (*Place, error) {
	var p Place
	var rawData []byte
	var placeTypes pq.StringArray
	var neLat, neLng, swLat, swLng sql.NullFloat64

	err := s.Scan(
		&p.ID, &p.GooglePlaceID, &p.Name, &p.FormattedAddress, &p.CountryCode,
		&p.CountryName, &p.AdministrativeArea, &p.Locality, &p.PostalCode,
		&p.Latitude, &p.Longitude, &neLat, &neLng, &swLat, &swLng,
		&placeTypes, &p.PrimaryType, &p.GoogleMapsURI, &p.PhotoReference,
		&p.UTCOffsetMinutes, &rawData, &p.Slug, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	p.PlaceTypes = []string(placeTypes)
	if neLat.Valid {
		p.ViewportNELat = &neLat.Float64
	}
	if neLng.Valid {
		p.ViewportNELng = &neLng.Float64
	}
	if swLat.Valid {
		p.ViewportSWLat = &swLat.Float64
	}
	if swLng.Valid {
		p.ViewportSWLng = &swLng.Float64
	}
	if len(rawData) > 0 {
		p.RawData = json.RawMessage(rawData)
	}

	return &p, nil
}

func scanPlaceFromRows(rows *sql.Rows) (*Place, error) {
	return scanPlace(rows)
}

func generateSlug(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		} else if r == ' ' || r == '-' || r == '_' {
			b.WriteRune('-')
		}
	}
	res := strings.Trim(b.String(), "-")
	if res == "" {
		res = fmt.Sprintf("place-%d", time.Now().Unix())
	}
	return res
}
