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
		WITH dest_stats AS (
			SELECT 
				t.id AS town_id,
				t.name AS town_name,
				r.name AS region_name,
				c.name AS country_name,
				c.code AS country_code,
				COALESCE(rec_count.total, 0) AS total_recs,
				COALESCE(active_count.total, 0) AS active_felagis,
				COALESCE(same_region_recs.total, 0) AS region_recs,
				COALESCE(same_town_recs.total, 0) AS town_recs,
				banner.image_url AS banner_url
			FROM towns t
			JOIN regions r ON t.region_id = r.id
			JOIN countries c ON r.country_id = c.id
			LEFT JOIN LATERAL (
				SELECT COUNT(*) AS total
				FROM destination_recommendations dr
				WHERE dr.town_id = t.id
			) rec_count ON true
			LEFT JOIN LATERAL (
				SELECT COUNT(DISTINCT tr.user_id) AS total
				FROM trips tr
				JOIN trip_stages ts ON (ts.town_id = t.id OR LOWER(ts.destination_name) = LOWER(t.name))
				WHERE CURRENT_DATE BETWEEN tr.start_date AND tr.end_date
			) active_count ON true
			LEFT JOIN LATERAL (
				SELECT COUNT(*) AS total
				FROM destination_recommendations dr
				JOIN users u ON dr.user_id = u.id
				JOIN towns ut ON u.town_id = ut.id
				WHERE dr.town_id = t.id AND $1::uuid IS NOT NULL AND ut.region_id = $1::uuid
			) same_region_recs ON true
			LEFT JOIN LATERAL (
				SELECT COUNT(*) AS total
				FROM destination_recommendations dr
				JOIN users u ON dr.user_id = u.id
				WHERE dr.town_id = t.id AND $2::uuid IS NOT NULL AND u.town_id = $2::uuid
			) same_town_recs ON true
			LEFT JOIN LATERAL (
				SELECT COALESCE(dr.image_url, dlm.image_url) AS image_url
				FROM destination_recommendations dr
				FULL OUTER JOIN destination_live_moments dlm ON dlm.town_id = t.id
				WHERE (dr.town_id = t.id AND dr.image_url IS NOT NULL AND dr.image_url != '')
				   OR (dlm.town_id = t.id AND dlm.image_url IS NOT NULL AND dlm.image_url != '')
				ORDER BY COALESCE(dr.created_at, dlm.created_at) DESC
				LIMIT 1
			) banner ON true
		)
		SELECT 
			town_id, town_name, region_name, country_name, country_code,
			total_recs, active_felagis, region_recs, town_recs, banner_url
		FROM dest_stats
		ORDER BY 
			(town_recs * 5 + region_recs * 3 + active_felagis * 2 + total_recs) DESC,
			town_name ASC
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
