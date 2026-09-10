package community

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
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
	ListPublicTripsByDestination(info *DestinationInfo, limit, offset int) ([]PublicTripSummary, error)
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
				       CASE 
				           WHEN LOWER(t.name) = LOWER($2) THEN 1
				           WHEN LOWER(t.name) LIKE LOWER($2) || '%' THEN 2
				           ELSE 3
				       END as rank_score
				FROM towns t
				JOIN regions r ON t.region_id = r.id
				JOIN countries c ON r.country_id = c.id
				WHERE t.name ILIKE $1 OR c.name ILIKE $1 OR c.code ILIKE $1
				LIMIT 30
			),
			rec_towns AS (
				SELECT dr.town_id, COUNT(dr.id) AS rec_count
				FROM destination_recommendations dr
				WHERE dr.town_id IN (SELECT id FROM matched_towns)
				GROUP BY dr.town_id
			),
			active_trip_towns AS (
				SELECT ts.town_id, COUNT(DISTINCT tr.user_id) AS active_felagis_count
				FROM trip_stages ts
				JOIN trips tr ON ts.trip_id = tr.id
				WHERE ts.town_id IN (SELECT id FROM matched_towns)
				  AND CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
				GROUP BY ts.town_id
			),
			public_trip_towns AS (
				SELECT ts.town_id, COUNT(DISTINCT tr.id) AS public_trips_count
				FROM trip_stages ts
				JOIN trips tr ON ts.trip_id = tr.id
				WHERE ts.town_id IN (SELECT id FROM matched_towns)
				  AND tr.visibility = 'public' AND (tr.status = 'completed' OR tr.end_date < CURRENT_DATE)
				GROUP BY ts.town_id
			),
			traveler_towns AS (
				SELECT ts.town_id, COUNT(DISTINCT tr.user_id) AS total_travelers_count
				FROM trip_stages ts
				JOIN trips tr ON ts.trip_id = tr.id
				WHERE ts.town_id IN (SELECT id FROM matched_towns)
				GROUP BY ts.town_id
			)
			SELECT mt.id, mt.name, mt.region_name, mt.country_name, mt.country_code,
			       COALESCE(rt.rec_count, 0) AS recommendations_count,
			       COALESCE(att.active_felagis_count, 0) AS active_felagis_count,
			       COALESCE(ptt.public_trips_count, 0) AS public_trips_count,
			       COALESCE(tt.total_travelers_count, 0) AS total_travelers_count,
			       COALESCE(
			           (SELECT tp.image_url FROM trip_photos tp JOIN trips tr ON tp.trip_id = tr.id JOIN trip_stages ts ON ts.trip_id = tr.id WHERE ts.town_id = mt.id AND tr.visibility = 'public' AND tp.image_url IS NOT NULL AND tp.image_url != '' ORDER BY tp.is_featured DESC, tp.created_at DESC LIMIT 1),
			           (SELECT dr.image_url FROM destination_recommendations dr WHERE dr.town_id = mt.id AND dr.image_url IS NOT NULL AND dr.image_url != '' ORDER BY dr.useful_votes_count DESC, dr.created_at DESC LIMIT 1),
			           (SELECT lm.image_url FROM destination_live_moments lm WHERE lm.town_id = mt.id AND lm.image_url IS NOT NULL AND lm.image_url != '' ORDER BY lm.created_at DESC LIMIT 1)
			       ) AS banner_url
			FROM matched_towns mt
			LEFT JOIN rec_towns rt ON rt.town_id = mt.id
			LEFT JOIN active_trip_towns att ON att.town_id = mt.id
			LEFT JOIN public_trip_towns ptt ON ptt.town_id = mt.id
			LEFT JOIN traveler_towns tt ON tt.town_id = mt.id
			ORDER BY mt.rank_score ASC, recommendations_count DESC, active_felagis_count DESC, mt.name ASC
			LIMIT $3
		`
		rows, err = r.db.Query(townQuery, queryPattern, trimmedQuery, limit)
	} else {
		townQuery = `
			WITH active_trip_towns AS (
				SELECT ts.town_id, COUNT(DISTINCT tr.user_id) AS active_felagis_count
				FROM trip_stages ts
				JOIN trips tr ON ts.trip_id = tr.id
				WHERE ts.town_id IS NOT NULL
				  AND CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
				GROUP BY ts.town_id
			),
			rec_towns AS (
				SELECT dr.town_id, COUNT(dr.id) AS rec_count
				FROM destination_recommendations dr
				WHERE dr.town_id IS NOT NULL
				GROUP BY dr.town_id
			),
			public_trip_towns AS (
				SELECT ts.town_id, COUNT(DISTINCT tr.id) AS public_trips_count
				FROM trip_stages ts
				JOIN trips tr ON ts.trip_id = tr.id
				WHERE ts.town_id IS NOT NULL
				  AND tr.visibility = 'public' AND (tr.status = 'completed' OR tr.end_date < CURRENT_DATE)
				GROUP BY ts.town_id
			),
			traveler_towns AS (
				SELECT ts.town_id, COUNT(DISTINCT tr.user_id) AS total_travelers_count
				FROM trip_stages ts
				JOIN trips tr ON ts.trip_id = tr.id
				WHERE ts.town_id IS NOT NULL
				GROUP BY ts.town_id
			),
			existing_town_ids AS (
				SELECT town_id FROM active_trip_towns
				UNION
				SELECT town_id FROM rec_towns
				UNION
				SELECT town_id FROM public_trip_towns
			)
			SELECT t.id, t.name, reg.name AS region_name, c.name AS country_name, c.code AS country_code,
			       COALESCE(rt.rec_count, 0) AS recommendations_count,
			       COALESCE(att.active_felagis_count, 0) AS active_felagis_count,
			       COALESCE(ptt.public_trips_count, 0) AS public_trips_count,
			       COALESCE(tt.total_travelers_count, 0) AS total_travelers_count,
			       COALESCE(
			           (SELECT tp.image_url FROM trip_photos tp JOIN trips tr ON tp.trip_id = tr.id JOIN trip_stages ts ON ts.trip_id = tr.id WHERE ts.town_id = t.id AND tr.visibility = 'public' AND tp.image_url IS NOT NULL AND tp.image_url != '' ORDER BY tp.is_featured DESC, tp.created_at DESC LIMIT 1),
			           (SELECT dr.image_url FROM destination_recommendations dr WHERE dr.town_id = t.id AND dr.image_url IS NOT NULL AND dr.image_url != '' ORDER BY dr.useful_votes_count DESC, dr.created_at DESC LIMIT 1),
			           (SELECT lm.image_url FROM destination_live_moments lm WHERE lm.town_id = t.id AND lm.image_url IS NOT NULL AND lm.image_url != '' ORDER BY lm.created_at DESC LIMIT 1)
			       ) AS banner_url
			FROM existing_town_ids eti
			JOIN towns t ON eti.town_id = t.id
			JOIN regions reg ON t.region_id = reg.id
			JOIN countries c ON reg.country_id = c.id
			LEFT JOIN rec_towns rt ON rt.town_id = t.id
			LEFT JOIN active_trip_towns att ON att.town_id = t.id
			LEFT JOIN public_trip_towns ptt ON ptt.town_id = t.id
			LEFT JOIN traveler_towns tt ON tt.town_id = t.id
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
		var regionName, countryName, countryCode, bannerURL sql.NullString
		s.Type = "town"

		if err := rows.Scan(
			&s.ID,
			&s.Name,
			&regionName,
			&countryName,
			&countryCode,
			&s.RecommendationsCount,
			&s.ActiveFelagisCount,
			&s.PublicTripsCount,
			&s.TotalTravelersCount,
			&bannerURL,
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
			flag := countryCodeToFlag(countryCode.String)
			if flag != "" {
				s.FlagEmoji = &flag
			}
		}
		if bannerURL.Valid && bannerURL.String != "" {
			s.BannerURL = &bannerURL.String
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
				SELECT c.code AS id, c.name, NULL::text AS region_name, c.name AS country_name, c.code AS country_code,
				       CASE 
				           WHEN LOWER(c.code) = LOWER($2) THEN 1
				           WHEN LOWER(c.name) = LOWER($2) THEN 2
				           WHEN LOWER(c.name) LIKE LOWER($2) || '%' THEN 3
				           ELSE 4
				       END as rank_score
				FROM countries c
				WHERE c.name ILIKE $1 OR c.code ILIKE $1
				LIMIT 20
			),
			rec_countries AS (
				SELECT dr.country_code, COUNT(dr.id) AS rec_count
				FROM destination_recommendations dr
				WHERE dr.country_code IN (SELECT country_code FROM matched_countries)
				  AND dr.town_id IS NULL
				GROUP BY dr.country_code
			),
			active_trip_countries AS (
				SELECT ts.country_code, COUNT(DISTINCT tr.user_id) AS active_felagis_count
				FROM trip_stages ts
				JOIN trips tr ON ts.trip_id = tr.id
				WHERE ts.country_code IN (SELECT country_code FROM matched_countries)
				  AND ts.town_id IS NULL
				  AND CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
				GROUP BY ts.country_code
			),
			public_trip_countries AS (
				SELECT ts.country_code, COUNT(DISTINCT tr.id) AS public_trips_count
				FROM trip_stages ts
				JOIN trips tr ON ts.trip_id = tr.id
				WHERE ts.country_code IN (SELECT country_code FROM matched_countries)
				  AND ts.town_id IS NULL
				  AND tr.visibility = 'public' AND (tr.status = 'completed' OR tr.end_date < CURRENT_DATE)
				GROUP BY ts.country_code
			),
			traveler_countries AS (
				SELECT ts.country_code, COUNT(DISTINCT tr.user_id) AS total_travelers_count
				FROM trip_stages ts
				JOIN trips tr ON ts.trip_id = tr.id
				WHERE ts.country_code IN (SELECT country_code FROM matched_countries)
				  AND ts.town_id IS NULL
				GROUP BY ts.country_code
			)
			SELECT mc.id, mc.name, mc.region_name, mc.country_name, mc.country_code,
			       COALESCE(rc.rec_count, 0) AS recommendations_count,
			       COALESCE(atc.active_felagis_count, 0) AS active_felagis_count,
			       COALESCE(ptc.public_trips_count, 0) AS public_trips_count,
			       COALESCE(tc.total_travelers_count, 0) AS total_travelers_count,
			       COALESCE(
			           (SELECT tp.image_url FROM trip_photos tp JOIN trips tr ON tp.trip_id = tr.id JOIN trip_stages ts ON ts.trip_id = tr.id WHERE ts.country_code = mc.country_code AND tr.visibility = 'public' AND tp.image_url IS NOT NULL AND tp.image_url != '' ORDER BY tp.is_featured DESC, tp.created_at DESC LIMIT 1),
			           (SELECT dr.image_url FROM destination_recommendations dr WHERE dr.country_code = mc.country_code AND dr.image_url IS NOT NULL AND dr.image_url != '' ORDER BY dr.useful_votes_count DESC, dr.created_at DESC LIMIT 1)
			       ) AS banner_url
			FROM matched_countries mc
			LEFT JOIN rec_countries rc ON rc.country_code = mc.country_code
			LEFT JOIN active_trip_countries atc ON atc.country_code = mc.country_code
			LEFT JOIN public_trip_countries ptc ON ptc.country_code = mc.country_code
			LEFT JOIN traveler_countries tc ON tc.country_code = mc.country_code
			ORDER BY mc.rank_score ASC, recommendations_count DESC, active_felagis_count DESC, mc.name ASC
			LIMIT $3
		`
		cRows, err = r.db.Query(countryQuery, queryPattern, trimmedQuery, limit)
	} else {
		countryQuery = `
			WITH active_trip_countries AS (
				SELECT ts.country_code, COUNT(DISTINCT tr.user_id) AS active_felagis_count
				FROM trip_stages ts
				JOIN trips tr ON ts.trip_id = tr.id
				WHERE ts.country_code IS NOT NULL
				  AND ts.town_id IS NULL
				  AND CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
				GROUP BY ts.country_code
			),
			rec_countries AS (
				SELECT dr.country_code, COUNT(dr.id) AS rec_count
				FROM destination_recommendations dr
				WHERE dr.country_code IS NOT NULL
				  AND dr.town_id IS NULL
				GROUP BY dr.country_code
			),
			public_trip_countries AS (
				SELECT ts.country_code, COUNT(DISTINCT tr.id) AS public_trips_count
				FROM trip_stages ts
				JOIN trips tr ON ts.trip_id = tr.id
				WHERE ts.country_code IS NOT NULL
				  AND ts.town_id IS NULL
				  AND tr.visibility = 'public' AND (tr.status = 'completed' OR tr.end_date < CURRENT_DATE)
				GROUP BY ts.country_code
			),
			traveler_countries AS (
				SELECT ts.country_code, COUNT(DISTINCT tr.user_id) AS total_travelers_count
				FROM trip_stages ts
				JOIN trips tr ON ts.trip_id = tr.id
				WHERE ts.country_code IS NOT NULL
				  AND ts.town_id IS NULL
				GROUP BY ts.country_code
			),
			existing_country_codes AS (
				SELECT country_code FROM active_trip_countries
				UNION
				SELECT country_code FROM rec_countries
				UNION
				SELECT country_code FROM public_trip_countries
			)
			SELECT c.code AS id, c.name, NULL::text AS region_name, c.name AS country_name, c.code AS country_code,
			       COALESCE(rc.rec_count, 0) AS recommendations_count,
			       COALESCE(atc.active_felagis_count, 0) AS active_felagis_count,
			       COALESCE(ptc.public_trips_count, 0) AS public_trips_count,
			       COALESCE(tc.total_travelers_count, 0) AS total_travelers_count,
			       COALESCE(
			           (SELECT tp.image_url FROM trip_photos tp JOIN trips tr ON tp.trip_id = tr.id JOIN trip_stages ts ON ts.trip_id = tr.id WHERE ts.country_code = c.code AND tr.visibility = 'public' AND tp.image_url IS NOT NULL AND tp.image_url != '' ORDER BY tp.is_featured DESC, tp.created_at DESC LIMIT 1),
			           (SELECT dr.image_url FROM destination_recommendations dr WHERE dr.country_code = c.code AND dr.image_url IS NOT NULL AND dr.image_url != '' ORDER BY dr.useful_votes_count DESC, dr.created_at DESC LIMIT 1)
			       ) AS banner_url
			FROM existing_country_codes ecc
			JOIN countries c ON ecc.country_code = c.code
			LEFT JOIN rec_countries rc ON rc.country_code = c.code
			LEFT JOIN active_trip_countries atc ON atc.country_code = c.code
			LEFT JOIN public_trip_countries ptc ON ptc.country_code = c.code
			LEFT JOIN traveler_countries tc ON tc.country_code = c.code
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
		var regionName, countryName, countryCode, bannerURL sql.NullString
		s.Type = "country"

		if err := cRows.Scan(
			&s.ID,
			&s.Name,
			&regionName,
			&countryName,
			&countryCode,
			&s.RecommendationsCount,
			&s.ActiveFelagisCount,
			&s.PublicTripsCount,
			&s.TotalTravelersCount,
			&bannerURL,
		); err != nil {
			return nil, fmt.Errorf("error scanning country search row: %w", err)
		}

		if regionName.Valid {
			s.RegionName = &regionName.String
		}
		if countryName.Valid {
			s.CountryName = &countryName.String
		} else {
			name := s.Name
			s.CountryName = &name
		}
		if countryCode.Valid {
			s.CountryCode = &countryCode.String
			flag := countryCodeToFlag(countryCode.String)
			if flag != "" {
				s.FlagEmoji = &flag
			}
		}
		if bannerURL.Valid && bannerURL.String != "" {
			s.BannerURL = &bannerURL.String
		}

		results = append(results, s)
	}
	if err := cRows.Err(); err != nil {
		return nil, err
	}

	// Rule: "Unitat més petita: si hi ha ciutat i país, agafem la ciutat; si només hi ha país (sense ciutat), el país"
	var filteredResults []DestinationSummary
	townCountryCodes := make(map[string]bool)
	seenDestinations := make(map[string]bool)

	for _, res := range results {
		if res.Type == "town" {
			key := fmt.Sprintf("town:%s", res.ID)
			if !seenDestinations[key] {
				seenDestinations[key] = true
				filteredResults = append(filteredResults, res)
				if res.CountryCode != nil && *res.CountryCode != "" {
					townCountryCodes[strings.ToUpper(*res.CountryCode)] = true
				}
			}
		}
	}

	for _, res := range results {
		if res.Type == "country" {
			cc := ""
			if res.CountryCode != nil {
				cc = strings.ToUpper(*res.CountryCode)
			}
			// Only include the country if there are no specific towns from this country in the results
			if cc != "" && townCountryCodes[cc] {
				continue
			}
			key := fmt.Sprintf("country:%s", res.ID)
			if !seenDestinations[key] {
				seenDestinations[key] = true
				filteredResults = append(filteredResults, res)
			}
		}
	}

	results = filteredResults

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

	// 1. Try resolving as Town (by town ID or town name)
	townQuery := `
		SELECT t.id, t.name, r.id, r.name, c.code, c.name
		FROM towns t
		JOIN regions r ON t.region_id = r.id
		JOIN countries c ON r.country_id = c.id
		WHERE t.id::text = $1 OR LOWER(t.name) = LOWER($1)
		ORDER BY CASE WHEN t.id::text = $1 THEN 1 ELSE 2 END
		LIMIT 1
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

	// 2. Try resolving as Country (by 2-letter Code, UUID or country name)
	countryQuery := `
		SELECT code, name
		FROM countries
		WHERE UPPER(code) = UPPER($1) OR id::text = $1 OR LOWER(name) = LOWER($1)
		ORDER BY CASE WHEN UPPER(code) = UPPER($1) THEN 1 ELSE 2 END
		LIMIT 1
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

		// Total visitors / travelers count
		totalVisQuery := `
			SELECT COUNT(DISTINCT tr.user_id)
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			WHERE (ts.town_id::text = $1 OR ts.destination_name = $2)
		`
		_ = r.db.QueryRow(totalVisQuery, info.TownID, info.TownName).Scan(&detail.TotalVisitorsCount)
		detail.TotalTravelersCount = detail.TotalVisitorsCount

		// Public completed trips count
		publicTripsQuery := `
			SELECT COUNT(DISTINCT tr.id)
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			WHERE tr.visibility = 'public' AND (tr.status = 'completed' OR tr.end_date < CURRENT_DATE)
			  AND (ts.town_id::text = $1 OR ts.destination_name = $2)
		`
		_ = r.db.QueryRow(publicTripsQuery, info.TownID, info.TownName).Scan(&detail.PublicTripsCount)

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

		// Dynamic Community Banner: 1) trip photos, 2) top-voted recommendation photo, 3) latest live moment
		var townBanner sql.NullString
		tripBannerQuery := `
			SELECT tp.image_url
			FROM trip_photos tp
			JOIN trips tr ON tp.trip_id = tr.id
			JOIN trip_stages ts ON ts.trip_id = tr.id
			WHERE (ts.town_id::text = $1 OR ts.destination_name = $2)
			  AND tr.visibility = 'public' AND tp.image_url IS NOT NULL AND tp.image_url != ''
			ORDER BY tp.is_featured DESC, tp.created_at DESC
			LIMIT 1
		`
		if err := r.db.QueryRow(tripBannerQuery, info.TownID, info.TownName).Scan(&townBanner); err == nil && townBanner.Valid && townBanner.String != "" {
			detail.BannerURL = &townBanner.String
		} else {
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

		// Total visitors / travelers count
		totalVisQuery := `
			SELECT COUNT(DISTINCT tr.user_id)
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			LEFT JOIN towns t ON ts.town_id = t.id
			LEFT JOIN regions r ON t.region_id = r.id
			LEFT JOIN countries dc ON r.country_id = dc.id
			WHERE (ts.country_code = $1 OR dc.code = $1 OR ts.destination_name = $2)
		`
		_ = r.db.QueryRow(totalVisQuery, info.CountryCode, info.CountryName).Scan(&detail.TotalVisitorsCount)
		detail.TotalTravelersCount = detail.TotalVisitorsCount

		// Public completed trips count
		cPublicTripsQuery := `
			SELECT COUNT(DISTINCT tr.id)
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			LEFT JOIN towns t ON ts.town_id = t.id
			LEFT JOIN regions r ON t.region_id = r.id
			LEFT JOIN countries dc ON r.country_id = dc.id
			WHERE tr.visibility = 'public' AND (tr.status = 'completed' OR tr.end_date < CURRENT_DATE)
			  AND (ts.country_code = $1 OR dc.code = $1 OR ts.destination_name = $2)
		`
		_ = r.db.QueryRow(cPublicTripsQuery, info.CountryCode, info.CountryName).Scan(&detail.PublicTripsCount)

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

		// Dynamic Country Banner: 1) trip photos, 2) top-voted recommendation photo
		var countryBanner sql.NullString
		cTripBannerQuery := `
			SELECT tp.image_url
			FROM trip_photos tp
			JOIN trips tr ON tp.trip_id = tr.id
			JOIN trip_stages ts ON ts.trip_id = tr.id
			LEFT JOIN towns t ON ts.town_id = t.id
			LEFT JOIN regions r ON t.region_id = r.id
			LEFT JOIN countries dc ON r.country_id = dc.id
			WHERE (ts.country_code = $1 OR dc.code = $1 OR ts.destination_name = $2)
			  AND tr.visibility = 'public' AND tp.image_url IS NOT NULL AND tp.image_url != ''
			ORDER BY tp.is_featured DESC, tp.created_at DESC
			LIMIT 1
		`
		if err := r.db.QueryRow(cTripBannerQuery, info.CountryCode, info.CountryName).Scan(&countryBanner); err == nil && countryBanner.Valid && countryBanner.String != "" {
			detail.BannerURL = &countryBanner.String
		} else {
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
		if req.TownID != nil && strings.TrimSpace(*req.TownID) != "" {
			townIDParam = strings.TrimSpace(*req.TownID)
		} else {
			townIDParam = nil
		}
		countryCodeParam = info.CountryCode
	}

	var imgParam, locParam interface{}
	if req.ImageURL != nil && *req.ImageURL != "" {
		imgParam = *req.ImageURL
	}
	if req.LocationName != nil && *req.LocationName != "" {
		locParam = *req.LocationName
	}

	isPublicVal := true
	if req.IsPublic != nil {
		isPublicVal = *req.IsPublic
	}

	insertQuery := `
		INSERT INTO destination_recommendations (town_id, country_code, user_id, category, title, description, image_url, location_name, is_public)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, useful_votes_count, created_at
	`

	var rec Recommendation
	rec.DestinationID = destID
	rec.Category = req.Category
	rec.Title = req.Title
	rec.Description = req.Description
	rec.ImageURL = req.ImageURL
	rec.LocationName = req.LocationName
	rec.IsPublic = isPublicVal
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
		isPublicVal,
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
			  AND (CURRENT_DATE BETWEEN tr.start_date AND tr.end_date OR tr.status = 'ongoing')
			  AND (ts.town_id::text = $2 OR LOWER(ts.destination_name) = LOWER($3))
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
			  AND (CURRENT_DATE BETWEEN tr.start_date AND tr.end_date OR tr.status = 'ongoing')
			  AND (UPPER(ts.country_code) = UPPER($2) OR LOWER(ts.destination_name) = LOWER($3))
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

var catalanMonths = map[time.Month]string{
	time.January:   "Gener",
	time.February:  "Febrer",
	time.March:     "Març",
	time.April:     "Abril",
	time.May:       "Maig",
	time.June:      "Juny",
	time.July:      "Juliol",
	time.August:     "Agost",
	time.September: "Setembre",
	time.October:   "Octubre",
	time.November:  "Novembre",
	time.December:  "Desembre",
}

func calculateTripPeriodAndDays(startDateStr, endDateStr string) (int, string) {
	sDate, err1 := time.Parse("2006-01-02", startDateStr)
	eDate, err2 := time.Parse("2006-01-02", endDateStr)
	if err1 != nil || err2 != nil {
		return 1, ""
	}

	days := int(eDate.Sub(sDate).Hours()/24) + 1
	if days <= 0 {
		days = 1
	}

	monthName, ok := catalanMonths[sDate.Month()]
	if !ok {
		monthName = sDate.Month().String()
	}

	daysText := "dies"
	if days == 1 {
		daysText = "dia"
	}

	formattedPeriod := fmt.Sprintf("%s %d • %d %s", monthName, sDate.Year(), days, daysText)
	return days, formattedPeriod
}

func (r *repository) ListPublicTripsByDestination(info *DestinationInfo, limit, offset int) ([]PublicTripSummary, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var tripQuery string
	var args []interface{}

	if info.IsTown {
		tripQuery = `
			SELECT DISTINCT tr.id, tr.title, tr.description, tr.start_date, tr.end_date,
			       u.id AS author_id, ut.name AS author_town, ur.name AS author_region, uc.name AS author_country,
			       COALESCE((SELECT COUNT(*) FROM trip_companions tc WHERE tc.trip_id = tr.id AND tc.role = 'companion' AND tc.status = 'accepted'), 0) AS companions_count
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			JOIN users u ON tr.user_id = u.id
			LEFT JOIN towns ut ON u.town_id = ut.id
			LEFT JOIN regions ur ON ut.region_id = ur.id
			LEFT JOIN countries uc ON ur.country_id = uc.id
			WHERE tr.visibility = 'public'
			  AND (tr.status = 'completed' OR tr.end_date < CURRENT_DATE)
			  AND (ts.town_id::text = $1 OR LOWER(ts.destination_name) = LOWER($2))
			ORDER BY tr.end_date DESC, tr.id DESC
			LIMIT $3 OFFSET $4
		`
		args = []interface{}{info.TownID, info.TownName, limit, offset}
	} else {
		tripQuery = `
			SELECT DISTINCT tr.id, tr.title, tr.description, tr.start_date, tr.end_date,
			       u.id AS author_id, ut.name AS author_town, ur.name AS author_region, uc.name AS author_country,
			       COALESCE((SELECT COUNT(*) FROM trip_companions tc WHERE tc.trip_id = tr.id AND tc.role = 'companion' AND tc.status = 'accepted'), 0) AS companions_count
			FROM trips tr
			JOIN trip_stages ts ON ts.trip_id = tr.id
			JOIN users u ON tr.user_id = u.id
			LEFT JOIN towns ut ON u.town_id = ut.id
			LEFT JOIN regions ur ON ut.region_id = ur.id
			LEFT JOIN countries uc ON ur.country_id = uc.id
			LEFT JOIN towns t ON ts.town_id = t.id
			LEFT JOIN regions r ON t.region_id = r.id
			LEFT JOIN countries dc ON r.country_id = dc.id
			WHERE tr.visibility = 'public'
			  AND (tr.status = 'completed' OR tr.end_date < CURRENT_DATE)
			  AND (ts.country_code = $1 OR dc.code = $1 OR LOWER(ts.destination_name) = LOWER($2))
			ORDER BY tr.end_date DESC, tr.id DESC
			LIMIT $3 OFFSET $4
		`
		args = []interface{}{info.CountryCode, info.CountryName, limit, offset}
	}

	rows, err := r.db.Query(tripQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("error querying public trips: %w", err)
	}
	defer rows.Close()

	var results []PublicTripSummary
	var tripIDs []string

	for rows.Next() {
		var pts PublicTripSummary
		var desc sql.NullString
		var sDate, eDate time.Time
		var authorID string
		var authorTown, authorRegion, authorCountry sql.NullString

		if err := rows.Scan(
			&pts.ID,
			&pts.Title,
			&desc,
			&sDate,
			&eDate,
			&authorID,
			&authorTown,
			&authorRegion,
			&authorCountry,
			&pts.CompanionsCount,
		); err != nil {
			return nil, fmt.Errorf("error scanning public trip row: %w", err)
		}

		if desc.Valid {
			pts.Description = &desc.String
		}
		pts.StartDate = sDate.Format("2006-01-02")
		pts.EndDate = eDate.Format("2006-01-02")

		pts.TotalDays, pts.FormattedPeriod = calculateTripPeriodAndDays(pts.StartDate, pts.EndDate)

		// Author Anonymization
		pts.Author.ID = authorID
		if authorTown.Valid && authorTown.String != "" {
			pts.Author.TownName = &authorTown.String
			pts.Author.AnonymousTitle = fmt.Sprintf("Un felagi de %s", authorTown.String)
		} else if authorRegion.Valid && authorRegion.String != "" {
			pts.Author.RegionName = &authorRegion.String
			pts.Author.AnonymousTitle = fmt.Sprintf("Un felagi de %s", authorRegion.String)
		} else {
			pts.Author.AnonymousTitle = "Un felagi de la teva terra"
		}
		if authorCountry.Valid && authorCountry.String != "" {
			pts.Author.CountryName = &authorCountry.String
		}

		pts.Stages = []PublicTripStage{}
		pts.Photos = []PublicTripPhoto{}

		results = append(results, pts)
		tripIDs = append(tripIDs, pts.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return []PublicTripSummary{}, nil
	}

	// Fetch stages for each trip
	stageQuery := `
		SELECT id, trip_id, stage_order, destination_name, country_code, town_id, start_date, end_date
		FROM trip_stages
		WHERE trip_id = ANY($1)
		ORDER BY trip_id, stage_order ASC
	`
	sRows, err := r.db.Query(stageQuery, pq.Array(tripIDs))
	if err == nil {
		defer sRows.Close()
		stagesByTrip := make(map[string][]PublicTripStage)
		for sRows.Next() {
			var st PublicTripStage
			var tID string
			var sOrder int
			var cc, townID sql.NullString
			var stStart, stEnd time.Time

			if err := sRows.Scan(
				&st.ID,
				&tID,
				&sOrder,
				&st.DestinationName,
				&cc,
				&townID,
				&stStart,
				&stEnd,
			); err == nil {
				if cc.Valid {
					st.CountryCode = &cc.String
				}
				if townID.Valid {
					st.TownID = &townID.String
				}
				st.StartDate = stStart.Format("2006-01-02")
				st.EndDate = stEnd.Format("2006-01-02")
				stagesByTrip[tID] = append(stagesByTrip[tID], st)
			}
		}
		for i := range results {
			if stList, exists := stagesByTrip[results[i].ID]; exists {
				results[i].Stages = stList
			}
		}
	}

	// Fetch photos for each trip
	photoQuery := `
		SELECT id, trip_id, image_url, caption, is_featured
		FROM trip_photos
		WHERE trip_id = ANY($1)
		ORDER BY trip_id, is_featured DESC, created_at DESC
	`
	pRows, err := r.db.Query(photoQuery, pq.Array(tripIDs))
	if err == nil {
		defer pRows.Close()
		photosByTrip := make(map[string][]PublicTripPhoto)
		for pRows.Next() {
			var ph PublicTripPhoto
			var tID string
			var cap sql.NullString

			if err := pRows.Scan(
				&ph.ID,
				&tID,
				&ph.ImageURL,
				&cap,
				&ph.IsFeatured,
			); err == nil {
				if cap.Valid {
					ph.Caption = &cap.String
				}
				photosByTrip[tID] = append(photosByTrip[tID], ph)
			}
		}
		for i := range results {
			if phList, exists := photosByTrip[results[i].ID]; exists {
				results[i].Photos = phList
			}
		}
	}

	return results, nil
}
