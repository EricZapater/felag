import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Radio,
  RadioGroup,
} from '@mui/material';
import { PhotoSharingMode } from '../types';

interface ArrivalPromptDialogProps {
  open: boolean;
  destinationName: string;
  flagEmoji?: string;
  initialMode?: PhotoSharingMode;
  onConfirm: (mode: PhotoSharingMode) => void | Promise<void>;
  onClose?: () => void;
}

export default function ArrivalPromptDialog({
  open,
  destinationName,
  flagEmoji = '📍',
  initialMode = 'all_felagis',
  onConfirm,
  onClose,
}: ArrivalPromptDialogProps) {
  const [selectedMode, setSelectedMode] = useState<PhotoSharingMode>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(selectedMode);
    } finally {
      setIsSubmitting(false);
    }
  };

  const options: { mode: PhotoSharingMode; title: string; desc: string }[] = [
    {
      mode: 'all_felagis',
      title: '🌍 Amb tots els FELAGIS que coincideixin',
      desc: `Les teves fotos apareixeran al Feed en Viu de ${destinationName} per a tots els viatgers amb dates solapades.`,
    },
    {
      mode: 'close_origin',
      title: '🏡 Només amb els meus propers',
      desc: 'Visible únicament per a FELAGIS del teu mateix poble/regió o amb qui tinguis xat obert.',
    },
    {
      mode: 'none',
      title: '🔒 Amb ningú (Mode Privat)',
      desc: 'No compartir cap foto al feed efímer. Pots canviar d’opció quan vulguis.',
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          p: { xs: 2, sm: 3 },
          bgcolor: '#FFFFFF',
          border: '1px solid #E8E2D9',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          textAlign: 'center',
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 1, sm: 2 } }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            bgcolor: '#FDEEE9',
            color: '#C85A32',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1.25rem',
          }}
        >
          {flagEmoji}
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 800, color: '#2C221E', mb: 1 }}>
          Benvingut/da a {destinationName}! 📍✨
        </Typography>

        <Typography variant="body2" sx={{ color: '#6B5E57', lineHeight: 1.5, mb: 3 }}>
          Comença la teva estada a {destinationName}. Vols compartir fotos en temps real amb altres FELAGIS que són a la ciutat ara mateix?
        </Typography>

        <RadioGroup
          value={selectedMode}
          onChange={(e) => setSelectedMode(e.target.value as PhotoSharingMode)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3, textAlign: 'left' }}
        >
          {options.map((opt) => {
            const isSelected = selectedMode === opt.mode;
            return (
              <Box
                key={opt.mode}
                onClick={() => setSelectedMode(opt.mode)}
                sx={{
                  border: isSelected ? '2px solid #C85A32' : '2px solid #E8E2D9',
                  bgcolor: isSelected ? '#FDF7F4' : '#FFFFFF',
                  borderRadius: 3,
                  p: 2,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#D4A373',
                    bgcolor: '#FAF7F2',
                  },
                }}
              >
                <Radio
                  checked={isSelected}
                  value={opt.mode}
                  sx={{
                    p: 0,
                    mt: 0.3,
                    color: '#C85A32',
                    '&.Mui-checked': { color: '#C85A32' },
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#2C221E', mb: 0.5 }}>
                    {opt.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.825rem', color: '#6B5E57', lineHeight: 1.4 }}>
                    {opt.desc}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </RadioGroup>

        <Button
          fullWidth
          variant="contained"
          onClick={handleConfirm}
          disabled={isSubmitting}
          sx={{
            bgcolor: '#C85A32',
            color: '#FFFFFF',
            py: 1.4,
            borderRadius: 2.5,
            fontSize: '1rem',
            fontWeight: 700,
            textTransform: 'none',
            '&:hover': { bgcolor: '#A0471D' },
          }}
        >
          {isSubmitting ? 'Guardant...' : 'Confirmar i Continuar 🚀'}
        </Button>

        <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#8C7A70' }}>
          🔒 Les fotos només són visibles durant el període de solapament del viatge. Pots canviar aquesta preferència en qualsevol moment.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
