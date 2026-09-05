import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  IconButton,
  Divider,
  Grid,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import DestinationAutocomplete from '../components/DestinationAutocomplete';
import { CompanionSelector } from '../components/CompanionSelector';
import { useTripStore } from '../store';
import { FelagiUserSummary, TripStageInput, TripVisibility } from '../types';

interface StageFormState {
  destination_name: string;
  country_code: string;
  town_id?: string;
  region_id?: string;
  start_date: string;
  end_date: string;
  notes: string;
}

export default function TripCreateView() {
  const { createTrip, isLoading, error, clearError } = useTripStore();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visibility, setVisibility] = useState<TripVisibility>('public');
  const [selectedCompanions, setSelectedCompanions] = useState<FelagiUserSummary[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [stages, setStages] = useState<StageFormState[]>([
    {
      destination_name: '',
      country_code: '',
      start_date: '',
      end_date: '',
      notes: '',
    },
  ]);

  const handleAddStage = () => {
    setStages((prev) => [
      ...prev,
      {
        destination_name: '',
        country_code: '',
        start_date: '',
        end_date: '',
        notes: '',
      },
    ]);
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) return;
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStageChange = (index: number, field: keyof StageFormState, value: string) => {
    setStages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    // UX Validations
    if (!title.trim()) {
      setValidationError('Si us plau, introdueix el títol del viatge.');
      return;
    }
    if (!startDate || !endDate) {
      setValidationError('Has d’introduir les dates d’inici i de fi del viatge.');
      return;
    }
    if (startDate > endDate) {
      setValidationError('La data d’inici ha de ser anterior o igual a la data de fi del viatge.');
      return;
    }
    if (stages.length === 0) {
      setValidationError('Cal afegir almenys una etapa al viatge.');
      return;
    }

    for (let i = 0; i < stages.length; i++) {
      const st = stages[i];
      if (!st.destination_name.trim()) {
        setValidationError(`L'etapa ${i + 1} necessita una destinació o ciutat.`);
        return;
      }
      if (!st.start_date || !st.end_date) {
        setValidationError(`L'etapa ${i + 1} necessita dates d'arribada i de sortida.`);
        return;
      }
      if (st.start_date > st.end_date) {
        setValidationError(`A l'etapa ${i + 1}, la data d'arribada no pot ser posterior a la de sortida.`);
        return;
      }
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

    try {
      const newTrip = await createTrip({
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        start_date: startDate,
        end_date: endDate,
        visibility,
        companion_user_ids: selectedCompanions.map((c) => c.id),
        stages: payloadStages,
      });
      navigate(`/trips/${newTrip.id}`);
    } catch (err) {
      // Error is set in store
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      {/* Main Container */}
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Card
          sx={{
            bgcolor: '#FFFFFF',
            border: '1px solid #E8E2D9',
            borderRadius: 3,
            p: { xs: 2, md: 4 },
            boxShadow: '0 2px 12px rgba(74, 46, 43, 0.05)',
          }}
        >
          <CardContent sx={{ p: { xs: 1, md: 2 } }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C221E', mb: 1 }}>
              Crear un nou viatge
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65', mb: 4 }}>
              Indica les teves dates i les etapes del viatge per trobar viatgers de la teva terra.
            </Typography>

            {validationError && (
              <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setValidationError(null)}>
                {validationError}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              {/* Trip Title */}
              <TextField
                fullWidth
                label="Títol del viatge"
                placeholder="Ex: Ruta per Escandinàvia"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                sx={{ mb: 3 }}
              />

              {/* Trip Dates */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Data d'inici"
                    InputLabelProps={{ shrink: true }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Data de finalització"
                    InputLabelProps={{ shrink: true }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </Grid>
              </Grid>

              {/* Trip Visibility */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="visibility-label">Visibilitat i Matching</InputLabel>
                <Select
                  labelId="visibility-label"
                  value={visibility}
                  label="Visibilitat i Matching"
                  onChange={(e) => setVisibility(e.target.value as TripVisibility)}
                >
                  <MenuItem value="public">
                    <strong>Públic</strong> — Visible per a matching amb tothom de la meva terra
                  </MenuItem>
                  <MenuItem value="contacts_only">
                    <strong>Només contactes</strong> — Visible només per a contactes directes
                  </MenuItem>
                  <MenuItem value="private">
                    <strong>Privat</strong> — Només per a ús personal (sense matching)
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Optional Description */}
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Descripció o notes generals (opcional)"
                placeholder="Ex: Viatge amb motxilla i trens..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{ mb: 3 }}
              />

              {/* Travel Companions Selector */}
              <CompanionSelector
                selectedCompanions={selectedCompanions}
                onChange={setSelectedCompanions}
              />

              <Divider sx={{ my: 4, borderColor: '#E8E2D9' }} />

              {/* Stages Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#3E2723' }}>
                  Destinacions / Etapes del viatge
                </Typography>
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddStage}
                  sx={{
                    color: '#C85A32',
                    borderColor: '#C85A32',
                    borderStyle: 'dashed',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#A0471D',
                      bgcolor: '#FAF7F2',
                      borderStyle: 'dashed',
                    },
                  }}
                >
                  Afegir etapa
                </Button>
              </Box>

              {/* Dynamic Stage Cards */}
              {stages.map((stage, idx) => (
                <Box
                  key={idx}
                  sx={{
                    bgcolor: '#FAF7F2',
                    border: '1px solid #E8E2D9',
                    borderRadius: 2,
                    p: 2.5,
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography sx={{ fontWeight: 700, color: '#C85A32', fontSize: '0.95rem' }}>
                      Etapa {idx + 1}
                    </Typography>
                    {stages.length > 1 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveStage(idx)}
                        aria-label="Eliminar etapa"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={8}>
                      <DestinationAutocomplete
                        value={stage.destination_name}
                        countryCode={stage.country_code}
                        townId={stage.town_id}
                        onChange={(data) => handleStageDestinationChange(idx, data)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Codi de país (opcional)"
                        placeholder="Ex: SE"
                        inputProps={{ maxLength: 3 }}
                        value={stage.country_code}
                        onChange={(e) => handleStageChange(idx, 'country_code', e.target.value)}
                        sx={{ bgcolor: '#FFFFFF' }}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Arribada"
                        InputLabelProps={{ shrink: true }}
                        value={stage.start_date}
                        onChange={(e) => handleStageChange(idx, 'start_date', e.target.value)}
                        required
                        sx={{ bgcolor: '#FFFFFF' }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Sortida"
                        InputLabelProps={{ shrink: true }}
                        value={stage.end_date}
                        onChange={(e) => handleStageChange(idx, 'end_date', e.target.value)}
                        required
                        sx={{ bgcolor: '#FFFFFF' }}
                      />
                    </Grid>
                  </Grid>

                  <TextField
                    fullWidth
                    size="small"
                    label="Notes de l'etapa (opcional)"
                    placeholder="Ex: Visita Gamla Stan, allotjament prop de l'estació..."
                    value={stage.notes}
                    onChange={(e) => handleStageChange(idx, 'notes', e.target.value)}
                    sx={{ bgcolor: '#FFFFFF' }}
                  />
                </Box>
              ))}

              {/* Form Actions */}
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  component={RouterLink}
                  to="/trips"
                  variant="outlined"
                  sx={{
                    color: '#555',
                    borderColor: '#DDCFBF',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    '&:hover': { borderColor: '#786C65', bgcolor: 'transparent' },
                  }}
                >
                  Cancel·lar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  sx={{
                    bgcolor: '#C85A32',
                    color: '#FFFFFF',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 4,
                    py: 1.2,
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#A0471D' },
                  }}
                >
                  {isLoading ? 'Guardant...' : 'Guardar viatge'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
