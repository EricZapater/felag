import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Pagination,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { publicSeoApi } from '../api';
import { PublicDestinationItem } from '../types';

export default function PublicDestinationsIndexView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const qParam = searchParams.get('q') || '';
  const lang = searchParams.get('lang') || 'ca';

  const [destinations, setDestinations] = useState<PublicDestinationItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState(qParam);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = 'Guies de Destinacions i Consells de Viatge — FELAG';
  }, []);

  useEffect(() => {
    setIsLoading(true);
    publicSeoApi
      .getPublicDestinations({
        page: pageParam,
        limit: 12,
        q: qParam || undefined,
        lang,
      })
      .then((res) => {
        setDestinations(res.data);
        setTotalPages(res.pagination.total_pages);
        setTotalItems(res.pagination.total_items);
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, [pageParam, qParam, lang]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: searchQuery, page: '1', lang });
  };

  const handlePageChange = (_: any, value: number) => {
    setSearchParams({ q: searchQuery, page: value.toString(), lang });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      {/* Hero Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2C221E 0%, #4A3B32 100%)',
          color: '#FFFFFF',
          py: 6,
          px: 2,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Chip
            icon={<VerifiedIcon sx={{ color: '#FFFFFF !important', fontSize: 16 }} />}
            label="Coneixement Col·lectiu de Viatge"
            size="small"
            sx={{
              bgcolor: '#C85A32',
              color: '#FFFFFF',
              fontWeight: 700,
              mb: 2,
            }}
          />
          <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.85rem', md: '2.5rem' }, mb: 1.5 }}>
            Explora les Guies Públiques de Destinacions 🌍
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 600, mx: 'auto', mb: 4, lineHeight: 1.6 }}>
            Consells pràctics, gastronomia i racons secrets compartits pels viatgers de FELAG arreu del món.
          </Typography>

          {/* Search Bar */}
          <Box
            component="form"
            onSubmit={handleSearchSubmit}
            sx={{
              display: 'flex',
              maxWidth: 540,
              mx: 'auto',
              bgcolor: '#FFFFFF',
              borderRadius: 3,
              p: 0.5,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
          >
            <TextField
              fullWidth
              placeholder="Cerca una ciutat o país (ex: Tòquio, Roma, Japó)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                startAdornment: <SearchIcon sx={{ color: '#8C7A70', ml: 1.5, mr: 1 }} />,
                sx: { px: 1, py: 0.5, color: '#2C221E' },
              }}
            />
          </Box>
        </Container>
      </Box>

      {/* Destinations Grid */}
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#2C221E' }}>
            Destinacions amb consells verificats ({totalItems})
          </Typography>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        ) : destinations.length === 0 ? (
          <Card sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: '#FAF7F2', border: '1px dashed #DDCFBF' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C221E', mb: 1 }}>
              No s'han trobat destinacions amb consells
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65' }}>
              Prova de cercar un altre terme o explora els països disponibles.
            </Typography>
          </Card>
        ) : (
          <>
            <Grid container spacing={3}>
              {destinations.map((dest) => (
                <Grid item xs={12} sm={6} md={4} key={dest.id}>
                  <Card
                    component={RouterLink}
                    to={`/destinacions/${dest.slug}`}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 3,
                      border: '1px solid #E8E2D9',
                      bgcolor: '#FFFFFF',
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#2C221E' }}>
                          {dest.name} {dest.flag_emoji}
                        </Typography>
                        <Chip
                          label={`📝 ${dest.total_tips_count} consells`}
                          size="small"
                          sx={{
                            bgcolor: '#FFF3E0',
                            color: '#E65100',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                          }}
                        />
                      </Box>

                      <Typography variant="body2" sx={{ color: '#786C65', mb: 2 }}>
                        📍 {dest.region_name ? `${dest.region_name}, ` : ''}{dest.country_name}
                      </Typography>

                      <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #F0ECE4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#C85A32' }}>
                          ✨ {dest.endorsement_summary}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#8C7A70' }}>
                          {dest.updated_at_period}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                <Pagination
                  count={totalPages}
                  page={pageParam}
                  onChange={handlePageChange}
                  sx={{
                    '& .MuiPaginationItem-root.Mui-selected': {
                      bgcolor: '#C85A32',
                      color: '#FFFFFF',
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
