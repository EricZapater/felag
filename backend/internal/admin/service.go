package admin

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
	"math"
	"runtime"
	"strconv"
	"time"
)

type WebSocketStatsProvider interface {
	GetTotalConnectionsCount() int
}

type Service interface {
	GetSummary(ctx context.Context) (*AdminMetricsSummaryResponse, error)
	GetApiLatencyMetrics(ctx context.Context) (*ApiLatencyMetricsResponse, error)
	GetAuditLogs(ctx context.Context, page, pageSize int, search, module string, statusCode *int) (*AuditLogsPaginatedResponse, error)
	ExportAuditLogsCSV(ctx context.Context, search, module string, statusCode *int) ([]byte, error)
	GetModerationReports(ctx context.Context) ([]ModerationReportItem, error)
	ResolveReport(ctx context.Context, reportID string, req ResolveReportRequest) error
}

type service struct {
	repo       Repository
	db         *sql.DB
	wsProvider WebSocketStatsProvider
	startTime  time.Time
}

func NewService(repo Repository, db *sql.DB, wsProvider WebSocketStatsProvider, startTime time.Time) Service {
	if startTime.IsZero() {
		startTime = time.Now()
	}
	return &service{
		repo:       repo,
		db:         db,
		wsProvider: wsProvider,
		startTime:  startTime,
	}
}

func (s *service) GetSummary(ctx context.Context) (*AdminMetricsSummaryResponse, error) {
	communityKPIs, err := s.repo.GetCommunityKPIs(ctx)
	if err != nil {
		return nil, fmt.Errorf("error fetching community KPIs: %w", err)
	}

	// Runtime and System telemetry
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	memAllocMB := float64(memStats.Alloc) / (1024 * 1024)
	memAllocMB = math.Round(memAllocMB*100) / 100

	numGoroutines := runtime.NumGoroutine()
	uptimeSeconds := int64(time.Since(s.startTime).Seconds())

	openConns := 0
	inUseConns := 0
	if s.db != nil {
		dbStats := s.db.Stats()
		openConns = dbStats.OpenConnections
		inUseConns = dbStats.InUse
	}

	activeWebsockets := 0
	if s.wsProvider != nil {
		activeWebsockets = s.wsProvider.GetTotalConnectionsCount()
	}

	systemHealth := SystemHealth{
		UptimeSeconds:      uptimeSeconds,
		MemoryAllocMB:      memAllocMB,
		NumGoroutines:      numGoroutines,
		DBOpenConnections:  openConns,
		DBInUseConnections: inUseConns,
		ActiveWebsockets:   activeWebsockets,
	}

	return &AdminMetricsSummaryResponse{
		Community: *communityKPIs,
		System:    systemHealth,
	}, nil
}

func (s *service) GetApiLatencyMetrics(ctx context.Context) (*ApiLatencyMetricsResponse, error) {
	return s.repo.GetApiLatencyMetrics(ctx)
}

func (s *service) GetAuditLogs(ctx context.Context, page, pageSize int, search, module string, statusCode *int) (*AuditLogsPaginatedResponse, error) {
	return s.repo.GetAuditLogs(ctx, page, pageSize, search, module, statusCode)
}

func (s *service) ExportAuditLogsCSV(ctx context.Context, search, module string, statusCode *int) ([]byte, error) {
	items, err := s.repo.ExportAuditLogs(ctx, search, module, statusCode)
	if err != nil {
		return nil, fmt.Errorf("error fetching audit logs for export: %w", err)
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Write CSV header
	headers := []string{
		"id", "user_id", "user_name", "user_email", "user_role",
		"action", "module", "endpoint", "method", "status_code",
		"duration_ms", "ip_address", "user_agent", "created_at",
	}
	if err := writer.Write(headers); err != nil {
		return nil, fmt.Errorf("error writing csv header: %w", err)
	}

	for _, item := range items {
		uid := ""
		if item.UserID != nil {
			uid = *item.UserID
		}
		uname := ""
		if item.UserName != nil {
			uname = *item.UserName
		}
		uemail := ""
		if item.UserEmail != nil {
			uemail = *item.UserEmail
		}
		urole := ""
		if item.UserRole != nil {
			urole = *item.UserRole
		}
		ip := ""
		if item.IPAddress != nil {
			ip = *item.IPAddress
		}
		ua := ""
		if item.UserAgent != nil {
			ua = *item.UserAgent
		}

		record := []string{
			item.ID,
			uid,
			uname,
			uemail,
			urole,
			item.Action,
			item.Module,
			item.Endpoint,
			item.Method,
			strconv.Itoa(item.StatusCode),
			strconv.Itoa(item.DurationMS),
			ip,
			ua,
			item.CreatedAt.Format(time.RFC3339),
		}

		if err := writer.Write(record); err != nil {
			return nil, fmt.Errorf("error writing csv record: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("error flushing csv buffer: %w", err)
	}

	return buf.Bytes(), nil
}

func (s *service) GetModerationReports(ctx context.Context) ([]ModerationReportItem, error) {
	return s.repo.GetModerationReports(ctx)
}

func (s *service) ResolveReport(ctx context.Context, reportID string, req ResolveReportRequest) error {
	return s.repo.ResolveReport(ctx, reportID, req)
}
