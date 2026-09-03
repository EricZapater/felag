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
  Typography,
} from '@mui/material';
import { useCommunityStore } from '../store';
import { CommunityReportReason, CommunityReportTargetType } from '../types';

interface ReportDialogProps {
  open: boolean;
  targetType: CommunityReportTargetType;
  targetId: string;
  targetTitle?: string;
  onClose: () => void;
}

export default function ReportDialog({
  open,
  targetType,
  targetId,
  targetTitle,
  onClose,
}: ReportDialogProps) {
  const { reportContent } = useCommunityStore();
  const [reason, setReason] = useState<CommunityReportReason>('inappropriate_content');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await reportContent({
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setDetails('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error enviant la denúncia');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTargetTypeLabel = (type: CommunityReportTargetType) => {
    switch (type) {
      case 'recommendation':
        return 'aquesta recomanació';
      case 'comment':
        return 'aquest comentari';
      case 'live_moment':
        return 'aquesta foto';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, color: '#2C221E', pb: 1 }}>
          🚩 Denunciar contingut
        </DialogTitle>

        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#786C65' }}>
            Indica el motiu pel qual vols denunciar {getTargetTypeLabel(targetType)}
            {targetTitle ? ` ("${targetTitle}")` : ''}.
          </Typography>

          {submitted ? (
            <Alert severity="success">
              Gràcies per ajudar a mantenir la comunitat segura. Hem rebut la teva denúncia.
            </Alert>
          ) : (
            <>
              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <FormControl fullWidth size="small">
                <InputLabel id="report-reason-label">Motiu de la denúncia</InputLabel>
                <Select
                  labelId="report-reason-label"
                  value={reason}
                  label="Motiu de la denúncia"
                  onChange={(e) => setReason(e.target.value as CommunityReportReason)}
                >
                  <MenuItem value="inappropriate_content">Contingut inapropiat o ofensiu</MenuItem>
                  <MenuItem value="spam">Spam o publicitat no autoritzada</MenuItem>
                  <MenuItem value="false_information">Informació falsa o enganyosa</MenuItem>
                  <MenuItem value="harassment">Assetjament o conductes d’odi</MenuItem>
                  <MenuItem value="other">Altres motius</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                label="Detalls addicionals (opcional)"
                placeholder="Afegeix qualsevol informació que ajudi l'equip de moderació..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </>
          )}
        </DialogContent>

        {!submitted && (
          <DialogActions sx={{ p: 2, pt: 0, gap: 1 }}>
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
              color="error"
              disabled={isSubmitting}
              sx={{
                bgcolor: '#D32F2F',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                '&:hover': { bgcolor: '#B71C1C' },
              }}
            >
              {isSubmitting ? 'Enviant...' : 'Enviar denúncia'}
            </Button>
          </DialogActions>
        )}
      </form>
    </Dialog>
  );
}
