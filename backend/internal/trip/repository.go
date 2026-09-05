package trip

import (
	"database/sql"
	"fmt"
	"time"
)

type Repository interface {
	Create(trip *Trip, stages []TripStage, companionUserIDs []string) (*Trip, error)
	GetByID(tripID, currentUserID string) (*Trip, error)
	ListByUserID(userID string, filter string) ([]Trip, error)
	Update(tripID, userID string, update *Trip, stages *[]TripStage, companionUserIDs *[]string) (*Trip, error)
	Delete(tripID, userID string) error
	UpdatePhotoSharingMode(tripID, userID string, mode string) error
	ListCompanions(tripID string) ([]TripCompanion, error)
	AddCompanion(tripID, userID, role string) (*TripCompanion, error)
	RemoveCompanion(tripID, userID string) error
	SearchUsers(query, excludeUserID string) ([]FelagiUserSummary, error)
	IsTripMember(tripID, userID string) (bool, bool, error) // isMember, isOwner, err
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
	if townName != nil && *townName != "" {
		return townName
	}
	if regionName != nil && *regionName != "" {
		return regionName
	}
	if countryName != nil && *countryName != "" {
		return countryName
	}
	return nil
}

func (r *repository) Create(trip *Trip, stages []TripStage, companionUserIDs []string) (*Trip, error) {
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
	createdTrip.IsOwner = true
	createdTrip.Stages = make([]TripStage, 0, len(stages))
	createdTrip.Companions = make([]TripCompanion, 0)

	// 1. Insert owner into trip_companions
	queryOwner := `
		INSERT INTO trip_companions (trip_id, user_id, role, status, created_at)
		VALUES ($1, $2, 'owner', 'accepted', NOW())
		ON CONFLICT (trip_id, user_id) DO NOTHING
	`
	if _, err := tx.Exec(queryOwner, createdTrip.ID, createdTrip.UserID); err != nil {
		return nil, fmt.Errorf("error inserting owner to trip_companions: %w", err)
	}

	// 2. Insert companion users if provided
	queryCompanion := `
		INSERT INTO trip_companions (trip_id, user_id, role, status, created_at)
		VALUES ($1, $2, 'companion', 'accepted', NOW())
		ON CONFLICT (trip_id, user_id) DO NOTHING
	`
	for _, cID := range companionUserIDs {
		if cID != "" && cID != createdTrip.UserID {
			if _, err := tx.Exec(queryCompanion, createdTrip.ID, cID); err != nil {
				return nil, fmt.Errorf("error inserting companion %s: %w", cID, err)
			}
		}
	}

	// 3. Insert stages
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

	// Fetch companions with user details
	companions, err := r.ListCompanions(createdTrip.ID)
	if err == nil {
		createdTrip.Companions = companions
	}

	return &createdTrip, nil
}

func (r *repository) GetByID(tripID, currentUserID string) (*Trip, error) {
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
	trip.IsOwner = (trip.UserID == currentUserID)
	trip.Stages = make([]TripStage, 0)
	trip.Companions = make([]TripCompanion, 0)

	// Fetch stages
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

	// Fetch companions
	companions, err := r.ListCompanions(tripID)
	if err != nil {
		return nil, fmt.Errorf("error querying companions for trip %s: %w", tripID, err)
	}
	trip.Companions = companions

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
			SELECT DISTINCT t.id, t.user_id, t.title, t.description, t.start_date, t.end_date, t.visibility, t.status, t.photo_sharing_mode, t.created_at, t.updated_at
			FROM trips t
			LEFT JOIN trip_companions tc ON t.id = tc.trip_id
			WHERE (t.user_id = $1 OR (tc.user_id = $1 AND tc.status = 'accepted'))
			  AND t.end_date >= CURRENT_DATE
			ORDER BY t.start_date ASC
		`
	case "past":
		queryTrips = `
			SELECT DISTINCT t.id, t.user_id, t.title, t.description, t.start_date, t.end_date, t.visibility, t.status, t.photo_sharing_mode, t.created_at, t.updated_at
			FROM trips t
			LEFT JOIN trip_companions tc ON t.id = tc.trip_id
			WHERE (t.user_id = $1 OR (tc.user_id = $1 AND tc.status = 'accepted'))
			  AND t.end_date < CURRENT_DATE
			ORDER BY t.start_date DESC
		`
	default: // "all" or any other
		queryTrips = `
			SELECT DISTINCT t.id, t.user_id, t.title, t.description, t.start_date, t.end_date, t.visibility, t.status, t.photo_sharing_mode, t.created_at, t.updated_at
			FROM trips t
			LEFT JOIN trip_companions tc ON t.id = tc.trip_id
			WHERE (t.user_id = $1 OR (tc.user_id = $1 AND tc.status = 'accepted'))
			ORDER BY t.start_date DESC
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
		trip.IsOwner = (trip.UserID == userID)
		trip.Stages = make([]TripStage, 0)
		trip.Companions = make([]TripCompanion, 0)

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
		LEFT JOIN trip_companions tc ON t.id = tc.trip_id
		WHERE (t.user_id = $1 OR (tc.user_id = $1 AND tc.status = 'accepted'))
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
			// Avoid duplicate stages in case of multiple joins
			exists := false
			for _, existing := range targetTrip.Stages {
				if existing.ID == s.ID {
					exists = true
					break
				}
			}
			if !exists {
				targetTrip.Stages = append(targetTrip.Stages, s)
			}
		}
	}
	if err := sRows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating stage rows for list: %w", err)
	}

	// Fetch companions for these trips
	queryCompanions := `
		SELECT tc.id, tc.trip_id, tc.user_id, u.name, u.avatar_url,
		       tw.name AS town_name, rg.name AS region_name, co.name AS country_name,
		       tc.role, tc.status, tc.created_at
		FROM trip_companions tc
		JOIN users u ON tc.user_id = u.id
		LEFT JOIN towns tw ON u.town_id = tw.id
		LEFT JOIN regions rg ON tw.region_id = rg.id
		LEFT JOIN countries co ON rg.country_id = co.id
		JOIN trips t ON tc.trip_id = t.id
		LEFT JOIN trip_companions tc2 ON t.id = tc2.trip_id
		WHERE (t.user_id = $1 OR (tc2.user_id = $1 AND tc2.status = 'accepted'))
		ORDER BY tc.created_at ASC
	`
	cRows, err := r.db.Query(queryCompanions, userID)
	if err == nil {
		defer cRows.Close()
		for cRows.Next() {
			var tc TripCompanion
			var avURL, twName, rgName, coName sql.NullString
			if err := cRows.Scan(
				&tc.ID, &tc.TripID, &tc.UserID, &tc.Name, &avURL,
				&twName, &rgName, &coName,
				&tc.Role, &tc.Status, &tc.CreatedAt,
			); err == nil {
				if avURL.Valid {
					tc.AvatarURL = &avURL.String
				}
				if twName.Valid {
					tc.TownName = &twName.String
				}
				var tStr, rStr, cStr *string
				if twName.Valid {
					tStr = &twName.String
				}
				if rgName.Valid {
					rStr = &rgName.String
				}
				if coName.Valid {
					cStr = &coName.String
				}
				tc.OriginSummary = formatOriginSummary(tStr, rStr, cStr)

				if targetTrip, ok := tripsMap[tc.TripID]; ok {
					// Avoid duplicates
					exists := false
					for _, existing := range targetTrip.Companions {
						if existing.ID == tc.ID {
							exists = true
							break
						}
					}
					if !exists {
						targetTrip.Companions = append(targetTrip.Companions, tc)
					}
				}
			}
		}
	}

	result := make([]Trip, len(tripsOrder))
	for i, id := range tripsOrder {
		result[i] = *tripsMap[id]
	}

	return result, nil
}

func (r *repository) Update(tripID, userID string, update *Trip, stages *[]TripStage, companionUserIDs *[]string) (*Trip, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Check trip existence and ownership (only creator/owner can update trip details)
	var isOwner bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM trips WHERE id = $1 AND user_id = $2)`
	if err := tx.QueryRow(checkQuery, tripID, userID).Scan(&isOwner); err != nil || !isOwner {
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
	updatedTrip.IsOwner = true

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

	// If companionUserIDs is updated
	if companionUserIDs != nil {
		// Keep owner, delete previous companions not in the new list
		deleteCompQuery := `DELETE FROM trip_companions WHERE trip_id = $1 AND role = 'companion'`
		if _, err := tx.Exec(deleteCompQuery, tripID); err != nil {
			return nil, fmt.Errorf("error resetting companions: %w", err)
		}

		insertCompQuery := `
			INSERT INTO trip_companions (trip_id, user_id, role, status, created_at)
			VALUES ($1, $2, 'companion', 'accepted', NOW())
			ON CONFLICT (trip_id, user_id) DO NOTHING
		`
		for _, cID := range *companionUserIDs {
			if cID != "" && cID != userID {
				if _, err := tx.Exec(insertCompQuery, tripID, cID); err != nil {
					return nil, fmt.Errorf("error inserting companion %s: %w", cID, err)
				}
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

	companions, err := r.ListCompanions(tripID)
	if err == nil {
		updatedTrip.Companions = companions
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

	// Check if user is owner or companion of the trip
	query := `
		UPDATE trips
		SET photo_sharing_mode = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND (user_id = $3 OR EXISTS (SELECT 1 FROM trip_companions tc WHERE tc.trip_id = $1 AND tc.user_id = $3))
	`
	res, err := r.db.Exec(query, tripID, mode, userID)
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

func (r *repository) ListCompanions(tripID string) ([]TripCompanion, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT tc.id, tc.trip_id, tc.user_id, u.name, u.avatar_url,
		       tw.name AS town_name, rg.name AS region_name, co.name AS country_name,
		       tc.role, tc.status, tc.created_at
		FROM trip_companions tc
		JOIN users u ON tc.user_id = u.id
		LEFT JOIN towns tw ON u.town_id = tw.id
		LEFT JOIN regions rg ON tw.region_id = rg.id
		LEFT JOIN countries co ON rg.country_id = co.id
		WHERE tc.trip_id = $1
		ORDER BY CASE WHEN tc.role = 'owner' THEN 0 ELSE 1 END, tc.created_at ASC
	`
	rows, err := r.db.Query(query, tripID)
	if err != nil {
		return nil, fmt.Errorf("error querying trip companions: %w", err)
	}
	defer rows.Close()

	companions := make([]TripCompanion, 0)
	for rows.Next() {
		var tc TripCompanion
		var avURL, twName, rgName, coName sql.NullString
		if err := rows.Scan(
			&tc.ID, &tc.TripID, &tc.UserID, &tc.Name, &avURL,
			&twName, &rgName, &coName,
			&tc.Role, &tc.Status, &tc.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("error scanning companion: %w", err)
		}

		if avURL.Valid {
			tc.AvatarURL = &avURL.String
		}
		if twName.Valid {
			tc.TownName = &twName.String
		}
		var tStr, rStr, cStr *string
		if twName.Valid {
			tStr = &twName.String
		}
		if rgName.Valid {
			rStr = &rgName.String
		}
		if coName.Valid {
			cStr = &coName.String
		}
		tc.OriginSummary = formatOriginSummary(tStr, rStr, cStr)

		companions = append(companions, tc)
	}

	return companions, nil
}

func (r *repository) AddCompanion(tripID, userID, role string) (*TripCompanion, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		INSERT INTO trip_companions (trip_id, user_id, role, status, created_at)
		VALUES ($1, $2, $3, 'accepted', NOW())
		ON CONFLICT (trip_id, user_id) DO UPDATE SET status = 'accepted'
		RETURNING id, trip_id, user_id, role, status, created_at
	`

	var tc TripCompanion
	if err := r.db.QueryRow(query, tripID, userID, role).Scan(
		&tc.ID, &tc.TripID, &tc.UserID, &tc.Role, &tc.Status, &tc.CreatedAt,
	); err != nil {
		return nil, fmt.Errorf("error adding trip companion: %w", err)
	}

	// Fetch user details for summary
	userQuery := `
		SELECT u.name, u.avatar_url, tw.name, rg.name, co.name
		FROM users u
		LEFT JOIN towns tw ON u.town_id = tw.id
		LEFT JOIN regions rg ON tw.region_id = rg.id
		LEFT JOIN countries co ON rg.country_id = co.id
		WHERE u.id = $1
	`
	var avURL, twName, rgName, coName sql.NullString
	if err := r.db.QueryRow(userQuery, userID).Scan(&tc.Name, &avURL, &twName, &rgName, &coName); err == nil {
		if avURL.Valid {
			tc.AvatarURL = &avURL.String
		}
		if twName.Valid {
			tc.TownName = &twName.String
		}
		var tStr, rStr, cStr *string
		if twName.Valid {
			tStr = &twName.String
		}
		if rgName.Valid {
			rStr = &rgName.String
		}
		if coName.Valid {
			cStr = &coName.String
		}
		tc.OriginSummary = formatOriginSummary(tStr, rStr, cStr)
	}

	return &tc, nil
}

func (r *repository) RemoveCompanion(tripID, userID string) error {
	if r.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	query := `DELETE FROM trip_companions WHERE trip_id = $1 AND user_id = $2 AND role != 'owner'`
	res, err := r.db.Exec(query, tripID, userID)
	if err != nil {
		return fmt.Errorf("error removing companion: %w", err)
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

func (r *repository) SearchUsers(query, excludeUserID string) ([]FelagiUserSummary, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	searchPattern := "%" + query + "%"
	sqlQuery := `
		SELECT u.id, u.name, u.avatar_url, tw.name AS town_name, rg.name AS region_name, co.name AS country_name
		FROM users u
		LEFT JOIN towns tw ON u.town_id = tw.id
		LEFT JOIN regions rg ON tw.region_id = rg.id
		LEFT JOIN countries co ON rg.country_id = co.id
		WHERE u.id != $1
		  AND (LOWER(u.name) LIKE LOWER($2) OR LOWER(u.email) LIKE LOWER($2) OR (tw.name IS NOT NULL AND LOWER(tw.name) LIKE LOWER($2)))
		ORDER BY u.name ASC
		LIMIT 20
	`
	rows, err := r.db.Query(sqlQuery, excludeUserID, searchPattern)
	if err != nil {
		return nil, fmt.Errorf("error searching users: %w", err)
	}
	defer rows.Close()

	users := make([]FelagiUserSummary, 0)
	for rows.Next() {
		var u FelagiUserSummary
		var avURL, twName, rgName, coName sql.NullString
		if err := rows.Scan(&u.ID, &u.Name, &avURL, &twName, &rgName, &coName); err != nil {
			return nil, fmt.Errorf("error scanning user: %w", err)
		}

		if avURL.Valid {
			u.AvatarURL = &avURL.String
		}
		if twName.Valid {
			u.TownName = &twName.String
		}
		var tStr, rStr, cStr *string
		if twName.Valid {
			tStr = &twName.String
		}
		if rgName.Valid {
			rStr = &rgName.String
		}
		if coName.Valid {
			cStr = &coName.String
		}
		u.OriginSummary = formatOriginSummary(tStr, rStr, cStr)

		users = append(users, u)
	}

	return users, nil
}

func (r *repository) IsTripMember(tripID, userID string) (bool, bool, error) {
	if r.db == nil {
		return false, false, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT role
		FROM trip_companions
		WHERE trip_id = $1 AND user_id = $2
	`
	var role string
	err := r.db.QueryRow(query, tripID, userID).Scan(&role)
	if err == sql.ErrNoRows {
		// Fallback check on trips table
		var tripUserID string
		err2 := r.db.QueryRow("SELECT user_id FROM trips WHERE id = $1", tripID).Scan(&tripUserID)
		if err2 == sql.ErrNoRows {
			return false, false, nil
		}
		if err2 != nil {
			return false, false, err2
		}
		isOwner := (tripUserID == userID)
		return isOwner, isOwner, nil
	}
	if err != nil {
		return false, false, err
	}

	return true, role == "owner", nil
}
