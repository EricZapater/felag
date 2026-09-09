import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
  Divider,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import EditIcon from '@mui/icons-material/Edit';
import DestinationAutocomplete from './DestinationAutocomplete';
import { useTripStore } from '../store';
import { Trip, TripStageInput, TripVisibility } from '../types';

interface StageFormState {
  id?: string;
  destination_name: string;
  country_code: string;
  town_id?: string;
  region_id?: string;
  start_date: string;
  end_date: string;
  notes: string;
}

interface EditTripDialogProps {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  onTripUpdated?: () => void;
}

export default function EditTripDialog({
  open,
  onClose,
  trip,
  onTripUpdated,
}: EditTripDialogProps) {
  const { updateTrip } = useTripStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visibility, setVisibility] = useState<TripVisibility>('public');
  const [photoSharingMode, setPhotoSharingMode] = useState<string>('all_felagis');
  const [stages, setStages] = useState<StageFormState[]>([]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (trip && open) {
      setTitle(trip.title || '');
      setDescription(trip.description || '');
      setStartDate(trip.start_date || '');
      setEndDate(trip.end_date || '');
      setVisibility(trip.visibility || 'public');
      setPhotoSharingMode(trip.photo_sharing_mode || 'all_felagis');

      if (trip.stages && trip.stages.length > 0) {
        const sorted = [...trip.stages].sort((a, b) => a.stage_order - b.stage_order);
        setStages(
          sorted.map((s) => ({
            id: s.id,
            destination_name: s.destination_name || '',
            country_code: s.country_code || '',
            town_id: s.town_id || undefined,
            region_id: s.region_id || undefined,
            start_date: s.start_date || '',
            end_date: s.end_date || '',
            notes: s.notes || '',
          }))
        );
      } else {
        setStages([
          {
            destination_name: '',
            country_code: '',
            start_date: trip.start_date || '',
            end_date: trip.end_date || '',
            notes: '',
          },
        ]);
      }
      setValidationError(null);
      setApiError(null);
    }
  }, [trip, open]);

  const handleAddStage = () => {
    const lastStage = stages[stages.length - 1];
    setStages((prev) => [
      ...prev,
      {
        destination_name: '',
        country_code: '',
        start_date: lastStage?.end_date || endDate || '',
        end_date: endDate || '',
        notes: '',
      },
    ]);
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) return;
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === stages.length - 1)
    ) {
      return;
    }
    const newStages = [...stages];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newStages[index];
    newStages[index] = newStages[targetIdx];
    newStages[targetIdx] = temp;
    setStages(newStages);
  };

  const handleStageDestinationChange = (
    index: number,
    data: { destination_name: string; country_code: string; town_id?: string; region_id?: string }
  ) => {
    setStages((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        destination_name: data.destination_name,
        country_code: data.country_code,
        town_id: data.town_id,
        region_id: data.region_id,
      };
      return updated;
    });
  };

  const handleStageFieldChange = (
    index: number,
    field: keyof StageFormState,
    value: string
  ) => {
    setStages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);

    if (!title.trim()) {
      setValidationError('El títol del viatge és obligatori.');
      return;
    }

    if (stages.length === 0) {
      setValidationError('El viatge ha de tenir almenys una etapa.');
      return;
    }

    let minStageDate = '';
    let maxStageDate = '';

    for (let i = 0; i < stages.length; i++) {
      const st = stages[i];
      if (!st.destination_name.trim()) {
        setValidationError(`L'etapa ${i + 1} necessita una destinació o ciutat.`);
        return;
      }
      if (!st.start_date || !st.end_date) {
        setValidationError(`L'etapa ${i + 1} necessita dates d'inici i de fi.`);
        return;
      }
      if (st.start_date > st.end_date) {
        setValidationError(
          `A l'etapa ${i + 1} (${st.destination_name}), la data d'inici no pot ser posterior a la de fi.`
        );
        return;
      }

      if (!minStageDate || st.start_date < minStageDate) {
        minStageDate = st.start_date;
      }
      if (!maxStageDate || st.end_date > maxStageDate) {
        maxStageDate = st.end_date;
      }
    }

    // Adapt overall dates if stages expand beyond current dates
    let finalStartDate = startDate;
    let finalEndDate = endDate;
    if (!finalStartDate || (minStageDate && minStageDate < finalStartDate)) {
      finalStartDate = minStageDate;
    }
    if (!finalEndDate || (maxStageDate && maxStageDate > finalEndDate)) {
      finalEndDate = maxStageDate;
    }

    if (finalStartDate > finalEndDate) {
      setValidationError('La data d’inici ha de ser anterior o igual a la data de fi.');
      return;
    }

    const payloadStages: TripStageInput[] = stages.map((st, idx) => ({
      stage_order: idx + 1,
      destination_name: st.destination_name.trim(),
      town_id: st.town_id || null,
      region_id: st.region_id || null,
      country_code: st.country_code.trim() ? st.country_code.trim().toUpperCase() : null,
      start_date: st.start_date,
      end_date: st.end_date,
      notes: st.notes.trim() ? st.notes.trim() : null,
    }));

    setIsSaving(true);
    try {
      await updateTrip(trip.id, {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        start_date: finalStartDate,
        end_date: finalEndDate,
        visibility,
        photo_sharing_mode: photoSharingMode,
        stages: payloadStages,
      });

      if (onTripUpdated) {
        onTripUpdated();
      }
      onClose();
    } catch (err: any) {
      setApiError(err?.response?.data?.error || err?.message || 'Error en actualitzar el viatge.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !isSaving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: '#2C221E', display: 'flex', alignItems: 'center', gap: 1 }}>
        <EditIcon sx={{ color: '#C85A32' }} />
        Editar viatge i etapes
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          {validationError && (
            <Alert severity="warning" sx={{ mb: 2.5 }} onClose={() => setValidationError(null)}>
              {validationError}
            </Alert>
          )}

          {apiError && (
            <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setApiError(null)}>
              {apiError}
            </Alert>
          )}

          {/* Dades generals */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#3E2723', mb: 2 }}>
            📌 Informació general
          </Typography>

          <TextField
            fullWidth
            label="Títol del viatge"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            size="small"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Descripció (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            size="small"
            sx={{ mb: 2 }}
          />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Data d'inici del viatge"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size="small"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Data de fi del viatge"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                size="small"
                required
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="edit-vis-label">Visibilitat i Matching</InputLabel>
                <Select
                  labelId="edit-vis-label"
                  value={visibility}
                  label="Visibilitat i Matching"
                  onChange={(e) => setVisibility(e.target.value as TripVisibility)}
                >
                  <MenuItem value="public">🌍 Públic (Apareix a Coincidències / Matching)</MenuItem>
                  <MenuItem value="contacts_only">👥 Només contactes</MenuItem>
                  <MenuItem value="private">🔒 Privat (Només tu i acompanyants)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="edit-psm-label">Compartició de Fotos</InputLabel>
                <Select
                  labelId="edit-psm-label"
                  value={photoSharingMode}
                  label="Compartició de Fotos"
                  onChange={(e) => setPhotoSharingMode(e.target.value)}
                >
                  <MenuItem value="all_felagis">📸 Tots els felagis que coincideixin</MenuItem>
                  <MenuItem value="close_origin">📍 Només felagis del mateix poble / comarca</MenuItem>
                  <MenuItem value="none">🔒 Només acompanyants directes</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Etapes de la ruta */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#3E2723' }}>
                🗺️ Etapes de la ruta ({stages.length})
              </Typography>
              <Typography variant="caption" sx={{ color: '#786C65' }}>
                Pots afegir, reordenar, canviar dates o modificar qualsevol destinació.
              </Typography>
            </Box>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddStage}
              size="small"
              variant="outlined"
              sx={{
                color: '#C85A32',
                borderColor: '#C85A32',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#F4ECE1', borderColor: '#A0471D' },
              }}
            >
              Afegir etapa
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {stages.map((stage, idx) => (
              <Paper
                key={idx}
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: '#FAF7F2',
                  borderColor: '#E8E2D9',
                  borderRadius: 2,
                  position: 'relative',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: '#C85A32',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2C221E' }}>
                      Etapa {idx + 1}: {stage.destination_name || 'Destinació nova'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="Moure amunt">
                      <span>
                        <IconButton
                          size="small"
                          disabled={idx === 0}
                          onClick={() => handleMoveStage(idx, 'up')}
                          sx={{ p: 0.5 }}
                        >
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Moure avall">
                      <span>
                        <IconButton
                          size="small"
                          disabled={idx === stages.length - 1}
                          onClick={() => handleMoveStage(idx, 'down')}
                          sx={{ p: 0.5 }}
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {stages.length > 1 && (
                      <Tooltip title="Eliminar etapa">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveStage(idx)}
                          sx={{ p: 0.5, ml: 0.5 }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <DestinationAutocomplete
                      value={stage.destination_name}
                      countryCode={stage.country_code}
                      townId={stage.town_id}
                      onChange={(data) => handleStageDestinationChange(idx, data)}
                      label="Destinació / Ciutat"
                      placeholder="Cerca poble, ciutat o país..."
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Data d'arribada"
                      InputLabelProps={{ shrink: true }}
                      value={stage.start_date}
                      onChange={(e) => handleStageFieldChange(idx, 'start_date', e.target.value)}
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Data de sortida"
                      InputLabelProps={{ shrink: true }}
                      value={stage.end_date}
                      onChange={(e) => handleStageFieldChange(idx, 'end_date', e.target.value)}
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Notes o plans de l'etapa (opcional)"
                      value={stage.notes}
                      onChange={(e) => handleStageFieldChange(idx, 'notes', e.target.value)}
                      size="small"
                      placeholder="Ex: Visitar casc antic, allotjament..."
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#FAF7F2' }}>
          <Button onClick={onClose} disabled={isSaving} sx={{ color: '#786C65' }}>
            Cancel·lar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSaving}
            sx={{
              bgcolor: '#C85A32',
              color: '#FFFFFF',
              fontWeight: 600,
              px: 3,
              '&:hover': { bgcolor: '#A0471D' },
            }}
          >
            {isSaving ? <CircularProgress size={22} sx={{ color: '#FFFFFF' }} /> : 'Desar canvis'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
