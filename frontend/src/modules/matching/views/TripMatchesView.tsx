import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Container,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { useMatchingStore } from '../store';
import { useTripStore } from '@/modules/trips/store';
import { useChatStore } from '@/modules/chat/store';
import { Match, AffinityLevel } from '../types';

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

function calculateDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function getAffinityBadgeConfig(level: AffinityLevel): { label: string; bg: string; color: string; border: string } {
  switch (level) {
    case 'town':
      return {
        label: '🥇 Mateix Poble',
        bg: '#FFF3E0',
        color: '#E65100',
        border: '#FFE0B2',
      };
    case 'region':
      return {
        label: '🥈 Mateixa Regió',
        bg: '#F4ECE1',
        color: '#703817',
        border: '#DDCFBF',
      };
    case 'country':
    default:
      return {
        label: '🥉 Mateix País',
        bg: '#EAE6E1',
        color: '#4A3E39',
        border: '#D1C9C0',
      };
  }
}

export default function TripMatchesView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { matches, fetchTripMatches, isLoading, error } = useMatchingStore();
  const { currentTrip, fetchTripById } = useTripStore();
  const { createOrGetConversation } = useChatStore();

  const [selectedContactUser, setSelectedContactUser] = useState<Match | null>(null);

  useEffect(() => {
    if (id) {
      fetchTripMatches(id);
      fetchTripById(id);
    }
  }, [id]);

  const getUserInitials = (name: string): string => {
    if (!name) return 'FL';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Back button */}
        <Button
          component={RouterLink}
          to={`/trips/${id}`}
          startIcon={<ArrowBackIcon />}
          sx={{
            color: '#C85A32',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 14,
            mb: 2.5,
            '&:hover': { bgcolor: 'transparent', color: '#A0471D' },
          }}
        >
          ‹ Tornar al detall del viatge
        </Button>

        {/* Trip Banner */}
        {currentTrip && (
          <Card
            sx={{
              bgcolor: '#FFFFFF',
              border: '1px solid #E8E2D9',
              borderRadius: 3,
              p: 3,
              boxShadow: '0 2px 12px rgba(74, 46, 43, 0.05)',
              mb: 3.5,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C221E', mb: 0.5 }}>
              {currentTrip.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65' }}>
              📅 {formatDate(currentTrip.start_date)} – {formatDate(currentTrip.end_date)}
              {currentTrip.stages && currentTrip.stages.length > 0 && (
                <> • 📍 {currentTrip.stages.map((s) => s.destination_name).join(', ')}</>
              )}
            </Typography>
          </Card>
        )}

        {/* Matches Header / Count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AutoAwesomeIcon sx={{ color: '#C85A32', fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#3E2723', fontSize: '1.15rem' }}>
            {matches.length} {matches.length === 1 ? 'FELAGI coincident trobat' : 'FELAGIS coincidents trobats'}
          </Typography>
        </Box>

        {/* Loading and Error */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Empty state */}
        {!isLoading && !error && matches.length === 0 && (
          <Card
            sx={{
              p: 5,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px dashed #DDCFBF',
              bgcolor: '#FAF7F2',
            }}
          >
            <PeopleOutlineIcon sx={{ fontSize: 52, color: '#8C7A70', mb: 1.5 }} />
            <Typography variant="h6" sx={{ color: '#2C221E', fontWeight: 600, mb: 1 }}>
              Encara no s’han trobat coincidències
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65', maxWidth: 500, mx: 'auto' }}>
              Aquest viatge és públic. Quan altres usuaris del teu poble, comarca o país coincideixin amb tu en dates i destinacions, apareixeran automàticament en aquesta llista.
            </Typography>
          </Card>
        )}

        {/* Matches list */}
        {!isLoading && !error && matches.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {matches.map((match) => {
              const badge = getAffinityBadgeConfig(match.affinity_level);
              const days = calculateDays(match.overlap_start_date, match.overlap_end_date);

              return (
                <Card
                  key={match.id}
                  sx={{
                    bgcolor: '#FFFFFF',
                    border: '1px solid #E8E2D9',
                    borderRadius: 3,
                    p: 3,
                    boxShadow: '0 2px 10px rgba(74, 46, 43, 0.04)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 16px rgba(74, 46, 43, 0.08)',
                    },
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 2.5,
                  }}
                >
                  {/* Left Felagi info */}
                  <Box
                    component={RouterLink}
                    to={`/users/${match.matched_user.id}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2.5,
                      textDecoration: 'none',
                      color: 'inherit',
                      '&:hover .felagi-name': { color: '#C85A32' },
                    }}
                  >
                    <Avatar
                      src={match.matched_user.avatar_url || undefined}
                      sx={{
                        width: 64,
                        height: 64,
                        bgcolor: '#F4ECE1',
                        color: '#703817',
                        border: '2px solid #C85A32',
                        fontSize: 22,
                        fontWeight: 700,
                      }}
                    >
                      {getUserInitials(match.matched_user.name)}
                    </Avatar>

                    <Box>
                      <Typography
                        className="felagi-name"
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: '#2C221E',
                          lineHeight: 1.2,
                          mb: 0.5,
                          transition: 'color 0.2s',
                        }}
                      >
                        {match.matched_user.name}
                      </Typography>
                      {match.matched_user.origin_summary && (
                        <Typography variant="body2" sx={{ color: '#703817', fontWeight: 600, mb: 0.8 }}>
                          📍 Origen: {match.matched_user.origin_summary}
                        </Typography>
                      )}
                      <Box
                        sx={{
                          display: 'inline-block',
                          bgcolor: '#FAF7F2',
                          border: '1px solid #E8E2D9',
                          borderRadius: 1.5,
                          px: 1.5,
                          py: 0.5,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: '#786C65', fontWeight: 500, fontSize: '0.8rem' }}>
                          ✨ {match.explanation}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Right Meta and action */}
                  <Box
                    sx={{
                      textAlign: { xs: 'left', sm: 'right' },
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: { xs: 'flex-start', sm: 'flex-end' },
                      width: { xs: '100%', sm: 'auto' },
                      mt: { xs: 1, sm: 0 },
                    }}
                  >
                    <Chip
                      label={badge.label}
                      sx={{
                        bgcolor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        borderRadius: 3,
                        mb: 1,
                      }}
                    />
                    <Typography variant="body2" sx={{ color: '#4A3E39', fontWeight: 600, mb: 1.5, fontSize: '0.85rem' }}>
                      📅 {formatDate(match.overlap_start_date)} – {formatDate(match.overlap_end_date)} ({days} dies a {match.destination_name})
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => setSelectedContactUser(match)}
                      sx={{
                        bgcolor: '#C85A32',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.825rem',
                        textTransform: 'none',
                        px: 2.2,
                        py: 0.8,
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: '#A0471D' },
                      }}
                    >
                      Connectar amb {match.matched_user.name.split(' ')[0]}
                    </Button>
                  </Box>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>

      {/* Connect Modal Dialog */}
      <Dialog
        open={Boolean(selectedContactUser)}
        onClose={() => setSelectedContactUser(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#2C221E' }}>
          Connectar amb {selectedContactUser?.matched_user.name}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#786C65', mb: 2 }}>
            Tots dos sou {selectedContactUser?.matched_user.origin_summary ? `de ${selectedContactUser.matched_user.origin_summary}` : 'de la mateixa terra'} i coincidireu a {selectedContactUser?.destination_name}.
          </DialogContentText>
          <Box sx={{ bgcolor: '#FAF7F2', p: 2, borderRadius: 2, border: '1px solid #E8E2D9' }}>
            <Typography variant="body2" sx={{ color: '#4A3E39', fontWeight: 600 }}>
              📅 Dates coincidents:
            </Typography>
            <Typography variant="body2" sx={{ color: '#703817' }}>
              {selectedContactUser && formatDate(selectedContactUser.overlap_start_date)} – {selectedContactUser && formatDate(selectedContactUser.overlap_end_date)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedContactUser(null)} sx={{ color: '#786C65' }}>
            Tancar
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (selectedContactUser) {
                const targetMatch = selectedContactUser;
                setSelectedContactUser(null);
                try {
                  const conv = await createOrGetConversation(
                    targetMatch.matched_user.id,
                    targetMatch.id
                  );
                  navigate(`/chats/${conv.id}`);
                } catch (err) {
                  // Handled
                }
              }
            }}
            sx={{ bgcolor: '#C85A32', '&:hover': { bgcolor: '#A0471D' }, textTransform: 'none', fontWeight: 600 }}
          >
            Enviar salutació
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
