package publicseo

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"strings"
)

type Repository interface {
	ListPublicDestinations(ctx context.Context, q, countryCode, sort string, page, limit int, minTips int) (*PublicDestinationsResponse, error)
	GetPublicDestinationBySlugOrID(ctx context.Context, slugOrID string) (*PublicDestinationItem, bool, string, string, error) // item, isTown, townID, countryCode, error
	GetPublicRecommendationsForDestination(ctx context.Context, isTown bool, townID, countryCode string) ([]PublicAnonymousTip, error)
	GetRelatedDestinations(ctx context.Context, countryCode, currentID string, limit int) ([]PublicDestinationItem, error)
	GetPublicSitemapEntries(ctx context.Context) ([]SitemapEntry, error)
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) ListPublicDestinations(ctx context.Context, q, countryCode, sort string, page, limit int, minTips int) (*PublicDestinationsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	whereClauses := []string{"1=1"}
	args := []interface{}{}
	argIdx := 1

	if strings.TrimSpace(q) != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(pr.name ILIKE $%d OR pr.country_name ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+strings.TrimSpace(q)+"%")
		argIdx++
	}

	if strings.TrimSpace(countryCode) != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("pr.country_code = $%d", argIdx))
		args = append(args, strings.ToUpper(strings.TrimSpace(countryCode)))
		argIdx++
	}

	if minTips < 1 {
		minTips = 1
	}
	whereClauses = append(whereClauses, fmt.Sprintf("pr.total_tips_count >= %d", minTips))

	whereSQL := strings.Join(whereClauses, " AND ")

	// 1. Unified CTE for both Town and Country level public destinations
	baseCTE := `
		WITH public_recs AS (
			-- Town-level destinations
			SELECT t.id::text AS id,
			       COALESCE(t.slug, LOWER(REGEXP_REPLACE(t.name, '[^a-zA-Z0-9]+', '-', 'g'))) AS slug,
			       t.name AS name,
			       reg.name AS region_name,
			       c.name AS country_name,
			       c.code AS country_code,
			       COUNT(dr.id) AS total_tips_count,
			       COUNT(DISTINCT dr.user_id) AS rec_felagis_count,
			       MAX(dr.created_at) AS last_tip_at,
			       'town' AS dest_type,
			       t.id AS town_id
			FROM destination_recommendations dr
			JOIN towns t ON dr.town_id = t.id
			JOIN regions reg ON t.region_id = reg.id
			JOIN countries c ON reg.country_id = c.id
			WHERE dr.is_public = true AND dr.town_id IS NOT NULL
			GROUP BY t.id, t.slug, t.name, reg.name, c.name, c.code

			UNION ALL

			-- Country-level destinations
			SELECT c.code AS id,
			       COALESCE(c.slug, LOWER(REGEXP_REPLACE(c.name, '[^a-zA-Z0-9]+', '-', 'g'))) AS slug,
			       c.name AS name,
			       NULL::text AS region_name,
			       c.name AS country_name,
			       c.code AS country_code,
			       COUNT(dr.id) AS total_tips_count,
			       COUNT(DISTINCT dr.user_id) AS rec_felagis_count,
			       MAX(dr.created_at) AS last_tip_at,
			       'country' AS dest_type,
			       NULL::uuid AS town_id
			FROM destination_recommendations dr
			JOIN countries c ON dr.country_code = c.code
			WHERE dr.is_public = true AND dr.town_id IS NULL
			GROUP BY c.code, c.slug, c.name
		)
	`

	countQuery := fmt.Sprintf(`
		%s
		SELECT COUNT(*)
		FROM public_recs pr
		WHERE %s
	`, baseCTE, whereSQL)

	var totalItems int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, fmt.Errorf("error counting public destinations: %w", err)
	}

	if totalItems == 0 {
		return &PublicDestinationsResponse{
			Data: []PublicDestinationItem{},
			Pagination: PaginationMeta{
				Page:       page,
				Limit:      limit,
				TotalItems: 0,
				TotalPages: 1,
			},
		}, nil
	}

	orderBy := "total_felagis_count DESC, total_tips_count DESC, fd.name ASC"
	switch sort {
	case "tips_count":
		orderBy = "total_tips_count DESC, total_felagis_count DESC, fd.name ASC"
	case "name":
		orderBy = "fd.name ASC"
	}

	query := fmt.Sprintf(`
		%s,
		filtered_destinations AS (
			SELECT pr.*
			FROM public_recs pr
			WHERE %s
		),
		trip_town_felagis AS (
			SELECT ts.town_id, COUNT(DISTINCT tr.user_id) AS trip_users_count
			FROM trip_stages ts
			JOIN trips tr ON ts.trip_id = tr.id
			WHERE ts.town_id IN (SELECT town_id FROM filtered_destinations WHERE town_id IS NOT NULL)
			GROUP BY ts.town_id
		),
		trip_country_felagis AS (
			SELECT ts.country_code, COUNT(DISTINCT tr.user_id) AS trip_users_count
			FROM trip_stages ts
			JOIN trips tr ON ts.trip_id = tr.id
			WHERE ts.country_code IN (SELECT country_code FROM filtered_destinations WHERE dest_type = 'country')
			GROUP BY ts.country_code
		)
		SELECT fd.id,
		       fd.slug,
		       fd.name,
		       fd.region_name,
		       fd.country_name,
		       fd.country_code,
		       fd.total_tips_count,
		       COALESCE(
		           CASE 
		               WHEN fd.dest_type = 'town' THEN ttf.trip_users_count
		               ELSE tcf.trip_users_count
		           END, 0
		       ) + fd.rec_felagis_count AS total_felagis_count,
		       COALESCE(TO_CHAR(fd.last_tip_at, 'YYYY-MM'), TO_CHAR(CURRENT_DATE, 'YYYY-MM')) AS updated_at_period
		FROM filtered_destinations fd
		LEFT JOIN trip_town_felagis ttf ON ttf.town_id = fd.town_id
		LEFT JOIN trip_country_felagis tcf ON tcf.country_code = fd.country_code AND fd.dest_type = 'country'
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, baseCTE, whereSQL, orderBy, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("error querying public destinations: %w", err)
	}
	defer rows.Close()

	var items []PublicDestinationItem
	for rows.Next() {
		var item PublicDestinationItem
		var regName sql.NullString

		if err := rows.Scan(
			&item.ID,
			&item.Slug,
			&item.Name,
			&regName,
			&item.CountryName,
			&item.CountryCode,
			&item.TotalTipsCount,
			&item.TotalFelagisCount,
			&item.UpdatedAtPeriod,
		); err != nil {
			return nil, fmt.Errorf("error scanning public destination: %w", err)
		}

		if regName.Valid {
			item.RegionName = &regName.String
		}
		flag := countryCodeToEmoji(item.CountryCode)
		item.FlagEmoji = &flag

		if item.TotalFelagisCount <= 1 {
			item.EndorsementSummary = "Avalat per 1 felagi"
		} else {
			item.EndorsementSummary = fmt.Sprintf("Avalat per %d felagis", item.TotalFelagisCount)
		}

		items = append(items, item)
	}

	totalPages := int(math.Ceil(float64(totalItems) / float64(limit)))
	if totalPages < 1 {
		totalPages = 1
	}

	if items == nil {
		items = []PublicDestinationItem{}
	}

	return &PublicDestinationsResponse{
		Data: items,
		Pagination: PaginationMeta{
			Page:       page,
			Limit:      limit,
			TotalItems: totalItems,
			TotalPages: totalPages,
		},
	}, nil
}

func (r *repository) GetPublicDestinationBySlugOrID(ctx context.Context, slugOrID string) (*PublicDestinationItem, bool, string, string, error) {
	trimmed := strings.TrimSpace(slugOrID)

	// 1. Ultra-fast town lookup
	townQuery := `
		SELECT t.id,
		       COALESCE(t.slug, LOWER(REGEXP_REPLACE(t.name, '[^a-zA-Z0-9]+', '-', 'g'))) AS slug,
		       t.name,
		       reg.name AS region_name,
		       c.name AS country_name,
		       c.code AS country_code
		FROM towns t
		JOIN regions reg ON t.region_id = reg.id
		JOIN countries c ON reg.country_id = c.id
		WHERE t.slug = $1 OR LOWER(t.slug) = LOWER($1) OR LOWER(t.name) = LOWER($1) OR t.id::text = $1
		LIMIT 1
	`

	var item PublicDestinationItem
	var regName sql.NullString
	err := r.db.QueryRowContext(ctx, townQuery, trimmed).Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&regName,
		&item.CountryName,
		&item.CountryCode,
	)
	if err == nil {
		if regName.Valid {
			item.RegionName = &regName.String
		}
		flag := countryCodeToEmoji(item.CountryCode)
		item.FlagEmoji = &flag

		// Targeted aggregates on single town ID
		var tipsCount, recFelagis int
		var maxCreatedAt sql.NullString
		_ = r.db.QueryRowContext(ctx, `
			SELECT COUNT(id), COUNT(DISTINCT user_id), TO_CHAR(MAX(created_at), 'YYYY-MM')
			FROM destination_recommendations
			WHERE town_id = $1 AND is_public = true
		`, item.ID).Scan(&tipsCount, &recFelagis, &maxCreatedAt)

		var tripFelagis int
		_ = r.db.QueryRowContext(ctx, `
			SELECT COUNT(DISTINCT tr.user_id)
			FROM trip_stages ts
			JOIN trips tr ON ts.trip_id = tr.id
			WHERE ts.town_id = $1
		`, item.ID).Scan(&tripFelagis)

		item.TotalTipsCount = tipsCount
		item.TotalFelagisCount = tripFelagis + recFelagis
		if maxCreatedAt.Valid && maxCreatedAt.String != "" {
			item.UpdatedAtPeriod = maxCreatedAt.String
		} else {
			item.UpdatedAtPeriod = "2026-09"
		}

		if item.TotalFelagisCount <= 1 {
			item.EndorsementSummary = "Avalat per 1 felagi"
		} else {
			item.EndorsementSummary = fmt.Sprintf("Avalat per %d felagis", item.TotalFelagisCount)
		}
		return &item, true, item.ID, item.CountryCode, nil
	}

	// 2. Try matching country (by slug, code, name, or localized alias)
	countryQuery := `
		SELECT c.id::text,
		       COALESCE(c.slug, LOWER(REGEXP_REPLACE(c.name, '[^a-zA-Z0-9]+', '-', 'g'))) AS slug,
		       c.name,
		       c.name AS country_name,
		       c.code AS country_code
		FROM countries c
		WHERE c.slug = $1 
		   OR LOWER(c.slug) = LOWER($1) 
		   OR c.code = $1 
		   OR UPPER(c.code) = UPPER($1) 
		   OR LOWER(c.name) = LOWER($1)
		   OR ($1 ILIKE 'marroc%' AND c.code = 'MA')
		   OR ($1 ILIKE 'espany%' AND c.code = 'ES')
		   OR ($1 ILIKE 'jap%' AND c.code = 'JP')
		   OR ($1 ILIKE 'fran%' AND c.code = 'FR')
		   OR ($1 ILIKE 'ital%' AND c.code = 'IT')
		   OR ($1 ILIKE 'island%' AND c.code = 'IS')
		LIMIT 1
	`

	err = r.db.QueryRowContext(ctx, countryQuery, trimmed).Scan(
		&item.ID,
		&item.Slug,
		&item.Name,
		&item.CountryName,
		&item.CountryCode,
	)
	if err == nil {
		flag := countryCodeToEmoji(item.CountryCode)
		item.FlagEmoji = &flag

		var tipsCount, recFelagis int
		var maxCreatedAt sql.NullString
		_ = r.db.QueryRowContext(ctx, `
			SELECT COUNT(id), COUNT(DISTINCT user_id), TO_CHAR(MAX(created_at), 'YYYY-MM')
			FROM destination_recommendations
			WHERE (country_code = $1 OR town_id IN (
				SELECT t.id FROM towns t JOIN regions r ON t.region_id = r.id JOIN countries c ON r.country_id = c.id WHERE c.code = $1
			)) AND is_public = true
		`, item.CountryCode).Scan(&tipsCount, &recFelagis, &maxCreatedAt)

		var tripFelagis int
		_ = r.db.QueryRowContext(ctx, `
			SELECT COUNT(DISTINCT tr.user_id)
			FROM trip_stages ts
			JOIN trips tr ON ts.trip_id = tr.id
			WHERE ts.country_code = $1 OR ts.destination_name ILIKE $2
		`, item.CountryCode, "%"+item.Name+"%").Scan(&tripFelagis)

		item.TotalTipsCount = tipsCount
		item.TotalFelagisCount = tripFelagis + recFelagis
		if maxCreatedAt.Valid && maxCreatedAt.String != "" {
			item.UpdatedAtPeriod = maxCreatedAt.String
		} else {
			item.UpdatedAtPeriod = "2026-09"
		}

		if item.TotalFelagisCount <= 1 {
			item.EndorsementSummary = "Avalat per 1 felagi"
		} else {
			item.EndorsementSummary = fmt.Sprintf("Avalat per %d felagis", item.TotalFelagisCount)
		}
		return &item, false, "", item.CountryCode, nil
	}

	return nil, false, "", "", sql.ErrNoRows
}

func (r *repository) GetPublicRecommendationsForDestination(ctx context.Context, isTown bool, townID, countryCode string) ([]PublicAnonymousTip, error) {
	var query string
	var args []interface{}

	if isTown {
		query = `
			SELECT dr.id::text, dr.title, dr.description, dr.category, dr.location_name, dr.image_url,
			       COALESCE(dr.useful_votes_count, 0) + 1 AS endorsements_count,
			       TO_CHAR(dr.created_at, 'YYYY-MM') AS period
			FROM destination_recommendations dr
			WHERE dr.town_id = $1 AND dr.is_public = true
			ORDER BY dr.useful_votes_count DESC, dr.created_at DESC
		`
		args = []interface{}{townID}
	} else {
		query = `
			SELECT dr.id::text, dr.title, dr.description, dr.category, dr.location_name, dr.image_url,
			       COALESCE(dr.useful_votes_count, 0) + 1 AS endorsements_count,
			       TO_CHAR(dr.created_at, 'YYYY-MM') AS period
			FROM destination_recommendations dr
			WHERE (dr.country_code = $1 OR dr.town_id IN (
				SELECT t.id FROM towns t JOIN regions r ON t.region_id = r.id JOIN countries c ON r.country_id = c.id WHERE c.code = $1
			)) AND dr.is_public = true
			ORDER BY dr.useful_votes_count DESC, dr.created_at DESC
		`
		args = []interface{}{countryCode}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("error querying public recommendations: %w", err)
	}
	defer rows.Close()

	var tips []PublicAnonymousTip
	for rows.Next() {
		var tip PublicAnonymousTip
		var locName, imgURL sql.NullString

		if err := rows.Scan(
			&tip.ID,
			&tip.Title,
			&tip.Description,
			&tip.Category,
			&locName,
			&imgURL,
			&tip.EndorsementsCount,
			&tip.Period,
		); err != nil {
			return nil, fmt.Errorf("error scanning public tip: %w", err)
		}

		if locName.Valid && strings.TrimSpace(locName.String) != "" {
			tip.LocationHint = &locName.String
		}
		if imgURL.Valid && strings.TrimSpace(imgURL.String) != "" {
			tip.PhotoURL = &imgURL.String
		}

		if tip.EndorsementsCount <= 1 {
			tip.EndorsementLabel = "1 felagi ho avala"
		} else {
			tip.EndorsementLabel = fmt.Sprintf("%d felagis ho avalen", tip.EndorsementsCount)
		}

		tips = append(tips, tip)
	}

	if tips == nil {
		tips = []PublicAnonymousTip{}
	}

	return tips, nil
}

func (r *repository) GetRelatedDestinations(ctx context.Context, countryCode, currentID string, limit int) ([]PublicDestinationItem, error) {
	query := `
		WITH public_tips AS (
			SELECT dr.town_id,
			       COUNT(dr.id) AS tips_count,
			       COUNT(DISTINCT dr.user_id) AS rec_felagis_count,
			       MAX(dr.created_at) AS last_tip_at
			FROM destination_recommendations dr
			WHERE dr.is_public = true AND dr.town_id IS NOT NULL AND dr.town_id::text != $2
			GROUP BY dr.town_id
		),
		filtered_towns AS (
			SELECT pt.town_id,
			       pt.tips_count,
			       pt.rec_felagis_count,
			       pt.last_tip_at,
			       t.name AS town_name,
			       t.slug AS town_slug,
			       reg.name AS region_name,
			       c.name AS country_name,
			       c.code AS country_code
			FROM public_tips pt
			JOIN towns t ON pt.town_id = t.id
			JOIN regions reg ON t.region_id = reg.id
			JOIN countries c ON reg.country_id = c.id
			WHERE c.code = $1
		)
		SELECT ft.town_id,
		       COALESCE(ft.town_slug, LOWER(REGEXP_REPLACE(ft.town_name, '[^a-zA-Z0-9]+', '-', 'g'))) AS slug,
		       ft.town_name,
		       ft.region_name,
		       ft.country_name,
		       ft.country_code,
		       ft.tips_count AS total_tips_count,
		       ft.rec_felagis_count AS total_felagis_count,
		       COALESCE(TO_CHAR(ft.last_tip_at, 'YYYY-MM'), TO_CHAR(CURRENT_DATE, 'YYYY-MM')) AS updated_at_period
		FROM filtered_towns ft
		ORDER BY total_tips_count DESC, total_felagis_count DESC
		LIMIT $3
	`

	rows, err := r.db.QueryContext(ctx, query, countryCode, currentID, limit)
	if err != nil {
		return nil, fmt.Errorf("error querying related destinations: %w", err)
	}
	defer rows.Close()

	var items []PublicDestinationItem
	for rows.Next() {
		var item PublicDestinationItem
		var regName sql.NullString

		if err := rows.Scan(
			&item.ID,
			&item.Slug,
			&item.Name,
			&regName,
			&item.CountryName,
			&item.CountryCode,
			&item.TotalTipsCount,
			&item.TotalFelagisCount,
			&item.UpdatedAtPeriod,
		); err != nil {
			return nil, fmt.Errorf("error scanning related destination: %w", err)
		}

		if regName.Valid {
			item.RegionName = &regName.String
		}
		flag := countryCodeToEmoji(item.CountryCode)
		item.FlagEmoji = &flag
		if item.TotalFelagisCount <= 1 {
			item.EndorsementSummary = "Avalat per 1 felagi"
		} else {
			item.EndorsementSummary = fmt.Sprintf("Avalat per %d felagis", item.TotalFelagisCount)
		}

		items = append(items, item)
	}

	if items == nil {
		items = []PublicDestinationItem{}
	}

	return items, nil
}

func (r *repository) GetPublicSitemapEntries(ctx context.Context) ([]SitemapEntry, error) {
	query := `
		WITH all_slugs AS (
			-- Towns
			SELECT COALESCE(t.slug, LOWER(REGEXP_REPLACE(t.name, '[^a-zA-Z0-9]+', '-', 'g'))) AS slug,
			       COALESCE(TO_CHAR(MAX(dr.created_at), 'YYYY-MM'), TO_CHAR(CURRENT_DATE, 'YYYY-MM')) AS lastmod_period,
			       COUNT(dr.id) AS tips_count
			FROM destination_recommendations dr
			JOIN towns t ON dr.town_id = t.id
			WHERE dr.is_public = true AND dr.town_id IS NOT NULL
			GROUP BY t.id, t.name, t.slug

			UNION ALL

			-- Countries
			SELECT COALESCE(c.slug, LOWER(REGEXP_REPLACE(c.name, '[^a-zA-Z0-9]+', '-', 'g'))) AS slug,
			       COALESCE(TO_CHAR(MAX(dr.created_at), 'YYYY-MM'), TO_CHAR(CURRENT_DATE, 'YYYY-MM')) AS lastmod_period,
			       COUNT(dr.id) AS tips_count
			FROM destination_recommendations dr
			JOIN countries c ON dr.country_code = c.code
			WHERE dr.is_public = true AND dr.town_id IS NULL
			GROUP BY c.code, c.name, c.slug
		)
		SELECT slug, lastmod_period, tips_count
		FROM all_slugs
		ORDER BY tips_count DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("error querying sitemap entries: %w", err)
	}
	defer rows.Close()

	var entries []SitemapEntry
	for rows.Next() {
		var slug, lastmod string
		var tipsCount int

		if err := rows.Scan(&slug, &lastmod, &tipsCount); err != nil {
			return nil, fmt.Errorf("error scanning sitemap row: %w", err)
		}

		priority := 0.7
		if tipsCount >= 5 {
			priority = 0.9
		} else if tipsCount >= 2 {
			priority = 0.8
		}

		entries = append(entries, SitemapEntry{
			Loc:           fmt.Sprintf("https://felag.app/destinacions/%s", slug),
			LastmodPeriod: lastmod,
			Changefreq:    "weekly",
			Priority:      priority,
		})
	}

	if entries == nil {
		entries = []SitemapEntry{}
	}

	return entries, nil
}

func countryCodeToEmoji(code string) string {
	if len(code) != 2 {
		return "🌍"
	}
	code = strings.ToUpper(code)
	r1 := rune(code[0]) - 'A' + 0x1F1E6
	r2 := rune(code[1]) - 'A' + 0x1F1E6
	return string([]rune{r1, r2})
}
