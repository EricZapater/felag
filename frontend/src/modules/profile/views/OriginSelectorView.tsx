import { useEffect, useState } from 'react';
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
  Typography,
  Alert,
} from '@mui/material';
import { useProfileStore } from '../store';
import { useNavigate } from 'react-router-dom';

export default function OriginSelectorView() {
  const { countries, regions, towns, fetchCountries, fetchRegions, fetchTowns, updateOrigin, isLoading, error } =
    useProfileStore();
  const navigate = useNavigate();

  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  const handleCountryChange = (countryId: string) => {
    setSelectedCountry(countryId);
    setSelectedRegion('');
    setSelectedTown('');
    if (countryId) {
      fetchRegions(countryId);
    }
  };

  const handleRegionChange = (regionId: string) => {
    setSelectedRegion(regionId);
    setSelectedTown('');
    if (regionId) {
      fetchTowns(regionId);
    }
  };

  const handleSaveOrigin = async () => {
    if (!selectedTown) return;
    try {
      await updateOrigin(selectedTown);
      setSuccessMsg('Origen guardat amb èxit!');
      setTimeout(() => navigate('/profile'), 1000);
    } catch (err) {
      // Error in store
    }
  };

  const currentCountryObj = countries.find((c) => c.id === selectedCountry);
  const currentRegionObj = regions.find((r) => r.id === selectedRegion);
  const currentTownObj = towns.find((t) => t.id === selectedTown);

  const selectedPathStr =
    currentCountryObj && currentRegionObj && currentTownObj
      ? `${currentCountryObj.name} ➔ ${currentRegionObj.name} ➔ ${currentTownObj.name}`
      : 'Cap origen completat';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0', py: 4 }}>
      <Container maxWidth="sm">
        <Typography variant="h5" sx={{ color: '#C85A32', fontWeight: 700, mb: 3 }}>
          FELAG
        </Typography>

        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(74, 46, 43, 0.06)', border: '1px solid #E8E2D9' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C221E', mb: 1 }}>
              Selecciona el teu origen
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65', mb: 3 }}>
              Selecciona la teva procedència seguint la jerarquia oficial (País → Regió → Ciutat).
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="country-label">1. País d'origen</InputLabel>
                <Select
                  labelId="country-label"
                  value={selectedCountry}
                  label="1. País d'origen"
                  onChange={(e) => handleCountryChange(e.target.value)}
                >
                  {countries.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={!selectedCountry}>
                <InputLabel id="region-label">2. Regió / Comunitat</InputLabel>
                <Select
                  labelId="region-label"
                  value={selectedRegion}
                  label="2. Regió / Comunitat"
                  onChange={(e) => handleRegionChange(e.target.value)}
                >
                  {regions.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={!selectedRegion}>
                <InputLabel id="town-label">3. Poble / Ciutat</InputLabel>
                <Select
                  labelId="town-label"
                  value={selectedTown}
                  label="3. Poble / Ciutat"
                  onChange={(e) => setSelectedTown(e.target.value)}
                >
                  {towns.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mt: 4, p: 2, bgcolor: '#F4ECE1', border: '1px solid #DDCFBF', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: '#8C7A70', fontWeight: 600, textTransform: 'uppercase' }}>
                Origen seleccionat
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#703817', mt: 0.5 }}>
                📍 {selectedPathStr}
              </Typography>
            </Box>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={() => navigate('/profile')} sx={{ color: '#786C65' }}>
                Cancel·lar
              </Button>
              <Button
                variant="contained"
                disabled={!selectedTown || isLoading}
                onClick={handleSaveOrigin}
                sx={{ bgcolor: '#C85A32', '&:hover': { bgcolor: '#A0471D' }, px: 3 }}
              >
                Confirmar origen
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
