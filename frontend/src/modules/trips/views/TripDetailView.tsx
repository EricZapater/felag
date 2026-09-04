import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { useTripStore } from '../store';
import ActiveTripHubCard from '@/modules/posttrip/components/ActiveTripHubCard';
import { usePostTripStore } from '@/modules/posttrip/store';

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
  return `${formatDate(startDate)} – ${formatDate(endDate)}${diffDays > 0 ? ` (${diffDays} dies)` : ''}`;
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
      return { label: 'Pla actiu', bg: '#E8F5E9', color: '#2E7D32' };
  }
}

export default function TripDetailView() {
  const { id } = useParams<{ id: string }>();
  const { currentTrip, fetchTripById, deleteTrip, isLoading, error } = useTripStore();
  const { activeHub, fetchActiveHub } = usePostTripStore();
  const navigate = useNavigate();

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTripById(id);
      fetchActiveHub().catch(() => {});
    }
  }, [id, fetchTripById, fetchActiveHub]);

  const handleDeleteConfirm = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteTrip(id);
      setOpenDeleteDialog(false);
      navigate('/trips');
    } catch (err) {
      setIsDeleting(false);
    }
  };

  if (isLoading && !currentTrip) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: '#C85A32' }} />
      </Box>
    );
  }

  if (error || !currentTrip) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0', py: 5 }}>
        <Container maxWidth="md">
          <Button
            component={RouterLink}
            to="/trips"
            startIcon={<ArrowBackIcon />}
            sx={{ color: '#C85A32', mb: 3, textTransform: 'none', fontWeight: 600 }}
          >
            Tornar a la llista de viatges
          </Button>
          <Alert severity="error">{error || 'No s’ha trobat el viatge sol·licitat.'}</Alert>
        </Container>
      </Box>
    );
  }

  const vis = getVisibilityLabel(currentTrip.visibility);
  const stat = getStatusBadge(currentTrip.status);
  const sortedStages = [...(currentTrip.stages || [])].sort((a, b) => a.stage_order - b.stage_order);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      {/* Main Container */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          component={RouterLink}
          to="/trips"
          startIcon={<ArrowBackIcon />}
          sx={{
            color: '#C85A32',
            textTransform: 'none',
            fontWeight: 600,
            mb: 3,
            '&:hover': { bgcolor: 'transparent', color: '#A0471D' },
          }}
        >
          ‹ Tornar a la llista de viatges
        </Button>

        {/* Hub d'accions del viatge (Cards) */}
        <ActiveTripHubCard
          hubData={activeHub && activeHub.trip_id === currentTrip.id ? activeHub : undefined}
          tripId={currentTrip.id}
          tripTitle={currentTrip.title}
          destinationName={sortedStages[0]?.destination_name || 'Viatge'}
          countryFlag={sortedStages[0]?.country_code ? '✈️' : '🌍'}
          isFinalDayOrPast={currentTrip.end_date <= new Date().toISOString().split('T')[0] || currentTrip.status === 'completed'}
          photosCount={activeHub && activeHub.trip_id === currentTrip.id ? activeHub.photos_count : 0}
          activeFelagisCount={activeHub && activeHub.trip_id === currentTrip.id ? activeHub.active_felagis_count : 0}
        />

        <Card
          sx={{
            bgcolor: '#FFFFFF',
            border: '1px solid #E8E2D9',
            borderRadius: 3,
            p: { xs: 2, md: 4 },
            boxShadow: '0 2px 12px rgba(74, 46, 43, 0.05)',
            mb: 3,
          }}
        >
          <CardContent sx={{ p: { xs: 1, md: 2 } }}>
            {/* Top Info */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C221E', mb: 1, fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
                  {currentTrip.title}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, color: '#786C65', fontSize: '0.95rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarTodayIcon sx={{ fontSize: 18, color: '#8C7A70' }} />
                    <Typography variant="body2">{formatDateRange(currentTrip.start_date, currentTrip.end_date)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationOnIcon sx={{ fontSize: 18, color: '#8C7A70' }} />
                    <Typography variant="body2">{sortedStages.length} {sortedStages.length === 1 ? 'etapa' : 'etapes'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <VisibilityIcon sx={{ fontSize: 18, color: '#8C7A70' }} />
                    <Typography variant="body2">{vis.label}</Typography>
                  </Box>
                </Box>
              </Box>

              <Chip
                label={stat.label}
                sx={{
                  bgcolor: stat.bg,
                  color: stat.color,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  borderRadius: 2,
                  px: 1,
                }}
              />
            </Box>

            {currentTrip.description && (
              <Typography variant="body1" sx={{ color: '#4A3E39', my: 2, fontStyle: 'italic' }}>
                {currentTrip.description}
              </Typography>
            )}

            {/* Timeline Section */}
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#3E2723', mt: 4, mb: 3 }}>
              Itinerari detallat
            </Typography>

            {sortedStages.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#786C65' }}>
                Aquest viatge no té etapes definides.
              </Typography>
            ) : (
              <Box sx={{ position: 'relative', pl: 4, ml: 1 }}>
                {/* Vertical Timeline Bar */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: 14,
                    top: 16,
                    bottom: 16,
                    width: 2,
                    bgcolor: '#DDCFBF',
                  }}
                />

                {sortedStages.map((stage, idx) => (
                  <Box key={stage.id || idx} sx={{ position: 'relative', mb: 3.5, '&:last-child': { mb: 0 } }}>
                    {/* Circle Dot Badge */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: -32,
                        top: 8,
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        bgcolor: '#C85A32',
                        color: '#FFFFFF',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        border: '2px solid #FFFFFF',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        zIndex: 1,
                      }}
                    >
                      {stage.stage_order || idx + 1}
                    </Box>

                    {/* Stage Card */}
                    <Box
                      sx={{
                        bgcolor: '#FAF7F2',
                        border: '1px solid #E8E2D9',
                        borderRadius: 2,
                        p: 2.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2C221E' }}>
                          {stage.destination_name} {stage.country_code ? `(${stage.country_code})` : ''}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#703817', fontWeight: 600 }}>
                          {formatDateRange(stage.start_date, stage.end_date)}
                        </Typography>
                      </Box>
                      {stage.notes && (
                        <Typography variant="body2" sx={{ color: '#786C65', mt: 0.5, mb: 1 }}>
                          {stage.notes}
                        </Typography>
                      )}
                      <Box sx={{ mt: 1 }}>
                        <Button
                          component={RouterLink}
                          to={`/destinations/${stage.town_id || stage.country_code || encodeURIComponent(stage.destination_name)}`}
                          size="small"
                          sx={{
                            color: '#C85A32',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            p: 0,
                            minWidth: 0,
                            '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                          }}
                        >
                          🗺️ Veure guia i recomanacions de {stage.destination_name}
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Matching Banner */}
            {currentTrip.visibility === 'public' && (
              <Box
                sx={{
                  bgcolor: '#F4ECE1',
                  border: '1px solid #DDCFBF',
                  borderRadius: 2,
                  p: 2.5,
                  mt: 4,
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ color: '#703817', fontWeight: 700, mb: 0.5 }}>
                    ✨ FELAG Matching
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#8C7A70' }}>
                    Troba altres viatgers del teu poble o regió que coincideixen en dates i destinacions.
                  </Typography>
                </Box>
                <Button
                  component={RouterLink}
                  to={`/trips/${currentTrip.id}/matches`}
                  variant="contained"
                  startIcon={<AutoAwesomeIcon />}
                  sx={{
                    bgcolor: '#C85A32',
                    color: '#FFFFFF',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 2.5,
                    py: 1,
                    borderRadius: 2,
                    whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: '#A0471D' },
                  }}
                >
                  Veure coincidències
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          {currentTrip.visibility === 'public' ? (
            <Button
              component={RouterLink}
              to={`/trips/${currentTrip.id}/matches`}
              variant="outlined"
              startIcon={<AutoAwesomeIcon />}
              sx={{
                color: '#C85A32',
                borderColor: '#C85A32',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                '&:hover': { bgcolor: '#F4ECE1', borderColor: '#A0471D' },
              }}
            >
              Coincidències FELAGIS ✨
            </Button>
          ) : (
            <Box />
          )}

          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => setOpenDeleteDialog(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
            }}
          >
            Eliminar viatge
          </Button>
        </Box>
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => !isDeleting && setOpenDeleteDialog(false)}>
        <DialogTitle sx={{ fontWeight: 700, color: '#2C221E' }}>Confirmar eliminació del viatge</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#786C65' }}>
            Estàs segur que vols eliminar el viatge <strong>"{currentTrip.title}"</strong>? Aquesta acció no es pot desfer i s'eliminaran totes les etapes associades.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} disabled={isDeleting} sx={{ color: '#786C65' }}>
            Cancel·lar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
          >
            {isDeleting ? 'Eliminant...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
