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
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { useTripStore } from '../store';
import { tripsApi } from '../api';
import { CompanionSelector } from '../components/CompanionSelector';
import { FelagiUserSummary } from '../types';
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

  // Travel companions state
  const [openAddCompanionDialog, setOpenAddCompanionDialog] = useState(false);
  const [selectedNewCompanions, setSelectedNewCompanions] = useState<FelagiUserSummary[]>([]);
  const [isSubmittingCompanion, setIsSubmittingCompanion] = useState(false);
  const [companionActionError, setCompanionActionError] = useState<string | null>(null);

  const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

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

  const handleAddCompanionsConfirm = async () => {
    if (!id || selectedNewCompanions.length === 0) return;
    setIsSubmittingCompanion(true);
    setCompanionActionError(null);
    try {
      for (const comp of selectedNewCompanions) {
        await tripsApi.addCompanion(id, comp.id);
      }
      setSelectedNewCompanions([]);
      setOpenAddCompanionDialog(false);
      await fetchTripById(id);
    } catch (err: any) {
      setCompanionActionError(err?.response?.data?.error || 'Error en afegir acompanyants');
    } finally {
      setIsSubmittingCompanion(false);
    }
  };

  const handleRemoveCompanion = async (companionUserId: string) => {
    if (!id) return;
    try {
      await tripsApi.removeCompanion(id, companionUserId);
      await fetchTripById(id);
    } catch (err: any) {
      setCompanionActionError(err?.response?.data?.error || 'Error en eliminar acompanyant');
    }
  };

  const handleLeaveTripConfirm = async () => {
    if (!id) return;
    setIsLeaving(true);
    try {
      // For leave trip, if the companion removes themselves:
      // Note: we can find companion record for current user or pass current user ID.
      // In the backend repository, DeleteCompanion removes from trip_companions matching trip_id and user_id.
      // If user is companion, we can pass their user_id or use API.
      // Since backend verifies user is companion or owner, we can call removeCompanion with the user's ID or delete endpoint
      const meCompanion = currentTrip?.companions?.find((c) => c.role !== 'owner');
      if (meCompanion) {
        await tripsApi.removeCompanion(id, meCompanion.user_id);
      }
      setOpenLeaveDialog(false);
      navigate('/trips');
    } catch (err: any) {
      setIsLeaving(false);
      setCompanionActionError(err?.response?.data?.error || 'Error en sortir del viatge');
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

            {/* Travel Companions Section */}
            <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #E8E2D9' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupIcon sx={{ color: '#C85A32' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#3E2723' }}>
                    Amb qui viatjo ({currentTrip.companions?.length || 1})
                  </Typography>
                </Box>
                {currentTrip.is_owner !== false && (
                  <Button
                    startIcon={<PersonAddIcon />}
                    size="small"
                    onClick={() => {
                      setSelectedNewCompanions([]);
                      setCompanionActionError(null);
                      setOpenAddCompanionDialog(true);
                    }}
                    sx={{
                      color: '#C85A32',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { bgcolor: '#F4ECE1' },
                    }}
                  >
                    Afegir acompanyant
                  </Button>
                )}
              </Box>

              {companionActionError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCompanionActionError(null)}>
                  {companionActionError}
                </Alert>
              )}

              <Typography variant="body2" sx={{ color: '#786C65', mb: 2 }}>
                Tots els viatgers d'aquest grup comparteixen l'àlbum de fotos i el tancament de viatge, i poden trobar altres viatgers externs, però mai faran match entre ells.
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                {(currentTrip.companions || []).map((comp) => {
                  const isCreator = comp.role === 'owner';
                  return (
                    <Box
                      key={comp.id || comp.user_id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: '#FAF7F2',
                        border: '1px solid #E8E2D9',
                        borderRadius: 2,
                        p: 1.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Avatar
                          src={comp.avatar_url || undefined}
                          sx={{ bgcolor: isCreator ? '#C85A32' : '#8C7A70', width: 38, height: 38, fontSize: '0.9rem', fontWeight: 700 }}
                        >
                          {(comp.name || 'F').slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: '#2C221E' }}>
                            {comp.name || 'Felagi'}
                          </Typography>
                          <Typography variant="caption" noWrap sx={{ color: '#786C65', display: 'block' }}>
                            {comp.town_name ? `📍 ${comp.town_name}` : comp.origin_summary || 'FELAGI'}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={isCreator ? '👑 Creador' : '✈️ Acompanyant'}
                          size="small"
                          sx={{
                            bgcolor: isCreator ? '#FFF3E0' : '#EDE7F6',
                            color: isCreator ? '#E65100' : '#512DA8',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            borderRadius: 1.5,
                          }}
                        />
                        {currentTrip.is_owner !== false && !isCreator && (
                          <Tooltip title="Eliminar del viatge">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveCompanion(comp.user_id)}
                              sx={{ color: '#D32F2F', p: 0.5 }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>

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

          {currentTrip.is_owner !== false ? (
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
          ) : (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<ExitToAppIcon />}
              onClick={() => setOpenLeaveDialog(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
              }}
            >
              Sortir del viatge
            </Button>
          )}
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

      {/* Leave Trip Dialog */}
      <Dialog open={openLeaveDialog} onClose={() => !isLeaving && setOpenLeaveDialog(false)}>
        <DialogTitle sx={{ fontWeight: 700, color: '#2C221E' }}>Sortir del viatge</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#786C65' }}>
            Estàs segur que vols sortir del viatge <strong>"{currentTrip.title}"</strong>? Ja no apareixeràs com a acompanyant ni tindràs accés a l'àlbum compartit.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenLeaveDialog(false)} disabled={isLeaving} sx={{ color: '#786C65' }}>
            Cancel·lar
          </Button>
          <Button
            onClick={handleLeaveTripConfirm}
            color="warning"
            variant="contained"
            disabled={isLeaving}
            sx={{ bgcolor: '#ED6C02', '&:hover': { bgcolor: '#C75B00' } }}
          >
            {isLeaving ? 'Sortint...' : 'Sortir del viatge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Companions Dialog */}
      <Dialog open={openAddCompanionDialog} onClose={() => !isSubmittingCompanion && setOpenAddCompanionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#2C221E' }}>Afegir acompanyants al viatge</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#786C65', mb: 2 }}>
            Cerca usuaris de FELAG pel seu nom o àlies per afegir-los al viatge. Compartiran el mateix itinerari i l'àlbum de records.
          </DialogContentText>
          <CompanionSelector
            selectedCompanions={selectedNewCompanions}
            onChange={setSelectedNewCompanions}
            excludedUserIds={(currentTrip.companions || []).map((c) => c.user_id)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddCompanionDialog(false)} disabled={isSubmittingCompanion} sx={{ color: '#786C65' }}>
            Cancel·lar
          </Button>
          <Button
            onClick={handleAddCompanionsConfirm}
            variant="contained"
            disabled={isSubmittingCompanion || selectedNewCompanions.length === 0}
            sx={{ bgcolor: '#C85A32', '&:hover': { bgcolor: '#A0471D' } }}
          >
            {isSubmittingCompanion ? 'Afegint...' : `Afegir ${selectedNewCompanions.length > 0 ? `(${selectedNewCompanions.length})` : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
