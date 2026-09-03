import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Chip,
  Rating,
  TextField,
  CircularProgress,
  Alert,
  MenuItem,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import { Link as RouterLink, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import InstagramStoriesCard from '../components/InstagramStoriesCard';
import { usePostTripStore } from '../store';
import { useTripStore } from '@/modules/trips/store';
import { CommunityTipCategory, StoriesCardData } from '../types';

const TIP_CATEGORIES: { value: CommunityTipCategory; label: string }[] = [
  { value: 'food', label: 'Gastronomia & Menjar 🍜' },
  { value: 'hidden_gem', label: 'Racó amagat / Secret ✨' },
  { value: 'transport', label: 'Transport & Mobilitat 🚆' },
  { value: 'practical_tip', label: 'Consell pràctic 💡' },
  { value: 'anecdote', label: 'Història o anècdota 📖' },
];

export default function TripWrapupView() {
  const { id: tripId } = useParams<{ id: string }>();
  const { currentTrip, fetchTripById } = useTripStore();
  const {
    wrapupStatus,
    storiesCardData,
    fetchWrapupStatus,
    fetchStoriesCardData,
    submitTripFeedback,
    isLoading,
    error,
  } = usePostTripStore();

  // Feedback form state
  const [rating, setRating] = useState<number | null>(5);
  const [comments, setComments] = useState('');
  const [tipCategory, setTipCategory] = useState<CommunityTipCategory>('hidden_gem');
  const [tipTitle, setTipTitle] = useState('');
  const [tipDescription, setTipDescription] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    if (tripId) {
      fetchTripById(tripId);
      fetchWrapupStatus(tripId);
      fetchStoriesCardData(tripId);
    }
  }, [tripId, fetchTripById, fetchWrapupStatus, fetchStoriesCardData]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId || !rating) return;

    setIsSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      const tips = tipTitle.trim() && tipDescription.trim()
        ? [
            {
              category: tipCategory,
              title: tipTitle.trim(),
              description: tipDescription.trim(),
            },
          ]
        : undefined;

      await submitTripFeedback(tripId, {
        rating,
        comments: comments.trim() || undefined,
        community_tips: tips,
      });

      setFeedbackSuccess('Moltes gràcies! El teu feedback i consells s’han publicat a la comunitat! ⭐');
      setComments('');
      setTipTitle('');
      setTipDescription('');
    } catch (err: any) {
      setFeedbackError(err.response?.data?.error || err.message || 'Error enviant la valoració');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const tripTitle = currentTrip?.title || storiesCardData?.trip_title || 'el teu viatge';

  // Fallback stories data if backend returns empty during dev
  const activeStoriesData: StoriesCardData = storiesCardData || {
    trip_id: tripId || '',
    trip_title: tripTitle,
    destination_name: currentTrip?.stages?.[0]?.destination_name || 'Japó',
    country_flag: '🇯🇵',
    author_name: 'FELAGI',
    author_origin: 'Catalunya',
    start_date: currentTrip?.start_date || '1 Set',
    end_date: currentTrip?.end_date || '15 Set',
    total_days: 15,
    stages_count: currentTrip?.stages?.length || 2,
    felagis_met_count: 3,
    featured_photos: [
      'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&auto=format&fit=crop&q=80',
    ],
  };

  const isCelebrationDone = Boolean(wrapupStatus?.celebration_completed);
  const isFeedbackDone = Boolean(wrapupStatus?.feedback_completed);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0', pb: 6 }}>
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          component={RouterLink}
          to={`/trips/${tripId}`}
          startIcon={<ArrowBackIcon />}
          sx={{
            color: '#C85A32',
            textTransform: 'none',
            fontWeight: 600,
            mb: 2.5,
            '&:hover': { bgcolor: 'transparent', color: '#A0471D' },
          }}
        >
          ‹ Tornar al Viatge
        </Button>

        {/* Wrapup Hero Banner */}
        <Box
          sx={{
            bgcolor: '#FFFFFF',
            border: '1px solid #E8E2D9',
            borderRadius: 4,
            p: { xs: 3, md: 4 },
            mb: 4,
            textAlign: 'center',
            boxShadow: '0 2px 14px rgba(0,0,0,0.03)',
          }}
        >
          <Chip
            label="✨ DIA FINAL DEL VIATGE"
            size="small"
            sx={{
              bgcolor: '#E8F5E9',
              color: '#2E7D32',
              fontWeight: 800,
              fontSize: '0.8rem',
              mb: 1.5,
              px: 1,
            }}
          />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: '#2C221E',
              fontSize: { xs: '1.6rem', md: '2.1rem' },
              mb: 1,
            }}
          >
            Has completat {tripTitle}! 🎉
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#786C65',
              maxWidth: 680,
              mx: 'auto',
              fontSize: '0.98rem',
            }}
          >
            Tanca la teva aventura completant el ritual de 3 tasques i comparteix el teu àlbum oficial d'Instagram Stories 9:16 amb amics i familiars.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Two Columns Layout */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 4,
            alignItems: 'flex-start',
          }}
        >
          {/* Left Column: 3 Tasks */}
          <Box sx={{ flex: 1.2, width: '100%' }}>
            {/* Task 1: Celebration Card */}
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                border: '1px solid #E8E2D9',
                borderRadius: 3,
                p: 3,
                mb: 2.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      bgcolor: isCelebrationDone ? '#2E7D32' : '#C85A32',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                    }}
                  >
                    {isCelebrationDone ? '✓' : '1'}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E', fontSize: '1.05rem' }}>
                    Celebration Card («Ens hem trobat!»)
                  </Typography>
                </Box>
                {isCelebrationDone ? (
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                    label="Completat"
                    size="small"
                    sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700 }}
                  />
                ) : (
                  <Button
                    component={RouterLink}
                    to={`/trips/${tripId}/celebrate`}
                    variant="outlined"
                    size="small"
                    sx={{
                      color: '#C85A32',
                      borderColor: '#C85A32',
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 2,
                    }}
                  >
                    Generar
                  </Button>
                )}
              </Box>
              <Typography variant="body2" sx={{ color: '#786C65' }}>
                Crea targetes de commemoració de les trobades amb altres FELAGIS durant el teu viatge.
              </Typography>
            </Box>

            {/* Task 2: Feedback & Tips */}
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                border: '1px solid #E8E2D9',
                borderRadius: 3,
                p: 3,
                mb: 2.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      bgcolor: isFeedbackDone ? '#2E7D32' : '#C85A32',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                    }}
                  >
                    {isFeedbackDone ? '✓' : '2'}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E', fontSize: '1.05rem' }}>
                    Valoració & Consells a la Comunitat
                  </Typography>
                </Box>
                {isFeedbackDone && (
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                    label="Completat"
                    size="small"
                    sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700 }}
                  />
                )}
              </Box>

              <Typography variant="body2" sx={{ color: '#786C65', mb: 2 }}>
                Com ha anat l'aventura? Puntua el viatge i deixa un consell per a futurs FELAGIS que visitin la mateixa terra.
              </Typography>

              {feedbackError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {feedbackError}
                </Alert>
              )}

              {/* Interactive Feedback Form */}
              <Box component="form" onSubmit={handleSubmitFeedback}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#2C221E' }}>
                    Puntuació general:
                  </Typography>
                  <Rating
                    value={rating}
                    onChange={(_, val) => setRating(val)}
                    icon={<StarIcon sx={{ color: '#FFA000', fontSize: 28 }} />}
                    emptyIcon={<StarIcon sx={{ color: '#E8E2D9', fontSize: 28 }} />}
                  />
                </Box>

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  label="La teva valoració general del viatge"
                  placeholder="El viatge a Tòquio ha estat inoblidable, sobretot els barris antics..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#2C221E', mb: 1 }}>
                  💡 Afegeix un consell per a la guia comunitària (opcional):
                </Typography>

                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Categoria del consell"
                  value={tipCategory}
                  onChange={(e) => setTipCategory(e.target.value as CommunityTipCategory)}
                  sx={{ mb: 1.5 }}
                >
                  {TIP_CATEGORIES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  fullWidth
                  size="small"
                  label="Títol del consell"
                  placeholder="Ex: Millor restaurant de Ramen a Shinjuku"
                  value={tipTitle}
                  onChange={(e) => setTipTitle(e.target.value)}
                  sx={{ mb: 1.5 }}
                />

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  label="Descripció del consell"
                  placeholder="Ex: Demaneu el tsukemen picant a la màquina de l'entrada..."
                  value={tipDescription}
                  onChange={(e) => setTipDescription(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmittingFeedback || !rating}
                  sx={{
                    bgcolor: '#C85A32',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 2,
                    px: 3,
                    '&:hover': { bgcolor: '#A0471D' },
                  }}
                >
                  {isSubmittingFeedback ? 'Publicant...' : '⭐ Publicar Feedback & Consells'}
                </Button>
              </Box>
            </Box>

            {/* Task 3: Stories Card Ready */}
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                border: '1px solid #E8E2D9',
                borderRadius: 3,
                p: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      bgcolor: '#2E7D32',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                    }}
                  >
                    3
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E', fontSize: '1.05rem' }}>
                    Reportatge Instagram Stories (9:16)
                  </Typography>
                </Box>
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                  label="A punt"
                  size="small"
                  sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700 }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#786C65' }}>
                La teva targeta visual 9:16 ja s'ha compost automàticament a partir de l'àlbum de fotos del viatge! Fes servir els botons de descàrrega i compartir per publicar-la a Instagram Stories, WhatsApp Status o TikTok.
              </Typography>
            </Box>
          </Box>

          {/* Right Column: 9:16 Instagram Card */}
          <Box sx={{ flex: 0.8, width: '100%', display: 'flex', justifyContent: 'center' }}>
            {isLoading && !storiesCardData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress sx={{ color: '#C85A32' }} />
              </Box>
            ) : (
              <InstagramStoriesCard data={activeStoriesData} />
            )}
          </Box>
        </Box>
      </Container>

      {/* Snackbar feedback */}
      <Snackbar
        open={Boolean(feedbackSuccess)}
        autoHideDuration={4000}
        onClose={() => setFeedbackSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setFeedbackSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {feedbackSuccess}
        </Alert>
      </Snackbar>
    </Box>
  );
}
