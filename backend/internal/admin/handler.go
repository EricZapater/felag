package admin

import (
	"errors"
	"net/http"
	"strconv"

	"felag/backend/internal/shared"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// GetSummary returns global community KPIs and system health telemetry
func (h *Handler) GetSummary(c *gin.Context) {
	summary, err := h.service.GetSummary(c.Request.Context())
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetApiLatencyMetrics returns endpoint latency percentiles and error rates
func (h *Handler) GetApiLatencyMetrics(c *gin.Context) {
	metrics, err := h.service.GetApiLatencyMetrics(c.Request.Context())
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, metrics)
}

// GetAuditLogs returns paginated audit log items filtered by search, module, statusCode
func (h *Handler) GetAuditLogs(c *gin.Context) {
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if parsed, err := strconv.Atoi(pageStr); err == nil && parsed > 0 {
			page = parsed
		}
	}

	pageSize := 20
	if pageSizeStr := c.Query("pageSize"); pageSizeStr != "" {
		if parsed, err := strconv.Atoi(pageSizeStr); err == nil && parsed > 0 {
			pageSize = parsed
		}
	}

	search := c.Query("search")
	module := c.Query("module")

	var statusCode *int
	if statusStr := c.Query("statusCode"); statusStr != "" {
		if parsed, err := strconv.Atoi(statusStr); err == nil && parsed > 0 {
			statusCode = &parsed
		}
	}

	logs, err := h.service.GetAuditLogs(c.Request.Context(), page, pageSize, search, module, statusCode)
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, logs)
}

// ExportAuditLogs exports audit logs in CSV format
func (h *Handler) ExportAuditLogs(c *gin.Context) {
	search := c.Query("search")
	module := c.Query("module")

	var statusCode *int
	if statusStr := c.Query("statusCode"); statusStr != "" {
		if parsed, err := strconv.Atoi(statusStr); err == nil && parsed > 0 {
			statusCode = &parsed
		}
	}

	csvData, err := h.service.ExportAuditLogsCSV(c.Request.Context(), search, module, statusCode)
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=audit-logs.csv")
	c.Data(http.StatusOK, "text/csv", csvData)
}

// GetModerationReports returns pending reports
func (h *Handler) GetModerationReports(c *gin.Context) {
	reports, err := h.service.GetModerationReports(c.Request.Context())
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, reports)
}

// ResolveReport handles report resolution
func (h *Handler) ResolveReport(c *gin.Context) {
	reportID := c.Param("id")
	if reportID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Report ID is required")
		return
	}

	var req ResolveReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	if err := h.service.ResolveReport(c.Request.Context(), reportID, req); err != nil {
		if errors.Is(err, ErrReportNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Report not found")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Report resolved successfully",
	})
}
