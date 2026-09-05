package matching

import (
	"database/sql"
	"fmt"
	"time"
)

type CandidateTripStage struct {
	TripID          string
	UserID          string
	DestinationName string
	StartDate       string
	EndDate         string
	UserName        string
	AvatarURL       *string
	TownID          *string
	TownName        *string
	RegionID        *string
	RegionName      *string
	CountryID       *string
	CountryName     *string
}

type Repository interface {
	GetTripMatches(tripID string) ([]Match, error)
	GetMatchByID(matchID string) (*Match, error)
	GetUserOrigin(userID string) (*UserOriginInfo, error)
	GetTripStages(tripID string) ([]TripStageRecord, error)
	FindCandidateStages(tripID, currentUserID, destinationName, startDate, endDate string) ([]CandidateTripStage, error)
	UpsertMatch(m *MatchRecord) (isNew bool, matchID string, err error)
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func formatOriginSummary(townName, regionName, countryName *string) *string {
	if townName != nil && regionName != nil && *townName != "" && *regionName != "" {
		res := fmt.Sprintf("%s (%s)", *townName, *regionName)
		return &res
	}
	if regionName != nil && countryName != nil && *regionName != "" && *countryName != "" {
		res := fmt.Sprintf("%s (%s)", *regionName, *countryName)
		return &res
	}
	if regionName != nil && *regionName != "" {
		return regionName
	}
	if countryName != nil && *countryName != "" {
		return countryName
	}
	return nil
}

func (r *repository) GetTripMatches(tripID string) ([]Match, error) {
	query := `
		SELECT m.id, m.trip_id, m.matched_trip_id, m.matched_user_id,
		       u.name, u.avatar_url,
		       t.name AS town_name, r.name AS region_name, c.name AS country_name,
		       m.destination_name, m.overlap_start_date::text, m.overlap_end_date::text,
		       m.affinity_level, m.affinity_score, m.explanation, m.created_at, m.status
		FROM matches m
		JOIN users u ON m.matched_user_id = u.id
		LEFT JOIN towns t ON u.town_id = t.id
		LEFT JOIN regions r ON t.region_id = r.id
		LEFT JOIN countries c ON r.country_id = c.id
		WHERE m.trip_id = $1 AND m.status = 'active'
		ORDER BY m.affinity_score DESC, m.overlap_start_date ASC
	`
	rows, err := r.db.Query(query, tripID)
	if err != nil {
		return nil, fmt.Errorf("error querying matches for trip %s: %w", tripID, err)
	}
	defer rows.Close()

	matches := make([]Match, 0)
	for rows.Next() {
		var m Match
		var matchedUserID, userName string
		var avatarURL, townName, regionName, countryName sql.NullString

		if err := rows.Scan(
			&m.ID, &m.TripID, &m.MatchedTripID, &matchedUserID,
			&userName, &avatarURL,
			&townName, &regionName, &countryName,
			&m.DestinationName, &m.OverlapStartDate, &m.OverlapEndDate,
			&m.AffinityLevel, &m.AffinityScore, &m.Explanation, &m.CreatedAt, &m.Status,
		); err != nil {
			return nil, fmt.Errorf("error scanning match: %w", err)
		}

		var avURL *string
		if avatarURL.Valid {
			avURL = &avatarURL.String
		}

		var tName, rName, cName *string
		if townName.Valid {
			tName = &townName.String
		}
		if regionName.Valid {
			rName = &regionName.String
		}
		if countryName.Valid {
			cName = &countryName.String
		}

		m.MatchedUser = FelagiUser{
			ID:            matchedUserID,
			Name:          userName,
			AvatarURL:     avURL,
			OriginSummary: formatOriginSummary(tName, rName, cName),
		}

		matches = append(matches, m)
	}

	return matches, nil
}

func (r *repository) GetMatchByID(matchID string) (*Match, error) {
	query := `
		SELECT m.id, m.trip_id, m.matched_trip_id, m.matched_user_id,
		       u.name, u.avatar_url,
		       t.name AS town_name, r.name AS region_name, c.name AS country_name,
		       m.destination_name, m.overlap_start_date::text, m.overlap_end_date::text,
		       m.affinity_level, m.affinity_score, m.explanation, m.created_at, m.status
		FROM matches m
		JOIN users u ON m.matched_user_id = u.id
		LEFT JOIN towns t ON u.town_id = t.id
		LEFT JOIN regions r ON t.region_id = r.id
		LEFT JOIN countries c ON r.country_id = c.id
		WHERE m.id = $1
	`
	var m Match
	var matchedUserID, userName string
	var avatarURL, townName, regionName, countryName sql.NullString

	err := r.db.QueryRow(query, matchID).Scan(
		&m.ID, &m.TripID, &m.MatchedTripID, &matchedUserID,
		&userName, &avatarURL,
		&townName, &regionName, &countryName,
		&m.DestinationName, &m.OverlapStartDate, &m.OverlapEndDate,
		&m.AffinityLevel, &m.AffinityScore, &m.Explanation, &m.CreatedAt, &m.Status,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying match by id: %w", err)
	}

	var avURL *string
	if avatarURL.Valid {
		avURL = &avatarURL.String
	}

	var tName, rName, cName *string
	if townName.Valid {
		tName = &townName.String
	}
	if regionName.Valid {
		rName = &regionName.String
	}
	if countryName.Valid {
		cName = &countryName.String
	}

	m.MatchedUser = FelagiUser{
		ID:            matchedUserID,
		Name:          userName,
		AvatarURL:     avURL,
		OriginSummary: formatOriginSummary(tName, rName, cName),
	}

	return &m, nil
}

func (r *repository) GetUserOrigin(userID string) (*UserOriginInfo, error) {
	query := `
		SELECT u.id, u.name, u.avatar_url,
		       t.id, t.name,
		       rg.id, rg.name,
		       co.id, co.name
		FROM users u
		LEFT JOIN towns t ON u.town_id = t.id
		LEFT JOIN regions rg ON t.region_id = rg.id
		LEFT JOIN countries co ON rg.country_id = co.id
		WHERE u.id = $1
	`
	var u UserOriginInfo
	var avURL, tID, tName, rID, rName, cID, cName sql.NullString

	err := r.db.QueryRow(query, userID).Scan(
		&u.UserID, &u.UserName, &avURL,
		&tID, &tName,
		&rID, &rName,
		&cID, &cName,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying user origin: %w", err)
	}

	if avURL.Valid {
		u.AvatarURL = &avURL.String
	}
	if tID.Valid {
		u.TownID = &tID.String
		u.TownName = &tName.String
	}
	if rID.Valid {
		u.RegionID = &rID.String
		u.RegionName = &rName.String
	}
	if cID.Valid {
		u.CountryID = &cID.String
		u.CountryName = &cName.String
	}

	return &u, nil
}

func (r *repository) GetTripStages(tripID string) ([]TripStageRecord, error) {
	query := `
		SELECT ts.trip_id, t.user_id, ts.destination_name, ts.start_date::text, ts.end_date::text, t.visibility
		FROM trip_stages ts
		JOIN trips t ON ts.trip_id = t.id
		WHERE ts.trip_id = $1
		ORDER BY ts.stage_order ASC
	`
	rows, err := r.db.Query(query, tripID)
	if err != nil {
		return nil, fmt.Errorf("error querying stages for trip %s: %w", tripID, err)
	}
	defer rows.Close()

	var stages []TripStageRecord
	for rows.Next() {
		var s TripStageRecord
		if err := rows.Scan(&s.TripID, &s.UserID, &s.DestinationName, &s.StartDate, &s.EndDate, &s.Visibility); err != nil {
			return nil, err
		}
		stages = append(stages, s)
	}
	return stages, nil
}

func (r *repository) FindCandidateStages(tripID, currentUserID, destinationName, startDate, endDate string) ([]CandidateTripStage, error) {
	query := `
		SELECT ts.trip_id, t.user_id, ts.destination_name, ts.start_date::text, ts.end_date::text,
		       u.name AS user_name, u.avatar_url,
		       tw.id AS town_id, tw.name AS town_name,
		       rg.id AS region_id, rg.name AS region_name,
		       co.id AS country_id, co.name AS country_name
		FROM trip_stages ts
		JOIN trips t ON ts.trip_id = t.id
		JOIN users u ON t.user_id = u.id
		LEFT JOIN towns tw ON u.town_id = tw.id
		LEFT JOIN regions rg ON tw.region_id = rg.id
		LEFT JOIN countries co ON rg.country_id = co.id
		WHERE t.id != $1
		  AND t.user_id != $2
		  AND t.user_id NOT IN (
		      SELECT user_id FROM trip_companions WHERE trip_id = $1
		  )
		  AND NOT EXISTS (
		      SELECT 1 FROM trip_companions tc1
		      JOIN trip_companions tc2 ON tc1.user_id = tc2.user_id
		      WHERE tc1.trip_id = t.id AND tc2.trip_id = $1
		  )
		  AND t.visibility != 'private'
		  AND t.status != 'cancelled'
		  AND LOWER(TRIM(ts.destination_name)) = LOWER(TRIM($3))
		  AND ts.start_date <= $5::date AND ts.end_date >= $4::date
	`
	rows, err := r.db.Query(query, tripID, currentUserID, destinationName, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("error querying candidate stages: %w", err)
	}
	defer rows.Close()

	var candidates []CandidateTripStage
	for rows.Next() {
		var c CandidateTripStage
		var avURL, tID, tName, rID, rName, coID, coName sql.NullString

		if err := rows.Scan(
			&c.TripID, &c.UserID, &c.DestinationName, &c.StartDate, &c.EndDate,
			&c.UserName, &avURL,
			&tID, &tName,
			&rID, &rName,
			&coID, &coName,
		); err != nil {
			return nil, fmt.Errorf("error scanning candidate stage: %w", err)
		}

		if avURL.Valid {
			c.AvatarURL = &avURL.String
		}
		if tID.Valid {
			c.TownID = &tID.String
			c.TownName = &tName.String
		}
		if rID.Valid {
			c.RegionID = &rID.String
			c.RegionName = &rName.String
		}
		if coID.Valid {
			c.CountryID = &coID.String
			c.CountryName = &coName.String
		}

		candidates = append(candidates, c)
	}

	return candidates, nil
}

func (r *repository) UpsertMatch(m *MatchRecord) (bool, string, error) {
	query := `
		INSERT INTO matches (
			trip_id, matched_trip_id, user_id, matched_user_id,
			destination_name, overlap_start_date, overlap_end_date,
			affinity_level, affinity_score, explanation, status,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10, 'active', NOW(), NOW())
		ON CONFLICT (trip_id, matched_trip_id) DO UPDATE
		SET destination_name = EXCLUDED.destination_name,
		    overlap_start_date = EXCLUDED.overlap_start_date,
		    overlap_end_date = EXCLUDED.overlap_end_date,
		    affinity_level = EXCLUDED.affinity_level,
		    affinity_score = EXCLUDED.affinity_score,
		    explanation = EXCLUDED.explanation,
		    updated_at = NOW()
		RETURNING id, (xmax = 0) AS is_new, created_at
	`
	var id string
	var isNew bool
	var createdAt time.Time

	err := r.db.QueryRow(
		query,
		m.TripID, m.MatchedTripID, m.UserID, m.MatchedUserID,
		m.DestinationName, m.OverlapStartDate, m.OverlapEndDate,
		m.AffinityLevel, m.AffinityScore, m.Explanation,
	).Scan(&id, &isNew, &createdAt)
	if err != nil {
		return false, "", fmt.Errorf("error upserting match: %w", err)
	}

	m.ID = id
	m.CreatedAt = createdAt
	m.IsNew = isNew

	return isNew, id, nil
}
