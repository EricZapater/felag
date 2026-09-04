import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useParams, Link as RouterLink } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { useCommunityStore, useLiveFeedStore } from '../store';
import ReportDialog from '../components/ReportDialog';

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `fa ${diffMins} min`;
    }
    if (diffHours < 24) {
      return `fa ${diffHours}h`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `fa ${diffDays}d`;
  } catch {
    return dateStr;
  }
}

export default function LiveFeedView() {
  const { id } = useParams<{ id: string }>();
  const { currentDestination, fetchDestinationDetail } = useCommunityStore();
  const {
    moments,
    activeFelagisCount,
    isLoading,
    error,
    isForbidden,
    fetchLiveFeed,
    postMoment,
  } = useLiveFeedStore();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState('');

  useEffect(() => {
    if (id) {
      fetchDestinationDetail(id);
      fetchLiveFeed(id);
    }
  }, [id]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setUploadError(null);

    if (!imageUrl.trim()) {
      setUploadError('Si us plau, introdueix la URL de la foto.');
      return;
    }

    setIsUploading(true);
    try {
      await postMoment(id, {
        image_url: imageUrl.trim(),
        caption: caption.trim() || undefined,
      });
      setImageUrl('');
      setCaption('');
      setUploadDialogOpen(false);
    } catch (err: any) {
      setUploadError(err.message || 'Error en publicar la foto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReportPhoto = (momentId: string) => {
    setReportTargetId(momentId);
    setReportDialogOpen(true);
  };

  const destName = currentDestination?.name || 'la destinació';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          component={RouterLink}
          to={`/destinations/${id}`}
          startIcon={<ArrowBackIcon />}
          sx={{
            color: '#C85A32',
            textTransform: 'none',
            fontWeight: 600,
            mb: 3,
            '&:hover': { bgcolor: 'transparent', color: '#A0471D' },
          }}
        >
          ‹ Tornar a la guia de {destName}
        </Button>

        {/* Live Feed Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 4,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#2C221E' }}>
                📸 Feed en Viu: {destName}
              </Typography>
              <Chip
                label="EN DIRECTE"
                size="small"
                sx={{
                  bgcolor: '#E65100',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  letterSpacing: 0.5,
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#786C65', mt: 0.5 }}>
              Moments fotogràfics dels {activeFelagisCount || currentDestination?.active_felagis_count || 1} FELAGIS que estan a {destName} ara mateix.
            </Typography>
          </Box>

          {!isForbidden && (
            <Button
              variant="contained"
              startIcon={<PhotoCameraIcon />}
              onClick={() => setUploadDialogOpen(true)}
              sx={{
                bgcolor: '#C85A32',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                py: 1,
                borderRadius: 2.5,
                '&:hover': { bgcolor: '#A0471D' },
              }}
            >
              📷 Compartir Foto
            </Button>
          )}
        </Box>

        {isForbidden ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              bgcolor: '#FFFFFF',
              borderRadius: 4,
              border: '1px solid #E8E2D9',
              p: 4,
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 56, color: '#C85A32', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#2C221E', mb: 1 }}>
              Accés restringit al Feed en Viu
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65', mb: 3, lineHeight: 1.6 }}>
              Per protegir la privadesa dels viatgers, el feed efímer de fotos només és visible i accessible per a usuaris amb un viatge actiu a aquesta destinació durant les dates de solapament.
            </Typography>
            <Button
              component={RouterLink}
              to={`/destinations/${id}`}
              variant="contained"
              sx={{
                bgcolor: '#C85A32',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': { bgcolor: '#A0471D' },
              }}
            >
              Tornar a la guia pública
            </Button>
          </Box>
        ) : isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : moments.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              bgcolor: '#FFFFFF',
              borderRadius: 3,
              border: '1px solid #E8E2D9',
              p: 4,
            }}
          >
            <PhotoCameraIcon sx={{ fontSize: 48, color: '#D4A373', mb: 1 }} />
            <Typography variant="h6" sx={{ color: '#2C221E', fontWeight: 700, mb: 1 }}>
              Encara no hi ha fotos en directe
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65', mb: 3 }}>
              Sigues el primer a compartir un moment o una foto del teu viatge a {destName}!
            </Typography>
            <Button
              variant="contained"
              startIcon={<PhotoCameraIcon />}
              onClick={() => setUploadDialogOpen(true)}
              sx={{
                bgcolor: '#C85A32',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': { bgcolor: '#A0471D' },
              }}
            >
              Publicar primera foto
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {moments.map((moment) => (
              <Grid item xs={12} sm={6} md={4} key={moment.id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    bgcolor: '#FFFFFF',
                    border: '1px solid #E8E2D9',
                    boxShadow: '0 2px 8px rgba(74, 46, 43, 0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <Box
                    component="img"
                    src={moment.image_url}
                    alt={moment.caption || 'Foto en directe'}
                    sx={{
                      width: '100%',
                      height: 260,
                      objectFit: 'cover',
                      bgcolor: '#FAF7F2',
                    }}
                  />
                  <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {moment.caption && (
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C221E', mb: 1.5 }}>
                        {moment.caption}
                      </Typography>
                    )}

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        pt: 1,
                        borderTop: '1px solid #FAF7F2',
                      }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ color: '#786C65', display: 'block' }}>
                          <strong>{moment.author.name}</strong> • {formatRelativeTime(moment.created_at)}
                        </Typography>
                        {(moment.author.town_name || moment.author.region_name) && (
                          <Chip
                            label={`📍 ${moment.author.town_name || moment.author.region_name}`}
                            size="small"
                            sx={{
                              bgcolor: '#FFF3E0',
                              color: '#E65100',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 20,
                              mt: 0.5,
                            }}
                          />
                        )}
                      </Box>

                      <IconButton
                        size="small"
                        title="Denunciar foto"
                        onClick={() => handleReportPhoto(moment.id)}
                        sx={{ color: '#A09893', '&:hover': { color: '#D32F2F' } }}
                      >
                        <FlagOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Upload Moment Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !isUploading && setUploadDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            bgcolor: '#FFFFFF',
            border: '1px solid #E8E2D9',
          },
        }}
      >
        <Box component="form" onSubmit={handleUploadSubmit}>
          <DialogTitle sx={{ fontWeight: 700, color: '#2C221E', pb: 1 }}>
            📷 Compartir Foto en Directe
          </DialogTitle>
          <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#786C65' }}>
              Aquesta foto serà visible únicament per als FELAGIS a {destName} durant les dates del teu viatge.
            </Typography>

            {uploadError && (
              <Alert severity="error" onClose={() => setUploadError(null)}>
                {uploadError}
              </Alert>
            )}

            <TextField
              fullWidth
              size="small"
              label="URL de la imatge"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
              helperText="Enllaç directe de la foto (R2 o imatge pública)"
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              label="Peu de foto (opcional)"
              placeholder="Ex: Creuant Shibuya de nit, ambient brutal! 🏙️"
              inputProps={{ maxLength: 280 }}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              helperText={`${caption.length}/280 caràcters`}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0, gap: 1 }}>
            <Button
              onClick={() => setUploadDialogOpen(false)}
              disabled={isUploading}
              sx={{ color: '#786C65', textTransform: 'none', fontWeight: 600 }}
            >
              Cancel·lar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isUploading}
              sx={{
                bgcolor: '#C85A32',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                '&:hover': { bgcolor: '#A0471D' },
              }}
            >
              {isUploading ? 'Publicant...' : 'Publicar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Report Photo Dialog */}
      <ReportDialog
        open={reportDialogOpen}
        targetType="live_moment"
        targetId={reportTargetId}
        onClose={() => setReportDialogOpen(false)}
      />
    </Box>
  );
}
