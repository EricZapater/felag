import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  Typography,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { communityApi } from '@/modules/community/api';
import { RecommendationCategory, TownSearchResult } from '@/modules/community/types';

interface CreateInspirationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateInspirationDialog({
  open,
  onClose,
  onCreated,
}: CreateInspirationDialogProps) {
  const navigate = useNavigate();
  const [submissionType, setSubmissionType] = useState<'recommendation' | 'itinerary'>('recommendation');
  const [category, setCategory] = useState<RecommendationCategory>('hidden_gem');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedTown, setSelectedTown] = useState<TownSearchResult | null>(null);
  const [townSearchQuery, setTownSearchQuery] = useState('');
  const [townOptions, setTownOptions] = useState<TownSearchResult[]>([]);
  const [isSearchingTowns, setIsSearchingTowns] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!townSearchQuery || townSearchQuery.trim().length < 2) {
      setTownOptions([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearchingTowns(true);
      communityApi
        .searchTowns(townSearchQuery.trim())
        .then((towns) => {
          setTownOptions(towns);
        })
        .catch(() => {
          setTownOptions([]);
        })
        .finally(() => {
          setIsSearchingTowns(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [townSearchQuery]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('La imatge és massa gran. El límit és de 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (submissionType === 'itinerary') {
      onClose();
      navigate('/trips/new');
      return;
    }

    if (!selectedTown) {
      setError('Si us plau, selecciona una destinació o ciutat per vincular la recomanació.');
      return;
    }
    if (!title.trim()) {
      setError('Si us plau, introdueix un títol.');
      return;
    }
    if (!description.trim()) {
      setError('Si us plau, introdueix una descripció o consell detallat.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find destination ID (using country_code or town id)
      const destinationId = selectedTown.country_code || selectedTown.id;
      await communityApi.createRecommendation(destinationId, {
        category,
        title: title.trim(),
        description: description.trim(),
        location_name: locationName.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        town_id: selectedTown.id,
        is_public: true,
      });

      // Reset
      setTitle('');
      setDescription('');
      setLocationName('');
      setImageUrl('');
      setSelectedTown(null);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error en publicar la recomanació');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
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
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 800, color: '#2C221E', pb: 1, fontSize: '1.25rem' }}>
          💡 Comparteix la teva experiència amb FELAG
        </DialogTitle>

        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#786C65' }}>
            Inspira altres viatgers catalans compartint els teus consells, itineraris o racons favorits arreu del món.
          </Typography>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Type selector */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant={submissionType === 'recommendation' ? 'contained' : 'outlined'}
              onClick={() => setSubmissionType('recommendation')}
              sx={{
                flex: 1,
                py: 1.2,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: submissionType === 'recommendation' ? '#C85A32' : 'transparent',
                borderColor: '#C85A32',
                color: submissionType === 'recommendation' ? '#FFFFFF' : '#C85A32',
                '&:hover': {
                  bgcolor: submissionType === 'recommendation' ? '#A0471D' : '#FDF4EF',
                  borderColor: '#C85A32',
                },
              }}
            >
              💎 Recomanació / Consell
            </Button>
            <Button
              variant={submissionType === 'itinerary' ? 'contained' : 'outlined'}
              onClick={() => setSubmissionType('itinerary')}
              sx={{
                flex: 1,
                py: 1.2,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: submissionType === 'itinerary' ? '#C85A32' : 'transparent',
                borderColor: '#C85A32',
                color: submissionType === 'itinerary' ? '#FFFFFF' : '#C85A32',
                '&:hover': {
                  bgcolor: submissionType === 'itinerary' ? '#A0471D' : '#FDF4EF',
                  borderColor: '#C85A32',
                },
              }}
            >
              🗺️ Crear Itinerari
            </Button>
          </Box>

          {submissionType === 'itinerary' ? (
            <Box sx={{ p: 2.5, bgcolor: '#FAF7F2', borderRadius: 2.5, border: '1px solid #E8E2D9', textAlign: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2C221E', mb: 1 }}>
                🗺️ Crear un itinerari de viatge complet
              </Typography>
              <Typography variant="body2" sx={{ color: '#786C65', mb: 2 }}>
                Registra les etapes del teu viatge, dates i destins per compartir-ho automàticament a la comunitat i connectar amb altres felagis.
              </Typography>
              <Button
                variant="contained"
                onClick={() => {
                  onClose();
                  navigate('/trips/new');
                }}
                sx={{
                  bgcolor: '#C85A32',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3,
                  py: 1,
                  '&:hover': { bgcolor: '#A0471D' },
                }}
              >
                Obrir el creador de viatges ✈️
              </Button>
            </Box>
          ) : (
            <>
              <Autocomplete
                size="small"
                options={townOptions}
                getOptionLabel={(option) =>
                  `${option.name}${option.region_name ? ` (${option.region_name})` : ''}${option.country_name ? `, ${option.country_name}` : ''}`
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterOptions={(x) => x}
                value={selectedTown}
                onChange={(_, newValue) => {
                  setSelectedTown(newValue);
                }}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    setTownSearchQuery(newInputValue);
                  }
                }}
                loading={isSearchingTowns}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Destinació o Ciutat"
                    placeholder="Escriu per cercar (ex: Tòquio, Reykjavík, Roma...)"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isSearchingTowns ? <CircularProgress color="inherit" size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              <FormControl fullWidth size="small">
                <InputLabel id="inspiration-category-label">Categoria</InputLabel>
                <Select
                  labelId="inspiration-category-label"
                  value={category}
                  label="Categoria"
                  onChange={(e) => setCategory(e.target.value as RecommendationCategory)}
                >
                  <MenuItem value="hidden_gem">💎 Racó Secret</MenuItem>
                  <MenuItem value="food">🍽️ Gastronomia</MenuItem>
                  <MenuItem value="practical_tip">💡 Consell Pràctic</MenuItem>
                  <MenuItem value="transport">🚆 Transport</MenuItem>
                  <MenuItem value="anecdote">📖 Anècdota</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                label="Títol del consell o racó"
                placeholder="Ex: Bar de pintxos ocult al barri vell"
                inputProps={{ maxLength: 120 }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                helperText={`${title.length}/120 caràcters`}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                label="Descripció i detalls útils"
                placeholder="Explica com arribar-hi, preus aproximats, recomanacions personals..."
                inputProps={{ maxLength: 2000 }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                helperText={`${description.length}/2000 caràcters`}
              />

              <TextField
                fullWidth
                size="small"
                label="Lloc concret o adreça (opcional)"
                placeholder="Ex: Carrer Major 12, Mirador del Nord..."
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />

              <Box sx={{ p: 2, bgcolor: '#FAF7F2', borderRadius: 2.5, border: '1px solid #E8E2D9' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2C221E', mb: 1 }}>
                  📸 Foto (opcional)
                </Typography>

                {imageUrl ? (
                  <Box sx={{ mb: 1.5 }}>
                    <Box
                      sx={{
                        height: 160,
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '1px solid #DDCFBF',
                        mb: 1,
                      }}
                    >
                      <Box
                        component="img"
                        src={imageUrl}
                        alt="Previsualització"
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => setImageUrl('')}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      🗑️ Eliminar foto
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      sx={{
                        borderColor: '#C85A32',
                        color: '#C85A32',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { borderColor: '#A0471D', bgcolor: '#FDF4EF' },
                      }}
                    >
                      📁 Penjar foto del dispositiu
                      <input type="file" accept="image/*" hidden onChange={handleFileUpload} />
                    </Button>
                    <TextField
                      fullWidth
                      size="small"
                      label="O enllaç d'imatge web"
                      placeholder="https://images.unsplash.com/..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                  </Box>
                )}
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
          <Button
            onClick={onClose}
            disabled={isSubmitting}
            sx={{ color: '#786C65', textTransform: 'none', fontWeight: 600 }}
          >
            Cancel·lar
          </Button>
          {submissionType === 'recommendation' && (
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{
                bgcolor: '#C85A32',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
                '&:hover': { bgcolor: '#A0471D' },
              }}
            >
              {isSubmitting ? 'Publicant...' : 'Publicar recomanació 🚀'}
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}
