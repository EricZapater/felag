package trip

import (
	"database/sql"
	"fmt"
	"time"
)

type Repository interface {
	Create(trip *Trip, stages []TripStage) (*Trip, error)
	GetByID(tripID string) (*Trip, error)
	ListByUserID(userID string, filter string) ([]Trip, error)
	Update(tripID, userID string, update *Trip, stages *[]TripStage) (*Trip, error)
	Delete(tripID, userID string) error
	UpdatePhotoSharingMode(tripID, userID string, mode string) error
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(trip *Trip, stages []TripStage) (*Trip, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	queryTrip := `
		INSERT INTO trips (user_id, title, description, start_date, end_date, visibility, status, photo_sharing_mode)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, title, description, start_date, end_date, visibility, status, photo_sharing_mode, created_at, updated_at
	`

	var desc sql.NullString
	if trip.Description != nil {
		desc = sql.NullString{String: *trip.Description, Valid: true}
	}

	photoSharing := trip.PhotoSharingMode
	if photoSharing == "" {
		photoSharing = "none"
	}

	var createdTrip Trip
	var startDate, endDate time.Time
	var resDesc sql.NullString

	err = tx.QueryRow(
		queryTrip,
		trip.UserID,
		trip.Title,
		desc,
		trip.StartDate,
		trip.EndDate,
		trip.Visibility,
		trip.Status,
		photoSharing,
	).Scan(
		&createdTrip.ID,
		&createdTrip.UserID,
		&createdTrip.Title,
		&resDesc,
		&startDate,
		&endDate,
		&createdTrip.Visibility,
		&createdTrip.Status,
		&createdTrip.PhotoSharingMode,
		&createdTrip.CreatedAt,
		&createdTrip.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error inserting trip: %w", err)
	}

	if resDesc.Valid {
		createdTrip.Description = &resDesc.String
	}
	createdTrip.StartDate = startDate.Format("2006-01-02")
	createdTrip.EndDate = endDate.Format("2006-01-02")
	createdTrip.Stages = make([]TripStage, 0, len(stages))

	queryStage := `
		INSERT INTO trip_stages (trip_id, stage_order, destination_name, country_code, town_id, region_id, start_date, end_date, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, trip_id, stage_order, destination_name, country_code, town_id, region_id, start_date, end_date, notes
	`

	for _, s := range stages {
		var cc, townID, regionID, notes sql.NullString
		if s.CountryCode != nil {
			cc = sql.NullString{String: *s.CountryCode, Valid: true}
		}
		if s.TownID != nil && *s.TownID != "" {
			townID = sql.NullString{String: *s.TownID, Valid: true}
		}
		if s.RegionID != nil && *s.RegionID != "" {
			regionID = sql.NullString{String: *s.RegionID, Valid: true}
		}
		if s.Notes != nil {
			notes = sql.NullString{String: *s.Notes, Valid: true}
		}

		var createdStage TripStage
		var sStart, sEnd time.Time
		var resCC, resTownID, resRegionID, resNotes sql.NullString

		err = tx.QueryRow(
			queryStage,
			createdTrip.ID,
			s.StageOrder,
			s.DestinationName,
			cc,
			townID,
			regionID,
			s.StartDate,
			s.EndDate,
			notes,
		).Scan(
			&createdStage.ID,
			&createdStage.TripID,
			&createdStage.StageOrder,
			&createdStage.DestinationName,
			&resCC,
			&resTownID,
			&resRegionID,
			&sStart,
			&sEnd,
			&resNotes,
		)
		if err != nil {
			return nil, fmt.Errorf("error inserting trip stage: %w", err)
		}

		if resCC.Valid {
			createdStage.CountryCode = &resCC.String
		}
		if resTownID.Valid {
			createdStage.TownID = &resTownID.String
		}
		if resRegionID.Valid {
			createdStage.RegionID = &resRegionID.String
		}
		if resNotes.Valid {
			createdStage.Notes = &resNotes.String
		}
		createdStage.StartDate = sStart.Format("2006-01-02")
		createdStage.EndDate = sEnd.Format("2006-01-02")

		createdTrip.Stages = append(createdTrip.Stages, createdStage)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("error committing transaction: %w", err)
	}

	return &createdTrip, nil
}

func (r *repository) GetByID(tripID string) (*Trip, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	queryTrip := `
		SELECT id, user_id, title, description, start_date, end_date, visibility, status, photo_sharing_mode, created_at, updated_at
		FROM trips
		WHERE id = $1
	`

	var trip Trip
	var startDate, endDate time.Time
	var desc sql.NullString

	err := r.db.QueryRow(queryTrip, tripID).Scan(
		&trip.ID,
		&trip.UserID,
		&trip.Title,
		&desc,
		&startDate,
		&endDate,
		&trip.Visibility,
		&trip.Status,
		&trip.PhotoSharingMode,
		&trip.CreatedAt,
		&trip.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying trip: %w", err)
	}

	if desc.Valid {
		trip.Description = &desc.String
	}
	trip.StartDate = startDate.Format("2006-01-02")
	trip.EndDate = endDate.Format("2006-01-02")
	trip.Stages = make([]TripStage, 0)

	queryStages := `
		SELECT id, trip_id, stage_order, destination_name, country_code, town_id, region_id, start_date, end_date, notes
		FROM trip_stages
		WHERE trip_id = $1
		ORDER BY stage_order ASC
	`

	rows, err := r.db.Query(queryStages, tripID)
	if err != nil {
		return nil, fmt.Errorf("error querying trip stages: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var s TripStage
		var sStart, sEnd time.Time
		var cc, townID, regionID, notes sql.NullString

		if err := rows.Scan(
			&s.ID,
			&s.TripID,
			&s.StageOrder,
			&s.DestinationName,
			&cc,
			&townID,
			&regionID,
			&sStart,
			&sEnd,
			&notes,
		); err != nil {
			return nil, fmt.Errorf("error scanning stage row: %w", err)
		}

		if cc.Valid {
			s.CountryCode = &cc.String
		}
		if townID.Valid {
			s.TownID = &townID.String
		}
		if regionID.Valid {
			s.RegionID = &regionID.String
		}
		if notes.Valid {
			s.Notes = &notes.String
		}
		s.StartDate = sStart.Format("2006-01-02")
		s.EndDate = sEnd.Format("2006-01-02")

		trip.Stages = append(trip.Stages, s)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating stage rows: %w", err)
	}

	return &trip, nil
}

func (r *repository) ListByUserID(userID string, filter string) ([]Trip, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	var queryTrips string
	switch filter {
	case "upcoming":
		queryTrips = `
			SELECT id, user_id, title, description, start_date, end_date, visibility, status, photo_sharing_mode, created_at, updated_at
			FROM trips
			WHERE user_id = $1 AND end_date >= CURRENT_DATE
			ORDER BY start_date ASC
		`
	case "past":
		queryTrips = `
			SELECT id, user_id, title, description, start_date, end_date, visibility, status, photo_sharing_mode, created_at, updated_at
			FROM trips
			WHERE user_id = $1 AND end_date < CURRENT_DATE
			ORDER BY start_date DESC
		`
	default: // "all" or any other
		queryTrips = `
			SELECT id, user_id, title, description, start_date, end_date, visibility, status, photo_sharing_mode, created_at, updated_at
			FROM trips
			WHERE user_id = $1
			ORDER BY start_date DESC
		`
	}

	rows, err := r.db.Query(queryTrips, userID)
	if err != nil {
		return nil, fmt.Errorf("error querying trips: %w", err)
	}
	defer rows.Close()

	tripsMap := make(map[string]*Trip)
	tripsOrder := make([]string, 0)
	var trips []Trip

	for rows.Next() {
		var trip Trip
		var startDate, endDate time.Time
		var desc sql.NullString

		if err := rows.Scan(
			&trip.ID,
			&trip.UserID,
			&trip.Title,
			&desc,
			&startDate,
			&endDate,
			&trip.Visibility,
			&trip.Status,
			&trip.PhotoSharingMode,
			&trip.CreatedAt,
			&trip.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("error scanning trip row: %w", err)
		}

		if desc.Valid {
			trip.Description = &desc.String
		}
		trip.StartDate = startDate.Format("2006-01-02")
		trip.EndDate = endDate.Format("2006-01-02")
		trip.Stages = make([]TripStage, 0)

		trips = append(trips, trip)
		tripsOrder = append(tripsOrder, trip.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating trip rows: %w", err)
	}

	if len(trips) == 0 {
		return []Trip{}, nil
	}

	for i := range trips {
		tripsMap[trips[i].ID] = &trips[i]
	}

	// Fetch all stages for these trips
	queryStages := `
		SELECT ts.id, ts.trip_id, ts.stage_order, ts.destination_name, ts.country_code, ts.town_id, ts.region_id, ts.start_date, ts.end_date, ts.notes
		FROM trip_stages ts
		JOIN trips t ON ts.trip_id = t.id
		WHERE t.user_id = $1
		ORDER BY ts.stage_order ASC
	`

	sRows, err := r.db.Query(queryStages, userID)
	if err != nil {
		return nil, fmt.Errorf("error querying trip stages for list: %w", err)
	}
	defer sRows.Close()

	for sRows.Next() {
		var s TripStage
		var sStart, sEnd time.Time
		var cc, townID, regionID, notes sql.NullString

		if err := sRows.Scan(
			&s.ID,
			&s.TripID,
			&s.StageOrder,
			&s.DestinationName,
			&cc,
			&townID,
			&regionID,
			&sStart,
			&sEnd,
			&notes,
		); err != nil {
			return nil, fmt.Errorf("error scanning stage row: %w", err)
		}

		if cc.Valid {
			s.CountryCode = &cc.String
		}
		if townID.Valid {
			s.TownID = &townID.String
		}
		if regionID.Valid {
			s.RegionID = &regionID.String
		}
		if notes.Valid {
			s.Notes = &notes.String
		}
		s.StartDate = sStart.Format("2006-01-02")
		s.EndDate = sEnd.Format("2006-01-02")

		if targetTrip, ok := tripsMap[s.TripID]; ok {
			targetTrip.Stages = append(targetTrip.Stages, s)
		}
	}
	if err := sRows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating stage rows for list: %w", err)
	}

	result := make([]Trip, len(tripsOrder))
	for i, id := range tripsOrder {
		result[i] = *tripsMap[id]
	}

	return result, nil
}

func (r *repository) Update(tripID, userID string, update *Trip, stages *[]TripStage) (*Trip, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Check trip existence and ownership
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM trips WHERE id = $1 AND user_id = $2)`
	if err := tx.QueryRow(checkQuery, tripID, userID).Scan(&exists); err != nil || !exists {
		return nil, nil // Not found or not owned
	}

	var titleParam, descParam, startParam, endParam, visParam, photoSharingParam interface{}
	if update.Title != "" {
		titleParam = update.Title
	}
	if update.Description != nil {
		descParam = *update.Description
	}
	if update.StartDate != "" {
		startParam = update.StartDate
	}
	if update.EndDate != "" {
		endParam = update.EndDate
	}
	if update.Visibility != "" {
		visParam = update.Visibility
	}
	if update.PhotoSharingMode != "" {
		photoSharingParam = update.PhotoSharingMode
	}

	updateQuery := `
		UPDATE trips
		SET title = COALESCE($3, title),
		    description = COALESCE($4, description),
		    start_date = COALESCE($5, start_date),
		    end_date = COALESCE($6, end_date),
		    visibility = COALESCE($7, visibility),
		    photo_sharing_mode = COALESCE($8, photo_sharing_mode),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, title, description, start_date, end_date, visibility, status, photo_sharing_mode, created_at, updated_at
	`

	var updatedTrip Trip
	var startDate, endDate time.Time
	var resDesc sql.NullString

	err = tx.QueryRow(
		updateQuery,
		tripID,
		userID,
		titleParam,
		descParam,
		startParam,
		endParam,
		visParam,
		photoSharingParam,
	).Scan(
		&updatedTrip.ID,
		&updatedTrip.UserID,
		&updatedTrip.Title,
		&resDesc,
		&startDate,
		&endDate,
		&updatedTrip.Visibility,
		&updatedTrip.Status,
		&updatedTrip.PhotoSharingMode,
		&updatedTrip.CreatedAt,
		&updatedTrip.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error updating trip: %w", err)
	}

	if resDesc.Valid {
		updatedTrip.Description = &resDesc.String
	}
	updatedTrip.StartDate = startDate.Format("2006-01-02")
	updatedTrip.EndDate = endDate.Format("2006-01-02")

	// If stages are updated
	if stages != nil {
		deleteStagesQuery := `DELETE FROM trip_stages WHERE trip_id = $1`
		if _, err := tx.Exec(deleteStagesQuery, tripID); err != nil {
			return nil, fmt.Errorf("error deleting old stages: %w", err)
		}

		queryStage := `
			INSERT INTO trip_stages (trip_id, stage_order, destination_name, country_code, town_id, region_id, start_date, end_date, notes)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`

		for _, s := range *stages {
			var cc, townID, regionID, notes sql.NullString
			if s.CountryCode != nil {
				cc = sql.NullString{String: *s.CountryCode, Valid: true}
			}
			if s.TownID != nil && *s.TownID != "" {
				townID = sql.NullString{String: *s.TownID, Valid: true}
			}
			if s.RegionID != nil && *s.RegionID != "" {
				regionID = sql.NullString{String: *s.RegionID, Valid: true}
			}
			if s.Notes != nil {
				notes = sql.NullString{String: *s.Notes, Valid: true}
			}

			_, err = tx.Exec(
				queryStage,
				tripID,
				s.StageOrder,
				s.DestinationName,
				cc,
				townID,
				regionID,
				s.StartDate,
				s.EndDate,
				notes,
			)
			if err != nil {
				return nil, fmt.Errorf("error inserting updated stage: %w", err)
			}
		}
	}

	// Fetch current stages
	queryCurrentStages := `
		SELECT id, trip_id, stage_order, destination_name, country_code, town_id, region_id, start_date, end_date, notes
		FROM trip_stages
		WHERE trip_id = $1
		ORDER BY stage_order ASC
	`
	sRows, err := tx.Query(queryCurrentStages, tripID)
	if err != nil {
		return nil, fmt.Errorf("error querying current stages: %w", err)
	}
	defer sRows.Close()

	updatedTrip.Stages = make([]TripStage, 0)
	for sRows.Next() {
		var s TripStage
		var sStart, sEnd time.Time
		var cc, townID, regionID, notes sql.NullString

		if err := sRows.Scan(
			&s.ID,
			&s.TripID,
			&s.StageOrder,
			&s.DestinationName,
			&cc,
			&townID,
			&regionID,
			&sStart,
			&sEnd,
			&notes,
		); err != nil {
			return nil, fmt.Errorf("error scanning updated stage row: %w", err)
		}

		if cc.Valid {
			s.CountryCode = &cc.String
		}
		if townID.Valid {
			s.TownID = &townID.String
		}
		if regionID.Valid {
			s.RegionID = &regionID.String
		}
		if notes.Valid {
			s.Notes = &notes.String
		}
		s.StartDate = sStart.Format("2006-01-02")
		s.EndDate = sEnd.Format("2006-01-02")

		updatedTrip.Stages = append(updatedTrip.Stages, s)
	}
	if err := sRows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating updated stage rows: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("error committing update transaction: %w", err)
	}

	return &updatedTrip, nil
}

func (r *repository) Delete(tripID, userID string) error {
	if r.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	query := `DELETE FROM trips WHERE id = $1 AND user_id = $2`
	res, err := r.db.Exec(query, tripID, userID)
	if err != nil {
		return fmt.Errorf("error deleting trip: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("error checking rows affected: %w", err)
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *repository) UpdatePhotoSharingMode(tripID, userID string, mode string) error {
	if r.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	query := `UPDATE trips SET photo_sharing_mode = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`
	res, err := r.db.Exec(query, tripID, userID, mode)
	if err != nil {
		return fmt.Errorf("error updating photo sharing mode: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("error checking rows affected: %w", err)
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}
