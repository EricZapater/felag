import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardMedia,
  CardContent,
  Container,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link as RouterLink, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { usePostTripStore } from '../store';
import { useTripStore } from '@/modules/trips/store';

export default function TripGalleryView() {
  const { id: tripId } = useParams<{ id: string }>();
  const { currentTrip, fetchTripById } = useTripStore();
  const {
    photos,
    fetchTripPhotos,
    addTripPhoto,
    togglePhotoFeatured,
    deleteTripPhoto,
    isLoading,
    error,
  } = usePostTripStore();

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (tripId) {
      fetchTripById(tripId);
      fetchTripPhotos(tripId);
    }
  }, [tripId, fetchTripById, fetchTripPhotos]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId) return;
    if (!imageUrl.trim()) {
      setAddError('Cal proporcionar una imatge (URL o fitxer).');
      return;
    }

    setIsSubmitting(true);
    setAddError(null);
    try {
      await addTripPhoto(tripId, {
        image_url: imageUrl.trim(),
        caption: caption.trim() || undefined,
        location_name: locationName.trim() || undefined,
        is_featured: isFeatured,
      });
      setOpenAddDialog(false);
      setImageUrl('');
      setCaption('');
      setLocationName('');
      setIsFeatured(false);
    } catch (err: any) {
      setAddError(err.response?.data?.error || err.message || 'Error en afegir la foto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFeatured = async (photoId: string) => {
    if (!tripId) return;
    try {
      await togglePhotoFeatured(tripId, photoId);
    } catch {
      // error handled in store
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!tripId) return;
    if (window.confirm('Vols eliminar aquesta fotografia de l’àlbum?')) {
      try {
        await deleteTripPhoto(tripId, photoId);
      } catch {
        // error handled in store
      }
    }
  };

  const tripTitle = currentTrip?.title || 'Àlbum del Viatge';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Navigation & Header */}
        <Box sx={{ mb: 3 }}>
          <Button
            component={RouterLink}
            to={`/trips/${tripId}`}
            startIcon={<ArrowBackIcon />}
            sx={{
              color: '#C85A32',
              textTransform: 'none',
              fontWeight: 600,
              mb: 1.5,
              '&:hover': { bgcolor: 'transparent', color: '#A0471D' },
            }}
          >
            ‹ Tornar al Viatge
          </Button>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: '#2C221E',
                  fontSize: { xs: '1.5rem', md: '1.85rem' },
                }}
              >
                🖼️ Àlbum: {tripTitle}
              </Typography>
              <Typography variant="body2" sx={{ color: '#786C65', mt: 0.5 }}>
                {photos.length} {photos.length === 1 ? 'fotografia desada' : 'fotografies desades'} per compondre el reportatge final.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                component={RouterLink}
                to={`/trips/${tripId}/celebrate`}
                variant="outlined"
                sx={{
                  borderColor: '#C85A32',
                  color: '#C85A32',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  '&:hover': { bgcolor: '#FDEEE9', borderColor: '#A0471D' },
                }}
              >
                📸 Celebration Card
              </Button>

              <Button
                variant="contained"
                startIcon={<AddPhotoAlternateIcon />}
                onClick={() => setOpenAddDialog(true)}
                sx={{
                  bgcolor: '#C85A32',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2.5,
                  '&:hover': { bgcolor: '#A0471D' },
                }}
              >
                📷 Afegir Fotos a l'Àlbum
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Global Error Banner */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading Spinner */}
        {isLoading && photos.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        )}

        {/* Empty State */}
        {!isLoading && photos.length === 0 && (
          <Card
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px dashed #DDCFBF',
              bgcolor: '#FAF7F2',
              my: 4,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C221E', mb: 1 }}>
              L'àlbum de fotos encara està buit
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65', mb: 3, maxWidth: 500, mx: 'auto' }}>
              Afegeix fotografies dels teus moments i llocs preferits durant el viatge per nodrir el reportatge oficial d'Instagram Stories.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddPhotoAlternateIcon />}
              onClick={() => setOpenAddDialog(true)}
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
              Pujar la primera fotografia
            </Button>
          </Card>
        )}

        {/* Photos Grid */}
        <Grid container spacing={2.5}>
          {photos.map((photo) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
              <Card
                sx={{
                  borderRadius: 3,
                  border: '1px solid #E8E2D9',
                  overflow: 'hidden',
                  position: 'relative',
                  bgcolor: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                  },
                }}
              >
                {/* Featured Badge */}
                {photo.is_featured && (
                  <Chip
                    label="⭐ Destacada"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      bgcolor: 'rgba(200,90,50,0.92)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      zIndex: 2,
                    }}
                  />
                )}

                {/* Card Media */}
                <CardMedia
                  component="img"
                  height="220"
                  image={photo.image_url}
                  alt={photo.caption || 'Foto del viatge'}
                  sx={{ objectFit: 'cover' }}
                />

                {/* Card Content & Action Bar */}
                <CardContent sx={{ p: 2 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: '#2C221E',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {photo.caption || 'Sense títol'}
                  </Typography>

                  <Typography variant="caption" sx={{ color: '#786C65', display: 'block', mt: 0.25 }}>
                    {photo.location_name ? `📍 ${photo.location_name}` : '📍 Lloc no especificat'}
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid #F0ECE4',
                      pt: 1,
                      mt: 1.5,
                    }}
                  >
                    <Button
                      size="small"
                      startIcon={photo.is_featured ? <StarIcon sx={{ color: '#C85A32' }} /> : <StarBorderIcon />}
                      onClick={() => handleToggleFeatured(photo.id)}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: photo.is_featured ? '#C85A32' : '#786C65',
                        p: 0,
                        '&:hover': { bgcolor: 'transparent', color: '#C85A32' },
                      }}
                    >
                      {photo.is_featured ? 'Destacada' : 'Destacar'}
                    </Button>

                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeletePhoto(photo.id)}
                      sx={{ p: 0.5 }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Add Photo Dialog */}
      <Dialog
        open={openAddDialog}
        onClose={() => !isSubmitting && setOpenAddDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 },
        }}
      >
        <form onSubmit={handleAddPhoto}>
          <DialogTitle sx={{ fontWeight: 800, color: '#2C221E' }}>
            📷 Afegir Foto a l'Àlbum
          </DialogTitle>
          <DialogContent>
            {addError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {addError}
              </Alert>
            )}

            <Typography variant="body2" sx={{ color: '#786C65', mb: 2 }}>
              Pots introduir un enllaç d'imatge directe o seleccionar un fitxer del teu dispositiu.
            </Typography>

            <Box sx={{ mb: 2.5 }}>
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
                📁 Seleccionar fitxer local...
                <input type="file" accept="image/*" hidden onChange={handleFileUpload} />
              </Button>

              <TextField
                fullWidth
                label="O URL de la imatge"
                variant="outlined"
                size="small"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
              />
            </Box>

            {imageUrl && (
              <Box
                sx={{
                  mb: 2,
                  height: 180,
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid #E8E2D9',
                }}
              >
                <Box
                  component="img"
                  src={imageUrl}
                  alt="Previsualització"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
            )}

            <TextField
              fullWidth
              label="Descripció / Peu de foto"
              variant="outlined"
              size="small"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ex: Shibuya Crossing de nit"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Ubicació"
              variant="outlined"
              size="small"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Ex: Tòquio, Asakusa"
              sx={{ mb: 1.5 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  sx={{ color: '#C85A32', '&.Mui-checked': { color: '#C85A32' } }}
                />
              }
              label={
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: '#2C221E' }}>
                  ⭐ Destacar per al Reportatge 9:16 d'Instagram Stories
                </Typography>
              }
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setOpenAddDialog(false)}
              disabled={isSubmitting}
              sx={{ color: '#786C65', textTransform: 'none' }}
            >
              Cancel·lar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{
                bgcolor: '#C85A32',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
                '&:hover': { bgcolor: '#A0471D' },
              }}
            >
              {isSubmitting ? 'Afegint...' : 'Afegir a l’Àlbum'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
