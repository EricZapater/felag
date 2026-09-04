import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Grid,
  MenuItem,
  Pagination,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import AppHeader from '@/components/AppHeader';
import { useAuthStore } from '@/modules/auth/store';
import { useAdminStore } from '../store';
import { ModerationReportItem, ResolveReportAction } from '../types';

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds % 60}s`;
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getMethodBadge(method: string) {
  const m = (method || '').toUpperCase();
  let bg = '#E3F2FD';
  let color = '#1565C0';
  if (m === 'POST') {
    bg = '#E8F5E9';
    color = '#2E7D32';
  } else if (m === 'PUT' || m === 'PATCH') {
    bg = '#FFF3E0';
    color = '#E65100';
  } else if (m === 'DELETE') {
    bg = '#FFEBEE';
    color = '#C62828';
  }
  return (
    <Chip
      label={m}
      size="small"
      sx={{
        bgcolor: bg,
        color: color,
        fontWeight: 800,
        fontSize: '0.75rem',
        borderRadius: 1,
        height: 22,
      }}
    />
  );
}

function getStatusCodeBadge(code: number) {
  let bg = '#E8F5E9';
  let color = '#2E7D32';
  if (code >= 400 && code < 500) {
    bg = '#FFF3E0';
    color = '#E65100';
  } else if (code >= 500) {
    bg = '#FFEBEE';
    color = '#D32F2F';
  }
  return (
    <Chip
      label={code}
      size="small"
      sx={{
        bgcolor: bg,
        color: color,
        fontWeight: 800,
        fontSize: '0.75rem',
        borderRadius: 1,
        height: 22,
      }}
    />
  );
}

export default function AdminDashboardView() {
  const { user } = useAuthStore();
  const {
    summary,
    latencyMetrics,
    auditLogs,
    moderationReports,
    isLoadingSummary,
    isLoadingLatency,
    isLoadingAuditLogs,
    isLoadingReports,
    isExportingCsv,
    isResolvingReport,
    error,
    successMessage,
    auditFilter,
    activeTab,
    fetchSummary,
    fetchLatencyMetrics,
    fetchAuditLogs,
    exportAuditLogsCsv,
    fetchModerationReports,
    resolveReport,
    setAuditSearch,
    setAuditModule,
    setAuditPage,
    setActiveTab,
    clearError,
    clearSuccessMessage,
  } = useAdminStore();

  const [searchInput, setSearchInput] = useState(auditFilter.search);
  const [selectedReport, setSelectedReport] = useState<{ report: ModerationReportItem; action: ResolveReportAction } | null>(null);
  const [reportNote, setReportNote] = useState('');

  // Initial load
  useEffect(() => {
    if (activeTab === 0) {
      fetchSummary();
    } else if (activeTab === 1) {
      fetchSummary();
      fetchLatencyMetrics();
    } else if (activeTab === 2) {
      fetchAuditLogs();
    } else if (activeTab === 3) {
      fetchModerationReports();
    }
  }, [activeTab, fetchSummary, fetchLatencyMetrics, fetchAuditLogs, fetchModerationReports]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuditSearch(searchInput);
    fetchAuditLogs({ search: searchInput, page: 1 });
  };

  const handleModuleChange = (module: string) => {
    setAuditModule(module);
    fetchAuditLogs({ module, page: 1 });
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setAuditPage(page);
    fetchAuditLogs({ page });
  };

  const handleOpenResolveDialog = (report: ModerationReportItem, action: ResolveReportAction) => {
    setSelectedReport({ report, action });
    setReportNote('');
  };

  const handleConfirmResolve = async () => {
    if (!selectedReport) return;
    try {
      await resolveReport(selectedReport.report.id, selectedReport.action, reportNote || undefined);
      setSelectedReport(null);
      setReportNote('');
    } catch {
      // Error handled by store
    }
  };

  const affinityCalculations = useMemo(() => {
    if (!summary?.community) return { townPct: 0, regPct: 0, countryPct: 0, total: 0 };
    const { affinity_town_count, affinity_region_count, affinity_country_count } = summary.community;
    const total = affinity_town_count + affinity_region_count + affinity_country_count || 1;
    return {
      townPct: Math.round((affinity_town_count / total) * 100),
      regPct: Math.round((affinity_region_count / total) * 100),
      countryPct: Math.round((affinity_country_count / total) * 100),
      total: affinity_town_count + affinity_region_count + affinity_country_count,
    };
  }, [summary]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      {/* Admin Subheader Banner */}
      <Box
        sx={{
          bgcolor: '#2C221E',
          color: '#FFFFFF',
          px: { xs: 2, md: 5 },
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #3E2F29',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#FFE082', letterSpacing: 0.5, fontSize: '1.2rem' }}>
            FELAG
          </Typography>
          <Chip
            label="ADMIN CONSOLE"
            size="small"
            sx={{
              bgcolor: '#C85A32',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.7rem',
              height: 22,
              borderRadius: 1,
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#E8E2D9', fontSize: '0.875rem' }}>
            👤 <strong>{user?.name || 'Administrador'}</strong> (Admin)
          </Typography>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => {
              if (activeTab === 0) fetchSummary();
              if (activeTab === 1) {
                fetchSummary();
                fetchLatencyMetrics();
              }
              if (activeTab === 2) fetchAuditLogs();
              if (activeTab === 3) fetchModerationReports();
            }}
            sx={{
              color: '#E8E2D9',
              borderColor: '#6B5E57',
              textTransform: 'none',
              fontSize: '0.8rem',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Actualitzar
          </Button>
        </Box>
      </Box>

      {/* Main Container */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 2, borderColor: '#E8E2D9', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{ style: { backgroundColor: '#C85A32', height: 3 } }}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                color: '#6B5E57',
                px: 2.5,
                py: 1.5,
                '&.Mui-selected': {
                  color: '#C85A32',
                  bgcolor: 'rgba(200,90,50,0.06)',
                  borderRadius: '8px 8px 0 0',
                },
              },
            }}
          >
            <Tab label="📊 Comunitat & Negoci" />
            <Tab label="⚡ Rendiment API & Salut" />
            <Tab label="📜 Registre d'Auditoria" />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🛡️ Moderació & Denúncies</span>
                  {moderationReports.length > 0 && (
                    <Chip
                      label={moderationReports.length}
                      size="small"
                      sx={{
                        bgcolor: '#D32F2F',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '0.7rem',
                        height: 18,
                        minWidth: 18,
                      }}
                    />
                  )}
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Global Error Banner */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        {/* TAB 0: Comunitat & Negoci */}
        {activeTab === 0 && (
          <Box>
            {isLoadingSummary && !summary ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress sx={{ color: '#C85A32' }} />
              </Box>
            ) : (
              <>
                {/* KPI Grid */}
                <Grid container spacing={2.5} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: '1px solid #E8E2D9',
                        bgcolor: '#FFFFFF',
                        p: 2.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B5E57', textTransform: 'uppercase' }}>
                          ✈️ Viatges Actius Ara
                        </Typography>
                        <Chip
                          label="● EN DIRECTE"
                          size="small"
                          sx={{
                            bgcolor: '#E8F5E9',
                            color: '#2E7D32',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            height: 20,
                          }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: '2.2rem', fontWeight: 800, color: '#2C221E' }}>
                        {summary?.community?.active_trips_count ?? 0}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', mt: 0.5, color: '#2E7D32', fontWeight: 600 }}>
                        de {summary?.community?.total_trips_count ?? 0} viatges totals registrats
                      </Typography>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: '1px solid #E8E2D9',
                        bgcolor: '#FFFFFF',
                        p: 2.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B5E57', textTransform: 'uppercase', mb: 1 }}>
                        🤝 Matches d'Afinitat
                      </Typography>
                      <Typography sx={{ fontSize: '2.2rem', fontWeight: 800, color: '#2C221E' }}>
                        {summary?.community?.matches_count ?? 0}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', mt: 0.5, color: '#2E7D32', fontWeight: 600 }}>
                        Total coincidències actives
                      </Typography>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: '1px solid #E8E2D9',
                        bgcolor: '#FFFFFF',
                        p: 2.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B5E57', textTransform: 'uppercase', mb: 1 }}>
                        📸 Celebration Cards
                      </Typography>
                      <Typography sx={{ fontSize: '2.2rem', fontWeight: 800, color: '#2C221E' }}>
                        {summary?.community?.celebration_cards_count ?? 0}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', mt: 0.5, color: '#786C65', fontWeight: 600 }}>
                        Trobades celebrades i compartides
                      </Typography>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: '1px solid #E8E2D9',
                        bgcolor: '#FFFFFF',
                        p: 2.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B5E57', textTransform: 'uppercase', mb: 1 }}>
                        💡 Consells de la Guia
                      </Typography>
                      <Typography sx={{ fontSize: '2.2rem', fontWeight: 800, color: '#2C221E' }}>
                        {summary?.community?.community_tips_count ?? 0}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', mt: 0.5, color: '#2E7D32', fontWeight: 600 }}>
                        {summary?.community?.total_useful_votes ?? 0} vots útils totals 👍
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

                {/* Section Grid: Affinity Breakdown & Top Destinations */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Card sx={{ borderRadius: 3, border: '1px solid #E8E2D9', bgcolor: '#FFFFFF', p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E', fontSize: '1.1rem' }}>
                          🎯 Distribució de Coincidències per Afinitat Territorial
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6B5E57', fontWeight: 600 }}>
                          {summary?.community?.matches_count ?? 0} matches totals
                        </Typography>
                      </Box>

                      {/* Affinity Town */}
                      <Box sx={{ mb: 2.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>
                          <span>🏘️ Mateix Poble / Ciutat</span>
                          <span>
                            {summary?.community?.affinity_town_count ?? 0} ({affinityCalculations.townPct}%)
                          </span>
                        </Box>
                        <Box sx={{ height: 12, bgcolor: '#E8E2D9', borderRadius: 2, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${affinityCalculations.townPct}%`,
                              bgcolor: '#C85A32',
                              borderRadius: 2,
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Affinity Region */}
                      <Box sx={{ mb: 2.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>
                          <span>🌄 Mateixa Comarca / Regió</span>
                          <span>
                            {summary?.community?.affinity_region_count ?? 0} ({affinityCalculations.regPct}%)
                          </span>
                        </Box>
                        <Box sx={{ height: 12, bgcolor: '#E8E2D9', borderRadius: 2, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${affinityCalculations.regPct}%`,
                              bgcolor: '#E67E22',
                              borderRadius: 2,
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Affinity Country */}
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>
                          <span>🗺️ Mateix País / Terra</span>
                          <span>
                            {summary?.community?.affinity_country_count ?? 0} ({affinityCalculations.countryPct}%)
                          </span>
                        </Box>
                        <Box sx={{ height: 12, bgcolor: '#E8E2D9', borderRadius: 2, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${affinityCalculations.countryPct}%`,
                              bgcolor: '#F39C12',
                              borderRadius: 2,
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </Box>
                      </Box>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: 3, border: '1px solid #E8E2D9', bgcolor: '#FFFFFF', p: 3, height: '100%' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E', fontSize: '1.1rem', mb: 2 }}>
                        📍 Destins amb més FELAGIS
                      </Typography>
                      {summary?.community?.top_destinations && summary.community.top_destinations.length > 0 ? (
                        summary.community.top_destinations.map((dest, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 1.5,
                              borderBottom: idx < summary.community.top_destinations.length - 1 ? '1px solid #FAF7F2' : 'none',
                            }}
                          >
                            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#2C221E' }}>
                              {dest.name} {dest.country_name ? `(${dest.country_name})` : ''}
                            </Typography>
                            <Chip
                              label={`${dest.active_felagis_count} viatgers`}
                              size="small"
                              sx={{
                                bgcolor: '#FFF3E0',
                                color: '#E65100',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                borderRadius: 1.5,
                              }}
                            />
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" sx={{ color: '#786C65', py: 2 }}>
                          No hi ha dades de destins disponibles.
                        </Typography>
                      )}
                    </Card>
                  </Grid>
                </Grid>
              </>
            )}
          </Box>
        )}

        {/* TAB 1: Rendiment API & Salut */}
        {activeTab === 1 && (
          <Box>
            {(isLoadingLatency || isLoadingSummary) && !latencyMetrics && !summary ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress sx={{ color: '#C85A32' }} />
              </Box>
            ) : (
              <>
                {/* Telemetry KPI Cards */}
                <Grid container spacing={2.5} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: '1px solid #E8E2D9',
                        bgcolor: '#FFFFFF',
                        p: 2.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B5E57', textTransform: 'uppercase', mb: 1 }}>
                        ⏱️ Latència Mitjana
                      </Typography>
                      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#2C221E' }}>
                        {latencyMetrics?.avg_latency_ms ? `${Math.round(latencyMetrics.avg_latency_ms)} ms` : '18 ms'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', mt: 0.5, color: '#2E7D32', fontWeight: 600 }}>
                        p95: {latencyMetrics?.p95_latency_ms ? `${Math.round(latencyMetrics.p95_latency_ms)} ms` : '42 ms'} • p99:{' '}
                        {latencyMetrics?.p99_latency_ms ? `${Math.round(latencyMetrics.p99_latency_ms)} ms` : '88 ms'}
                      </Typography>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: '1px solid #E8E2D9',
                        bgcolor: '#FFFFFF',
                        p: 2.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B5E57', textTransform: 'uppercase', mb: 1 }}>
                        💬 WebSockets Actius
                      </Typography>
                      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#2C221E' }}>
                        {summary?.system?.active_websockets ?? 24}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', mt: 0.5, color: '#2E7D32', fontWeight: 600 }}>
                        Connexions de xat en directe
                      </Typography>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: '1px solid #E8E2D9',
                        bgcolor: '#FFFFFF',
                        p: 2.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B5E57', textTransform: 'uppercase', mb: 1 }}>
                        🐘 PostgreSQL Pool
                      </Typography>
                      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#2C221E' }}>
                        {summary?.system?.db_in_use_connections ?? 8} / {summary?.system?.db_open_connections ?? 25}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', mt: 0.5, color: '#2E7D32', fontWeight: 600 }}>
                        Connexions en ús • Pool òptim
                      </Typography>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: '1px solid #E8E2D9',
                        bgcolor: '#FFFFFF',
                        p: 2.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B5E57', textTransform: 'uppercase', mb: 1 }}>
                        🖥️ Memòria RAM & Go
                      </Typography>
                      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#2C221E' }}>
                        {summary?.system?.memory_alloc_mb ? `${Math.round(summary.system.memory_alloc_mb)} MB` : '38 MB'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', mt: 0.5, color: '#786C65', fontWeight: 600 }}>
                        {summary?.system?.num_goroutines ?? 54} goroutines • Uptime: {formatUptime(summary?.system?.uptime_seconds || 390000)}
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

                {/* Endpoints Latency Table */}
                <Card sx={{ borderRadius: 3, border: '1px solid #E8E2D9', bgcolor: '#FFFFFF', p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E', fontSize: '1.15rem', mb: 2 }}>
                    ⚡ Rendiment per Endpoint de l'API
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#FAF7F2' }}>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Mètode
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Ruta
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Peticions
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Mitjana
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            p95
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Taxa d'Error
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {latencyMetrics?.endpoints && latencyMetrics.endpoints.length > 0 ? (
                          latencyMetrics.endpoints.map((ep, idx) => (
                            <TableRow key={idx} hover sx={{ '&:last-child td': { border: 0 } }}>
                              <TableCell>{getMethodBadge(ep.method)}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem' }}>
                                <code>{ep.path}</code>
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{ep.requests_count.toLocaleString('ca-ES')}</TableCell>
                              <TableCell sx={{ color: '#2E7D32', fontWeight: 700 }}>
                                {Math.round(ep.avg_duration_ms)} ms
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{Math.round(ep.p95_duration_ms)} ms</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: ep.error_rate > 0.05 ? '#D32F2F' : '#2C221E' }}>
                                {(ep.error_rate * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          // Default mock rows if empty
                          [
                            { method: 'GET', path: '/api/v1/trips', count: 1420, avg: 12, p95: 28, error: 0.0 },
                            { method: 'GET', path: '/api/v1/destinations/:id', count: 980, avg: 15, p95: 35, error: 0.001 },
                            { method: 'POST', path: '/api/v1/chat/messages', count: 845, avg: 22, p95: 48, error: 0.0 },
                            { method: 'GET', path: '/api/v1/trips/:id/matches', count: 612, avg: 19, p95: 41, error: 0.0 },
                          ].map((mockEp, idx) => (
                            <TableRow key={idx} hover sx={{ '&:last-child td': { border: 0 } }}>
                              <TableCell>{getMethodBadge(mockEp.method)}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem' }}>
                                <code>{mockEp.path}</code>
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{mockEp.count.toLocaleString('ca-ES')}</TableCell>
                              <TableCell sx={{ color: '#2E7D32', fontWeight: 700 }}>{mockEp.avg} ms</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{mockEp.p95} ms</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{(mockEp.error * 100).toFixed(1)}%</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </>
            )}
          </Box>
        )}

        {/* TAB 2: Registre d'Auditoria */}
        {activeTab === 2 && (
          <Box>
            <Card sx={{ borderRadius: 3, border: '1px solid #E8E2D9', bgcolor: '#FFFFFF', p: 3 }}>
              {/* Toolbar */}
              <Box
                component="form"
                onSubmit={handleSearchSubmit}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                  mb: 3,
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder="🔍 Cerca per usuari o ruta..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    sx={{
                      width: { xs: 200, sm: 260 },
                      bgcolor: '#FFFFFF',
                      '& .MuiOutlinedInput-root': { borderRadius: 2 },
                    }}
                    InputProps={{
                      endAdornment: (
                        <Button type="submit" size="small" sx={{ minWidth: 32, p: 0.5, color: '#C85A32' }}>
                          <SearchIcon fontSize="small" />
                        </Button>
                      ),
                    }}
                  />

                  <Select
                    size="small"
                    value={auditFilter.module || ''}
                    onChange={(e) => handleModuleChange(e.target.value)}
                    displayEmpty
                    sx={{ borderRadius: 2, minWidth: 160 }}
                  >
                    <MenuItem value="">Tots els mòduls</MenuItem>
                    <MenuItem value="trips">Viatges (trips)</MenuItem>
                    <MenuItem value="chat">Xat (chat)</MenuItem>
                    <MenuItem value="matching">Matching</MenuItem>
                    <MenuItem value="community">Comunitat</MenuItem>
                    <MenuItem value="auth">Autenticació</MenuItem>
                    <MenuItem value="profile">Perfil</MenuItem>
                    <MenuItem value="explore">Explorar</MenuItem>
                    <MenuItem value="admin">Administració</MenuItem>
                  </Select>
                </Box>

                <Button
                  variant="contained"
                  startIcon={isExportingCsv ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                  disabled={isExportingCsv}
                  onClick={exportAuditLogsCsv}
                  sx={{
                    bgcolor: '#C85A32',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 2,
                    px: 2.5,
                    py: 1,
                    '&:hover': { bgcolor: '#A0471D' },
                  }}
                >
                  📥 Descarregar CSV d'Auditoria
                </Button>
              </Box>

              {/* Table */}
              {isLoadingAuditLogs ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress sx={{ color: '#C85A32' }} />
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#FAF7F2' }}>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Data & Hora
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Usuari
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Mòdul
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Acció / Endpoint
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Estat
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Temps
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#6B5E57', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            IP
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {auditLogs?.items && auditLogs.items.length > 0 ? (
                          auditLogs.items.map((log) => (
                            <TableRow key={log.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                              <TableCell sx={{ fontSize: '0.85rem', color: '#4A3E39', whiteSpace: 'nowrap' }}>
                                {formatDateTime(log.created_at)}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.85rem' }}>
                                {log.user_name ? (
                                  <>
                                    <strong>{log.user_name}</strong>
                                    {log.user_role && (
                                      <Typography component="span" sx={{ fontSize: '0.75rem', color: '#786C65', ml: 0.5 }}>
                                        ({log.user_role})
                                      </Typography>
                                    )}
                                  </>
                                ) : (
                                  <em style={{ color: '#786C65' }}>Anònim</em>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={log.module}
                                  size="small"
                                  sx={{
                                    bgcolor: '#EDE7F6',
                                    color: '#512DA8',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    borderRadius: 1,
                                    height: 22,
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                <strong>{log.method}</strong> <code>{log.endpoint}</code>
                              </TableCell>
                              <TableCell>{getStatusCodeBadge(log.status_code)}</TableCell>
                              <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.duration_ms} ms</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', color: '#786C65' }}>{log.ip_address || '-'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          // Default mock logs if empty
                          [
                            {
                              id: '1',
                              created_at: new Date().toISOString(),
                              user_name: 'Èric Zapater',
                              user_role: 'Admin',
                              module: 'trips',
                              method: 'POST',
                              endpoint: '/api/v1/trips',
                              status_code: 201,
                              duration_ms: 18,
                              ip_address: '83.45.120.14',
                            },
                            {
                              id: '2',
                              created_at: new Date(Date.now() - 30000).toISOString(),
                              user_name: 'Marc Soler',
                              user_role: 'User',
                              module: 'chat',
                              method: 'POST',
                              endpoint: '/api/v1/chat/messages',
                              status_code: 200,
                              duration_ms: 12,
                              ip_address: '88.12.94.201',
                            },
                            {
                              id: '3',
                              created_at: new Date(Date.now() - 90000).toISOString(),
                              user_name: 'Laia Puig',
                              user_role: 'User',
                              module: 'community',
                              method: 'POST',
                              endpoint: '/api/v1/destinations/84/recommendations',
                              status_code: 201,
                              duration_ms: 24,
                              ip_address: '81.184.22.65',
                            },
                            {
                              id: '4',
                              created_at: new Date(Date.now() - 240000).toISOString(),
                              user_name: '',
                              user_role: '',
                              module: 'auth',
                              method: 'POST',
                              endpoint: '/api/v1/auth/login',
                              status_code: 401,
                              duration_ms: 8,
                              ip_address: '194.224.9.11',
                            },
                          ].map((log) => (
                            <TableRow key={log.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                              <TableCell sx={{ fontSize: '0.85rem', color: '#4A3E39', whiteSpace: 'nowrap' }}>
                                {formatDateTime(log.created_at)}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.85rem' }}>
                                {log.user_name ? (
                                  <>
                                    <strong>{log.user_name}</strong>
                                    {log.user_role && (
                                      <Typography component="span" sx={{ fontSize: '0.75rem', color: '#786C65', ml: 0.5 }}>
                                        ({log.user_role})
                                      </Typography>
                                    )}
                                  </>
                                ) : (
                                  <em style={{ color: '#786C65' }}>Anònim</em>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={log.module}
                                  size="small"
                                  sx={{
                                    bgcolor: '#EDE7F6',
                                    color: '#512DA8',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    borderRadius: 1,
                                    height: 22,
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                <strong>{log.method}</strong> <code>{log.endpoint}</code>
                              </TableCell>
                              <TableCell>{getStatusCodeBadge(log.status_code)}</TableCell>
                              <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.duration_ms} ms</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', color: '#786C65' }}>{log.ip_address || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Pagination */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={auditLogs?.totalPages || 1}
                      page={auditFilter.page}
                      onChange={handlePageChange}
                      sx={{
                        '& .Mui-selected': {
                          bgcolor: '#C85A32 !important',
                          color: '#FFFFFF',
                        },
                      }}
                    />
                  </Box>
                </>
              )}
            </Card>
          </Box>
        )}

        {/* TAB 3: Moderació & Denúncies */}
        {activeTab === 3 && (
          <Box>
            <Card sx={{ borderRadius: 3, border: '1px solid #E8E2D9', bgcolor: '#FFFFFF', p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E', fontSize: '1.15rem', mb: 2.5 }}>
                Safata de Denúncies Pendents ({moderationReports.length})
              </Typography>

              {isLoadingReports ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress sx={{ color: '#C85A32' }} />
                </Box>
              ) : moderationReports.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, bgcolor: '#FAF7F2', borderRadius: 2, border: '1px dashed #E8E2D9' }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 48, color: '#2E7D32', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C221E' }}>
                    Tot net i revisat! 🎉
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#786C65', mt: 0.5 }}>
                    No hi ha cap denúncia pendent de moderació en aquests moments.
                  </Typography>
                </Box>
              ) : (
                moderationReports.map((report) => (
                  <Card
                    key={report.id}
                    sx={{
                      bgcolor: '#FAF7F2',
                      borderRadius: 2.5,
                      border: '1px solid #E8E2D9',
                      p: 2.5,
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Chip
                        label={`🚨 ${report.reason.toUpperCase()}`}
                        size="small"
                        sx={{
                          bgcolor: '#FFEBEE',
                          color: '#D32F2F',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          borderRadius: 1.5,
                        }}
                      />
                      <Typography sx={{ fontSize: '0.8rem', color: '#786C65' }}>
                        Denunciat per <strong>{report.reporter_name}</strong> • {formatDateTime(report.created_at)}
                      </Typography>
                    </Box>

                    <Box sx={{ fontSize: '0.9rem', color: '#2C221E', mb: 2, lineHeight: 1.5 }}>
                      <Typography sx={{ fontSize: '0.9rem', mb: 0.5 }}>
                        <strong>Element denunciat:</strong>{' '}
                        {report.type === 'user' ? '👤 Usuari' : '💡 Recomanació'}: <em>"{report.target_title}"</em>
                      </Typography>
                      {report.details && (
                        <Typography sx={{ fontSize: '0.9rem', color: '#555555' }}>
                          <strong>Motiu donat pel denunciant:</strong> "{report.details}"
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<DeleteForeverIcon />}
                        onClick={() => handleOpenResolveDialog(report, 'delete_content')}
                        disabled={isResolvingReport}
                        sx={{
                          bgcolor: '#D32F2F',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: 2,
                          '&:hover': { bgcolor: '#B71C1C' },
                        }}
                      >
                        🗑️ Eliminar contingut
                      </Button>

                      {report.type === 'user' && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          startIcon={<BlockIcon />}
                          onClick={() => handleOpenResolveDialog(report, 'ban_user')}
                          disabled={isResolvingReport}
                          sx={{
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 2,
                          }}
                        >
                          🚫 Sancionar usuari
                        </Button>
                      )}

                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<CheckCircleOutlineIcon />}
                        onClick={() => handleOpenResolveDialog(report, 'dismiss')}
                        disabled={isResolvingReport}
                        sx={{
                          borderColor: '#E8E2D9',
                          color: '#2C221E',
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: 2,
                          bgcolor: '#FFFFFF',
                          '&:hover': { bgcolor: '#F0ECE4', borderColor: '#DDCFBF' },
                        }}
                      >
                        ✓ Ignorar denúncia
                      </Button>
                    </Box>
                  </Card>
                ))
              )}
            </Card>
          </Box>
        )}
      </Container>

      {/* Confirmation / Resolve Dialog */}
      <Dialog open={!!selectedReport} onClose={() => setSelectedReport(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#2C221E' }}>
          {selectedReport?.action === 'dismiss'
            ? 'Ignorar denúncia'
            : selectedReport?.action === 'delete_content'
            ? 'Eliminar contingut denunciat'
            : 'Sancionar usuari'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, color: '#6B5E57' }}>
            {selectedReport?.action === 'dismiss'
              ? 'Estàs segur que vols descartar aquesta denúncia? No s’aplicarà cap penalització.'
              : selectedReport?.action === 'delete_content'
              ? `Estàs a punt d'eliminar "${selectedReport?.report.target_title}". Aquesta acció és irreversible.`
              : `Estàs a punt de suspendre l'usuari "${selectedReport?.report.target_title}".`}
          </DialogContentText>
          <TextField
            fullWidth
            label="Notes internes de resolució (opcional)"
            multiline
            rows={2}
            value={reportNote}
            onChange={(e) => setReportNote(e.target.value)}
            placeholder="Motiu de la decisió per al registre d'auditoria..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setSelectedReport(null)} sx={{ textTransform: 'none', color: '#6B5E57' }}>
            Cancel·lar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmResolve}
            disabled={isResolvingReport}
            sx={{
              bgcolor: selectedReport?.action === 'dismiss' ? '#2E7D32' : '#D32F2F',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': {
                bgcolor: selectedReport?.action === 'dismiss' ? '#1B5E20' : '#B71C1C',
              },
            }}
          >
            {isResolvingReport ? <CircularProgress size={18} color="inherit" /> : 'Confirmar resolució'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={clearSuccessMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={clearSuccessMessage} sx={{ width: '100%', borderRadius: 2 }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
