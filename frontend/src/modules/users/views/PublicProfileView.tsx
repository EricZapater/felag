import { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  Avatar,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatIcon from '@mui/icons-material/Chat';
import { useParams, useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { usePublicProfileStore } from '../store';
import { useChatStore } from '@/modules/chat/store';

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

function getUserInitials(name: string): string {
  if (!name) return 'FL';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PublicProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, fetchPublicProfile, isLoading, error } = usePublicProfileStore();
  const { createOrGetConversation, isSending } = useChatStore();

  useEffect(() => {
    if (id) {
      fetchPublicProfile(id);
    }
  }, [id, fetchPublicProfile]);

  const handleOpenChat = async () => {
    if (!id) return;
    try {
      const conv = await createOrGetConversation(id);
      navigate(`/chats/${conv.id}`);
    } catch (err) {
      // Error handled by store
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      <Container maxWidth="sm" sx={{ py: 4 }}>
        {/* Back Link */}
        <Button
          onClick={() => navigate(-1)}
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
          ‹ Tornar
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {isLoading && !profile && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        )}

        {profile && (
          <>
            {/* Profile Card */}
            <Card
              sx={{
                bgcolor: '#FFFFFF',
                border: '1px solid #E8E2D9',
                borderRadius: 3,
                p: { xs: 3, sm: 4 },
                boxShadow: '0 2px 12px rgba(74, 46, 43, 0.05)',
                textAlign: 'center',
                mb: 3,
              }}
            >
              <Avatar
                src={profile.avatar_url || undefined}
                sx={{
                  width: 96,
                  height: 96,
                  bgcolor: '#F4ECE1',
                  color: '#703817',
                  border: '3px solid #C85A32',
                  fontSize: 32,
                  fontWeight: 700,
                  mx: 'auto',
                  mb: 2,
                }}
              >
                {getUserInitials(profile.name)}
              </Avatar>

              <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C221E', mb: 1 }}>
                {profile.name}
              </Typography>

              {profile.origin_summary && (
                <Box
                  sx={{
                    display: 'inline-block',
                    bgcolor: '#FFF3E0',
                    color: '#E65100',
                    border: '1px solid #FFE0B2',
                    px: 2,
                    py: 0.6,
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    mb: 2,
                  }}
                >
                  📍 {profile.origin_summary}
                </Box>
              )}

              {profile.bio ? (
                <Typography
                  variant="body1"
                  sx={{
                    color: '#4A3E39',
                    lineHeight: 1.55,
                    maxWidth: 500,
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  {profile.bio}
                </Typography>
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    color: '#786C65',
                    fontStyle: 'italic',
                    mb: 3,
                  }}
                >
                  Aquest viatger encara no ha afegit cap biografia.
                </Typography>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  onClick={handleOpenChat}
                  disabled={isSending}
                  startIcon={<ChatIcon />}
                  sx={{
                    bgcolor: '#C85A32',
                    color: '#FFFFFF',
                    px: 3.5,
                    py: 1.2,
                    borderRadius: '24px',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    '&:hover': { bgcolor: '#A0471D' },
                  }}
                >
                  Obrir Xat 💬
                </Button>
              </Box>
            </Card>

            {/* Public Trips Card */}
            <Card
              sx={{
                bgcolor: '#FFFFFF',
                border: '1px solid #E8E2D9',
                borderRadius: 3,
                p: { xs: 2.5, sm: 3 },
                boxShadow: '0 2px 10px rgba(74, 46, 43, 0.04)',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C221E', mb: 2 }}>
                Viatges públics
              </Typography>

              {(!profile.public_trips || profile.public_trips.length === 0) ? (
                <Typography variant="body2" sx={{ color: '#786C65' }}>
                  Aquest usuari no té cap viatge públic actiu.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {profile.public_trips.map((trip, idx) => (
                    <Box
                      key={trip.id}
                      sx={{
                        py: 1.8,
                        borderBottom:
                          idx < (profile.public_trips?.length || 0) - 1
                            ? '1px solid #E8E2D9'
                            : 'none',
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 0.5,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 700, color: '#2C221E', lineHeight: 1.2 }}
                        >
                          {trip.title}
                        </Typography>
                        {trip.destination_summary && (
                          <Typography variant="caption" sx={{ color: '#786C65' }}>
                            📍 {trip.destination_summary}
                          </Typography>
                        )}
                      </Box>

                      <Typography
                        variant="caption"
                        sx={{ color: '#786C65', fontWeight: 500, fontSize: '0.8rem' }}
                      >
                        📅 {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Card>
          </>
        )}
      </Container>
    </Box>
  );
}
