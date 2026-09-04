package profile

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type Repository interface {
	GetProfile(userID string) (*Profile, error)
	UpdateProfile(userID string, name, phoneNumber, bio *string) error
	UpdateAvatar(userID string, avatarURL string) error
	UpdateOrigin(userID, townID string) error
	GetCountries() ([]Country, error)
	GetRegionsByCountry(countryID string) ([]Region, error)
	GetTownsByRegion(regionID string) ([]Town, error)
	SearchTowns(q string, limit int) ([]TownSearchResult, error)
	GetPublicProfile(userID string) (*PublicProfile, error)
	GetPublicTrips(userID string) ([]PublicTripSummary, error)
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetProfile(userID string) (*Profile, error) {
	query := `
		SELECT u.id, u.name, u.email, u.phone_number, u.avatar_url, u.bio,
		       t.id, t.name, r.id, r.name, c.id, c.name, c.code
		FROM users u
		LEFT JOIN towns t ON u.town_id = t.id
		LEFT JOIN regions r ON t.region_id = r.id
		LEFT JOIN countries c ON r.country_id = c.id
		WHERE u.id = $1
	`
	p := &Profile{}
	var townID, townName, regionID, regionName, countryID, countryName, countryCode sql.NullString

	err := r.db.QueryRow(query, userID).Scan(
		&p.ID, &p.Name, &p.Email, &p.PhoneNumber, &p.AvatarURL, &p.Bio,
		&townID, &townName, &regionID, &regionName, &countryID, &countryName, &countryCode,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying profile: %w", err)
	}

	if townID.Valid {
		p.Origin = &OriginHierarchy{
			Country: Country{ID: countryID.String, Name: countryName.String, Code: countryCode.String},
			Region:  Region{ID: regionID.String, Name: regionName.String, CountryID: countryID.String},
			Town:    Town{ID: townID.String, Name: townName.String, RegionID: regionID.String},
		}
	}

	return p, nil
}

func (r *repository) UpdateProfile(userID string, name, phoneNumber, bio *string) error {
	query := `
		UPDATE users
		SET name = COALESCE($2, name),
		    phone_number = COALESCE($3, phone_number),
		    bio = COALESCE($4, bio),
		    updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(query, userID, name, phoneNumber, bio)
	if err != nil {
		return fmt.Errorf("error updating profile: %w", err)
	}
	return nil
}

func (r *repository) UpdateAvatar(userID string, avatarURL string) error {
	query := `
		UPDATE users
		SET avatar_url = $2, updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(query, userID, avatarURL)
	if err != nil {
		return fmt.Errorf("error updating avatar_url: %w", err)
	}
	return nil
}

func (r *repository) UpdateOrigin(userID, townID string) error {
	// Verify townExists
	var exists bool
	err := r.db.QueryRow("SELECT EXISTS(SELECT 1 FROM towns WHERE id = $1)", townID).Scan(&exists)
	if err != nil || !exists {
		return fmt.Errorf("town with id %s does not exist", townID)
	}

	query := `
		UPDATE users
		SET town_id = $2, updated_at = NOW()
		WHERE id = $1
	`
	_, err = r.db.Exec(query, userID, townID)
	if err != nil {
		return fmt.Errorf("error updating origin town_id: %w", err)
	}
	return nil
}

func (r *repository) GetCountries() ([]Country, error) {
	rows, err := r.db.Query("SELECT id, name, code FROM countries ORDER BY name ASC")
	if err != nil {
		return nil, fmt.Errorf("error querying countries: %w", err)
	}
	defer rows.Close()

	var countries []Country
	for rows.Next() {
		var c Country
		if err := rows.Scan(&c.ID, &c.Name, &c.Code); err != nil {
			return nil, err
		}
		countries = append(countries, c)
	}
	return countries, nil
}

func (r *repository) GetRegionsByCountry(countryID string) ([]Region, error) {
	rows, err := r.db.Query("SELECT id, name, country_id FROM regions WHERE country_id = $1 ORDER BY name ASC", countryID)
	if err != nil {
		return nil, fmt.Errorf("error querying regions: %w", err)
	}
	defer rows.Close()

	var regions []Region
	for rows.Next() {
		var reg Region
		if err := rows.Scan(&reg.ID, &reg.Name, &reg.CountryID); err != nil {
			return nil, err
		}
		regions = append(regions, reg)
	}
	return regions, nil
}

func (r *repository) GetTownsByRegion(regionID string) ([]Town, error) {
	rows, err := r.db.Query("SELECT id, name, region_id FROM towns WHERE region_id = $1 ORDER BY name ASC", regionID)
	if err != nil {
		return nil, fmt.Errorf("error querying towns: %w", err)
	}
	defer rows.Close()

	var towns []Town
	for rows.Next() {
		var tw Town
		if err := rows.Scan(&tw.ID, &tw.Name, &tw.RegionID); err != nil {
			return nil, err
		}
		towns = append(towns, tw)
	}
	return towns, nil
}

func (r *repository) GetPublicProfile(userID string) (*PublicProfile, error) {
	query := `
		SELECT u.id, u.name, u.avatar_url, u.bio,
		       t.name, r.name, c.name
		FROM users u
		LEFT JOIN towns t ON u.town_id = t.id
		LEFT JOIN regions r ON t.region_id = r.id
		LEFT JOIN countries c ON r.country_id = c.id
		WHERE u.id = $1
	`
	p := &PublicProfile{
		PublicTrips: []PublicTripSummary{},
	}
	var townName, regionName, countryName sql.NullString
	var avatar, bio sql.NullString

	err := r.db.QueryRow(query, userID).Scan(
		&p.ID, &p.Name, &avatar, &bio,
		&townName, &regionName, &countryName,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying public profile: %w", err)
	}

	if avatar.Valid {
		p.AvatarURL = &avatar.String
	}
	if bio.Valid {
		p.Bio = &bio.String
	}

	if townName.Valid && regionName.Valid {
		summary := fmt.Sprintf("%s (%s)", townName.String, regionName.String)
		p.OriginSummary = &summary
	} else if regionName.Valid && countryName.Valid {
		summary := fmt.Sprintf("%s (%s)", regionName.String, countryName.String)
		p.OriginSummary = &summary
	} else if countryName.Valid {
		summary := countryName.String
		p.OriginSummary = &summary
	}

	return p, nil
}

func (r *repository) GetPublicTrips(userID string) ([]PublicTripSummary, error) {
	query := `
		SELECT t.id, t.title, t.start_date, t.end_date,
		       COALESCE((
		           SELECT STRING_AGG(ts.destination_name, ', ' ORDER BY ts.stage_order)
		           FROM trip_stages ts
		           WHERE ts.trip_id = t.id
		       ), '') AS destination_summary
		FROM trips t
		WHERE t.user_id = $1 AND t.visibility = 'public'
		ORDER BY t.start_date ASC
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("error querying public trips: %w", err)
	}
	defer rows.Close()

	var trips []PublicTripSummary
	for rows.Next() {
		var pt PublicTripSummary
		var startDate, endDate time.Time
		if err := rows.Scan(&pt.ID, &pt.Title, &startDate, &endDate, &pt.DestinationSummary); err != nil {
			return nil, fmt.Errorf("error scanning public trip: %w", err)
		}
		pt.StartDate = startDate.Format("2006-01-02")
		pt.EndDate = endDate.Format("2006-01-02")
		trips = append(trips, pt)
	}
	if trips == nil {
		trips = []PublicTripSummary{}
	}
	return trips, nil
}

func (r *repository) SearchTowns(q string, limit int) ([]TownSearchResult, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	trimmed := strings.TrimSpace(q)
	if trimmed == "" {
		return []TownSearchResult{}, nil
	}

	if limit <= 0 {
		limit = 15
	}

	pattern := "%" + trimmed + "%"

	query := `
		WITH raw_matches AS (
			SELECT t.id, t.name, r.name AS region_name, c.name AS country_name, c.code AS country_code
			FROM towns t
			JOIN regions r ON t.region_id = r.id
			JOIN countries c ON r.country_id = c.id
			WHERE t.name ILIKE $1 OR r.name ILIKE $1 OR c.name ILIKE $1
			LIMIT 100
		),
		ranked AS (
			SELECT rm.id, rm.name, rm.region_name, rm.country_name, rm.country_code,
			       CASE 
			           WHEN LOWER(rm.name) = LOWER($2) THEN 1
			           WHEN LOWER(rm.name) LIKE LOWER($2) || '%' THEN 2
			           WHEN LOWER(rm.region_name) = LOWER($2) THEN 3
			           ELSE 4
			       END AS rank_score,
			       ROW_NUMBER() OVER(PARTITION BY LOWER(rm.name), rm.region_name, rm.country_code ORDER BY rm.id) as rn
			FROM raw_matches rm
		)
		SELECT id, name, region_name, country_name, country_code
		FROM ranked
		WHERE rn = 1
		ORDER BY rank_score ASC, name ASC
		LIMIT $3
	`

	rows, err := r.db.Query(query, pattern, trimmed, limit)
	if err != nil {
		return nil, fmt.Errorf("error searching towns: %w", err)
	}
	defer rows.Close()

	var results []TownSearchResult
	for rows.Next() {
		var res TownSearchResult
		var regName, countryName, countryCode sql.NullString

		if err := rows.Scan(&res.ID, &res.Name, &regName, &countryName, &countryCode); err != nil {
			return nil, fmt.Errorf("error scanning town search row: %w", err)
		}

		if regName.Valid {
			res.RegionName = &regName.String
		}
		if countryName.Valid {
			res.CountryName = &countryName.String
		}
		if countryCode.Valid {
			res.CountryCode = &countryCode.String
		}

		results = append(results, res)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating town search rows: %w", err)
	}

	if results == nil {
		results = []TownSearchResult{}
	}

	return results, nil
}
