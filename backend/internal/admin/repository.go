package admin

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
)

var (
	ErrReportNotFound = errors.New("REPORT_NOT_FOUND")
)

type Repository interface {
	GetCommunityKPIs(ctx context.Context) (*CommunityKPIs, error)
	GetApiLatencyMetrics(ctx context.Context) (*ApiLatencyMetricsResponse, error)
	GetAuditLogs(ctx context.Context, page, pageSize int, search, module string, statusCode *int) (*AuditLogsPaginatedResponse, error)
	ExportAuditLogs(ctx context.Context, search, module string, statusCode *int) ([]AuditLogItem, error)
	GetModerationReports(ctx context.Context) ([]ModerationReportItem, error)
	ResolveReport(ctx context.Context, reportID string, req ResolveReportRequest) error
	SaveAuditLog(ctx context.Context, item *AuditLogItem) error
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetCommunityKPIs(ctx context.Context) (*CommunityKPIs, error) {
	kpis := &CommunityKPIs{
		TopDestinations: make([]TopDestinationKPI, 0),
	}

	// 1. Active & Total Trips
	queryTrips := `
		SELECT 
			COUNT(*) FILTER (WHERE status = 'active' OR (start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE)),
			COUNT(*)
		FROM trips
	`
	if err := r.db.QueryRowContext(ctx, queryTrips).Scan(&kpis.ActiveTripsCount, &kpis.TotalTripsCount); err != nil {
		return nil, fmt.Errorf("error querying trips kpis: %w", err)
	}

	// 2. Matches & Affinity breakdown
	queryMatches := `
		SELECT 
			COUNT(*),
			COUNT(*) FILTER (WHERE LOWER(affinity_level) = 'town'),
			COUNT(*) FILTER (WHERE LOWER(affinity_level) = 'region'),
			COUNT(*) FILTER (WHERE LOWER(affinity_level) = 'country')
		FROM matches
	`
	if err := r.db.QueryRowContext(ctx, queryMatches).Scan(
		&kpis.MatchesCount,
		&kpis.AffinityTownCount,
		&kpis.AffinityRegionCount,
		&kpis.AffinityCountryCount,
	); err != nil {
		return nil, fmt.Errorf("error querying matches kpis: %w", err)
	}

	// 3. Celebration Cards Count
	queryCards := `SELECT COUNT(*) FROM celebration_cards`
	if err := r.db.QueryRowContext(ctx, queryCards).Scan(&kpis.CelebrationCardsCount); err != nil {
		return nil, fmt.Errorf("error querying celebration cards count: %w", err)
	}

	// 4. Recommendations & Useful Votes
	queryTips := `
		SELECT 
			COUNT(*),
			COALESCE(SUM(useful_votes_count), 0)
		FROM destination_recommendations
	`
	if err := r.db.QueryRowContext(ctx, queryTips).Scan(&kpis.CommunityTipsCount, &kpis.TotalUsefulVotes); err != nil {
		return nil, fmt.Errorf("error querying recommendations kpis: %w", err)
	}

	// 5. Top Destinations
	queryDestinations := `
		SELECT 
			ts.destination_name,
			COALESCE(c.name, ts.country_code, 'Global') AS country_name,
			COUNT(DISTINCT t.user_id) AS active_felagis_count
		FROM trip_stages ts
		JOIN trips t ON ts.trip_id = t.id
		LEFT JOIN countries c ON c.code = ts.country_code
		GROUP BY ts.destination_name, c.name, ts.country_code
		ORDER BY active_felagis_count DESC, ts.destination_name ASC
		LIMIT 5
	`
	rows, err := r.db.QueryContext(ctx, queryDestinations)
	if err != nil {
		return nil, fmt.Errorf("error querying top destinations: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var dest TopDestinationKPI
		if err := rows.Scan(&dest.Name, &dest.CountryName, &dest.ActiveFelagisCount); err != nil {
			return nil, fmt.Errorf("error scanning top destination: %w", err)
		}
		kpis.TopDestinations = append(kpis.TopDestinations, dest)
	}

	return kpis, nil
}

func (r *repository) GetApiLatencyMetrics(ctx context.Context) (*ApiLatencyMetricsResponse, error) {
	resp := &ApiLatencyMetricsResponse{
		Endpoints: make([]EndpointLatencyKPI, 0),
	}

	// Global metrics
	queryGlobal := `
		SELECT 
			COALESCE(AVG(duration_ms), 0),
			COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0),
			COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms), 0),
			COUNT(*)
		FROM audit_logs
	`
	if err := r.db.QueryRowContext(ctx, queryGlobal).Scan(
		&resp.AvgLatencyMS,
		&resp.P95LatencyMS,
		&resp.P99LatencyMS,
		&resp.TotalRequests,
	); err != nil {
		return nil, fmt.Errorf("error querying global latency metrics: %w", err)
	}

	// Round global floats
	resp.AvgLatencyMS = math.Round(resp.AvgLatencyMS*100) / 100
	resp.P95LatencyMS = math.Round(resp.P95LatencyMS*100) / 100
	resp.P99LatencyMS = math.Round(resp.P99LatencyMS*100) / 100

	// Per endpoint metrics
	queryEndpoints := `
		SELECT 
			method,
			endpoint,
			COUNT(*) AS requests_count,
			COALESCE(AVG(duration_ms), 0) AS avg_duration_ms,
			COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95_duration_ms,
			COALESCE(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0), 0) AS error_rate
		FROM audit_logs
		GROUP BY method, endpoint
		ORDER BY requests_count DESC, avg_duration_ms DESC
		LIMIT 50
	`
	rows, err := r.db.QueryContext(ctx, queryEndpoints)
	if err != nil {
		return nil, fmt.Errorf("error querying endpoint latency metrics: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var ep EndpointLatencyKPI
		if err := rows.Scan(
			&ep.Method,
			&ep.Path,
			&ep.RequestsCount,
			&ep.AvgDurationMS,
			&ep.P95DurationMS,
			&ep.ErrorRate,
		); err != nil {
			return nil, fmt.Errorf("error scanning endpoint metric: %w", err)
		}
		ep.AvgDurationMS = math.Round(ep.AvgDurationMS*100) / 100
		ep.P95DurationMS = math.Round(ep.P95DurationMS*100) / 100
		ep.ErrorRate = math.Round(ep.ErrorRate*10000) / 10000
		resp.Endpoints = append(resp.Endpoints, ep)
	}

	return resp, nil
}

func buildAuditLogsWhereClause(search, module string, statusCode *int) (string, []interface{}) {
	var conditions []string
	var args []interface{}
	idx := 1

	if strings.TrimSpace(search) != "" {
		searchTerm := "%" + strings.TrimSpace(search) + "%"
		conditions = append(conditions, fmt.Sprintf("(al.action ILIKE $%d OR al.endpoint ILIKE $%d OR al.user_email ILIKE $%d OR u.name ILIKE $%d)", idx, idx, idx, idx))
		args = append(args, searchTerm)
		idx++
	}

	if strings.TrimSpace(module) != "" {
		conditions = append(conditions, fmt.Sprintf("al.module = $%d", idx))
		args = append(args, strings.TrimSpace(module))
		idx++
	}

	if statusCode != nil && *statusCode > 0 {
		conditions = append(conditions, fmt.Sprintf("al.status_code = $%d", idx))
		args = append(args, *statusCode)
		idx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	return whereClause, args
}

func (r *repository) GetAuditLogs(ctx context.Context, page, pageSize int, search, module string, statusCode *int) (*AuditLogsPaginatedResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	whereClause, args := buildAuditLogsWhereClause(search, module, statusCode)

	// Count total
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM audit_logs al
		LEFT JOIN users u ON al.user_id = u.id
		%s
	`, whereClause)

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("error counting audit logs: %w", err)
	}

	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(pageSize)))
	}

	resp := &AuditLogsPaginatedResponse{
		Items:      make([]AuditLogItem, 0),
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}

	if total == 0 {
		return resp, nil
	}

	offset := (page - 1) * pageSize
	argIdx := len(args) + 1

	selectQuery := fmt.Sprintf(`
		SELECT 
			al.id, al.user_id, u.name, al.user_email, al.user_role,
			al.action, al.module, al.endpoint, al.method, al.status_code,
			al.duration_ms, al.ip_address, al.user_agent, al.created_at
		FROM audit_logs al
		LEFT JOIN users u ON al.user_id = u.id
		%s
		ORDER BY al.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	queryArgs := append(args, pageSize, offset)
	rows, err := r.db.QueryContext(ctx, selectQuery, queryArgs...)
	if err != nil {
		return nil, fmt.Errorf("error querying audit logs: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item AuditLogItem
		var uid, uName, uEmail, uRole, ip, ua sql.NullString
		if err := rows.Scan(
			&item.ID,
			&uid,
			&uName,
			&uEmail,
			&uRole,
			&item.Action,
			&item.Module,
			&item.Endpoint,
			&item.Method,
			&item.StatusCode,
			&item.DurationMS,
			&ip,
			&ua,
			&item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("error scanning audit log item: %w", err)
		}
		if uid.Valid {
			item.UserID = &uid.String
		}
		if uName.Valid {
			item.UserName = &uName.String
		}
		if uEmail.Valid {
			item.UserEmail = &uEmail.String
		}
		if uRole.Valid {
			item.UserRole = &uRole.String
		}
		if ip.Valid {
			item.IPAddress = &ip.String
		}
		if ua.Valid {
			item.UserAgent = &ua.String
		}
		resp.Items = append(resp.Items, item)
	}

	return resp, nil
}

func (r *repository) ExportAuditLogs(ctx context.Context, search, module string, statusCode *int) ([]AuditLogItem, error) {
	whereClause, args := buildAuditLogsWhereClause(search, module, statusCode)

	selectQuery := fmt.Sprintf(`
		SELECT 
			al.id, al.user_id, u.name, al.user_email, al.user_role,
			al.action, al.module, al.endpoint, al.method, al.status_code,
			al.duration_ms, al.ip_address, al.user_agent, al.created_at
		FROM audit_logs al
		LEFT JOIN users u ON al.user_id = u.id
		%s
		ORDER BY al.created_at DESC
		LIMIT 10000
	`, whereClause)

	rows, err := r.db.QueryContext(ctx, selectQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("error querying audit logs for export: %w", err)
	}
	defer rows.Close()

	items := make([]AuditLogItem, 0)
	for rows.Next() {
		var item AuditLogItem
		var uid, uName, uEmail, uRole, ip, ua sql.NullString
		if err := rows.Scan(
			&item.ID,
			&uid,
			&uName,
			&uEmail,
			&uRole,
			&item.Action,
			&item.Module,
			&item.Endpoint,
			&item.Method,
			&item.StatusCode,
			&item.DurationMS,
			&ip,
			&ua,
			&item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("error scanning exported audit log: %w", err)
		}
		if uid.Valid {
			item.UserID = &uid.String
		}
		if uName.Valid {
			item.UserName = &uName.String
		}
		if uEmail.Valid {
			item.UserEmail = &uEmail.String
		}
		if uRole.Valid {
			item.UserRole = &uRole.String
		}
		if ip.Valid {
			item.IPAddress = &ip.String
		}
		if ua.Valid {
			item.UserAgent = &ua.String
		}
		items = append(items, item)
	}

	return items, nil
}

func (r *repository) GetModerationReports(ctx context.Context) ([]ModerationReportItem, error) {
	query := `
		SELECT 
			ur.id,
			'user' AS type,
			ur.reporter_id,
			COALESCE(u_rep.name, 'Unknown') AS reporter_name,
			ur.reported_id AS target_id,
			COALESCE(u_tgt.name, 'User') AS target_title,
			ur.reason,
			ur.details,
			ur.status,
			ur.created_at
		FROM user_reports ur
		LEFT JOIN users u_rep ON ur.reporter_id = u_rep.id
		LEFT JOIN users u_tgt ON ur.reported_id = u_tgt.id
		WHERE ur.status = 'pending'

		UNION ALL

		SELECT 
			cr.id,
			'recommendation' AS type,
			cr.reporter_id,
			COALESCE(u_rep.name, 'Unknown') AS reporter_name,
			cr.target_id,
			COALESCE(dr.title, 'Recommendation') AS target_title,
			cr.reason,
			cr.details,
			cr.status,
			cr.created_at
		FROM community_reports cr
		LEFT JOIN users u_rep ON cr.reporter_id = u_rep.id
		LEFT JOIN destination_recommendations dr ON cr.target_id = dr.id
		WHERE cr.status = 'pending'

		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("error querying moderation reports: %w", err)
	}
	defer rows.Close()

	items := make([]ModerationReportItem, 0)
	for rows.Next() {
		var item ModerationReportItem
		var details sql.NullString
		if err := rows.Scan(
			&item.ID,
			&item.Type,
			&item.ReporterID,
			&item.ReporterName,
			&item.TargetID,
			&item.TargetTitle,
			&item.Reason,
			&details,
			&item.Status,
			&item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("error scanning moderation report: %w", err)
		}
		if details.Valid {
			item.Details = &details.String
		}
		items = append(items, item)
	}

	return items, nil
}

func (r *repository) ResolveReport(ctx context.Context, reportID string, req ResolveReportRequest) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("error beginning tx: %w", err)
	}
	defer tx.Rollback()

	// 1. Check user_reports
	var userReportID, reportedUserID string
	err = tx.QueryRowContext(ctx, "SELECT id, reported_id FROM user_reports WHERE id = $1", reportID).Scan(&userReportID, &reportedUserID)
	if err == nil {
		// Update user report status
		if _, err := tx.ExecContext(ctx, "UPDATE user_reports SET status = 'resolved' WHERE id = $1", reportID); err != nil {
			return fmt.Errorf("error updating user report status: %w", err)
		}

		if req.Action == "ban_user" {
			// Update role to banned
			if _, err := tx.ExecContext(ctx, "UPDATE users SET role = 'banned' WHERE id = $1", reportedUserID); err != nil {
				return fmt.Errorf("error banning reported user: %w", err)
			}
		}

		return tx.Commit()
	}

	// 2. Check community_reports
	var commReportID, targetID, targetType string
	err = tx.QueryRowContext(ctx, "SELECT id, target_id, target_type FROM community_reports WHERE id = $1", reportID).Scan(&commReportID, &targetID, &targetType)
	if err == nil {
		if _, err := tx.ExecContext(ctx, "UPDATE community_reports SET status = 'resolved' WHERE id = $1", reportID); err != nil {
			return fmt.Errorf("error updating community report status: %w", err)
		}

		if req.Action == "delete_content" {
			if targetType == "recommendation" || targetType == "destination_recommendation" {
				if _, err := tx.ExecContext(ctx, "DELETE FROM destination_recommendations WHERE id = $1", targetID); err != nil {
					return fmt.Errorf("error deleting recommendation content: %w", err)
				}
			}
		} else if req.Action == "ban_user" {
			// Find author of recommendation
			var authorID string
			if err := tx.QueryRowContext(ctx, "SELECT user_id FROM destination_recommendations WHERE id = $1", targetID).Scan(&authorID); err == nil {
				if _, err := tx.ExecContext(ctx, "UPDATE users SET role = 'banned' WHERE id = $1", authorID); err != nil {
					return fmt.Errorf("error banning content author: %w", err)
				}
			}
		}

		return tx.Commit()
	}

	return ErrReportNotFound
}

func (r *repository) SaveAuditLog(ctx context.Context, item *AuditLogItem) error {
	query := `
		INSERT INTO audit_logs (
			id, user_id, user_email, user_role, action, module,
			endpoint, method, status_code, duration_ms, ip_address, user_agent, created_at
		) VALUES (
			COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()), $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11, $12, COALESCE($13, NOW())
		)
	`
	_, err := r.db.ExecContext(ctx, query,
		item.ID, item.UserID, item.UserEmail, item.UserRole, item.Action, item.Module,
		item.Endpoint, item.Method, item.StatusCode, item.DurationMS, item.IPAddress, item.UserAgent, item.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("error saving audit log: %w", err)
	}
	return nil
}
