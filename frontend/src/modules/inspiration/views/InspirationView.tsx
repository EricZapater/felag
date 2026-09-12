import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Autocomplete,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import AddIcon from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ShareIcon from '@mui/icons-material/Share';
import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { useInspirationStore } from '../store';
import { InspirationCategory, InspirationItem } from '../types';
import { communityApi } from '@/modules/community/api';
import { useChatStore } from '@/modules/chat/store';
import CreateInspirationDialog from '../components/CreateInspirationDialog';

interface DestinationOption {
  id: string;
  name: string;
  country_name?: string;
  country_code?: string;
  flag_emoji?: string;
  label: string;
}

export default function InspirationView() {
  const navigate = useNavigate();
  const {
    items,
    categories,
    selectedCategory,
    searchQuery,
    isLoading,
    error,
    fetchInspiration,
    setCategory,
    setSearchQuery,
    toggleVote,
  } = useInspirationStore();

  const { createOrGetConversation } = useChatStore();

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [connectingAuthorId, setConnectingAuthorId] = useState<string | null>(null);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  // Autocomplete state
  const [destinationOptions, setDestinationOptions] = useState<DestinationOption[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<DestinationOption | null>(null);
  const [autoInputValue, setAutoInputValue] = useState(searchQuery);
  const [isSearchingDestinations, setIsSearchingDestinations] = useState(false);

  useEffect(() => {
    fetchInspiration();
  }, [fetchInspiration]);

  // Autocomplete debounced search for Nom (País)
  useEffect(() => {
    if (!autoInputValue || autoInputValue.trim().length < 2) {
      setDestinationOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDestinations(true);
      try {
        const [towns, dests] = await Promise.allSettled([
          communityApi.searchTowns(autoInputValue.trim()),
          communityApi.getDestinations(autoInputValue.trim()),
        ]);

        const townList = towns.status === 'fulfilled' ? towns.value : [];
        const destList = dests.status === 'fulfilled' ? dests.value : [];

        const combined: DestinationOption[] = [];
        const seenIds = new Set<string>();

        for (const t of townList) {
          if (!seenIds.has(t.id)) {
            seenIds.add(t.id);
            const country = t.country_name || t.country_code || '';
            combined.push({
              id: t.id,
              name: t.name,
              country_name: t.country_name,
              country_code: t.country_code,
              label: country ? `${t.name} (${country})` : t.name,
            });
          }
        }

        for (const d of destList) {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            const country = d.country_name || d.country_code || '';
            combined.push({
              id: d.id,
              name: d.name,
              country_name: d.country_name,
              country_code: d.country_code,
              flag_emoji: d.flag_emoji,
              label: country ? `${d.name} (${country})` : d.name,
            });
          }
        }

        setDestinationOptions(combined);
      } catch {
        setDestinationOptions([]);
      } finally {
        setIsSearchingDestinations(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [autoInputValue]);

  const handleDestinationSelect = (option: DestinationOption | null) => {
    setSelectedDestination(option);
    if (option) {
      setSearchQuery(option.name);
    } else {
      setSearchQuery('');
    }
  };

  const handleTextSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(autoInputValue);
  };

  const handleContactAuthor = async (authorId: string) => {
    if (!authorId || connectingAuthorId) return;
    setConnectingAuthorId(authorId);
    try {
      const conv = await createOrGetConversation(authorId);
      if (conv && conv.id) {
        navigate(`/chats/${conv.id}`);
      } else {
        navigate('/chats');
      }
    } catch {
      navigate('/chats');
    } finally {
      setConnectingAuthorId(null);
    }
  };

  const handleShareClick = (item: InspirationItem) => {
    if (navigator.share) {
      navigator
        .share({
          title: item.title,
          text: item.description || `Inspiració de viatge a FELAG: ${item.title}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedItemId(item.id);
      setTimeout(() => setCopiedItemId(null), 2000);
    }
  };

  const getCategoryLabel = (category?: InspirationCategory) => {
    switch (category) {
      case 'food':
        return { label: 'Gastronomia', emoji: '🍽️', color: '#D97706' };
      case 'hidden_gem':
        return { label: 'Racó Secret', emoji: '💎', color: '#059669' };
      case 'practical_tip':
        return { label: 'Consell Pràctic', emoji: '💡', color: '#2563EB' };
      case 'transport':
        return { label: 'Transport', emoji: '🚆', color: '#7C3AED' };
      case 'anecdote':
        return { label: 'Anècdota', emoji: '📖', color: '#DB2777' };
      case 'itinerary':
        return { label: 'Itinerari', emoji: '🗺️', color: '#C85A32' };
      default:
        return { label: 'Recomanació', emoji: '✨', color: '#C85A32' };
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      {/* Hero Header */}
      <Box
        sx={{
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E8E2D9',
          py: { xs: 4, md: 6 },
          px: 2,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: '#FAF0E6',
                color: '#C85A32',
                px: 2,
                py: 0.75,
                borderRadius: 99,
                fontWeight: 700,
                fontSize: '0.85rem',
                mb: 2,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 18 }} />
              Comunitat de Viatgers Catalans
            </Box>

            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 800,
                color: '#2C221E',
                mb: 1.5,
                letterSpacing: -0.5,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              }}
            >
              Inspiració per als teus viatges 💡
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: '#6E5D53',
                fontSize: { xs: '1rem', md: '1.15rem' },
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              Descobreix itineraris complets, racons secrets autèntics i consells pràctics compartits directament per felagis arreu del món.
            </Typography>

            {/* Integrated Search Bar with Destination Autocomplete `Nom (País)` */}
            <Box
              component="form"
              onSubmit={handleTextSearchSubmit}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.5,
                maxWidth: 620,
                mx: 'auto',
                alignItems: 'stretch',
              }}
            >
              <Autocomplete
                freeSolo
                fullWidth
                options={destinationOptions}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option.label;
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterOptions={(x) => x}
                value={selectedDestination}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    setSearchQuery(newValue);
                  } else {
                    handleDestinationSelect(newValue);
                  }
                }}
                inputValue={autoInputValue}
                onInputChange={(_, newInputValue, reason) => {
                  setAutoInputValue(newInputValue);
                  if (reason === 'clear') {
                    setSearchQuery('');
                  }
                }}
                loading={isSearchingDestinations}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Cerca destinació `Nom (País)` (ex: Tòquio, Islàndia, Roma...)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <SearchIcon sx={{ color: '#C85A32', ml: 1, mr: 0.5 }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      endAdornment: (
                        <>
                          {isSearchingDestinations ? (
                            <CircularProgress color="inherit" size={18} sx={{ mr: 1 }} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                      sx: {
                        bgcolor: '#F9F6F0',
                        borderRadius: 3,
                        '& fieldset': { borderColor: '#E8E2D9' },
                        '&:hover fieldset': { borderColor: '#C85A32' },
                        '&.Mui-focused fieldset': { borderColor: '#C85A32' },
                      },
                    }}
                  />
                )}
              />

              <Button
                variant="contained"
                onClick={() => setShareDialogOpen(true)}
                startIcon={<AddIcon />}
                sx={{
                  bgcolor: '#C85A32',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  borderRadius: 3,
                  px: 3,
                  py: { xs: 1.5, sm: 'auto' },
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(200, 90, 50, 0.25)',
                  '&:hover': {
                    bgcolor: '#A0471D',
                  },
                }}
              >
                Compartir 🚀
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Category Pills / Filter Section */}
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 1.2,
            overflowX: 'auto',
            pb: 1.5,
            pt: 0.5,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Chip
                key={cat.id}
                label={`${cat.emoji} ${cat.label}`}
                onClick={() => setCategory(cat.id)}
                clickable
                sx={{
                  px: 1.2,
                  py: 2.2,
                  borderRadius: 3,
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  bgcolor: isSelected ? '#C85A32' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#6E5D53',
                  border: isSelected ? '1px solid #C85A32' : '1px solid #E8E2D9',
                  boxShadow: isSelected
                    ? '0 4px 12px rgba(200, 90, 50, 0.25)'
                    : '0 2px 6px rgba(0, 0, 0, 0.03)',
                  '&:hover': {
                    bgcolor: isSelected ? '#A0471D' : '#FDF4EF',
                    color: isSelected ? '#FFFFFF' : '#C85A32',
                    borderColor: '#C85A32',
                  },
                }}
              />
            );
          })}
        </Box>

        {error && (
          <Alert severity="error" sx={{ my: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        ) : items.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              bgcolor: '#FFFFFF',
              borderRadius: 3,
              border: '1px solid #E8E2D9',
              p: 4,
              mt: 2,
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 48, color: '#D4A373', mb: 1 }} />
            <Typography variant="h6" sx={{ color: '#2C221E', fontWeight: 700, mb: 0.5 }}>
              No s'ha trobat contingut d'inspiració
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65', mb: 3 }}>
              {searchQuery
                ? `No hi ha resultats per a "${searchQuery}". Prova amb un altre terme o categoria.`
                : 'Sé el primer a compartir una recomanació o itinerari amb la comunitat!'}
            </Typography>
            <Button
              variant="contained"
              onClick={() => setShareDialogOpen(true)}
              startIcon={<AddIcon />}
              sx={{
                bgcolor: '#C85A32',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': { bgcolor: '#A0471D' },
              }}
            >
              Publicar la primera recomanació
            </Button>
          </Box>
        ) : (
          /* Cards Grid */
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {items.map((item) => {
              if (item.type === 'itinerary') {
                return (
                  <Grid item xs={12} md={6} key={item.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 3,
                        bgcolor: '#FFFFFF',
                        border: '1px solid #E8E2D9',
                        boxShadow: '0 4px 14px rgba(44, 34, 30, 0.05)',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: '0 8px 24px rgba(74, 46, 43, 0.12)',
                          borderColor: '#C85A32',
                        },
                      }}
                    >
                      {/* Cover Photo */}
                      <Box sx={{ position: 'relative', height: 200, bgcolor: '#FAF7F2' }}>
                        {item.cover_image_url || item.image_url ? (
                          <CardMedia
                            component="img"
                            image={item.cover_image_url || item.image_url}
                            alt={item.title}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: '#F4ECE1',
                            }}
                          >
                            <Typography sx={{ fontSize: '3rem' }}>{item.flag_emoji || '🗺️'}</Typography>
                          </Box>
                        )}

                        {/* Top Pills */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            display: 'flex',
                            gap: 1,
                            alignItems: 'center',
                          }}
                        >
                          <Chip
                            label="🗺️ Itinerari"
                            size="small"
                            sx={{
                              bgcolor: 'rgba(44, 34, 30, 0.85)',
                              backdropFilter: 'blur(4px)',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          />
                          {item.flag_emoji && (
                            <Box
                              sx={{
                                px: 1,
                                py: 0.3,
                                borderRadius: 2,
                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(4px)',
                                fontSize: '1rem',
                                lineHeight: 1.2,
                              }}
                            >
                              {item.flag_emoji}
                            </Box>
                          )}
                        </Box>

                        {/* Days Pill */}
                        {item.total_days && (
                          <Chip
                            icon={<CalendarMonthIcon sx={{ fontSize: '1rem !important', color: '#FFFFFF' }} />}
                            label={`${item.total_days} dies`}
                            size="small"
                            sx={{
                              position: 'absolute',
                              bottom: 12,
                              right: 12,
                              bgcolor: '#C85A32',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                            }}
                          />
                        )}
                      </Box>

                      {/* Card Body */}
                      <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                            color: '#2C221E',
                            fontSize: '1.2rem',
                            lineHeight: 1.3,
                            mb: 1.5,
                          }}
                        >
                          {item.title}
                        </Typography>

                        {item.description && (
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#6E5D53',
                              lineHeight: 1.5,
                              mb: 2,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {item.description}
                          </Typography>
                        )}

                        {/* Stages Pipeline */}
                        {item.stages && item.stages.length > 0 && (
                          <Box sx={{ mb: 2.5, bgcolor: '#FAF7F2', p: 1.5, borderRadius: 2, border: '1px solid #E8E2D9' }}>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                fontWeight: 700,
                                color: '#786C65',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                mb: 1,
                              }}
                            >
                              📍 Etapes de la ruta:
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{
                                flexWrap: 'wrap',
                                gap: 0.8,
                              }}
                            >
                              {item.stages.map((stage, idx) => (
                                <Box
                                  key={stage.id || idx}
                                  sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      bgcolor: '#FFFFFF',
                                      px: 1,
                                      py: 0.4,
                                      borderRadius: 1.5,
                                      border: '1px solid #DDCFBF',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      color: '#2C221E',
                                    }}
                                  >
                                    <span style={{ color: '#C85A32', fontWeight: 800, marginRight: 3 }}>
                                      {idx + 1}.
                                    </span>
                                    {stage.destination_name}
                                  </Box>
                                  {idx < (item.stages?.length ?? 0) - 1 && (
                                    <ArrowForwardIcon sx={{ fontSize: 13, color: '#C85A32' }} />
                                  )}
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        )}

                        {/* Footer with Anonymous Author & Chat Button */}
                        <Box
                          sx={{
                            mt: 'auto',
                            pt: 2,
                            borderTop: '1px solid #F0EAE1',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 1.5,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                bgcolor: '#F4ECE1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#C85A32',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                              }}
                            >
                              👤
                            </Box>
                            <Box>
                              <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#2C221E' }}>
                                Un felagi de {item.author.town_name || item.author.region_name || 'Catalunya'}
                              </Typography>
                              <Typography sx={{ fontSize: '0.72rem', color: '#786C65' }}>
                                Viatge completat & verificat
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Tooltip title={copiedItemId === item.id ? 'Enllaç copiat!' : 'Compartir'}>
                              <IconButton
                                size="small"
                                onClick={() => handleShareClick(item)}
                                sx={{ color: '#786C65', '&:hover': { color: '#C85A32' } }}
                              >
                                <ShareIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />}
                              onClick={() => handleContactAuthor(item.author.id)}
                              disabled={connectingAuthorId === item.author.id}
                              sx={{
                                bgcolor: '#4A2E2B',
                                color: '#FFFFFF',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                borderRadius: 2,
                                px: 1.8,
                                py: 0.8,
                                '&:hover': { bgcolor: '#2C221E' },
                              }}
                            >
                              Iniciar xat 💬
                            </Button>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              }

              // Recommendation Card
              const catInfo = getCategoryLabel(item.category);
              return (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 3,
                      bgcolor: '#FFFFFF',
                      border: '1px solid #E8E2D9',
                      boxShadow: '0 2px 8px rgba(44, 34, 30, 0.04)',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 8px 24px rgba(74, 46, 43, 0.12)',
                        borderColor: '#C85A32',
                      },
                    }}
                  >
                    {/* Recommendation Photo or Header */}
                    {item.image_url || item.cover_image_url ? (
                      <Box sx={{ position: 'relative', height: 160, bgcolor: '#FAF7F2' }}>
                        <CardMedia
                          component="img"
                          image={item.image_url || item.cover_image_url}
                          alt={item.title}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 10,
                            left: 10,
                          }}
                        >
                          <Chip
                            label={`${catInfo.emoji} ${catInfo.label}`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255, 255, 255, 0.92)',
                              backdropFilter: 'blur(4px)',
                              color: '#2C221E',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              border: `1px solid ${catInfo.color}`,
                            }}
                          />
                        </Box>
                        {item.flag_emoji && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              px: 0.8,
                              py: 0.2,
                              borderRadius: 1.5,
                              bgcolor: 'rgba(255, 255, 255, 0.9)',
                              backdropFilter: 'blur(4px)',
                              fontSize: '0.9rem',
                            }}
                          >
                            {item.flag_emoji}
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Box sx={{ p: 2, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={`${catInfo.emoji} ${catInfo.label}`}
                          size="small"
                          sx={{
                            bgcolor: '#FAF0E6',
                            color: '#C85A32',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        />
                        {item.flag_emoji && <Typography sx={{ fontSize: '1.2rem' }}>{item.flag_emoji}</Typography>}
                      </Box>
                    )}

                    {/* Card Body */}
                    <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: '#2C221E',
                          fontSize: '1.05rem',
                          lineHeight: 1.35,
                          mb: 1,
                        }}
                      >
                        {item.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          color: '#6E5D53',
                          lineHeight: 1.5,
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.description}
                      </Typography>

                      {/* Location Badge */}
                      {(item.location_name || item.destination_name) && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            color: '#786C65',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            mb: 2,
                          }}
                        >
                          <LocationOnIcon sx={{ fontSize: 16, color: '#C85A32' }} />
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#786C65',
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.location_name || item.destination_name}
                            {item.country_name ? `, ${item.country_name}` : ''}
                          </Typography>
                        </Box>
                      )}

                      {/* Author & Endorsement Footer */}
                      <Box
                        sx={{
                          mt: 'auto',
                          pt: 1.5,
                          borderTop: '1px solid #F0EAE1',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#786C65' }}>
                            {item.author.name ? item.author.name : 'Felagi'}
                            {item.author.town_name ? ` (${item.author.town_name})` : ''}
                          </Typography>
                        </Box>

                        {/* Endorsements / Avals */}
                        <Button
                          size="small"
                          onClick={() => toggleVote(item.id)}
                          startIcon={
                            item.user_has_voted ? (
                              <ThumbUpIcon sx={{ fontSize: '0.9rem !important', color: '#C85A32' }} />
                            ) : (
                              <ThumbUpOutlinedIcon sx={{ fontSize: '0.9rem !important' }} />
                            )
                          }
                          sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            color: item.user_has_voted ? '#C85A32' : '#786C65',
                            bgcolor: item.user_has_voted ? '#FAF0E6' : 'transparent',
                            borderRadius: 2,
                            px: 1,
                            py: 0.4,
                            '&:hover': {
                              bgcolor: '#FDF4EF',
                              color: '#C85A32',
                            },
                          }}
                        >
                          👍 {item.useful_votes_count || 0} aval{item.useful_votes_count === 1 ? '' : 's'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>

      {/* Share Dialog */}
      <CreateInspirationDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        onCreated={() => {
          fetchInspiration();
        }}
      />
    </Box>
  );
}
