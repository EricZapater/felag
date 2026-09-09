package explore

import (
	"database/sql"
	"fmt"
	"strings"
)

type Repository interface {
	GetUserOrigin(userID string) (*UserOriginInfo, error)
	GetExploreDestinations(origin *UserOriginInfo, limit int) ([]ExploreDestinationItem, error)
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetUserOrigin(userID string) (*UserOriginInfo, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT u.town_id, t.name, t.region_id, reg.name, reg.country_id, c.name, c.code
		FROM users u
		LEFT JOIN towns t ON u.town_id = t.id
		LEFT JOIN regions reg ON t.region_id = reg.id
		LEFT JOIN countries c ON reg.country_id = c.id
		WHERE u.id = $1;
	`

	var o UserOriginInfo
	var townID, townName, regionID, regionName, countryID, countryName, countryCode sql.NullString
	err := r.db.QueryRow(query, userID).Scan(
		&townID, &townName, &regionID, &regionName, &countryID, &countryName, &countryCode,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying user origin: %w", err)
	}

	if townID.Valid {
		o.TownID = &townID.String
	}
	if townName.Valid {
		o.TownName = &townName.String
	}
	if regionID.Valid {
		o.RegionID = &regionID.String
	}
	if regionName.Valid {
		o.RegionName = &regionName.String
	}
	if countryID.Valid {
		o.CountryID = &countryID.String
	}
	if countryName.Valid {
		o.CountryName = &countryName.String
	}
	if countryCode.Valid {
		o.CountryCode = &countryCode.String
	}

	return &o, nil
}

func (r *repository) GetExploreDestinations(origin *UserOriginInfo, limit int) ([]ExploreDestinationItem, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	if limit <= 0 {
		limit = 20
	}

	var userTownID, userRegionID *string
	if origin != nil {
		userTownID = origin.TownID
		userRegionID = origin.RegionID
	}

	query := `
		WITH existing_towns AS (
			SELECT ts.town_id
			FROM trip_stages ts
			WHERE ts.town_id IS NOT NULL
			UNION
			SELECT dr.town_id
			FROM destination_recommendations dr
			WHERE dr.town_id IS NOT NULL
		),
		existing_countries AS (
			SELECT ts.country_code
			FROM trip_stages ts
			WHERE ts.country_code IS NOT NULL
			UNION
			SELECT dr.country_code
			FROM destination_recommendations dr
			WHERE dr.country_code IS NOT NULL
		),
		town_recs AS (
			SELECT dr.town_id,
			       COUNT(dr.id) AS total_recs,
			       COUNT(CASE WHEN $1::uuid IS NOT NULL AND ut.region_id = $1::uuid THEN 1 END) AS region_recs,
			       COUNT(CASE WHEN $2::uuid IS NOT NULL AND u.town_id = $2::uuid THEN 1 END) AS town_recs
			FROM destination_recommendations dr
			JOIN users u ON dr.user_id = u.id
			LEFT JOIN towns ut ON u.town_id = ut.id
			WHERE dr.town_id IN (SELECT town_id FROM existing_towns)
			GROUP BY dr.town_id
		),
		country_recs AS (
			SELECT dr.country_code,
			       COUNT(dr.id) AS total_recs,
			       COUNT(CASE WHEN $1::uuid IS NOT NULL AND ut.region_id = $1::uuid THEN 1 END) AS region_recs,
			       COUNT(CASE WHEN $2::uuid IS NOT NULL AND u.town_id = $2::uuid THEN 1 END) AS town_recs
			FROM destination_recommendations dr
			JOIN users u ON dr.user_id = u.id
			LEFT JOIN towns ut ON u.town_id = ut.id
			WHERE dr.country_code IN (SELECT country_code FROM existing_countries)
			GROUP BY dr.country_code
		),
		active_town_trips AS (
			SELECT ts.town_id, COUNT(DISTINCT tr.user_id) AS active_felagis
			FROM trip_stages ts
			JOIN trips tr ON ts.trip_id = tr.id
			WHERE ts.town_id IN (SELECT town_id FROM existing_towns)
			  AND CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			GROUP BY ts.town_id
		),
		active_country_trips AS (
			SELECT ts.country_code, COUNT(DISTINCT tr.user_id) AS active_felagis
			FROM trip_stages ts
			JOIN trips tr ON ts.trip_id = tr.id
			WHERE ts.country_code IN (SELECT country_code FROM existing_countries)
			  AND CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			GROUP BY ts.country_code
		),
		latest_town_banner AS (
			SELECT DISTINCT ON (img.town_id) img.town_id, img.image_url
			FROM (
				SELECT dr.town_id, dr.image_url, dr.created_at
				FROM destination_recommendations dr
				WHERE dr.town_id IN (SELECT town_id FROM existing_towns) AND dr.image_url IS NOT NULL AND dr.image_url != ''
				UNION ALL
				SELECT dlm.town_id, dlm.image_url, dlm.created_at
				FROM destination_live_moments dlm
				WHERE dlm.town_id IN (SELECT town_id FROM existing_towns) AND dlm.image_url IS NOT NULL AND dlm.image_url != ''
			) img
			ORDER BY img.town_id, img.created_at DESC
		),
		latest_country_banner AS (
			SELECT DISTINCT ON (dr.country_code) dr.country_code, dr.image_url
			FROM destination_recommendations dr
			WHERE dr.country_code IN (SELECT country_code FROM existing_countries) AND dr.image_url IS NOT NULL AND dr.image_url != ''
			ORDER BY dr.country_code, dr.created_at DESC
		),
		combined AS (
			SELECT 
				t.id::text AS id,
				t.name AS name,
				r.name AS region_name,
				c.name AS country_name,
				c.code AS country_code,
				COALESCE(tr.total_recs, 0) AS total_recs,
				COALESCE(at.active_felagis, 0) AS active_felagis,
				COALESCE(tr.region_recs, 0) AS region_recs,
				COALESCE(tr.town_recs, 0) AS town_recs,
				lb.image_url AS banner_url,
				(COALESCE(tr.town_recs, 0) * 5 + COALESCE(tr.region_recs, 0) * 3 + COALESCE(at.active_felagis, 0) * 2 + COALESCE(tr.total_recs, 0)) AS score
			FROM existing_towns et
			JOIN towns t ON et.town_id = t.id
			JOIN regions r ON t.region_id = r.id
			JOIN countries c ON r.country_id = c.id
			LEFT JOIN town_recs tr ON tr.town_id = t.id
			LEFT JOIN active_town_trips at ON at.town_id = t.id
			LEFT JOIN latest_town_banner lb ON lb.town_id = t.id

			UNION ALL

			SELECT
				c.code AS id,
				c.name AS name,
				NULL::text AS region_name,
				c.name AS country_name,
				c.code AS country_code,
				COALESCE(cr.total_recs, 0) AS total_recs,
				COALESCE(act.active_felagis, 0) AS active_felagis,
				COALESCE(cr.region_recs, 0) AS region_recs,
				COALESCE(cr.town_recs, 0) AS town_recs,
				lcb.image_url AS banner_url,
				(COALESCE(cr.town_recs, 0) * 5 + COALESCE(cr.region_recs, 0) * 3 + COALESCE(act.active_felagis, 0) * 2 + COALESCE(cr.total_recs, 0)) AS score
			FROM existing_countries ec
			JOIN countries c ON ec.country_code = c.code
			LEFT JOIN country_recs cr ON cr.country_code = c.code
			LEFT JOIN active_country_trips act ON act.country_code = c.code
			LEFT JOIN latest_country_banner lcb ON lcb.country_code = c.code
			WHERE NOT EXISTS (
				SELECT 1 FROM existing_towns et2
				JOIN towns t2 ON et2.town_id = t2.id
				JOIN regions r2 ON t2.region_id = r2.id
				WHERE r2.country_id = c.id
			)
		)
		SELECT id, name, region_name, country_name, country_code, total_recs, active_felagis, region_recs, town_recs, banner_url
		FROM combined
		ORDER BY score DESC, name ASC
		LIMIT $3;
	`

	rows, err := r.db.Query(query, userRegionID, userTownID, limit)
	if err != nil {
		return nil, fmt.Errorf("error querying explore destinations: %w", err)
	}
	defer rows.Close()

	var results []ExploreDestinationItem
	for rows.Next() {
		var item ExploreDestinationItem
		var regName, bannerURL sql.NullString
		var totalRecs, activeFelagis, regionRecs, townRecs int

		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&regName,
			&item.CountryName,
			&item.CountryCode,
			&totalRecs,
			&activeFelagis,
			&regionRecs,
			&townRecs,
			&bannerURL,
		); err != nil {
			return nil, fmt.Errorf("error scanning destination item: %w", err)
		}

		if regName.Valid {
			item.RegionName = &regName.String
		}
		if bannerURL.Valid {
			item.BannerURL = &bannerURL.String
		}
		item.TotalRecommendations = totalRecs
		item.ActiveFelagisCount = activeFelagis

		flag := CountryCodeToFlagEmoji(item.CountryCode)
		item.FlagEmoji = &flag

		// Determine tailored affinity reason
		var reason string
		if townRecs > 0 && origin != nil && origin.TownName != nil {
			reason = fmt.Sprintf("Molt recomanat per felagis de %s", *origin.TownName)
		} else if regionRecs > 0 && origin != nil && origin.RegionName != nil {
			reason = fmt.Sprintf("Popular entre viatgers de %s", *origin.RegionName)
		} else if activeFelagis > 0 {
			reason = fmt.Sprintf("Destinació activa ara mateix amb %d felagis", activeFelagis)
		} else if totalRecs > 0 {
			reason = fmt.Sprintf("Comunitat activa amb %d recomanacions", totalRecs)
		} else {
			reason = "Destinació recomanada per descobrir"
		}
		item.AffinityReason = &reason

		results = append(results, item)
	}

	if results == nil {
		results = []ExploreDestinationItem{}
	}

	return results, nil
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
