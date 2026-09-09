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
  FormControlLabel,
  Checkbox,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { useCommunityStore } from '../store';
import { communityApi } from '../api';
import { RecommendationCategory, TownSearchResult } from '../types';

interface CreateRecommendationDialogProps {
  open: boolean;
  destinationId: string;
  destinationName: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateRecommendationDialog({
  open,
  destinationId,
  destinationName,
  onClose,
  onCreated,
}: CreateRecommendationDialogProps) {
  const { createRecommendation } = useCommunityStore();

  const [category, setCategory] = useState<RecommendationCategory>('food');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Si us plau, introdueix un títol per a la recomanació.');
      return;
    }
    if (!description.trim()) {
      setError('Si us plau, introdueix una descripció o consell.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRecommendation(destinationId, {
        category,
        title: title.trim(),
        description: description.trim(),
        location_name: locationName.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        town_id: selectedTown ? selectedTown.id : undefined,
        is_public: isPublic,
      });
      // Reset form
      setTitle('');
      setDescription('');
      setLocationName('');
      setImageUrl('');
      setSelectedTown(null);
      setIsPublic(true);
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
        <DialogTitle sx={{ fontWeight: 700, color: '#2C221E', pb: 1 }}>
          ✨ Publicar Recomanació a {destinationName}
        </DialogTitle>

        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#786C65' }}>
            Comparteix els millors racons, consells útils i experiències amb altres FELAGIS que visitin {destinationName}.
          </Typography>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth size="small">
            <InputLabel id="category-select-label">Categoria</InputLabel>
            <Select
              labelId="category-select-label"
              value={category}
              label="Categoria"
              onChange={(e) => setCategory(e.target.value as RecommendationCategory)}
            >
              <MenuItem value="food">🍽️ Gastronomia & Menjar</MenuItem>
              <MenuItem value="hidden_gem">💎 Racó Secret (fora de rutes)</MenuItem>
              <MenuItem value="transport">🚆 Transport & Mobilitat</MenuItem>
              <MenuItem value="practical_tip">💡 Consell Pràctic</MenuItem>
              <MenuItem value="anecdote">📖 Anècdota o Vivència</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            label="Títol de la recomanació"
            placeholder="Ex: Ramen Fuunji a Shinjuku — El millor Tsukemen"
            inputProps={{ maxLength: 120 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            helperText={`${title.length}/120 caràcters`}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            size="small"
            label="Descripció i consells detallats"
            placeholder="Explica com arribar-hi, horaris recomanats, què demanar o qualsevol detall important..."
            inputProps={{ maxLength: 2000 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            helperText={`${description.length}/2000 caràcters`}
          />

          <Autocomplete
            size="small"
            options={townOptions}
            getOptionLabel={(option) => `${option.name}${option.region_name ? ` (${option.region_name})` : ''}${option.country_name ? `, ${option.country_name}` : ''}`}
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
                label="Poble o Ciutat específica (opcional)"
                placeholder="Cerca el poble o ciutat (ex: Marrakech, Girona...)"
                helperText="Vincula el consell a un poble concret per aparèixer a la seva guia"
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

          <TextField
            fullWidth
            size="small"
            label="Lloc concret, local o adreça (opcional)"
            placeholder="Ex: Jemaa el-Fnaa, Restaurant Saegreifinn, etc."
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
          />

          <TextField
            fullWidth
            size="small"
            label="URL de la imatge (opcional)"
            placeholder="https://images.unsplash.com/photo-..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            helperText="Enllaç d'una foto de la recomanació"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                sx={{ color: '#C85A32', '&.Mui-checked': { color: '#C85A32' } }}
              />
            }
            label={
              <Box>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: '#2C221E' }}>
                  🌍 Mostrar a la guia pública de la web
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#786C65' }}>
                  El teu consell ajudarà altres viatgers que cerquin a Google (sense revelar el teu nom ni dades personals).
                </Typography>
              </Box>
            }
          />
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
          <Button
            onClick={onClose}
            disabled={isSubmitting}
            sx={{ color: '#786C65', textTransform: 'none', fontWeight: 600 }}
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
              px: 3,
              '&:hover': { bgcolor: '#A0471D' },
            }}
          >
            {isSubmitting ? 'Publicant...' : 'Publicar 🚀'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
