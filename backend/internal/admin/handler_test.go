package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

type mockService struct {
	getSummaryFunc           func(ctx context.Context) (*AdminMetricsSummaryResponse, error)
	getApiLatencyMetricsFunc func(ctx context.Context) (*ApiLatencyMetricsResponse, error)
	getAuditLogsFunc         func(ctx context.Context, page, pageSize int, search, module string, statusCode *int) (*AuditLogsPaginatedResponse, error)
	exportAuditLogsCSVFunc   func(ctx context.Context, search, module string, statusCode *int) ([]byte, error)
	getModerationReportsFunc func(ctx context.Context) ([]ModerationReportItem, error)
	resolveReportFunc        func(ctx context.Context, reportID string, req ResolveReportRequest) error
}

func (m *mockService) GetSummary(ctx context.Context) (*AdminMetricsSummaryResponse, error) {
	if m.getSummaryFunc != nil {
		return m.getSummaryFunc(ctx)
	}
	return &AdminMetricsSummaryResponse{}, nil
}

func (m *mockService) GetApiLatencyMetrics(ctx context.Context) (*ApiLatencyMetricsResponse, error) {
	if m.getApiLatencyMetricsFunc != nil {
		return m.getApiLatencyMetricsFunc(ctx)
	}
	return &ApiLatencyMetricsResponse{}, nil
}

func (m *mockService) GetAuditLogs(ctx context.Context, page, pageSize int, search, module string, statusCode *int) (*AuditLogsPaginatedResponse, error) {
	if m.getAuditLogsFunc != nil {
		return m.getAuditLogsFunc(ctx, page, pageSize, search, module, statusCode)
	}
	return &AuditLogsPaginatedResponse{}, nil
}

func (m *mockService) ExportAuditLogsCSV(ctx context.Context, search, module string, statusCode *int) ([]byte, error) {
	if m.exportAuditLogsCSVFunc != nil {
		return m.exportAuditLogsCSVFunc(ctx, search, module, statusCode)
	}
	return []byte("id,user_id\n"), nil
}

func (m *mockService) GetModerationReports(ctx context.Context) ([]ModerationReportItem, error) {
	if m.getModerationReportsFunc != nil {
		return m.getModerationReportsFunc(ctx)
	}
	return []ModerationReportItem{}, nil
}

func (m *mockService) ResolveReport(ctx context.Context, reportID string, req ResolveReportRequest) error {
	if m.resolveReportFunc != nil {
		return m.resolveReportFunc(ctx, reportID, req)
	}
	return nil
}

func setupAdminRouter(svc Service) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewHandler(svc)

	v1 := r.Group("/api/v1/admin")
	{
		v1.GET("/metrics/summary", h.GetSummary)
		v1.GET("/metrics/api-latency", h.GetApiLatencyMetrics)
		v1.GET("/metrics/audit-logs", h.GetAuditLogs)
		v1.GET("/metrics/audit-logs/export", h.ExportAuditLogs)
		v1.GET("/moderation/reports", h.GetModerationReports)
		v1.PUT("/moderation/reports/:id/resolve", h.ResolveReport)
	}
	return r
}

func TestHandler_GetSummary(t *testing.T) {
	svc := &mockService{
		getSummaryFunc: func(ctx context.Context) (*AdminMetricsSummaryResponse, error) {
			return &AdminMetricsSummaryResponse{
				Community: CommunityKPIs{
					ActiveTripsCount: 10,
					TotalTripsCount:  25,
				},
				System: SystemHealth{
					UptimeSeconds: 3600,
				},
			}, nil
		},
	}

	r := setupAdminRouter(svc)
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/admin/metrics/summary", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}

	var res AdminMetricsSummaryResponse
	if err := json.Unmarshal(resp.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if res.Community.ActiveTripsCount != 10 {
		t.Errorf("expected 10 active trips, got %d", res.Community.ActiveTripsCount)
	}
}

func TestHandler_GetApiLatency(t *testing.T) {
	svc := &mockService{
		getApiLatencyMetricsFunc: func(ctx context.Context) (*ApiLatencyMetricsResponse, error) {
			return &ApiLatencyMetricsResponse{
				AvgLatencyMS:  30.5,
				TotalRequests: 100,
			}, nil
		},
	}

	r := setupAdminRouter(svc)
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/admin/metrics/api-latency", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}
}

func TestHandler_GetAuditLogs(t *testing.T) {
	svc := &mockService{
		getAuditLogsFunc: func(ctx context.Context, page, pageSize int, search, module string, statusCode *int) (*AuditLogsPaginatedResponse, error) {
			return &AuditLogsPaginatedResponse{
				Items:      []AuditLogItem{},
				Total:      0,
				Page:       page,
				PageSize:   pageSize,
				TotalPages: 0,
			}, nil
		},
	}

	r := setupAdminRouter(svc)
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/admin/metrics/audit-logs?page=2&pageSize=10&search=auth&module=auth&statusCode=200", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}
}

func TestHandler_ExportAuditLogs(t *testing.T) {
	svc := &mockService{
		exportAuditLogsCSVFunc: func(ctx context.Context, search, module string, statusCode *int) ([]byte, error) {
			return []byte("id,user_id,action\n1,u1,GET\n"), nil
		},
	}

	r := setupAdminRouter(svc)
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/admin/metrics/audit-logs/export", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}
	if resp.Header().Get("Content-Type") != "text/csv" {
		t.Errorf("expected Content-Type text/csv, got %s", resp.Header().Get("Content-Type"))
	}
}

func TestHandler_GetModerationReports(t *testing.T) {
	svc := &mockService{
		getModerationReportsFunc: func(ctx context.Context) ([]ModerationReportItem, error) {
			return []ModerationReportItem{
				{
					ID:           "rep-1",
					Type:         "user",
					ReporterID:   "u1",
					ReporterName: "Reporter",
					TargetID:     "u2",
					TargetTitle:  "Reported User",
					Reason:       "harassment",
					Status:       "pending",
					CreatedAt:    time.Now(),
				},
			}, nil
		},
	}

	r := setupAdminRouter(svc)
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/admin/moderation/reports", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}
}

func TestHandler_ResolveReport(t *testing.T) {
	svc := &mockService{
		resolveReportFunc: func(ctx context.Context, reportID string, req ResolveReportRequest) error {
			if reportID == "not-found" {
				return ErrReportNotFound
			}
			if reportID == "error-id" {
				return errors.New("db error")
			}
			return nil
		},
	}

	r := setupAdminRouter(svc)

	// 1. Success
	bodySuccess, _ := json.Marshal(ResolveReportRequest{Action: "dismiss"})
	req1, _ := http.NewRequest(http.MethodPut, "/api/v1/admin/moderation/reports/valid-id/resolve", bytes.NewBuffer(bodySuccess))
	req1.Header.Set("Content-Type", "application/json")
	resp1 := httptest.NewRecorder()
	r.ServeHTTP(resp1, req1)
	if resp1.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp1.Code)
	}

	// 2. Invalid action
	bodyInvalid, _ := json.Marshal(map[string]string{"action": "invalid_action"})
	req2, _ := http.NewRequest(http.MethodPut, "/api/v1/admin/moderation/reports/valid-id/resolve", bytes.NewBuffer(bodyInvalid))
	req2.Header.Set("Content-Type", "application/json")
	resp2 := httptest.NewRecorder()
	r.ServeHTTP(resp2, req2)
	if resp2.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 for invalid action, got %d", resp2.Code)
	}

	// 3. Not found
	req3, _ := http.NewRequest(http.MethodPut, "/api/v1/admin/moderation/reports/not-found/resolve", bytes.NewBuffer(bodySuccess))
	req3.Header.Set("Content-Type", "application/json")
	resp3 := httptest.NewRecorder()
	r.ServeHTTP(resp3, req3)
	if resp3.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", resp3.Code)
	}

	// 4. Internal Error
	req4, _ := http.NewRequest(http.MethodPut, "/api/v1/admin/moderation/reports/error-id/resolve", bytes.NewBuffer(bodySuccess))
	req4.Header.Set("Content-Type", "application/json")
	resp4 := httptest.NewRecorder()
	r.ServeHTTP(resp4, req4)
	if resp4.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", resp4.Code)
	}
}
