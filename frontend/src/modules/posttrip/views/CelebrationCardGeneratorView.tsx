import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Link as RouterLink, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { usePostTripStore } from '../store';
import { useTripStore } from '@/modules/trips/store';
import { useMatchingStore } from '@/modules/matching/store';
import { useProfileStore } from '@/modules/profile/store';
import { CelebrationCard } from '../types';

export default function CelebrationCardGeneratorView() {
  const { id: tripId } = useParams<{ id: string }>();
  const cardRef = useRef<HTMLDivElement>(null);

  const { currentTrip, fetchTripById } = useTripStore();
  const { matches, fetchTripMatches } = useMatchingStore();
  const { profile, fetchProfile } = useProfileStore();
  const {
    celebrationCards,
    fetchCelebrationCards,
    createCelebrationCard,
    error,
  } = usePostTripStore();

  const [selectedFelagiId, setSelectedFelagiId] = useState('');
  const [locationName, setLocationName] = useState('Shibuya Crossing, Tòquio 🗼');
  const [caption, setCaption] = useState('');
  const [selfieUrl, setSelfieUrl] = useState(
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop&q=80'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Active preview card
  const [previewCard, setPreviewCard] = useState<CelebrationCard | null>(null);

  useEffect(() => {
    if (tripId) {
      fetchTripById(tripId);
      fetchTripMatches(tripId);
      fetchCelebrationCards(tripId);
    }
    fetchProfile();
  }, [tripId, fetchTripById, fetchTripMatches, fetchCelebrationCards, fetchProfile]);

  // Set default selected felagi if matches loaded
  useEffect(() => {
    if (matches && matches.length > 0 && !selectedFelagiId) {
      setSelectedFelagiId(matches[0].matched_user?.id || '');
    }
  }, [matches, selectedFelagiId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSelfieUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedFelagi = matches.find(
    (m) => m.matched_user?.id === selectedFelagiId
  );

  const user1Name = profile?.name || 'Tu';
  const user1Town = profile?.origin?.town?.name || profile?.origin?.region?.name || 'Catalunya';
  const user2Name = selectedFelagi?.matched_user?.name || 'Marc Soler';
  const user2Town = selectedFelagi?.matched_user?.origin_summary || 'Terrassa';

  const defaultHeadline = `${user1Name} i ${user2Name} s'han trobat a ${locationName.split(',')[0]}! 🎉✨`;
  const defaultSubheadline = `${user1Town} 🤝 ${user2Town} a ${locationName}`;

  const handleGenerateAndShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId) return;
    if (!selectedFelagiId && matches.length > 0) {
      setFormError('Selecciona el FELAGI amb qui t’has trobat.');
      return;
    }
    if (!locationName.trim()) {
      setFormError('Indica el lloc de la trobada.');
      return;
    }
    if (!selfieUrl.trim()) {
      setFormError('Afegeix una foto o selfie.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const generated = await createCelebrationCard(tripId, {
        user_2_id: selectedFelagiId || '00000000-0000-0000-0000-000000000001',
        image_url: selfieUrl,
        location_name: locationName,
        caption: caption || undefined,
      });
      setPreviewCard(generated);
      setSuccessMessage('Targeta oficial generada i enviada al xat del grup! 🎉');
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Error en crear la targeta');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Canvas PNG Download
  const handleDownloadPNG = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Card Background
      ctx.fillStyle = '#FAF7F2';
      ctx.fillRect(0, 0, 800, 1000);

      // Outer Border
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 786, 986);

      // Inner Header Badge
      ctx.fillStyle = '#FDEEE9';
      ctx.beginPath();
      ctx.roundRect(240, 50, 320, 56, 16);
      ctx.fill();

      ctx.fillStyle = '#C85A32';
      ctx.font = 'bold 24px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎉 ENS HEM TROBAT!', 400, 87);

      // Load Image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(60, 140, 680, 540, 24);
        ctx.clip();
        ctx.drawImage(img, 60, 140, 680, 540);
        ctx.restore();

        // Headlines
        ctx.fillStyle = '#2C221E';
        ctx.font = 'bold 36px -apple-system, sans-serif';
        ctx.fillText(defaultHeadline.slice(0, 38), 400, 740);

        ctx.fillStyle = '#6B5E57';
        ctx.font = '500 26px -apple-system, sans-serif';
        ctx.fillText(defaultSubheadline, 400, 800);

        // Footer divider
        ctx.strokeStyle = '#E8E2D9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(60, 880);
        ctx.lineTo(740, 880);
        ctx.stroke();

        ctx.fillStyle = '#C85A32';
        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`FELAG • ${currentTrip?.title || 'Viatge'}`, 60, 930);

        ctx.textAlign = 'right';
        ctx.fillText(new Date().toLocaleDateString('ca-ES'), 740, 930);

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Celebration-Card-${user2Name.replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        link.click();
        setSuccessMessage('Targeta de celebració descarregada en PNG! 📥');
      };
      img.src = selfieUrl;
    } catch {
      setSuccessMessage('Error en descarregar la targeta.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ens hem trobat a ${locationName}!`,
          text: defaultHeadline,
          url: window.location.href,
        });
        setSuccessMessage('Targeta compartida!');
      } catch {
        // Ignored share abort
      }
    } else {
      handleDownloadPNG();
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
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
            mb: 2,
            '&:hover': { bgcolor: 'transparent', color: '#A0471D' },
          }}
        >
          ‹ Tornar al Viatge
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 4,
            alignItems: 'flex-start',
          }}
        >
          {/* Form Column */}
          <Box
            component="form"
            onSubmit={handleGenerateAndShare}
            sx={{
              flex: 1.1,
              bgcolor: '#FFFFFF',
              border: '1px solid #E8E2D9',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
              boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#2C221E', mb: 0.5 }}>
              📸 Crear Celebration Card
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65', mb: 3 }}>
              T'has trobat amb un altre FELAGI durant el viatge? Genera la vostra targeta de celebració oficial per enviar-la al xat i compartir-la!
            </Typography>

            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            {/* Select Felagi */}
            <TextField
              select
              fullWidth
              label="Amb qui t'has trobat?"
              value={selectedFelagiId}
              onChange={(e) => setSelectedFelagiId(e.target.value)}
              sx={{ mb: 2.5 }}
            >
              {matches.length > 0 ? (
                matches.map((m) => {
                  const mUser = m.matched_user;
                  const uid = mUser?.id || m.id;
                  const name = mUser?.name || 'FELAGI';
                  const origin = mUser?.origin_summary || 'Catalunya';
                  return (
                    <MenuItem key={uid} value={uid}>
                      {name} ({origin})
                    </MenuItem>
                  );
                })
              ) : (
                <MenuItem value="00000000-0000-0000-0000-000000000001">
                  Marc Soler (Terrassa • Vallès Occidental)
                </MenuItem>
              )}
            </TextField>

            {/* Location */}
            <TextField
              fullWidth
              label="On us heu trobat?"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Ex: Shibuya Crossing, Tòquio 🗼"
              sx={{ mb: 2.5 }}
            />

            {/* Photo / Selfie */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2C221E', mb: 1 }}>
                Foto / Selfie de la trobada
              </Typography>
              <Button
                variant="outlined"
                component="label"
                sx={{
                  borderColor: '#E8E2D9',
                  color: '#2C221E',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  mb: 1.5,
                  '&:hover': { borderColor: '#C85A32' },
                }}
              >
                📁 Pujar foto local...
                <input type="file" accept="image/*" hidden onChange={handleFileUpload} />
              </Button>
              <TextField
                fullWidth
                size="small"
                label="O URL de la foto"
                value={selfieUrl}
                onChange={(e) => setSelfieUrl(e.target.value)}
              />
            </Box>

            {/* Optional Caption */}
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Comentari opcional"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ex: Quina casualitat trobar-nos a l'altra punta de món!"
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
              sx={{
                bgcolor: '#C85A32',
                color: '#FFFFFF',
                py: 1.3,
                borderRadius: 2.5,
                fontWeight: 800,
                fontSize: '1rem',
                textTransform: 'none',
                '&:hover': { bgcolor: '#A0471D' },
              }}
            >
              {isSubmitting ? 'Generant...' : '✨ Generar Targeta de Celebració'}
            </Button>
          </Box>

          {/* Preview Column */}
          <Box
            sx={{
              flex: 0.9,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            {/* The Official Celebration Card Frame */}
            <Box
              ref={cardRef}
              sx={{
                width: { xs: 300, sm: 350 },
                background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF7F2 100%)',
                border: '3px solid #C85A32',
                borderRadius: '24px',
                p: 2.5,
                boxShadow: '0 14px 40px rgba(200,90,50,0.18)',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  bgcolor: '#FDEEE9',
                  color: '#C85A32',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  py: 0.5,
                  px: 1.75,
                  borderRadius: 3,
                  display: 'inline-block',
                  mb: 2,
                }}
              >
                🎉 ENS HEM TROBAT!
              </Box>

              <Box
                component="img"
                src={selfieUrl}
                alt="Selfie trobada"
                sx={{
                  width: '100%',
                  height: 250,
                  borderRadius: 3,
                  objectFit: 'cover',
                  border: '2px solid #E8E2D9',
                  mb: 2,
                }}
              />

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: '#2C221E',
                  fontSize: '1.1rem',
                  lineHeight: 1.3,
                  mb: 0.8,
                }}
              >
                {previewCard?.headline || defaultHeadline}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: '#6B5E57',
                  fontSize: '0.85rem',
                  mb: 2,
                }}
              >
                {previewCard?.subheadline || defaultSubheadline}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #E8E2D9',
                  pt: 1.5,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#C85A32',
                }}
              >
                <span>FELAG • {currentTrip?.title || 'Viatge'}</span>
                <span>{new Date().toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                mt: 2.5,
                width: { xs: 300, sm: 350 },
              }}
            >
              <Button
                variant="contained"
                onClick={handleDownloadPNG}
                startIcon={<DownloadIcon />}
                sx={{
                  bgcolor: '#2C221E',
                  color: '#FFFFFF',
                  flex: 1,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': { bgcolor: '#1A1412' },
                }}
              >
                📥 Descarregar PNG
              </Button>

              <Button
                variant="contained"
                onClick={handleShare}
                startIcon={<SendIcon />}
                sx={{
                  bgcolor: '#C85A32',
                  color: '#FFFFFF',
                  flex: 1.2,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': { bgcolor: '#A0471D' },
                }}
              >
                📲 Compartir
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Existing Celebration Cards List for this trip */}
        {celebrationCards.length > 0 && (
          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#2C221E', mb: 2 }}>
              Targetes de celebració creades en aquest viatge ({celebrationCards.length})
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2.5 }}>
              {celebrationCards.map((card) => (
                <Card key={card.id} sx={{ borderRadius: 3, border: '1px solid #E8E2D9' }}>
                  <Box
                    component="img"
                    src={card.image_url}
                    alt={card.title}
                    sx={{ width: '100%', height: 180, objectFit: 'cover' }}
                  />
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2C221E' }}>
                      {card.headline}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#786C65', display: 'block', mt: 0.5 }}>
                      📍 {card.location_name}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}
      </Container>

      {/* Snackbar notification */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={3500}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
