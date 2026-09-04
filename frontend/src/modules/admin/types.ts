export interface TopDestinationKPI {
  name: string;
  country_name: string;
  active_felagis_count: number;
}

export interface CommunityKPIs {
  active_trips_count: number;
  total_trips_count: number;
  matches_count: number;
  affinity_town_count: number;
  affinity_region_count: number;
  affinity_country_count: number;
  celebration_cards_count: number;
  community_tips_count: number;
  total_useful_votes: number;
  top_destinations: TopDestinationKPI[];
}

export interface SystemHealth {
  uptime_seconds: number;
  memory_alloc_mb: number;
  num_goroutines: number;
  db_open_connections: number;
  db_in_use_connections: number;
  active_websockets: number;
}

export interface AdminMetricsSummaryResponse {
  community: CommunityKPIs;
  system: SystemHealth;
}

export interface EndpointLatencyKPI {
  method: string;
  path: string;
  requests_count: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  error_rate: number;
}

export interface ApiLatencyMetricsResponse {
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  total_requests: number;
  endpoints: EndpointLatencyKPI[];
}

export interface AuditLogItem {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  module: string;
  endpoint: string;
  method: string;
  status_code: number;
  duration_ms: number;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditLogsPaginatedResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditLogsQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  module?: string;
  statusCode?: number;
}

export type ModerationReportType = 'user' | 'recommendation';

export interface ModerationReportItem {
  id: string;
  type: ModerationReportType;
  reporter_id: string;
  reporter_name: string;
  target_id: string;
  target_title: string;
  reason: string;
  details?: string;
  status: string;
  created_at: string;
}

export type ResolveReportAction = 'dismiss' | 'delete_content' | 'ban_user';

export interface ResolveReportRequest {
  action: ResolveReportAction;
  notes?: string;
}

export interface SuccessResponse {
  success: boolean;
  message?: string;
}
