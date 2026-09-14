import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardMedia,
  Grid,
  Dialog,
  DialogContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { inspirationApi } from '../api';
import { PublicTripSummary } from '@/modules/community/types';
import { useChatStore } from '@/modules/chat/store';

export default function PublicTripDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createOrGetConversation } = useChatStore();

  const [trip, setTrip] = useState<PublicTripSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isConnectingChat, setIsConnectingChat] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    inspirationApi
      .getPublicTripDetail(id)
      .then((data) => {
        setTrip(data);
      })
      .catch((err: any) => {
        setError(err.response?.data?.error?.message || 'No s’ha pogut carregar el detall del viatge.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleStartChat = async () => {
    if (!trip?.author?.id || isConnectingChat) return;
    setIsConnectingChat(true);
    try {
      const conv = await createOrGetConversation(trip.author.id);
      if (conv && conv.id) {
        navigate(`/chats/${conv.id}`);
      } else {
        navigate('/chats');
      }
    } catch {
      navigate('/chats');
    } finally {
      setIsConnectingChat(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: trip?.title || 'Viatge a FELAG',
          text: `Mira aquest itinerari de viatge compartit a FELAG: ${trip?.title}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const coverPhoto =
    trip?.photos?.find((p) => p.is_cover)?.photo_url ||
    trip?.photos?.[0]?.photo_url ||
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Back Link */}
        <Button
          component={RouterLink}
          to="/inspiration"
          startIcon={<ArrowBackIcon />}
          sx={{
            color: '#C85A32',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            mb: 2.5,
            '&:hover': { bgcolor: 'transparent', color: '#A0471D' },
          }}
        >
          ‹ Tornar a Inspiració
        </Button>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: 3 }}>
            {error}
          </Alert>
        ) : trip ? (
          <Box>
            {/* Header Hero Card */}
            <Card
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                border: '1px solid #E8E2D9',
                boxShadow: '0 8px 32px rgba(44, 34, 30, 0.08)',
                bgcolor: '#FFFFFF',
                mb: 4,
              }}
            >
              {/* Cover Banner */}
              <Box sx={{ position: 'relative', height: { xs: 220, sm: 320 } }}>
                <CardMedia
                  component="img"
                  image={coverPhoto}
                  alt={trip.title}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    display: 'flex',
                    gap: 1,
                  }}
                >
                  <Chip
                    label="🗺️ Itinerari Verificat"
                    sx={{
                      bgcolor: 'rgba(44, 34, 30, 0.9)',
                      backdropFilter: 'blur(6px)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                  }}
                >
                  <Tooltip title={copiedLink ? 'Enllaç copiat!' : 'Compartir viatge'}>
                    <IconButton
                      onClick={handleShare}
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(6px)',
                        color: '#C85A32',
                        '&:hover': { bgcolor: '#FFFFFF' },
                      }}
                    >
                      <ShareIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {trip.start_date && (
                  <Chip
                    icon={<CalendarMonthIcon sx={{ fontSize: '1.1rem !important', color: '#FFFFFF' }} />}
                    label={`${trip.total_days || 1} dies • ${trip.formatted_period || trip.start_date}`}
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      bgcolor: '#C85A32',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      px: 0.5,
                    }}
                  />
                )}
              </Box>

              {/* Title and Description */}
              <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    color: '#2C221E',
                    lineHeight: 1.25,
                    mb: 1.5,
                    fontSize: { xs: '1.5rem', sm: '2rem' },
                  }}
                >
                  {trip.title}
                </Typography>

                {trip.description && (
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#5C4339',
                      fontSize: '1.05rem',
                      lineHeight: 1.6,
                      mb: 3,
                    }}
                  >
                    {trip.description}
                  </Typography>
                )}

                {/* Author Card Box */}
                <Box
                  sx={{
                    bgcolor: '#FAF7F2',
                    border: '1px solid #E8E2D9',
                    borderRadius: 3,
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        bgcolor: '#F4ECE1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        border: '2px solid #E8E2D9',
                      }}
                    >
                      👤
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: '#2C221E', fontSize: '0.95rem' }}>
                        {trip.author.anonymous_title || `Un felagi de ${trip.author.town_name || trip.author.region_name || 'Catalunya'}`}
                      </Typography>
                      <Typography sx={{ color: '#786C65', fontSize: '0.78rem' }}>
                        Viatge completat & validat per la comunitat ✨
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    variant="contained"
                    onClick={handleStartChat}
                    disabled={isConnectingChat}
                    startIcon={isConnectingChat ? <CircularProgress size={16} color="inherit" /> : <ChatBubbleOutlineIcon />}
                    sx={{
                      bgcolor: '#C85A32',
                      color: '#FFFFFF',
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 2.5,
                      px: 2.5,
                      py: 1,
                      '&:hover': { bgcolor: '#A0471D' },
                    }}
                  >
                    Demanar consell a l'autor 💬
                  </Button>
                </Box>
              </Box>
            </Card>

            {/* Itinerary Timeline / Stages */}
            {trip.stages && trip.stages.length > 0 && (
              <Box
                sx={{
                  bgcolor: '#FFFFFF',
                  borderRadius: 4,
                  border: '1px solid #E8E2D9',
                  p: { xs: 2.5, sm: 3.5 },
                  mb: 4,
                  boxShadow: '0 2px 12px rgba(44,34,30,0.03)',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E', mb: 2 }}>
                  📍 Ruta i Etapes del Viatge ({trip.stages.length})
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {trip.stages.map((stage, idx) => (
                    <Box
                      key={stage.id || idx}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: '#FAF7F2',
                        border: '1px solid #E8E2D9',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: '#C85A32',
                            color: '#FFFFFF',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                          }}
                        >
                          {idx + 1}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, color: '#2C221E', fontSize: '0.95rem' }}>
                            {stage.destination_name}
                          </Typography>
                          {(stage.town_name || stage.country_name) && (
                            <Typography sx={{ fontSize: '0.75rem', color: '#786C65' }}>
                              {stage.town_name ? `${stage.town_name}, ` : ''}{stage.country_name || stage.country_code}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {stage.start_date && (
                        <Typography sx={{ fontSize: '0.78rem', color: '#786C65', fontWeight: 600 }}>
                          {stage.start_date} {stage.end_date && stage.end_date !== stage.start_date ? `➔ ${stage.end_date}` : ''}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Photo Gallery */}
            {trip.photos && trip.photos.length > 0 && (
              <Box
                sx={{
                  bgcolor: '#FFFFFF',
                  borderRadius: 4,
                  border: '1px solid #E8E2D9',
                  p: { xs: 2.5, sm: 3.5 },
                  boxShadow: '0 2px 12px rgba(44,34,30,0.03)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PhotoLibraryIcon sx={{ color: '#C85A32' }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E' }}>
                    Galeria de Fotos del Viatge ({trip.photos.length})
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {trip.photos.map((photo) => (
                    <Grid item xs={6} sm={4} key={photo.id}>
                      <Box
                        onClick={() => setSelectedPhoto(photo.photo_url || (photo as any).image_url)}
                        sx={{
                          position: 'relative',
                          pt: '75%',
                          borderRadius: 2.5,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '1px solid #E8E2D9',
                          transition: 'transform 0.2s',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={photo.photo_url || (photo as any).image_url}
                          alt={photo.caption || 'Foto viatge'}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        {photo.caption && (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              bgcolor: 'rgba(0,0,0,0.65)',
                              color: '#FFFFFF',
                              p: 0.75,
                              fontSize: '0.72rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {photo.caption}
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        ) : null}
      </Container>

      {/* Photo Zoom Lightbox Dialog */}
      <Dialog
        open={Boolean(selectedPhoto)}
        onClose={() => setSelectedPhoto(null)}
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'hidden',
          },
        }}
      >
        <DialogContent sx={{ position: 'relative', p: 0, display: 'flex', justifyContent: 'center' }}>
          <IconButton
            onClick={() => setSelectedPhoto(null)}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: '#FFFFFF',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
            }}
          >
            <CloseIcon />
          </IconButton>
          {selectedPhoto && (
            <Box
              component="img"
              src={selectedPhoto}
              alt="Foto ampliada"
              sx={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                borderRadius: 3,
                objectFit: 'contain',
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
