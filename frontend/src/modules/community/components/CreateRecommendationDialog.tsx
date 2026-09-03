import { useState } from 'react';
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
} from '@mui/material';
import { useCommunityStore } from '../store';
import { RecommendationCategory } from '../types';

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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      });
      // Reset form
      setTitle('');
      setDescription('');
      setLocationName('');
      setImageUrl('');
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

          <TextField
            fullWidth
            size="small"
            label="Ubicació o adreça (opcional)"
            placeholder="Ex: Shinjuku 2-chome 12-4, Tòquio"
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
