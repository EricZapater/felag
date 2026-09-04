package admin

import "time"

type TopDestinationKPI struct {
	Name               string `json:"name"`
	CountryName        string `json:"country_name"`
	ActiveFelagisCount int    `json:"active_felagis_count"`
}

type CommunityKPIs struct {
	ActiveTripsCount      int                 `json:"active_trips_count"`
	TotalTripsCount       int                 `json:"total_trips_count"`
	MatchesCount          int                 `json:"matches_count"`
	AffinityTownCount     int                 `json:"affinity_town_count"`
	AffinityRegionCount   int                 `json:"affinity_region_count"`
	AffinityCountryCount  int                 `json:"affinity_country_count"`
	CelebrationCardsCount int                 `json:"celebration_cards_count"`
	CommunityTipsCount    int                 `json:"community_tips_count"`
	TotalUsefulVotes      int                 `json:"total_useful_votes"`
	TopDestinations       []TopDestinationKPI `json:"top_destinations"`
}

type SystemHealth struct {
	UptimeSeconds      int64   `json:"uptime_seconds"`
	MemoryAllocMB      float64 `json:"memory_alloc_mb"`
	NumGoroutines      int     `json:"num_goroutines"`
	DBOpenConnections  int     `json:"db_open_connections"`
	DBInUseConnections int     `json:"db_in_use_connections"`
	ActiveWebsockets   int     `json:"active_websockets"`
}

type AdminMetricsSummaryResponse struct {
	Community CommunityKPIs `json:"community"`
	System    SystemHealth  `json:"system"`
}

type EndpointLatencyKPI struct {
	Method        string  `json:"method"`
	Path          string  `json:"path"`
	RequestsCount int     `json:"requests_count"`
	AvgDurationMS float64 `json:"avg_duration_ms"`
	P95DurationMS float64 `json:"p95_duration_ms"`
	ErrorRate     float64 `json:"error_rate"`
}

type ApiLatencyMetricsResponse struct {
	AvgLatencyMS  float64              `json:"avg_latency_ms"`
	P95LatencyMS  float64              `json:"p95_latency_ms"`
	P99LatencyMS  float64              `json:"p99_latency_ms"`
	TotalRequests int                  `json:"total_requests"`
	Endpoints     []EndpointLatencyKPI `json:"endpoints"`
}

type AuditLogItem struct {
	ID         string    `json:"id"`
	UserID     *string   `json:"user_id,omitempty"`
	UserName   *string   `json:"user_name,omitempty"`
	UserEmail  *string   `json:"user_email,omitempty"`
	UserRole   *string   `json:"user_role,omitempty"`
	Action     string    `json:"action"`
	Module     string    `json:"module"`
	Endpoint   string    `json:"endpoint"`
	Method     string    `json:"method"`
	StatusCode int       `json:"status_code"`
	DurationMS int       `json:"duration_ms"`
	IPAddress  *string   `json:"ip_address,omitempty"`
	UserAgent  *string   `json:"user_agent,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

type AuditLogsPaginatedResponse struct {
	Items      []AuditLogItem `json:"items"`
	Total      int            `json:"total"`
	Page       int            `json:"page"`
	PageSize   int            `json:"pageSize"`
	TotalPages int            `json:"totalPages"`
}

type ModerationReportItem struct {
	ID           string    `json:"id"`
	Type         string    `json:"type"` // "user" or "recommendation"
	ReporterID   string    `json:"reporter_id"`
	ReporterName string    `json:"reporter_name"`
	TargetID     string    `json:"target_id"`
	TargetTitle  string    `json:"target_title"`
	Reason       string    `json:"reason"`
	Details      *string   `json:"details,omitempty"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

type ResolveReportRequest struct {
	Action string  `json:"action" binding:"required,oneof=dismiss delete_content ban_user"`
	Notes  *string `json:"notes,omitempty"`
}

type SuccessResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}
