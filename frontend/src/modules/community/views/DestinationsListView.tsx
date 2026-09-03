import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { useCommunityStore } from '../store';

export default function DestinationsListView() {
  const { destinations, fetchDestinations, isLoading, error } = useCommunityStore();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchTerm(q);
    fetchDestinations(q.trim() || undefined);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: '#2C221E', mb: 1, letterSpacing: -0.5 }}
          >
            Guies de Destinacions 🗺️
          </Typography>
          <Typography variant="body1" sx={{ color: '#6B5E57', maxWidth: 650, mx: 'auto', mb: 3 }}>
            Descobreix consells, racons secrets i recomanacions de viatgers de la teva terra arreu del món.
          </Typography>

          {/* Search Bar */}
          <Box sx={{ maxWidth: 500, mx: 'auto' }}>
            <TextField
              fullWidth
              placeholder="Cerca per ciutat, regió o país (ex: Tòquio, Islàndia, Roma...)"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#C85A32' }} />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: '#FFFFFF',
                  borderRadius: 3,
                  boxShadow: '0 2px 8px rgba(74, 46, 43, 0.06)',
                  '& fieldset': { borderColor: '#E8E2D9' },
                  '&:hover fieldset': { borderColor: '#C85A32' },
                  '&.Mui-focused fieldset': { borderColor: '#C85A32' },
                },
              }}
            />
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        ) : destinations.length === 0 ? (
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
            <LocationOnIcon sx={{ fontSize: 48, color: '#D4A373', mb: 1 }} />
            <Typography variant="h6" sx={{ color: '#2C221E', fontWeight: 700, mb: 0.5 }}>
              No s'han trobat destinacions
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65' }}>
              {searchTerm
                ? `No hi ha cap ciutat o país que coincideixi amb "${searchTerm}". Prova una altra cerca.`
                : 'Encara no hi ha destinacions registrades.'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {destinations.map((dest) => (
              <Grid item xs={12} sm={6} md={4} key={dest.id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    bgcolor: '#FFFFFF',
                    border: '1px solid #E8E2D9',
                    boxShadow: '0 2px 8px rgba(74, 46, 43, 0.04)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 8px 24px rgba(74, 46, 43, 0.12)',
                      borderColor: '#C85A32',
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => navigate(`/destinations/${dest.id}`)}
                    sx={{ p: 2.5 }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E' }}>
                          {dest.name}
                        </Typography>
                        <Chip
                          label={dest.type === 'town' ? 'Ciutat' : 'País'}
                          size="small"
                          sx={{
                            bgcolor: dest.type === 'town' ? '#FDEEE9' : '#FFF8E1',
                            color: dest.type === 'town' ? '#C85A32' : '#E65100',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        />
                      </Box>

                      {(dest.region_name || dest.country_name) && (
                        <Typography variant="body2" sx={{ color: '#786C65', mb: 2 }}>
                          📍 {[dest.region_name, dest.country_name].filter(Boolean).join(', ')}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 2, pt: 1.5, borderTop: '1px solid #FAF7F2' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#C85A32', fontSize: '0.85rem', fontWeight: 600 }}>
                          <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                          <span>{dest.recommendations_count ?? 0} recomanacions</span>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#703817', fontSize: '0.85rem', fontWeight: 600 }}>
                          <PeopleIcon sx={{ fontSize: 16 }} />
                          <span>{dest.active_felagis_count ?? 0} viatgers ara</span>
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
