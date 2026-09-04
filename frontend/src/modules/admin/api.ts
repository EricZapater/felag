import { apiClient } from '@/api/client';
import {
  AdminMetricsSummaryResponse,
  ApiLatencyMetricsResponse,
  AuditLogsPaginatedResponse,
  AuditLogsQueryParams,
  ModerationReportItem,
  ResolveReportRequest,
  SuccessResponse,
} from './types';

export const adminApi = {
  getSummary: async (): Promise<AdminMetricsSummaryResponse> => {
    const res = await apiClient.get<AdminMetricsSummaryResponse>('/api/v1/admin/metrics/summary');
    return res.data;
  },

  getLatencyMetrics: async (): Promise<ApiLatencyMetricsResponse> => {
    const res = await apiClient.get<ApiLatencyMetricsResponse>('/api/v1/admin/metrics/api-latency');
    return res.data;
  },

  getAuditLogs: async (params?: AuditLogsQueryParams): Promise<AuditLogsPaginatedResponse> => {
    const queryParams: Record<string, string | number> = {};
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.pageSize !== undefined) queryParams.pageSize = params.pageSize;
    if (params?.search) queryParams.search = params.search;
    if (params?.module) queryParams.module = params.module;
    if (params?.statusCode !== undefined) queryParams.statusCode = params.statusCode;

    const res = await apiClient.get<AuditLogsPaginatedResponse>('/api/v1/admin/metrics/audit-logs', {
      params: queryParams,
    });
    return res.data;
  },

  exportAuditLogsCsv: async (): Promise<Blob> => {
    const res = await apiClient.get<Blob>('/api/v1/admin/metrics/audit-logs/export', {
      responseType: 'blob',
    });
    return res.data;
  },

  getModerationReports: async (): Promise<ModerationReportItem[]> => {
    const res = await apiClient.get<ModerationReportItem[]>('/api/v1/admin/moderation/reports');
    return res.data;
  },

  resolveReport: async (id: string, data: ResolveReportRequest): Promise<SuccessResponse> => {
    const res = await apiClient.put<SuccessResponse>(
      `/api/v1/admin/moderation/reports/${encodeURIComponent(id)}/resolve`,
      data
    );
    return res.data;
  },
};
