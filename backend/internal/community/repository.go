package community

import (
	"database/sql"
	"fmt"
	"strings"
)

type Repository interface {
	SearchDestinations(q string, limit int) ([]DestinationSummary, error)
	ResolveDestination(destID string) (*DestinationInfo, error)
	GetDestinationStats(info *DestinationInfo, currentUserID string) (*DestinationDetail, error)
	ListRecommendations(info *DestinationInfo, category string, originFilter string, sort string, currentUserID string) ([]Recommendation, error)
	CreateRecommendation(destID string, info *DestinationInfo, userID string, req CreateRecommendationRequest) (*Recommendation, error)
	GetRecommendationByID(recID string) (*Recommendation, error)
	ToggleVote(recommendationID, userID string) (bool, int, error)
	ListComments(recommendationID string) ([]Comment, error)
	CreateComment(recID, userID, content string) (*Comment, error)
	GetUserActiveTrip(userID string, info *DestinationInfo) (tripID string, photoSharingMode string, isTravelling bool, err error)
	ListLiveMoments(info *DestinationInfo, currentUserID string) (*LiveFeedResponse, error)
	CreateLiveMoment(townID, userID, tripID, imageURL string, caption *string) (*LiveMoment, error)
	CreateReport(reporterID, targetType, targetID, reason string, details *string) error
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) SearchDestinations(q string, limit int) ([]DestinationSummary, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	if limit <= 0 {
		limit = 20
	}

	trimmedQuery := strings.TrimSpace(q)
	queryPattern := "%" + trimmedQuery + "%"
	var results []DestinationSummary
	var err error

	// 1. Search towns
	var townQuery string
	var rows *sql.Rows

	if trimmedQuery != "" {
		townQuery = `
			WITH matched_towns AS (
				SELECT t.id, t.name, r.name AS region_name, c.name AS country_name, c.code AS country_code,
				       ROW_NUMBER() OVER (
				           PARTITION BY LOWER(t.name), r.name, c.code 
				           ORDER BY 
				               CASE 
				                   WHEN LOWER(t.name) = LOWER($2) THEN 1
				                   WHEN LOWER(t.name) LIKE LOWER($2) || '%' THEN 2
				                   WHEN LOWER(r.name) = LOWER($2) THEN 3
				                   ELSE 4
				               END, t.id
				       ) as rn,
				       CASE 
				           WHEN LOWER(t.name) = LOWER($2) THEN 1
				           WHEN LOWER(t.name) LIKE LOWER($2) || '%' THEN 2
				           WHEN LOWER(r.name) = LOWER($2) THEN 3
				           ELSE 4
				       END as rank_score
				FROM towns t
				JOIN regions r ON t.region_id = r.id
				JOIN countries c ON r.country_id = c.id
				WHERE t.name ILIKE $1 OR r.name ILIKE $1 OR c.name ILIKE $1
				LIMIT 100
			),
			deduped AS (
				SELECT id, name, region_name, country_name, country_code, rank_score
				FROM matched_towns
				WHERE rn = 1
				ORDER BY rank_score ASC, name ASC
				LIMIT $3
			)
			SELECT d.id, d.name, d.region_name, d.country_name, d.country_code,
			       COALESCE((SELECT COUNT(*) FROM destination_recommendations dr WHERE dr.town_id = d.id), 0) AS recommendations_count,
			       COALESCE((
			           SELECT COUNT(DISTINCT tr.user_id)
			           FROM trips tr
			           JOIN trip_stages ts ON ts.trip_id = tr.id
			           WHERE CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			             AND (ts.town_id = d.id OR ts.destination_name = d.name)
			       ), 0) AS active_felagis_count
			FROM deduped d
			ORDER BY recommendations_count DESC, active_felagis_count DESC, d.rank_score ASC, d.name ASC
		`
		rows, err = r.db.Query(townQuery, queryPattern, trimmedQuery, limit)
	} else {
		townQuery = `
			SELECT t.id, t.name, r.name AS region_name, c.name AS country_name, c.code AS country_code,
			       COALESCE((SELECT COUNT(*) FROM destination_recommendations dr WHERE dr.town_id = t.id), 0) AS recommendations_count,
			       COALESCE((
			           SELECT COUNT(DISTINCT tr.user_id)
			           FROM trips tr
			           JOIN trip_stages ts ON ts.trip_id = tr.id
			           WHERE CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			             AND (ts.town_id = t.id OR ts.destination_name = t.name)
			       ), 0) AS active_felagis_count
			FROM towns t
			JOIN regions r ON t.region_id = r.id
			JOIN countries c ON r.country_id = c.id
			WHERE (SELECT COUNT(*) FROM destination_recommendations dr WHERE dr.town_id = t.id) > 0
			   OR (SELECT COUNT(DISTINCT tr.user_id) FROM trips tr JOIN trip_stages ts ON ts.trip_id = tr.id WHERE CURRENT_DATE BETWEEN tr.start_date AND tr.end_date AND (ts.town_id = t.id OR ts.destination_name = t.name)) > 0
			ORDER BY recommendations_count DESC, active_felagis_count DESC, t.name ASC
			LIMIT $1
		`
		rows, err = r.db.Query(townQuery, limit)
	}
	if err != nil {
		return nil, fmt.Errorf("error searching towns: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var s DestinationSummary
		var regionName, countryName, countryCode sql.NullString
		s.Type = "town"

		if err := rows.Scan(
			&s.ID,
			&s.Name,
			&regionName,
			&countryName,
			&countryCode,
			&s.RecommendationsCount,
			&s.ActiveFelagisCount,
		); err != nil {
			return nil, fmt.Errorf("error scanning town search row: %w", err)
		}

		if regionName.Valid {
			s.RegionName = &regionName.String
		}
		if countryName.Valid {
			s.CountryName = &countryName.String
		}
		if countryCode.Valid {
			s.CountryCode = &countryCode.String
		}

		results = append(results, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// 2. Search countries
	var countryQuery string
	var cRows *sql.Rows

	if trimmedQuery != "" {
		countryQuery = `
			WITH matched_countries AS (
				SELECT c.id, c.name, c.code,
				       CASE 
				           WHEN LOWER(c.code) = LOWER($2) THEN 1
				           WHEN LOWER(c.name) = LOWER($2) THEN 2
				           WHEN LOWER(c.name) LIKE LOWER($2) || '%' THEN 3
				           ELSE 4
				       END as rank_score
				FROM countries c
				WHERE c.name ILIKE $1 OR c.code ILIKE $1
				ORDER BY rank_score ASC, c.name ASC
				LIMIT $3
			)
			SELECT mc.code, mc.name, mc.code,
			       COALESCE((
			           SELECT COUNT(*)
			           FROM destination_recommendations dr
			           LEFT JOIN towns t ON dr.town_id = t.id
			           LEFT JOIN regions r ON t.region_id = r.id
			           LEFT JOIN countries dc ON r.country_id = dc.id
			           WHERE dr.country_code = mc.code OR dc.code = mc.code
			       ), 0) AS recommendations_count,
			       COALESCE((
			           SELECT COUNT(DISTINCT tr.user_id)
			           FROM trips tr
			           JOIN trip_stages ts ON ts.trip_id = tr.id
			           WHERE CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			             AND (ts.country_code = mc.code OR ts.destination_name = mc.name)
			       ), 0) AS active_felagis_count
			FROM matched_countries mc
			ORDER BY recommendations_count DESC, active_felagis_count DESC, mc.rank_score ASC, mc.name ASC
		`
		cRows, err = r.db.Query(countryQuery, queryPattern, trimmedQuery, limit)
	} else {
		countryQuery = `
			SELECT c.code, c.name, c.code,
			       COALESCE((
			           SELECT COUNT(*)
			           FROM destination_recommendations dr
			           LEFT JOIN towns t ON dr.town_id = t.id
			           LEFT JOIN regions r ON t.region_id = r.id
			           LEFT JOIN countries dc ON r.country_id = dc.id
			           WHERE dr.country_code = c.code OR dc.code = c.code
			       ), 0) AS recommendations_count,
			       COALESCE((
			           SELECT COUNT(DISTINCT tr.user_id)
			           FROM trips tr
			           JOIN trip_stages ts ON ts.trip_id = tr.id
			           WHERE CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			             AND (ts.country_code = c.code OR ts.destination_name = c.name)
			       ), 0) AS active_felagis_count
			FROM countries c
			WHERE (SELECT COUNT(*) FROM destination_recommendations dr WHERE dr.country_code = c.code) > 0
			   OR (SELECT COUNT(DISTINCT tr.user_id) FROM trips tr JOIN trip_stages ts ON ts.trip_id = tr.id WHERE CURRENT_DATE BETWEEN tr.start_date AND tr.end_date AND ts.country_code = c.code) > 0
			ORDER BY recommendations_count DESC, active_felagis_count DESC, c.name ASC
			LIMIT $1
		`
		cRows, err = r.db.Query(countryQuery, limit)
	}
	if err != nil {
		return nil, fmt.Errorf("error searching countries: %w", err)
	}
	defer cRows.Close()

	for cRows.Next() {
		var s DestinationSummary
		var countryName, countryCode sql.NullString
		s.Type = "country"

		if err := cRows.Scan(
			&s.ID,
			&s.Name,
			&countryCode,
			&s.RecommendationsCount,
			&s.ActiveFelagisCount,
		); err != nil {
			return nil, fmt.Errorf("error scanning country search row: %w", err)
		}

		if countryName.Valid {
			s.CountryName = &countryName.String
		} else {
			name := s.Name
			s.CountryName = &name
		}
		if countryCode.Valid {
			s.CountryCode = &countryCode.String
		}

		results = append(results, s)
	}
	if err := cRows.Err(); err != nil {
		return nil, err
	}

	if len(results) > limit {
		results = results[:limit]
	}
	if results == nil {
		results = []DestinationSummary{}
	}

	return results, nil
}

func (r *repository) ResolveDestination(destID string) (*DestinationInfo, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	cleanID := strings.TrimSpace(destID)
	if cleanID == "" {
		return nil, nil
	}

	// 1. Try resolving as Town (by town ID)
	townQuery := `
		SELECT t.id, t.name, r.id, r.name, c.code, c.name
		FROM towns t
		JOIN regions r ON t.region_id = r.id
		JOIN countries c ON r.country_id = c.id
		WHERE t.id::text = $1
	`
	var tInfo DestinationInfo
	err := r.db.QueryRow(townQuery, cleanID).Scan(
		&tInfo.TownID,
		&tInfo.TownName,
		&tInfo.RegionID,
		&tInfo.RegionName,
		&tInfo.CountryCode,
		&tInfo.CountryName,
	)
	if err == nil {
		tInfo.IsTown = true
		return &tInfo, nil
	}
	if err != sql.ErrNoRows && !strings.Contains(err.Error(), "invalid input syntax for type uuid") {
		return nil, fmt.Errorf("error checking town destination: %w", err)
	}

	// 2. Try resolving as Country (by 2-letter Code or UUID)
	countryQuery := `
		SELECT code, name
		FROM countries
		WHERE UPPER(code) = UPPER($1) OR id::text = $1
	`
	var cCode, cName string
	err = r.db.QueryRow(countryQuery, cleanID).Scan(&cCode, &cName)
	if err == nil {
		return &DestinationInfo{
			IsTown:      false,
			CountryCode: cCode,
			CountryName: cName,
		}, nil
	}
	if err == sql.ErrNoRows || strings.Contains(err.Error(), "invalid input syntax for type uuid") {
		return nil, nil // Not found
	}

	return nil, fmt.Errorf("error resolving country destination: %w", err)
}

func countryCodeToFlag(countryCode string) string {
	if len(countryCode) != 2 {
		return ""
	}
	cc := strings.ToUpper(countryCode)
	r1 := rune(cc[0]) - 'A' + 0x1F1E6
	r2 := rune(cc[1]) - 'A' + 0x1F1E6
	return string([]rune{r1, r2})
}

func (r *repository) GetDestinationStats(info *DestinationInfo, currentUserID string) (*DestinationDetail, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	detail := &DestinationDetail{
		CountryCode:          info.CountryCode,
		CountryName:          info.CountryName,
		UserPhotoSharingMode: "none",
	}

	flag := countryCodeToFlag(info.CountryCode)
	if flag != "" {
		detail.FlagEmoji = &flag
	}

	if info.IsTown {
		detail.ID = info.TownID
		detail.Name = info.TownName
		region := info.RegionName
		detail.RegionName = &region

		// Total recommendations
		recQuery := `SELECT COUNT(*) FROM destination_recommendations WHERE town_id = $1`
		_ = r.db.QueryRow(recQuery, info.TownID).Scan(&detail.TotalRecommendations)

		// Active felagis count
		activeQuery := `
			SELECT COUNT(DISTINCT tr.user_id)
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			WHERE CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			  AND (ts.town_id::text = $1 OR ts.destination_name = $2)
		`
		_ = r.db.QueryRow(activeQuery, info.TownID, info.TownName).Scan(&detail.ActiveFelagisCount)

		// Total visitors count
		totalVisQuery := `
			SELECT COUNT(DISTINCT tr.user_id)
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			WHERE (ts.town_id::text = $1 OR ts.destination_name = $2)
		`
		_ = r.db.QueryRow(totalVisQuery, info.TownID, info.TownName).Scan(&detail.TotalVisitorsCount)

		// Check if current user is travelling now
		if currentUserID != "" {
			userTripQuery := `
				SELECT tr.photo_sharing_mode
				FROM trips tr
				JOIN trip_stages ts ON ts.trip_id = tr.id
				WHERE tr.user_id = $1
				  AND CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
				  AND (ts.town_id::text = $2 OR ts.destination_name = $3)
				LIMIT 1
			`
			var psm string
			err := r.db.QueryRow(userTripQuery, currentUserID, info.TownID, info.TownName).Scan(&psm)
			if err == nil {
				detail.UserIsTravellingNow = true
				detail.UserPhotoSharingMode = psm
			}
		}

		// Dynamic Community Banner: 1) top-voted recommendation photo, 2) latest live moment
		var townBanner sql.NullString
		bannerQuery := `
			SELECT image_url FROM destination_recommendations
			WHERE town_id = $1 AND image_url IS NOT NULL AND image_url != ''
			ORDER BY useful_votes_count DESC, created_at DESC
			LIMIT 1
		`
		if err := r.db.QueryRow(bannerQuery, info.TownID).Scan(&townBanner); err == nil && townBanner.Valid && townBanner.String != "" {
			detail.BannerURL = &townBanner.String
		} else {
			momentBannerQuery := `
				SELECT image_url FROM destination_live_moments
				WHERE town_id = $1 AND image_url IS NOT NULL AND image_url != ''
				ORDER BY created_at DESC
				LIMIT 1
			`
			if err := r.db.QueryRow(momentBannerQuery, info.TownID).Scan(&townBanner); err == nil && townBanner.Valid && townBanner.String != "" {
				detail.BannerURL = &townBanner.String
			}
		}
	} else {
		detail.ID = info.CountryCode
		detail.Name = info.CountryName

		// Total recommendations
		recQuery := `
			SELECT COUNT(*)
			FROM destination_recommendations dr
			LEFT JOIN towns t ON dr.town_id = t.id
			LEFT JOIN regions r ON t.region_id = r.id
			LEFT JOIN countries dc ON r.country_id = dc.id
			WHERE dr.country_code = $1 OR dc.code = $1
		`
		_ = r.db.QueryRow(recQuery, info.CountryCode).Scan(&detail.TotalRecommendations)

		// Active felagis count
		activeQuery := `
			SELECT COUNT(DISTINCT tr.user_id)
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			WHERE CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			  AND (ts.country_code = $1 OR ts.destination_name = $2)
		`
		_ = r.db.QueryRow(activeQuery, info.CountryCode, info.CountryName).Scan(&detail.ActiveFelagisCount)

		// Total visitors count
		totalVisQuery := `
			SELECT COUNT(DISTINCT tr.user_id)
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			WHERE (ts.country_code = $1 OR ts.destination_name = $2)
		`
		_ = r.db.QueryRow(totalVisQuery, info.CountryCode, info.CountryName).Scan(&detail.TotalVisitorsCount)

		// Check if current user is travelling now
		if currentUserID != "" {
			userTripQuery := `
				SELECT tr.photo_sharing_mode
				FROM trips tr
				JOIN trip_stages ts ON ts.trip_id = tr.id
				WHERE tr.user_id = $1
				  AND CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
				  AND (ts.country_code = $2 OR ts.destination_name = $3)
				LIMIT 1
			`
			var psm string
			err := r.db.QueryRow(userTripQuery, currentUserID, info.CountryCode, info.CountryName).Scan(&psm)
			if err == nil {
				detail.UserIsTravellingNow = true
				detail.UserPhotoSharingMode = psm
			}
		}

		// Dynamic Country Banner: top-voted recommendation photo
		var countryBanner sql.NullString
		cBannerQuery := `
			SELECT dr.image_url
			FROM destination_recommendations dr
			LEFT JOIN towns t ON dr.town_id = t.id
			LEFT JOIN regions r ON t.region_id = r.id
			LEFT JOIN countries dc ON r.country_id = dc.id
			WHERE (dr.country_code = $1 OR dc.code = $1)
			  AND dr.image_url IS NOT NULL AND dr.image_url != ''
			ORDER BY dr.useful_votes_count DESC, dr.created_at DESC
			LIMIT 1
		`
		if err := r.db.QueryRow(cBannerQuery, info.CountryCode).Scan(&countryBanner); err == nil && countryBanner.Valid && countryBanner.String != "" {
			detail.BannerURL = &countryBanner.String
		}
	}

	return detail, nil
}

func (r *repository) ListRecommendations(info *DestinationInfo, category string, originFilter string, sort string, currentUserID string) ([]Recommendation, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Fetch current user's origin for filtering
	var userTownID, userRegionID sql.NullString
	if currentUserID != "" {
		_ = r.db.QueryRow(`
			SELECT u.town_id, t.region_id
			FROM users u
			LEFT JOIN towns t ON u.town_id = t.id
			WHERE u.id = $1
		`, currentUserID).Scan(&userTownID, &userRegionID)
	}

	var conditions []string
	var args []interface{}
	argIdx := 1

	if info.IsTown {
		conditions = append(conditions, fmt.Sprintf("dr.town_id::text = $%d", argIdx))
		args = append(args, info.TownID)
		argIdx++
	} else {
		conditions = append(conditions, fmt.Sprintf(`
			(dr.country_code = $%d OR dr.town_id IN (
				SELECT t.id FROM towns t
				JOIN regions r ON t.region_id = r.id
				JOIN countries c ON r.country_id = c.id
				WHERE c.code = $%d
			))
		`, argIdx, argIdx))
		args = append(args, info.CountryCode)
		argIdx++
	}

	cleanCategory := strings.TrimSpace(category)
	if cleanCategory != "" && cleanCategory != "all" {
		conditions = append(conditions, fmt.Sprintf("dr.category = $%d", argIdx))
		args = append(args, cleanCategory)
		argIdx++
	}

	cleanOriginFilter := strings.TrimSpace(originFilter)
	if cleanOriginFilter == "same_town" && userTownID.Valid {
		conditions = append(conditions, fmt.Sprintf("u.town_id = $%d", argIdx))
		args = append(args, userTownID.String)
		argIdx++
	} else if cleanOriginFilter == "same_origin" {
		if userRegionID.Valid && userTownID.Valid {
			conditions = append(conditions, fmt.Sprintf("(u.town_id = $%d OR ut.region_id = $%d)", argIdx, argIdx+1))
			args = append(args, userTownID.String, userRegionID.String)
			argIdx += 2
		} else if userTownID.Valid {
			conditions = append(conditions, fmt.Sprintf("u.town_id = $%d", argIdx))
			args = append(args, userTownID.String)
			argIdx++
		}
	}

	whereClause := strings.Join(conditions, " AND ")
	if whereClause != "" {
		whereClause = "WHERE " + whereClause
	}

	orderBy := "dr.useful_votes_count DESC, dr.created_at DESC"
	if strings.TrimSpace(sort) == "recent" {
		orderBy = "dr.created_at DESC"
	}

	userVoteArg := currentUserID
	if userVoteArg == "" {
		userVoteArg = "00000000-0000-0000-0000-000000000000"
	}

	query := fmt.Sprintf(`
		SELECT dr.id, COALESCE(dr.town_id::text, dr.country_code) AS destination_id, dr.category, dr.title, dr.description,
		       dr.image_url, dr.location_name, dr.useful_votes_count, dr.created_at,
		       u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar,
		       ut.name AS author_town, ur.name AS author_region, uc.name AS author_country,
		       COALESCE((SELECT COUNT(*) FROM recommendation_comments rc WHERE rc.recommendation_id = dr.id), 0) AS comments_count,
		       EXISTS(SELECT 1 FROM recommendation_votes rv WHERE rv.recommendation_id = dr.id AND rv.user_id = $%d) AS user_has_voted
		FROM destination_recommendations dr
		JOIN users u ON dr.user_id = u.id
		LEFT JOIN towns ut ON u.town_id = ut.id
		LEFT JOIN regions ur ON ut.region_id = ur.id
		LEFT JOIN countries uc ON ur.country_id = uc.id
		%s
		ORDER BY %s
	`, argIdx, whereClause, orderBy)

	args = append(args, userVoteArg)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("error querying recommendations: %w", err)
	}
	defer rows.Close()

	var recs []Recommendation
	for rows.Next() {
		var rec Recommendation
		var destID sql.NullString
		var imgURL, locName, avatarURL, townName, regionName, countryName sql.NullString

		if err := rows.Scan(
			&rec.ID,
			&destID,
			&rec.Category,
			&rec.Title,
			&rec.Description,
			&imgURL,
			&locName,
			&rec.UsefulVotesCount,
			&rec.CreatedAt,
			&rec.Author.ID,
			&rec.Author.Name,
			&avatarURL,
			&townName,
			&regionName,
			&countryName,
			&rec.CommentsCount,
			&rec.UserHasVoted,
		); err != nil {
			return nil, fmt.Errorf("error scanning recommendation row: %w", err)
		}

		if destID.Valid {
			rec.DestinationID = destID.String
		}
		if imgURL.Valid {
			rec.ImageURL = &imgURL.String
		}
		if locName.Valid {
			rec.LocationName = &locName.String
		}
		if avatarURL.Valid {
			rec.Author.AvatarURL = &avatarURL.String
		}
		if townName.Valid {
			rec.Author.TownName = &townName.String
		}
		if regionName.Valid {
			rec.Author.RegionName = &regionName.String
		}
		if countryName.Valid {
			rec.Author.CountryName = &countryName.String
		}

		recs = append(recs, rec)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if recs == nil {
		recs = []Recommendation{}
	}

	return recs, nil
}

func (r *repository) CreateRecommendation(destID string, info *DestinationInfo, userID string, req CreateRecommendationRequest) (*Recommendation, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	var townIDParam, countryCodeParam interface{}
	if info.IsTown {
		townIDParam = info.TownID
		countryCodeParam = info.CountryCode
	} else {
		townIDParam = nil
		countryCodeParam = info.CountryCode
	}

	var imgParam, locParam interface{}
	if req.ImageURL != nil && *req.ImageURL != "" {
		imgParam = *req.ImageURL
	}
	if req.LocationName != nil && *req.LocationName != "" {
		locParam = *req.LocationName
	}

	insertQuery := `
		INSERT INTO destination_recommendations (town_id, country_code, user_id, category, title, description, image_url, location_name)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, useful_votes_count, created_at
	`

	var rec Recommendation
	rec.DestinationID = destID
	rec.Category = req.Category
	rec.Title = req.Title
	rec.Description = req.Description
	rec.ImageURL = req.ImageURL
	rec.LocationName = req.LocationName
	rec.CommentsCount = 0
	rec.UserHasVoted = false

	err := r.db.QueryRow(
		insertQuery,
		townIDParam,
		countryCodeParam,
		userID,
		req.Category,
		req.Title,
		req.Description,
		imgParam,
		locParam,
	).Scan(&rec.ID, &rec.UsefulVotesCount, &rec.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("error inserting recommendation: %w", err)
	}

	// Fetch author details
	authorQuery := `
		SELECT u.id, u.name, u.avatar_url, ut.name, ur.name, uc.name
		FROM users u
		LEFT JOIN towns ut ON u.town_id = ut.id
		LEFT JOIN regions ur ON ut.region_id = ur.id
		LEFT JOIN countries uc ON ur.country_id = uc.id
		WHERE u.id = $1
	`
	var avatarURL, townName, regionName, countryName sql.NullString
	err = r.db.QueryRow(authorQuery, userID).Scan(
		&rec.Author.ID,
		&rec.Author.Name,
		&avatarURL,
		&townName,
		&regionName,
		&countryName,
	)
	if err != nil {
		return nil, fmt.Errorf("error fetching author details: %w", err)
	}

	if avatarURL.Valid {
		rec.Author.AvatarURL = &avatarURL.String
	}
	if townName.Valid {
		rec.Author.TownName = &townName.String
	}
	if regionName.Valid {
		rec.Author.RegionName = &regionName.String
	}
	if countryName.Valid {
		rec.Author.CountryName = &countryName.String
	}

	return &rec, nil
}

func (r *repository) GetRecommendationByID(recID string) (*Recommendation, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT dr.id, COALESCE(dr.town_id::text, dr.country_code) AS destination_id, dr.category, dr.title, dr.description,
		       dr.image_url, dr.location_name, dr.useful_votes_count, dr.created_at,
		       u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar,
		       ut.name AS author_town, ur.name AS author_region, uc.name AS author_country,
		       (SELECT COUNT(*) FROM recommendation_comments rc WHERE rc.recommendation_id = dr.id) AS comments_count
		FROM destination_recommendations dr
		JOIN users u ON dr.user_id = u.id
		LEFT JOIN towns ut ON u.town_id = ut.id
		LEFT JOIN regions ur ON ut.region_id = ur.id
		LEFT JOIN countries uc ON ur.country_id = uc.id
		WHERE dr.id = $1
	`

	var rec Recommendation
	var destID, imgURL, locName, avatarURL, townName, regionName, countryName sql.NullString

	err := r.db.QueryRow(query, recID).Scan(
		&rec.ID,
		&destID,
		&rec.Category,
		&rec.Title,
		&rec.Description,
		&imgURL,
		&locName,
		&rec.UsefulVotesCount,
		&rec.CreatedAt,
		&rec.Author.ID,
		&rec.Author.Name,
		&avatarURL,
		&townName,
		&regionName,
		&countryName,
		&rec.CommentsCount,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying recommendation by id: %w", err)
	}

	if destID.Valid {
		rec.DestinationID = destID.String
	}
	if imgURL.Valid {
		rec.ImageURL = &imgURL.String
	}
	if locName.Valid {
		rec.LocationName = &locName.String
	}
	if avatarURL.Valid {
		rec.Author.AvatarURL = &avatarURL.String
	}
	if townName.Valid {
		rec.Author.TownName = &townName.String
	}
	if regionName.Valid {
		rec.Author.RegionName = &regionName.String
	}
	if countryName.Valid {
		rec.Author.CountryName = &countryName.String
	}

	return &rec, nil
}

func (r *repository) ToggleVote(recommendationID, userID string) (bool, int, error) {
	if r.db == nil {
		return false, 0, fmt.Errorf("database connection is nil")
	}

	tx, err := r.db.Begin()
	if err != nil {
		return false, 0, fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Check if recommendation exists
	var exists bool
	err = tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM destination_recommendations WHERE id = $1)`, recommendationID).Scan(&exists)
	if err != nil || !exists {
		return false, 0, sql.ErrNoRows
	}

	var hasVoted bool
	err = tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM recommendation_votes WHERE recommendation_id = $1 AND user_id = $2)`, recommendationID, userID).Scan(&hasVoted)
	if err != nil {
		return false, 0, fmt.Errorf("error checking vote: %w", err)
	}

	var newCount int
	if hasVoted {
		// Remove vote
		_, err = tx.Exec(`DELETE FROM recommendation_votes WHERE recommendation_id = $1 AND user_id = $2`, recommendationID, userID)
		if err != nil {
			return false, 0, fmt.Errorf("error deleting vote: %w", err)
		}
		err = tx.QueryRow(`
			UPDATE destination_recommendations
			SET useful_votes_count = GREATEST(0, useful_votes_count - 1), updated_at = NOW()
			WHERE id = $1
			RETURNING useful_votes_count
		`, recommendationID).Scan(&newCount)
		if err != nil {
			return false, 0, fmt.Errorf("error decrementing useful_votes_count: %w", err)
		}
		if err := tx.Commit(); err != nil {
			return false, 0, fmt.Errorf("error committing vote removal: %w", err)
		}
		return false, newCount, nil
	}

	// Add vote
	_, err = tx.Exec(`INSERT INTO recommendation_votes (recommendation_id, user_id) VALUES ($1, $2)`, recommendationID, userID)
	if err != nil {
		return false, 0, fmt.Errorf("error inserting vote: %w", err)
	}
	err = tx.QueryRow(`
		UPDATE destination_recommendations
		SET useful_votes_count = useful_votes_count + 1, updated_at = NOW()
		WHERE id = $1
		RETURNING useful_votes_count
	`, recommendationID).Scan(&newCount)
	if err != nil {
		return false, 0, fmt.Errorf("error incrementing useful_votes_count: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return false, 0, fmt.Errorf("error committing vote addition: %w", err)
	}

	return true, newCount, nil
}

func (r *repository) ListComments(recommendationID string) ([]Comment, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Verify recommendation exists
	var exists bool
	err := r.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM destination_recommendations WHERE id = $1)`, recommendationID).Scan(&exists)
	if err != nil || !exists {
		return nil, sql.ErrNoRows
	}

	query := `
		SELECT rc.id, rc.content, rc.created_at,
		       u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar,
		       ut.name AS author_town, ur.name AS author_region, uc.name AS author_country
		FROM recommendation_comments rc
		JOIN users u ON rc.user_id = u.id
		LEFT JOIN towns ut ON u.town_id = ut.id
		LEFT JOIN regions ur ON ut.region_id = ur.id
		LEFT JOIN countries uc ON ur.country_id = uc.id
		WHERE rc.recommendation_id = $1
		ORDER BY rc.created_at ASC
	`

	rows, err := r.db.Query(query, recommendationID)
	if err != nil {
		return nil, fmt.Errorf("error querying comments: %w", err)
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var c Comment
		var avatarURL, townName, regionName, countryName sql.NullString

		if err := rows.Scan(
			&c.ID,
			&c.Content,
			&c.CreatedAt,
			&c.Author.ID,
			&c.Author.Name,
			&avatarURL,
			&townName,
			&regionName,
			&countryName,
		); err != nil {
			return nil, fmt.Errorf("error scanning comment row: %w", err)
		}

		if avatarURL.Valid {
			c.Author.AvatarURL = &avatarURL.String
		}
		if townName.Valid {
			c.Author.TownName = &townName.String
		}
		if regionName.Valid {
			c.Author.RegionName = &regionName.String
		}
		if countryName.Valid {
			c.Author.CountryName = &countryName.String
		}

		comments = append(comments, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if comments == nil {
		comments = []Comment{}
	}

	return comments, nil
}

func (r *repository) CreateComment(recID, userID, content string) (*Comment, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Verify recommendation exists
	var exists bool
	err := r.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM destination_recommendations WHERE id = $1)`, recID).Scan(&exists)
	if err != nil || !exists {
		return nil, sql.ErrNoRows
	}

	insertQuery := `
		INSERT INTO recommendation_comments (recommendation_id, user_id, content)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`

	var c Comment
	c.Content = content
	err = r.db.QueryRow(insertQuery, recID, userID, content).Scan(&c.ID, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("error inserting comment: %w", err)
	}

	// Fetch author summary
	authorQuery := `
		SELECT u.id, u.name, u.avatar_url, ut.name, ur.name, uc.name
		FROM users u
		LEFT JOIN towns ut ON u.town_id = ut.id
		LEFT JOIN regions ur ON ut.region_id = ur.id
		LEFT JOIN countries uc ON ur.country_id = uc.id
		WHERE u.id = $1
	`
	var avatarURL, townName, regionName, countryName sql.NullString
	err = r.db.QueryRow(authorQuery, userID).Scan(
		&c.Author.ID,
		&c.Author.Name,
		&avatarURL,
		&townName,
		&regionName,
		&countryName,
	)
	if err != nil {
		return nil, fmt.Errorf("error fetching author details for comment: %w", err)
	}

	if avatarURL.Valid {
		c.Author.AvatarURL = &avatarURL.String
	}
	if townName.Valid {
		c.Author.TownName = &townName.String
	}
	if regionName.Valid {
		c.Author.RegionName = &regionName.String
	}
	if countryName.Valid {
		c.Author.CountryName = &countryName.String
	}

	return &c, nil
}

func (r *repository) GetUserActiveTrip(userID string, info *DestinationInfo) (string, string, bool, error) {
	if r.db == nil {
		return "", "", false, fmt.Errorf("database connection is nil")
	}

	var tripID, photoSharingMode string
	var err error

	if info.IsTown {
		query := `
			SELECT tr.id, tr.photo_sharing_mode
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			WHERE tr.user_id = $1
			  AND CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			  AND (ts.town_id::text = $2 OR ts.destination_name = $3)
			ORDER BY tr.start_date ASC
			LIMIT 1
		`
		err = r.db.QueryRow(query, userID, info.TownID, info.TownName).Scan(&tripID, &photoSharingMode)
	} else {
		query := `
			SELECT tr.id, tr.photo_sharing_mode
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			WHERE tr.user_id = $1
			  AND CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			  AND (ts.country_code = $2 OR ts.destination_name = $3)
			ORDER BY tr.start_date ASC
			LIMIT 1
		`
		err = r.db.QueryRow(query, userID, info.CountryCode, info.CountryName).Scan(&tripID, &photoSharingMode)
	}

	if err == sql.ErrNoRows {
		return "", "", false, nil
	}
	if err != nil {
		return "", "", false, fmt.Errorf("error querying user active trip: %w", err)
	}

	return tripID, photoSharingMode, true, nil
}

func (r *repository) ListLiveMoments(info *DestinationInfo, currentUserID string) (*LiveFeedResponse, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Fetch active travellers count for destination
	var activeCount int
	if info.IsTown {
		activeQuery := `
			SELECT COUNT(DISTINCT tr.user_id)
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			WHERE CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			  AND (ts.town_id::text = $1 OR ts.destination_name = $2)
		`
		_ = r.db.QueryRow(activeQuery, info.TownID, info.TownName).Scan(&activeCount)
	} else {
		activeQuery := `
			SELECT COUNT(DISTINCT tr.user_id)
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			WHERE CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			  AND (ts.country_code = $1 OR ts.destination_name = $2)
		`
		_ = r.db.QueryRow(activeQuery, info.CountryCode, info.CountryName).Scan(&activeCount)
	}

	// Fetch current user origin
	var userTownID, userRegionID sql.NullString
	if currentUserID != "" {
		_ = r.db.QueryRow(`
			SELECT u.town_id, t.region_id
			FROM users u
			LEFT JOIN towns t ON u.town_id = t.id
			WHERE u.id = $1
		`, currentUserID).Scan(&userTownID, &userRegionID)
	}

	var destCondition string
	var destArgs []interface{}
	if info.IsTown {
		destCondition = "dlm.town_id::text = $1"
		destArgs = append(destArgs, info.TownID)
	} else {
		destCondition = `dlm.town_id IN (
			SELECT t.id FROM towns t
			JOIN regions r ON t.region_id = r.id
			JOIN countries c ON r.country_id = c.id
			WHERE c.code = $1
		)`
		destArgs = append(destArgs, info.CountryCode)
	}

	query := fmt.Sprintf(`
		SELECT dlm.id, dlm.image_url, dlm.caption, dlm.created_at,
		       u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar,
		       ut.name AS author_town, ur.name AS author_region, uc.name AS author_country
		FROM destination_live_moments dlm
		JOIN users u ON dlm.user_id = u.id
		JOIN trips tr ON dlm.trip_id = tr.id
		LEFT JOIN towns ut ON u.town_id = ut.id
		LEFT JOIN regions ur ON ut.region_id = ur.id
		LEFT JOIN countries uc ON ur.country_id = uc.id
		WHERE %s
		  AND (
		      tr.photo_sharing_mode = 'all_felagis'
		      OR (tr.photo_sharing_mode = 'close_origin' AND (
		          ($2 != '' AND u.town_id::text = $2)
		          OR ($3 != '' AND ut.region_id::text = $3)
		          OR EXISTS(SELECT 1 FROM conversations conv WHERE (conv.participant_1 = $4 AND conv.participant_2 = u.id) OR (conv.participant_2 = $4 AND conv.participant_1 = u.id))
		      ))
		      OR dlm.user_id = $4
		  )
		ORDER BY dlm.created_at DESC
	`, destCondition)

	uTownStr := ""
	if userTownID.Valid {
		uTownStr = userTownID.String
	}
	uRegionStr := ""
	if userRegionID.Valid {
		uRegionStr = userRegionID.String
	}

	destArgs = append(destArgs, uTownStr, uRegionStr, currentUserID)

	rows, err := r.db.Query(query, destArgs...)
	if err != nil {
		return nil, fmt.Errorf("error querying live moments: %w", err)
	}
	defer rows.Close()

	moments := []LiveMoment{}
	for rows.Next() {
		var m LiveMoment
		var caption, avatarURL, townName, regionName, countryName sql.NullString

		if err := rows.Scan(
			&m.ID,
			&m.ImageURL,
			&caption,
			&m.CreatedAt,
			&m.Author.ID,
			&m.Author.Name,
			&avatarURL,
			&townName,
			&regionName,
			&countryName,
		); err != nil {
			return nil, fmt.Errorf("error scanning live moment row: %w", err)
		}

		if caption.Valid {
			m.Caption = &caption.String
		}
		if avatarURL.Valid {
			m.Author.AvatarURL = &avatarURL.String
		}
		if townName.Valid {
			m.Author.TownName = &townName.String
		}
		if regionName.Valid {
			m.Author.RegionName = &regionName.String
		}
		if countryName.Valid {
			m.Author.CountryName = &countryName.String
		}

		moments = append(moments, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &LiveFeedResponse{
		ActiveFelagisCount: activeCount,
		Moments:            moments,
	}, nil
}

func (r *repository) CreateLiveMoment(townID, userID, tripID, imageURL string, caption *string) (*LiveMoment, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	var capParam interface{}
	if caption != nil && *caption != "" {
		capParam = *caption
	}

	insertQuery := `
		INSERT INTO destination_live_moments (town_id, user_id, trip_id, image_url, caption)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`

	var m LiveMoment
	m.ImageURL = imageURL
	m.Caption = caption

	err := r.db.QueryRow(insertQuery, townID, userID, tripID, imageURL, capParam).Scan(&m.ID, &m.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("error inserting live moment: %w", err)
	}

	// Fetch author details
	authorQuery := `
		SELECT u.id, u.name, u.avatar_url, ut.name, ur.name, uc.name
		FROM users u
		LEFT JOIN towns ut ON u.town_id = ut.id
		LEFT JOIN regions ur ON ut.region_id = ur.id
		LEFT JOIN countries uc ON ur.country_id = uc.id
		WHERE u.id = $1
	`
	var avatarURL, townName, regionName, countryName sql.NullString
	err = r.db.QueryRow(authorQuery, userID).Scan(
		&m.Author.ID,
		&m.Author.Name,
		&avatarURL,
		&townName,
		&regionName,
		&countryName,
	)
	if err != nil {
		return nil, fmt.Errorf("error fetching author details for live moment: %w", err)
	}

	if avatarURL.Valid {
		m.Author.AvatarURL = &avatarURL.String
	}
	if townName.Valid {
		m.Author.TownName = &townName.String
	}
	if regionName.Valid {
		m.Author.RegionName = &regionName.String
	}
	if countryName.Valid {
		m.Author.CountryName = &countryName.String
	}

	return &m, nil
}

func (r *repository) CreateReport(reporterID, targetType, targetID, reason string, details *string) error {
	if r.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	var detailsParam interface{}
	if details != nil && *details != "" {
		detailsParam = *details
	}

	query := `
		INSERT INTO community_reports (target_type, target_id, reporter_id, reason, details)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.Exec(query, targetType, targetID, reporterID, reason, detailsParam)
	if err != nil {
		return fmt.Errorf("error inserting community report: %w", err)
	}
	return nil
}
