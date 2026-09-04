import { create } from 'zustand';
import { adminApi } from './api';
import {
  AdminMetricsSummaryResponse,
  ApiLatencyMetricsResponse,
  AuditLogsPaginatedResponse,
  AuditLogsQueryParams,
  ModerationReportItem,
  ResolveReportAction,
} from './types';

interface AdminState {
  summary: AdminMetricsSummaryResponse | null;
  latencyMetrics: ApiLatencyMetricsResponse | null;
  auditLogs: AuditLogsPaginatedResponse | null;
  moderationReports: ModerationReportItem[];

  isLoadingSummary: boolean;
  isLoadingLatency: boolean;
  isLoadingAuditLogs: boolean;
  isLoadingReports: boolean;
  isExportingCsv: boolean;
  isResolvingReport: boolean;

  error: string | null;
  successMessage: string | null;

  auditFilter: {
    search: string;
    module: string;
    page: number;
    pageSize: number;
    statusCode?: number;
  };
  activeTab: number;

  fetchSummary: () => Promise<void>;
  fetchLatencyMetrics: () => Promise<void>;
  fetchAuditLogs: (params?: AuditLogsQueryParams) => Promise<void>;
  exportAuditLogsCsv: () => Promise<void>;
  fetchModerationReports: () => Promise<void>;
  resolveReport: (id: string, action: ResolveReportAction, notes?: string) => Promise<void>;

  setAuditSearch: (search: string) => void;
  setAuditModule: (module: string) => void;
  setAuditPage: (page: number) => void;
  setAuditPageSize: (pageSize: number) => void;
  setAuditStatusCode: (statusCode?: number) => void;
  setActiveTab: (tab: number) => void;
  clearError: () => void;
  clearSuccessMessage: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  summary: null,
  latencyMetrics: null,
  auditLogs: null,
  moderationReports: [],

  isLoadingSummary: false,
  isLoadingLatency: false,
  isLoadingAuditLogs: false,
  isLoadingReports: false,
  isExportingCsv: false,
  isResolvingReport: false,

  error: null,
  successMessage: null,

  auditFilter: {
    search: '',
    module: '',
    page: 1,
    pageSize: 20,
    statusCode: undefined,
  },
  activeTab: 0,

  fetchSummary: async () => {
    set({ isLoadingSummary: true, error: null });
    try {
      const summary = await adminApi.getSummary();
      set({ summary, isLoadingSummary: false });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error carregant el resum de mètriques';
      set({ error: msg, isLoadingSummary: false });
    }
  },

  fetchLatencyMetrics: async () => {
    set({ isLoadingLatency: true, error: null });
    try {
      const latencyMetrics = await adminApi.getLatencyMetrics();
      set({ latencyMetrics, isLoadingLatency: false });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error carregant mètriques de rendiment';
      set({ error: msg, isLoadingLatency: false });
    }
  },

  fetchAuditLogs: async (params?: AuditLogsQueryParams) => {
    const currentFilter = get().auditFilter;
    const effectiveParams: AuditLogsQueryParams = {
      page: params?.page ?? currentFilter.page,
      pageSize: params?.pageSize ?? currentFilter.pageSize,
      search: params?.search !== undefined ? params.search : currentFilter.search,
      module: params?.module !== undefined ? params.module : currentFilter.module,
      statusCode: params?.statusCode !== undefined ? params.statusCode : currentFilter.statusCode,
    };

    set({ isLoadingAuditLogs: true, error: null });
    try {
      const auditLogs = await adminApi.getAuditLogs(effectiveParams);
      set({
        auditLogs,
        isLoadingAuditLogs: false,
        auditFilter: {
          page: effectiveParams.page || 1,
          pageSize: effectiveParams.pageSize || 20,
          search: effectiveParams.search || '',
          module: effectiveParams.module || '',
          statusCode: effectiveParams.statusCode,
        },
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error carregant el registre d’auditoria';
      set({ error: msg, isLoadingAuditLogs: false });
    }
  },

  exportAuditLogsCsv: async () => {
    set({ isExportingCsv: true, error: null });
    try {
      const blob = await adminApi.exportAuditLogsCsv();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `felag_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      set({ isExportingCsv: false, successMessage: 'CSV d\'auditoria descarregat correctament' });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error descarregant el CSV d’auditoria';
      set({ error: msg, isExportingCsv: false });
    }
  },

  fetchModerationReports: async () => {
    set({ isLoadingReports: true, error: null });
    try {
      const moderationReports = await adminApi.getModerationReports();
      set({ moderationReports, isLoadingReports: false });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error carregant els informes de moderació';
      set({ error: msg, isLoadingReports: false });
    }
  },

  resolveReport: async (id: string, action: ResolveReportAction, notes?: string) => {
    set({ isResolvingReport: true, error: null });
    try {
      await adminApi.resolveReport(id, { action, notes });
      set((state) => ({
        moderationReports: state.moderationReports.filter((r) => r.id !== id),
        isResolvingReport: false,
        successMessage: action === 'dismiss'
          ? 'Denúncia descartada amb èxit'
          : action === 'delete_content'
          ? 'Contingut eliminat i resolt amb èxit'
          : 'Usuari sancionat i denúncia resolta amb èxit',
      }));
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error resolent la denúncia';
      set({ error: msg, isResolvingReport: false });
      throw err;
    }
  },

  setAuditSearch: (search: string) => {
    set((state) => ({
      auditFilter: { ...state.auditFilter, search, page: 1 },
    }));
  },

  setAuditModule: (module: string) => {
    set((state) => ({
      auditFilter: { ...state.auditFilter, module, page: 1 },
    }));
  },

  setAuditPage: (page: number) => {
    set((state) => ({
      auditFilter: { ...state.auditFilter, page },
    }));
  },

  setAuditPageSize: (pageSize: number) => {
    set((state) => ({
      auditFilter: { ...state.auditFilter, pageSize, page: 1 },
    }));
  },

  setAuditStatusCode: (statusCode?: number) => {
    set((state) => ({
      auditFilter: { ...state.auditFilter, statusCode, page: 1 },
    }));
  },

  setActiveTab: (tab: number) => {
    set({ activeTab: tab });
  },

  clearError: () => set({ error: null }),
  clearSuccessMessage: () => set({ successMessage: null }),
}));
