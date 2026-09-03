import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link as RouterLink } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { useTripStore } from '../store';
import { Trip, TripFilter } from '../types';
import ActiveTripHubCard from '@/modules/posttrip/components/ActiveTripHubCard';
import { usePostTripStore } from '@/modules/posttrip/store';

// Helper for date formatting without timezone shift
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const months = ['Gen', 'Febr', 'Març', 'Abr', 'Maig', 'Juny', 'Jul', 'Ag', 'Set', 'Oct', 'Nov', 'Des'];
  return `${day} ${months[monthIdx] || ''} ${year}`;
}

function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '';
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return `📅 ${formatDate(startDate)} – ${formatDate(endDate)}${diffDays > 0 ? ` (${diffDays} dies)` : ''}`;
}

function getVisibilityLabel(visibility: string): { label: string; bg: string; color: string } {
  switch (visibility) {
    case 'public':
      return { label: 'Públic (Matching)', bg: '#E8F5E9', color: '#2E7D32' };
    case 'contacts_only':
      return { label: 'Només contactes', bg: '#E3F2FD', color: '#1565C0' };
    case 'private':
    default:
      return { label: 'Privat', bg: '#F5F5F5', color: '#616161' };
  }
}

function getStatusBadge(status: string): { label: string; bg: string; color: string } {
  switch (status) {
    case 'ongoing':
      return { label: 'En curs', bg: '#FFF3E0', color: '#E65100' };
    case 'completed':
      return { label: 'Finalitzat', bg: '#E0E0E0', color: '#555555' };
    case 'cancelled':
      return { label: 'Cancel·lat', bg: '#FFEBEE', color: '#C62828' };
    case 'planned':
    default:
      return { label: 'Planificat', bg: '#EFEBE9', color: '#4E342E' };
  }
}

export default function TripsListView() {
  const { trips, fetchTrips, isLoading, error } = useTripStore();
  const { activeHub, fetchActiveHub } = usePostTripStore();
  const [filterTab, setFilterTab] = useState<TripFilter>('all');

  useEffect(() => {
    fetchTrips(filterTab);
    fetchActiveHub();
  }, [fetchTrips, fetchActiveHub, filterTab]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: TripFilter) => {
    setFilterTab(newValue);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingTrips = trips.filter((t) => t.end_date >= todayStr || t.status === 'ongoing' || t.status === 'planned');
  const pastTrips = trips.filter((t) => t.end_date < todayStr || t.status === 'completed');

  const renderTripCard = (trip: Trip, isPast = false) => {
    const vis = getVisibilityLabel(trip.visibility);
    const stat = getStatusBadge(trip.status);

    return (
      <Grid item xs={12} md={6} key={trip.id}>
        <Card
          sx={{
            borderRadius: 3,
            border: '1px solid #E8E2D9',
            boxShadow: '0 2px 10px rgba(74, 46, 43, 0.04)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            bgcolor: '#FFFFFF',
            opacity: isPast ? 0.88 : 1,
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 16px rgba(74, 46, 43, 0.08)',
            },
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography
                component={RouterLink}
                to={`/trips/${trip.id}`}
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: '#2C221E',
                  textDecoration: 'none',
                  '&:hover': { color: '#C85A32' },
                }}
              >
                {trip.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Chip
                  label={vis.label}
                  size="small"
                  sx={{
                    bgcolor: vis.bg,
                    color: vis.color,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    borderRadius: 2,
                  }}
                />
                {trip.status !== 'planned' && (
                  <Chip
                    label={stat.label}
                    size="small"
                    sx={{
                      bgcolor: stat.bg,
                      color: stat.color,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderRadius: 2,
                    }}
                  />
                )}
              </Box>
            </Box>

            <Typography variant="body2" sx={{ color: '#786C65', mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {formatDateRange(trip.start_date, trip.end_date)}
            </Typography>

            {trip.stages && trip.stages.length > 0 && (
              <Box
                sx={{
                  bgcolor: '#FAF7F2',
                  border: '1px solid #E8E2D9',
                  borderRadius: 2,
                  p: 1.5,
                  mb: 2,
                  flexGrow: 1,
                }}
              >
                {trip.stages.map((st, idx) => (
                  <Box
                    key={st.id || idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 1,
                      fontSize: '0.875rem',
                      color: '#4A3E39',
                      mb: idx < trip.stages.length - 1 ? 0.75 : 0,
                    }}
                  >
                    <Typography component="span" sx={{ color: '#C85A32', fontWeight: 700, fontSize: '0.875rem' }}>
                      {st.stage_order || idx + 1}.
                    </Typography>
                    <Typography component="span" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {st.destination_name} {st.country_code ? `(${st.country_code})` : ''}
                      {st.start_date && st.end_date && (
                        <Typography component="span" sx={{ color: '#786C65', ml: 0.5, fontSize: '0.8rem' }}>
                          — {formatDate(st.start_date)} a {formatDate(st.end_date)}
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #F0ECE4',
                pt: 1.5,
                mt: 'auto',
              }}
            >
              <Typography variant="caption" sx={{ color: '#786C65', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOnIcon sx={{ fontSize: 16 }} />
                {trip.stages?.length || 0} {trip.stages?.length === 1 ? 'destinació' : 'destinacions'}
              </Typography>
              <Button
                component={RouterLink}
                to={`/trips/${trip.id}`}
                endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                sx={{
                  color: '#C85A32',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  p: 0,
                  '&:hover': { bgcolor: 'transparent', color: '#A0471D' },
                }}
              >
                {isPast ? 'Veure resum' : 'Veure itinerari'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      {/* Main Container */}
      <Container maxWidth="md" sx={{ py: 5 }}>
        {/* Active Trip Hub Card if active */}
        {activeHub?.has_active_trip && (
          <ActiveTripHubCard hubData={activeHub} />
        )}

        {/* Title and Action */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C221E', fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
            Els meus viatges
          </Typography>
          <Button
            component={RouterLink}
            to="/trips/new"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              bgcolor: '#C85A32',
              color: '#FFFFFF',
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: 2,
              '&:hover': { bgcolor: '#A0471D' },
            }}
          >
            Nou viatge
          </Button>
        </Box>

        {/* Filter Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: '#E8E2D9', mb: 4 }}>
          <Tabs
            value={filterTab}
            onChange={handleTabChange}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: '#C85A32' } }}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                color: '#786C65',
                '&.Mui-selected': { color: '#C85A32' },
              },
            }}
          >
            <Tab label="Tots els viatges" value="all" />
            <Tab label="Propers i en curs" value="upcoming" />
            <Tab label="Passats" value="past" />
          </Tabs>
        </Box>

        {/* Loading / Error States */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {/* Content */}
        {!isLoading && !error && trips.length === 0 && (
          <Card
            sx={{
              p: 5,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px dashed #DDCFBF',
              bgcolor: '#FAF7F2',
            }}
          >
            <CalendarTodayIcon sx={{ fontSize: 48, color: '#8C7A70', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#2C221E', fontWeight: 600, mb: 1 }}>
              Encara no tens cap viatge registrat
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65', mb: 3 }}>
              Crea el teu primer viatge amb les teves etapes per trobar gent de la teva terra arreu del món.
            </Typography>
            <Button
              component={RouterLink}
              to="/trips/new"
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                bgcolor: '#C85A32',
                '&:hover': { bgcolor: '#A0471D' },
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
              }}
            >
              Crear el primer viatge
            </Button>
          </Card>
        )}

        {!isLoading && !error && trips.length > 0 && (
          <>
            {filterTab === 'all' ? (
              <>
                {upcomingTrips.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#3E2723', mb: 2 }}>
                      Viatges propers i en curs
                    </Typography>
                    <Grid container spacing={3}>
                      {upcomingTrips.map((trip) => renderTripCard(trip, false))}
                    </Grid>
                  </Box>
                )}

                {pastTrips.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#3E2723', mb: 2 }}>
                      Viatges passats
                    </Typography>
                    <Grid container spacing={3}>
                      {pastTrips.map((trip) => renderTripCard(trip, true))}
                    </Grid>
                  </Box>
                )}
              </>
            ) : (
              <Grid container spacing={3}>
                {trips.map((trip) => renderTripCard(trip, filterTab === 'past'))}
              </Grid>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
