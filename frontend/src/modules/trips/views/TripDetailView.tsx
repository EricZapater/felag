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
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useTripStore } from '../store';

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
  const navigate = useNavigate();

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTripById(id);
    }
  }, [id, fetchTripById]);

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
      {/* Top Header */}
      <Box
        component="header"
        sx={{
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E8E2D9',
          px: { xs: 2, md: 5 },
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Typography
            component={RouterLink}
            to="/trips"
            variant="h5"
            sx={{
              color: '#C85A32',
              fontWeight: 700,
              letterSpacing: 1,
              textDecoration: 'none',
            }}
          >
            FELAG
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Typography
              component={RouterLink}
              to="/trips"
              sx={{
                color: '#C85A32',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              Viatges
            </Typography>
            <Typography
              component={RouterLink}
              to="/profile"
              sx={{
                color: '#786C65',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: 15,
                '&:hover': { color: '#C85A32' },
              }}
            >
              Perfil
            </Typography>
          </Box>
        </Box>
      </Box>

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
                        <Typography variant="body2" sx={{ color: '#786C65', mt: 1 }}>
                          {stage.notes}
                        </Typography>
                      )}
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
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ color: '#703817', fontWeight: 700, mb: 0.5 }}>
                    ✨ FELAG Matching (Fase 3)
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#8C7A70' }}>
                    Aquest viatge buscarà coincidències amb altres usuaris de la teva terra que coincideixin en aquestes dates i destinacions.
                  </Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
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
