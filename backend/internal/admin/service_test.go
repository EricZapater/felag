package admin

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

type mockRepository struct {
	getCommunityKPIsFunc     func(ctx context.Context) (*CommunityKPIs, error)
	getApiLatencyMetricsFunc func(ctx context.Context) (*ApiLatencyMetricsResponse, error)
	getAuditLogsFunc         func(ctx context.Context, page, pageSize int, search, module string, statusCode *int) (*AuditLogsPaginatedResponse, error)
	exportAuditLogsFunc      func(ctx context.Context, search, module string, statusCode *int) ([]AuditLogItem, error)
	getModerationReportsFunc func(ctx context.Context) ([]ModerationReportItem, error)
	resolveReportFunc        func(ctx context.Context, reportID string, req ResolveReportRequest) error
	saveAuditLogFunc         func(ctx context.Context, item *AuditLogItem) error
}

func (m *mockRepository) GetCommunityKPIs(ctx context.Context) (*CommunityKPIs, error) {
	if m.getCommunityKPIsFunc != nil {
		return m.getCommunityKPIsFunc(ctx)
	}
	return &CommunityKPIs{}, nil
}

func (m *mockRepository) GetApiLatencyMetrics(ctx context.Context) (*ApiLatencyMetricsResponse, error) {
	if m.getApiLatencyMetricsFunc != nil {
		return m.getApiLatencyMetricsFunc(ctx)
	}
	return &ApiLatencyMetricsResponse{}, nil
}

func (m *mockRepository) GetAuditLogs(ctx context.Context, page, pageSize int, search, module string, statusCode *int) (*AuditLogsPaginatedResponse, error) {
	if m.getAuditLogsFunc != nil {
		return m.getAuditLogsFunc(ctx, page, pageSize, search, module, statusCode)
	}
	return &AuditLogsPaginatedResponse{}, nil
}

func (m *mockRepository) ExportAuditLogs(ctx context.Context, search, module string, statusCode *int) ([]AuditLogItem, error) {
	if m.exportAuditLogsFunc != nil {
		return m.exportAuditLogsFunc(ctx, search, module, statusCode)
	}
	return []AuditLogItem{}, nil
}

func (m *mockRepository) GetModerationReports(ctx context.Context) ([]ModerationReportItem, error) {
	if m.getModerationReportsFunc != nil {
		return m.getModerationReportsFunc(ctx)
	}
	return []ModerationReportItem{}, nil
}

func (m *mockRepository) ResolveReport(ctx context.Context, reportID string, req ResolveReportRequest) error {
	if m.resolveReportFunc != nil {
		return m.resolveReportFunc(ctx, reportID, req)
	}
	return nil
}

func (m *mockRepository) SaveAuditLog(ctx context.Context, item *AuditLogItem) error {
	if m.saveAuditLogFunc != nil {
		return m.saveAuditLogFunc(ctx, item)
	}
	return nil
}

type mockWSProvider struct {
	connectionsCount int
}

func (m *mockWSProvider) GetTotalConnectionsCount() int {
	return m.connectionsCount
}

func TestService_GetSummary(t *testing.T) {
	ctx := context.Background()
	startTime := time.Now().Add(-10 * time.Minute)

	repo := &mockRepository{
		getCommunityKPIsFunc: func(ctx context.Context) (*CommunityKPIs, error) {
			return &CommunityKPIs{
				ActiveTripsCount:      12,
				TotalTripsCount:       45,
				MatchesCount:          20,
				AffinityTownCount:     5,
				AffinityRegionCount:   10,
				AffinityCountryCount:  5,
				CelebrationCardsCount: 8,
				CommunityTipsCount:    15,
				TotalUsefulVotes:      32,
				TopDestinations: []TopDestinationKPI{
					{Name: "Tokyo", CountryName: "Japan", ActiveFelagisCount: 6},
				},
			}, nil
		},
	}

	wsProvider := &mockWSProvider{connectionsCount: 4}
	svc := NewService(repo, nil, wsProvider, startTime)

	summary, err := svc.GetSummary(ctx)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if summary.Community.ActiveTripsCount != 12 {
		t.Errorf("expected 12 active trips, got %d", summary.Community.ActiveTripsCount)
	}
	if summary.System.ActiveWebsockets != 4 {
		t.Errorf("expected 4 active websockets, got %d", summary.System.ActiveWebsockets)
	}
	if summary.System.UptimeSeconds < 590 {
		t.Errorf("expected uptime >= 590s, got %d", summary.System.UptimeSeconds)
	}
	if summary.System.NumGoroutines <= 0 {
		t.Errorf("expected positive num goroutines, got %d", summary.System.NumGoroutines)
	}
}

func TestService_GetSummary_Error(t *testing.T) {
	ctx := context.Background()
	repo := &mockRepository{
		getCommunityKPIsFunc: func(ctx context.Context) (*CommunityKPIs, error) {
			return nil, errors.New("db connection failed")
		},
	}

	svc := NewService(repo, nil, nil, time.Now())
	_, err := svc.GetSummary(ctx)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestService_GetApiLatencyMetrics(t *testing.T) {
	ctx := context.Background()
	repo := &mockRepository{
		getApiLatencyMetricsFunc: func(ctx context.Context) (*ApiLatencyMetricsResponse, error) {
			return &ApiLatencyMetricsResponse{
				AvgLatencyMS:  45.5,
				P95LatencyMS:  120.0,
				P99LatencyMS:  250.0,
				TotalRequests: 1500,
				Endpoints: []EndpointLatencyKPI{
					{
						Method:        "GET",
						Path:          "/api/v1/trips",
						RequestsCount: 500,
						AvgDurationMS: 30.2,
						P95DurationMS: 85.0,
						ErrorRate:     0.01,
					},
				},
			}, nil
		},
	}

	svc := NewService(repo, nil, nil, time.Now())
	metrics, err := svc.GetApiLatencyMetrics(ctx)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if metrics.TotalRequests != 1500 {
		t.Errorf("expected 1500 requests, got %d", metrics.TotalRequests)
	}
	if len(metrics.Endpoints) != 1 {
		t.Fatalf("expected 1 endpoint, got %d", len(metrics.Endpoints))
	}
	if metrics.Endpoints[0].Method != "GET" {
		t.Errorf("expected method GET, got %s", metrics.Endpoints[0].Method)
	}
}

func TestService_GetAuditLogs(t *testing.T) {
	ctx := context.Background()
	userID := "u-123"
	email := "test@felag.com"
	role := "admin"

	repo := &mockRepository{
		getAuditLogsFunc: func(ctx context.Context, page, pageSize int, search, module string, statusCode *int) (*AuditLogsPaginatedResponse, error) {
			return &AuditLogsPaginatedResponse{
				Items: []AuditLogItem{
					{
						ID:         "log-1",
						UserID:     &userID,
						UserEmail:  &email,
						UserRole:   &role,
						Action:     "GET /api/v1/admin/metrics/summary",
						Module:     "admin",
						Endpoint:   "/api/v1/admin/metrics/summary",
						Method:     "GET",
						StatusCode: 200,
						DurationMS: 15,
						CreatedAt:  time.Now(),
					},
				},
				Total:      1,
				Page:       1,
				PageSize:   20,
				TotalPages: 1,
			}, nil
		},
	}

	svc := NewService(repo, nil, nil, time.Now())
	resp, err := svc.GetAuditLogs(ctx, 1, 20, "admin", "admin", nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if resp.Total != 1 {
		t.Errorf("expected total 1, got %d", resp.Total)
	}
	if len(resp.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(resp.Items))
	}
	if *resp.Items[0].UserEmail != "test@felag.com" {
		t.Errorf("expected email test@felag.com, got %v", resp.Items[0].UserEmail)
	}
}

func TestService_ExportAuditLogsCSV(t *testing.T) {
	ctx := context.Background()
	userID := "u-123"
	userName := "Alice"
	email := "alice@felag.com"
	role := "admin"
	ip := "127.0.0.1"
	ua := "Mozilla/5.0"
	now := time.Date(2026, 9, 4, 10, 0, 0, 0, time.UTC)

	repo := &mockRepository{
		exportAuditLogsFunc: func(ctx context.Context, search, module string, statusCode *int) ([]AuditLogItem, error) {
			return []AuditLogItem{
				{
					ID:         "log-1",
					UserID:     &userID,
					UserName:   &userName,
					UserEmail:  &email,
					UserRole:   &role,
					Action:     "GET /api/v1/trips",
					Module:     "trips",
					Endpoint:   "/api/v1/trips",
					Method:     "GET",
					StatusCode: 200,
					DurationMS: 25,
					IPAddress:  &ip,
					UserAgent:  &ua,
					CreatedAt:  now,
				},
			}, nil
		},
	}

	svc := NewService(repo, nil, nil, time.Now())
	csvBytes, err := svc.ExportAuditLogsCSV(ctx, "", "", nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	csvStr := string(csvBytes)
	if !strings.Contains(csvStr, "id,user_id,user_name,user_email,user_role") {
		t.Errorf("csv missing expected header, got:\n%s", csvStr)
	}
	if !strings.Contains(csvStr, "log-1,u-123,Alice,alice@felag.com,admin,GET /api/v1/trips,trips,/api/v1/trips,GET,200,25,127.0.0.1,Mozilla/5.0") {
		t.Errorf("csv missing expected row, got:\n%s", csvStr)
	}
}

func TestService_GetModerationReports(t *testing.T) {
	ctx := context.Background()
	details := "Inappropriate content in recommendation"

	repo := &mockRepository{
		getModerationReportsFunc: func(ctx context.Context) ([]ModerationReportItem, error) {
			return []ModerationReportItem{
				{
					ID:           "rep-1",
					Type:         "recommendation",
					ReporterID:   "u-1",
					ReporterName: "Bob",
					TargetID:     "rec-123",
					TargetTitle:  "Hidden Spot",
					Reason:       "spam",
					Details:      &details,
					Status:       "pending",
					CreatedAt:    time.Now(),
				},
			}, nil
		},
	}

	svc := NewService(repo, nil, nil, time.Now())
	reports, err := svc.GetModerationReports(ctx)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(reports) != 1 {
		t.Fatalf("expected 1 report, got %d", len(reports))
	}
	if reports[0].Type != "recommendation" {
		t.Errorf("expected type recommendation, got %s", reports[0].Type)
	}
}

func TestService_ResolveReport(t *testing.T) {
	ctx := context.Background()
	var resolvedID string
	var resolvedAction string

	repo := &mockRepository{
		resolveReportFunc: func(ctx context.Context, reportID string, req ResolveReportRequest) error {
			resolvedID = reportID
			resolvedAction = req.Action
			return nil
		},
	}

	svc := NewService(repo, nil, nil, time.Now())
	note := "Content removed"
	err := svc.ResolveReport(ctx, "rep-99", ResolveReportRequest{
		Action: "delete_content",
		Notes:  &note,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if resolvedID != "rep-99" {
		t.Errorf("expected report ID rep-99, got %s", resolvedID)
	}
	if resolvedAction != "delete_content" {
		t.Errorf("expected action delete_content, got %s", resolvedAction)
	}
}
