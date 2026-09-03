import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Container,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PeopleIcon from '@mui/icons-material/People';
import { Link as RouterLink } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { useExploreStore } from '../store';
import { useProfileStore } from '@/modules/profile/store';
import { ExploreDestinationItem } from '../types';

export default function ExploreDestinationsView() {
  const { recommendations, fetchRecommendations, isLoading, error } = useExploreStore();
  const { profile, fetchProfile } = useProfileStore();

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRecommendations();
    fetchProfile();
  }, [fetchRecommendations, fetchProfile]);

  const userRegion =
    profile?.origin?.region?.name || profile?.origin?.town?.name || 'la teva terra (Catalunya)';

  // Fallback destination recommendations if server has empty state initially
  const defaultDestinations: ExploreDestinationItem[] = [
    {
      id: 'tokyo-jp',
      name: 'Tòquio',
      region_name: 'Regió de Kantō',
      country_name: 'Japó',
      country_code: 'JP',
      flag_emoji: '🇯🇵',
      banner_url:
        'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80',
      total_recommendations: 24,
      active_felagis_count: 8,
      affinity_reason: 'Molt popular entre viatgers del Vallès i Barcelonès',
    },
    {
      id: 'kyoto-jp',
      name: 'Kyoto',
      region_name: 'Regió de Kansai',
      country_name: 'Japó',
      country_code: 'JP',
      flag_emoji: '🇯🇵',
      banner_url:
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop&q=80',
      total_recommendations: 18,
      active_felagis_count: 4,
      affinity_reason: 'Destinació estrella per a rutes culturals',
    },
    {
      id: 'cinque-terre-it',
      name: 'Itàlia (Cinque Terre)',
      region_name: 'Ligúria',
      country_name: 'Itàlia',
      country_code: 'IT',
      flag_emoji: '🇮🇹',
      banner_url:
        'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&auto=format&fit=crop&q=80',
      total_recommendations: 32,
      active_felagis_count: 12,
      affinity_reason: 'Escapada mediterrània preferida per catalans',
    },
    {
      id: 'reykjavik-is',
      name: 'Islàndia (Cercle Daurat)',
      region_name: 'Höfuðborgarsvæðið',
      country_name: 'Islàndia',
      country_code: 'IS',
      flag_emoji: '🇮🇸',
      banner_url:
        'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=600&auto=format&fit=crop&q=80',
      total_recommendations: 15,
      active_felagis_count: 5,
      affinity_reason: 'Gran afinitat amb amants del senderisme i natura',
    },
  ];

  const itemsToDisplay = recommendations.length > 0 ? recommendations : defaultDestinations;

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return itemsToDisplay;
    const q = searchTerm.toLowerCase();
    return itemsToDisplay.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.country_name.toLowerCase().includes(q) ||
        (d.region_name && d.region_name.toLowerCase().includes(q))
    );
  }, [itemsToDisplay, searchTerm]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0', pb: 6 }}>
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Explore Hero */}
        <Box sx={{ textAlign: 'center', mb: 4, pt: 2 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: '#2C221E',
              fontSize: { xs: '1.75rem', md: '2.4rem' },
              mb: 1,
            }}
          >
            Descobreix la teva propera aventura 🗺️✨
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#786C65',
              fontSize: { xs: '0.95rem', md: '1.1rem' },
              maxWidth: 600,
              mx: 'auto',
              mb: 3,
            }}
          >
            Explora destinacions recomanades pels viatgers de la teva terra
          </Typography>

          {/* Search Box */}
          <Box
            sx={{
              display: 'flex',
              maxWidth: 600,
              mx: 'auto',
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Cerca una ciutat o país (ex: Kyoto, Islàndia, Roma...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#8C7A70' }} />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: '#FFFFFF',
                  borderRadius: 3,
                  '& fieldset': { borderColor: '#E8E2D9' },
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

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        )}

        {/* Section: Origin Affinity Recommendations */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <AutoAwesomeIcon sx={{ color: '#C85A32', fontSize: 24 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#2C221E', fontSize: '1.3rem' }}>
              🏡 Popular entre FELAGIS de {userRegion}
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {filteredItems.map((dest) => (
              <Grid item xs={12} sm={6} md={4} key={dest.id}>
                <Card
                  component={RouterLink}
                  to={`/destinations/${dest.id}`}
                  sx={{
                    borderRadius: 3.5,
                    border: '1px solid #E8E2D9',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    bgcolor: '#FFFFFF',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 10px 24px rgba(74, 46, 43, 0.10)',
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="170"
                    image={
                      dest.banner_url ||
                      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80'
                    }
                    alt={dest.name}
                    sx={{ objectFit: 'cover' }}
                  />

                  <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '1.3rem', mr: 1 }}>{dest.flag_emoji || '🌍'}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E' }}>
                        {dest.name}
                      </Typography>
                    </Box>

                    <Typography variant="body2" sx={{ color: '#786C65', mb: 1.5 }}>
                      {dest.country_name} {dest.region_name ? `• ${dest.region_name}` : ''}
                    </Typography>

                    {dest.affinity_reason && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#C85A32',
                          fontWeight: 600,
                          bgcolor: '#FDEEE9',
                          p: 0.75,
                          borderRadius: 1.5,
                          mb: 2,
                          display: 'block',
                        }}
                      >
                        ✨ {dest.affinity_reason}
                      </Typography>
                    )}

                    <Box
                      sx={{
                        mt: 'auto',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid #F0ECE4',
                        pt: 1.5,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#786C65', fontWeight: 600 }}>
                        ✨ {dest.total_recommendations || 0} consells
                      </Typography>

                      <Chip
                        icon={<PeopleIcon sx={{ fontSize: 14 }} />}
                        label={`${dest.active_felagis_count || 0} FELAGIS`}
                        size="small"
                        sx={{
                          bgcolor: '#FFF3E0',
                          color: '#E65100',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          borderRadius: 2,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}
