package posttrip

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type TripAccessInfo struct {
	ID               string
	UserID           string
	Title            string
	StartDate        time.Time
	EndDate          time.Time
	Status           string
	PhotoSharingMode string
	DestinationName  string
	CountryCode      string
}

type ActiveTripInfo struct {
	TripID                string
	Title                 string
	StartDate             time.Time
	EndDate               time.Time
	PhotoSharingMode      string
	DestinationName       string
	CountryCode           string
	PhotosCount           int
	CelebrationCardsCount int
	ActiveFelagisCount    int
}

type Repository interface {
	GetActiveTripForUser(userID string) (*ActiveTripInfo, error)
	GetTripAccessInfo(tripID string) (*TripAccessInfo, error)

	// Photos
	ListPhotos(tripID string) ([]TripPhoto, error)
	GetPhoto(tripID, photoID string) (*TripPhoto, error)
	AddPhoto(tripID, userID string, req AddTripPhotoRequest) (*TripPhoto, error)
	TogglePhotoFeatured(tripID, photoID string) (*TripPhoto, error)
	DeletePhoto(tripID, photoID, userID string) error

	// Celebration Cards
	ListCelebrationCards(tripID string) ([]CelebrationCard, error)
	CreateCelebrationCard(tripID, user1ID, user2ID string, matchID *string, imageURL, title, headline string, subheadline *string, locationName string) (*CelebrationCard, error)
	GetUserOriginSummary(userID string) (*UserOriginSummary, error)
	FindMatchID(user1ID, user2ID, tripID string) (*string, error)

	// Wrapup & Feedback
	GetWrapupStatus(tripID, userID string) (*WrapupStatus, error)
	UpdateWrapupTask(tripID, userID string, celebration *bool, feedback *bool, stories *bool) error
	CreateFeedback(tripID, userID string, rating int, comments *string) error
	InsertDestinationRecommendation(townID, countryCode *string, userID, category, title, description string, imageURL, locationName *string) error
	GetTripTownAndCountry(tripID string) (townID, countryCode *string, err error)

	// Stories Card Data
	GetStoriesCardData(tripID, userID string) (*StoriesCardData, error)
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetActiveTripForUser(userID string) (*ActiveTripInfo, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Look for a trip where CURRENT_DATE is between start_date and end_date, or status is 'active',
	// or the most recently started active trip
	query := `
		SELECT t.id, t.title, t.start_date, t.end_date, t.photo_sharing_mode,
		       COALESCE(ts.destination_name, 'Destinació') AS dest_name,
		       COALESCE(ts.country_code, 'ES') AS country_code
		FROM trips t
		LEFT JOIN LATERAL (
			SELECT destination_name, country_code
			FROM trip_stages
			WHERE trip_id = t.id
			ORDER BY stage_order ASC
			LIMIT 1
		) ts ON true
		WHERE t.user_id = $1
		  AND (
		      (CURRENT_DATE BETWEEN t.start_date AND t.end_date)
		      OR (t.status = 'active')
		      OR (CURRENT_DATE <= t.end_date AND t.start_date <= CURRENT_DATE + INTERVAL '1 day')
		  )
		ORDER BY 
		    CASE WHEN CURRENT_DATE BETWEEN t.start_date AND t.end_date THEN 0 ELSE 1 END,
		    t.start_date ASC
		LIMIT 1;
	`

	var info ActiveTripInfo
	var startDate, endDate time.Time
	err := r.db.QueryRow(query, userID).Scan(
		&info.TripID,
		&info.Title,
		&startDate,
		&endDate,
		&info.PhotoSharingMode,
		&info.DestinationName,
		&info.CountryCode,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying active trip: %w", err)
	}

	info.StartDate = startDate
	info.EndDate = endDate

	// Photos count
	_ = r.db.QueryRow(`SELECT COUNT(*) FROM trip_photos WHERE trip_id = $1`, info.TripID).Scan(&info.PhotosCount)

	// Celebration cards count
	_ = r.db.QueryRow(`SELECT COUNT(*) FROM celebration_cards WHERE trip_id = $1`, info.TripID).Scan(&info.CelebrationCardsCount)

	// Active felagis count (overlapping travellers in same stage / destination)
	felagisQuery := `
		SELECT COUNT(DISTINCT tr2.user_id)
		FROM trip_stages ts1
		JOIN trip_stages ts2 ON (
			(ts1.town_id IS NOT NULL AND ts2.town_id = ts1.town_id) OR
			(LOWER(ts1.destination_name) = LOWER(ts2.destination_name))
		)
		JOIN trips tr2 ON ts2.trip_id = tr2.id AND tr2.user_id != $1
		WHERE ts1.trip_id = $2
		  AND tr2.start_date <= $3
		  AND tr2.end_date >= $4;
	`
	_ = r.db.QueryRow(felagisQuery, userID, info.TripID, info.EndDate, info.StartDate).Scan(&info.ActiveFelagisCount)

	return &info, nil
}

func (r *repository) GetTripAccessInfo(tripID string) (*TripAccessInfo, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT t.id, t.user_id, t.title, t.start_date, t.end_date, t.status, t.photo_sharing_mode,
		       COALESCE(ts.destination_name, 'Destinació'),
		       COALESCE(ts.country_code, 'ES')
		FROM trips t
		LEFT JOIN LATERAL (
			SELECT destination_name, country_code
			FROM trip_stages
			WHERE trip_id = t.id
			ORDER BY stage_order ASC
			LIMIT 1
		) ts ON true
		WHERE t.id = $1;
	`

	var t TripAccessInfo
	var startDate, endDate time.Time
	err := r.db.QueryRow(query, tripID).Scan(
		&t.ID,
		&t.UserID,
		&t.Title,
		&startDate,
		&endDate,
		&t.Status,
		&t.PhotoSharingMode,
		&t.DestinationName,
		&t.CountryCode,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying trip: %w", err)
	}

	t.StartDate = startDate
	t.EndDate = endDate
	return &t, nil
}

func (r *repository) ListPhotos(tripID string) ([]TripPhoto, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT id, trip_id, user_id, image_url, caption, is_featured, location_name, created_at
		FROM trip_photos
		WHERE trip_id = $1
		ORDER BY is_featured DESC, created_at DESC;
	`

	rows, err := r.db.Query(query, tripID)
	if err != nil {
		return nil, fmt.Errorf("error querying photos: %w", err)
	}
	defer rows.Close()

	var photos []TripPhoto
	for rows.Next() {
		var p TripPhoto
		var caption, locationName sql.NullString
		if err := rows.Scan(
			&p.ID,
			&p.TripID,
			&p.UserID,
			&p.ImageURL,
			&caption,
			&p.IsFeatured,
			&locationName,
			&p.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("error scanning photo: %w", err)
		}
		if caption.Valid {
			p.Caption = &caption.String
		}
		if locationName.Valid {
			p.LocationName = &locationName.String
		}
		photos = append(photos, p)
	}

	if photos == nil {
		photos = []TripPhoto{}
	}

	return photos, nil
}

func (r *repository) GetPhoto(tripID, photoID string) (*TripPhoto, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT id, trip_id, user_id, image_url, caption, is_featured, location_name, created_at
		FROM trip_photos
		WHERE id = $1 AND trip_id = $2;
	`

	var p TripPhoto
	var caption, locationName sql.NullString
	err := r.db.QueryRow(query, photoID, tripID).Scan(
		&p.ID,
		&p.TripID,
		&p.UserID,
		&p.ImageURL,
		&caption,
		&p.IsFeatured,
		&locationName,
		&p.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying photo: %w", err)
	}
	if caption.Valid {
		p.Caption = &caption.String
	}
	if locationName.Valid {
		p.LocationName = &locationName.String
	}
	return &p, nil
}

func (r *repository) AddPhoto(tripID, userID string, req AddTripPhotoRequest) (*TripPhoto, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	isFeatured := false
	if req.IsFeatured != nil {
		isFeatured = *req.IsFeatured
	}

	query := `
		INSERT INTO trip_photos (trip_id, user_id, image_url, caption, is_featured, location_name)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, trip_id, user_id, image_url, caption, is_featured, location_name, created_at;
	`

	var p TripPhoto
	var caption, locationName sql.NullString
	err := r.db.QueryRow(query, tripID, userID, req.ImageURL, req.Caption, isFeatured, req.LocationName).Scan(
		&p.ID,
		&p.TripID,
		&p.UserID,
		&p.ImageURL,
		&caption,
		&p.IsFeatured,
		&locationName,
		&p.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error inserting photo: %w", err)
	}
	if caption.Valid {
		p.Caption = &caption.String
	}
	if locationName.Valid {
		p.LocationName = &locationName.String
	}
	return &p, nil
}

func (r *repository) TogglePhotoFeatured(tripID, photoID string) (*TripPhoto, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		UPDATE trip_photos
		SET is_featured = NOT is_featured
		WHERE id = $1 AND trip_id = $2
		RETURNING id, trip_id, user_id, image_url, caption, is_featured, location_name, created_at;
	`

	var p TripPhoto
	var caption, locationName sql.NullString
	err := r.db.QueryRow(query, photoID, tripID).Scan(
		&p.ID,
		&p.TripID,
		&p.UserID,
		&p.ImageURL,
		&caption,
		&p.IsFeatured,
		&locationName,
		&p.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error toggling featured photo: %w", err)
	}
	if caption.Valid {
		p.Caption = &caption.String
	}
	if locationName.Valid {
		p.LocationName = &locationName.String
	}
	return &p, nil
}

func (r *repository) DeletePhoto(tripID, photoID, userID string) error {
	if r.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	query := `
		DELETE FROM trip_photos
		WHERE id = $1 AND trip_id = $2 AND (
			user_id = $3 OR EXISTS (SELECT 1 FROM trips WHERE id = $2 AND user_id = $3)
		);
	`
	res, err := r.db.Exec(query, photoID, tripID, userID)
	if err != nil {
		return fmt.Errorf("error deleting photo: %w", err)
	}
	rowsAff, _ := res.RowsAffected()
	if rowsAff == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *repository) GetUserOriginSummary(userID string) (*UserOriginSummary, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT u.id, u.name, u.avatar_url,
		       t.name AS town_name,
		       reg.name AS region_name,
		       c.name AS country_name
		FROM users u
		LEFT JOIN towns t ON u.town_id = t.id
		LEFT JOIN regions reg ON t.region_id = reg.id
		LEFT JOIN countries c ON reg.country_id = c.id
		WHERE u.id = $1;
	`

	var s UserOriginSummary
	var avatarURL, townName, regionName, countryName sql.NullString
	err := r.db.QueryRow(query, userID).Scan(
		&s.ID,
		&s.Name,
		&avatarURL,
		&townName,
		&regionName,
		&countryName,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying user origin summary: %w", err)
	}
	if avatarURL.Valid {
		s.AvatarURL = &avatarURL.String
	}
	if townName.Valid {
		s.TownName = &townName.String
	}
	if regionName.Valid {
		s.RegionName = &regionName.String
	}
	if countryName.Valid {
		s.CountryName = &countryName.String
	}
	return &s, nil
}

func (r *repository) FindMatchID(user1ID, user2ID, tripID string) (*string, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT id FROM matches
		WHERE (
			(user_id = $1 AND matched_user_id = $2) OR
			(user_id = $2 AND matched_user_id = $1)
		) AND (trip_id = $3 OR matched_trip_id = $3)
		LIMIT 1;
	`
	var matchID string
	err := r.db.QueryRow(query, user1ID, user2ID, tripID).Scan(&matchID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &matchID, nil
}

func (r *repository) ListCelebrationCards(tripID string) ([]CelebrationCard, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT cc.id, cc.trip_id, cc.image_url, cc.title, cc.headline, cc.subheadline, cc.location_name, cc.created_at,
		       u1.id, u1.name, u1.avatar_url, t1.name, reg1.name, c1.name,
		       u2.id, u2.name, u2.avatar_url, t2.name, reg2.name, c2.name
		FROM celebration_cards cc
		JOIN users u1 ON cc.user_1_id = u1.id
		LEFT JOIN towns t1 ON u1.town_id = t1.id
		LEFT JOIN regions reg1 ON t1.region_id = reg1.id
		LEFT JOIN countries c1 ON reg1.country_id = c1.id
		JOIN users u2 ON cc.user_2_id = u2.id
		LEFT JOIN towns t2 ON u2.town_id = t2.id
		LEFT JOIN regions reg2 ON t2.region_id = reg2.id
		LEFT JOIN countries c2 ON reg2.country_id = c2.id
		WHERE cc.trip_id = $1
		ORDER BY cc.created_at DESC;
	`

	rows, err := r.db.Query(query, tripID)
	if err != nil {
		return nil, fmt.Errorf("error querying celebration cards: %w", err)
	}
	defer rows.Close()

	var cards []CelebrationCard
	for rows.Next() {
		var c CelebrationCard
		var subheadline sql.NullString
		var u1Avatar, u1Town, u1Region, u1Country sql.NullString
		var u2Avatar, u2Town, u2Region, u2Country sql.NullString

		if err := rows.Scan(
			&c.ID, &c.TripID, &c.ImageURL, &c.Title, &c.Headline, &subheadline, &c.LocationName, &c.CreatedAt,
			&c.User1.ID, &c.User1.Name, &u1Avatar, &u1Town, &u1Region, &u1Country,
			&c.User2.ID, &c.User2.Name, &u2Avatar, &u2Town, &u2Region, &u2Country,
		); err != nil {
			return nil, fmt.Errorf("error scanning celebration card: %w", err)
		}

		if subheadline.Valid {
			c.Subheadline = &subheadline.String
		}
		if u1Avatar.Valid {
			c.User1.AvatarURL = &u1Avatar.String
		}
		if u1Town.Valid {
			c.User1.TownName = &u1Town.String
		}
		if u1Region.Valid {
			c.User1.RegionName = &u1Region.String
		}
		if u1Country.Valid {
			c.User1.CountryName = &u1Country.String
		}

		if u2Avatar.Valid {
			c.User2.AvatarURL = &u2Avatar.String
		}
		if u2Town.Valid {
			c.User2.TownName = &u2Town.String
		}
		if u2Region.Valid {
			c.User2.RegionName = &u2Region.String
		}
		if u2Country.Valid {
			c.User2.CountryName = &u2Country.String
		}

		cards = append(cards, c)
	}

	if cards == nil {
		cards = []CelebrationCard{}
	}

	return cards, nil
}

func (r *repository) CreateCelebrationCard(tripID, user1ID, user2ID string, matchID *string, imageURL, title, headline string, subheadline *string, locationName string) (*CelebrationCard, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		INSERT INTO celebration_cards (trip_id, user_1_id, user_2_id, match_id, image_url, title, headline, subheadline, location_name)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at;
	`

	var id string
	var createdAt time.Time
	err := r.db.QueryRow(query, tripID, user1ID, user2ID, matchID, imageURL, title, headline, subheadline, locationName).Scan(&id, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("error inserting celebration card: %w", err)
	}

	u1, err := r.GetUserOriginSummary(user1ID)
	if err != nil {
		return nil, err
	}
	u2, err := r.GetUserOriginSummary(user2ID)
	if err != nil {
		return nil, err
	}

	card := &CelebrationCard{
		ID:           id,
		TripID:       tripID,
		User1:        *u1,
		User2:        *u2,
		ImageURL:     imageURL,
		Title:        title,
		Headline:     headline,
		Subheadline:  subheadline,
		LocationName: locationName,
		CreatedAt:    createdAt,
	}

	return card, nil
}

func (r *repository) GetWrapupStatus(tripID, userID string) (*WrapupStatus, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// 1. Check trip end date
	var endDate time.Time
	err := r.db.QueryRow(`SELECT end_date FROM trips WHERE id = $1`, tripID).Scan(&endDate)
	if err != nil {
		return nil, fmt.Errorf("error querying trip end date: %w", err)
	}

	today := time.Now().Truncate(24 * time.Hour)
	tripEnd := endDate.Truncate(24 * time.Hour)
	isFinalDayOrPast := !today.Before(tripEnd)

	// 2. Query wrapup_tasks_status
	var celebrationCompleted, feedbackCompleted, storiesShared bool
	err = r.db.QueryRow(`
		SELECT celebration_completed, feedback_completed, stories_shared
		FROM wrapup_tasks_status
		WHERE trip_id = $1 AND user_id = $2
	`, tripID, userID).Scan(&celebrationCompleted, &feedbackCompleted, &storiesShared)

	if err == sql.ErrNoRows {
		// Also verify directly if celebration card or feedback exists
		var celebCount int
		_ = r.db.QueryRow(`SELECT COUNT(*) FROM celebration_cards WHERE trip_id = $1 AND (user_1_id = $2 OR user_2_id = $2)`, tripID, userID).Scan(&celebCount)
		celebrationCompleted = celebCount > 0

		var fbCount int
		_ = r.db.QueryRow(`SELECT COUNT(*) FROM trip_feedback WHERE trip_id = $1 AND user_id = $2`, tripID, userID).Scan(&fbCount)
		feedbackCompleted = fbCount > 0
	} else if err != nil {
		return nil, fmt.Errorf("error querying wrapup status: %w", err)
	}

	// Check if stories are ready (has at least 1 photo or celebration card or trip completed)
	var photosCount int
	_ = r.db.QueryRow(`SELECT COUNT(*) FROM trip_photos WHERE trip_id = $1`, tripID).Scan(&photosCount)
	storiesReady := photosCount > 0 || isFinalDayOrPast

	completedTasks := 0
	if celebrationCompleted {
		completedTasks++
	}
	if feedbackCompleted {
		completedTasks++
	}
	if storiesReady && (storiesShared || isFinalDayOrPast) {
		completedTasks++
	}

	progressPercentage := (completedTasks * 100) / 3

	return &WrapupStatus{
		IsFinalDayOrPast:     isFinalDayOrPast,
		CelebrationCompleted: celebrationCompleted,
		FeedbackCompleted:    feedbackCompleted,
		StoriesReady:         storiesReady,
		ProgressPercentage:   progressPercentage,
	}, nil
}

func (r *repository) UpdateWrapupTask(tripID, userID string, celebration *bool, feedback *bool, stories *bool) error {
	if r.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	query := `
		INSERT INTO wrapup_tasks_status (trip_id, user_id, celebration_completed, feedback_completed, stories_shared, updated_at)
		VALUES ($1, $2, COALESCE($3, FALSE), COALESCE($4, FALSE), COALESCE($5, FALSE), CURRENT_TIMESTAMP)
		ON CONFLICT (trip_id, user_id) DO UPDATE
		SET celebration_completed = COALESCE($3, wrapup_tasks_status.celebration_completed),
		    feedback_completed = COALESCE($4, wrapup_tasks_status.feedback_completed),
		    stories_shared = COALESCE($5, wrapup_tasks_status.stories_shared),
		    updated_at = CURRENT_TIMESTAMP;
	`
	_, err := r.db.Exec(query, tripID, userID, celebration, feedback, stories)
	if err != nil {
		return fmt.Errorf("error updating wrapup task: %w", err)
	}
	return nil
}

func (r *repository) CreateFeedback(tripID, userID string, rating int, comments *string) error {
	if r.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	query := `
		INSERT INTO trip_feedback (trip_id, user_id, rating, comments)
		VALUES ($1, $2, $3, $4);
	`
	_, err := r.db.Exec(query, tripID, userID, rating, comments)
	if err != nil {
		return fmt.Errorf("error creating trip feedback: %w", err)
	}
	return nil
}

func (r *repository) GetTripTownAndCountry(tripID string) (townID, countryCode *string, err error) {
	if r.db == nil {
		return nil, nil, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT ts.town_id, ts.country_code
		FROM trip_stages ts
		WHERE ts.trip_id = $1
		ORDER BY ts.stage_order ASC
		LIMIT 1;
	`
	var tID, cCode sql.NullString
	err = r.db.QueryRow(query, tripID).Scan(&tID, &cCode)
	if err == sql.ErrNoRows {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	if tID.Valid {
		townID = &tID.String
	}
	if cCode.Valid {
		countryCode = &cCode.String
	}
	return townID, countryCode, nil
}

func (r *repository) InsertDestinationRecommendation(townID, countryCode *string, userID, category, title, description string, imageURL, locationName *string) error {
	if r.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	query := `
		INSERT INTO destination_recommendations (town_id, country_code, user_id, category, title, description, image_url, location_name)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
	`
	_, err := r.db.Exec(query, townID, countryCode, userID, category, title, description, imageURL, locationName)
	if err != nil {
		return fmt.Errorf("error inserting destination recommendation from feedback: %w", err)
	}
	return nil
}

func (r *repository) GetStoriesCardData(tripID, userID string) (*StoriesCardData, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// 1. Query trip basic details
	query := `
		SELECT t.id, t.title, t.start_date, t.end_date,
		       COALESCE(ts.destination_name, 'Destinació') AS dest_name,
		       COALESCE(ts.country_code, 'ES') AS country_code,
		       u.name AS author_name,
		       twn.name AS town_name,
		       reg.name AS region_name
		FROM trips t
		JOIN users u ON t.user_id = u.id
		LEFT JOIN towns twn ON u.town_id = twn.id
		LEFT JOIN regions reg ON twn.region_id = reg.id
		LEFT JOIN LATERAL (
			SELECT destination_name, country_code
			FROM trip_stages
			WHERE trip_id = t.id
			ORDER BY stage_order ASC
			LIMIT 1
		) ts ON true
		WHERE t.id = $1;
	`

	var d StoriesCardData
	var startDate, endDate time.Time
	var destName, countryCode, townName, regionName sql.NullString
	err := r.db.QueryRow(query, tripID).Scan(
		&d.TripID,
		&d.TripTitle,
		&startDate,
		&endDate,
		&destName,
		&countryCode,
		&d.AuthorName,
		&townName,
		&regionName,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying stories data: %w", err)
	}

	if destName.Valid {
		d.DestinationName = &destName.String
	}
	flag := CountryCodeToFlagEmoji(countryCode.String)
	d.CountryFlag = &flag

	d.StartDate = startDate.Format("2006-01-02")
	d.EndDate = endDate.Format("2006-01-02")

	// Calculate total days
	diff := endDate.Sub(startDate)
	totalDays := int(diff.Hours()/24) + 1
	if totalDays < 1 {
		totalDays = 1
	}
	d.TotalDays = totalDays

	// Author origin string
	var originParts []string
	if townName.Valid && townName.String != "" {
		originParts = append(originParts, townName.String)
	}
	if regionName.Valid && regionName.String != "" {
		originParts = append(originParts, regionName.String)
	}
	if len(originParts) > 0 {
		orig := strings.Join(originParts, ", ")
		d.AuthorOrigin = &orig
	}

	// 2. Stages count
	_ = r.db.QueryRow(`SELECT COUNT(*) FROM trip_stages WHERE trip_id = $1`, tripID).Scan(&d.StagesCount)

	// 3. Felagis met count (celebration cards or matches)
	var celebrationCount int
	_ = r.db.QueryRow(`
		SELECT COUNT(DISTINCT CASE WHEN user_1_id = $2 THEN user_2_id ELSE user_1_id END)
		FROM celebration_cards
		WHERE trip_id = $1 AND (user_1_id = $2 OR user_2_id = $2)
	`, tripID, userID).Scan(&celebrationCount)
	d.FelagisMetCount = celebrationCount

	// 4. Featured photos (or recent photos if no featured)
	photoRows, err := r.db.Query(`
		SELECT image_url
		FROM trip_photos
		WHERE trip_id = $1
		ORDER BY is_featured DESC, created_at DESC
		LIMIT 6;
	`, tripID)
	if err == nil {
		defer photoRows.Close()
		var photos []string
		for photoRows.Next() {
			var url string
			if err := photoRows.Scan(&url); err == nil {
				photos = append(photos, url)
			}
		}
		if photos != nil {
			d.FeaturedPhotos = photos
		} else {
			d.FeaturedPhotos = []string{}
		}
	} else {
		d.FeaturedPhotos = []string{}
	}

	return &d, nil
}

func CountryCodeToFlagEmoji(countryCode string) string {
	countryCode = strings.ToUpper(strings.TrimSpace(countryCode))
	if len(countryCode) != 2 {
		return "🌍"
	}
	var b strings.Builder
	for _, r := range countryCode {
		if r >= 'A' && r <= 'Z' {
			b.WriteRune(r - 'A' + 0x1F1E6)
		} else {
			return "🌍"
		}
	}
	return b.String()
}
