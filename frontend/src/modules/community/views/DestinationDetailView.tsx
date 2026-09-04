import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Select,
  MenuItem,
  FormControl,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  TextField,
  Collapse,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import SendIcon from '@mui/icons-material/Send';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SecurityIcon from '@mui/icons-material/Security';
import { useParams, Link as RouterLink } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { useCommunityStore } from '../store';
import {
  OriginFilter,
  RecommendationCategoryFilter,
  SortOrder,
  PhotoSharingMode,
} from '../types';
import CreateRecommendationDialog from '../components/CreateRecommendationDialog';
import ReportDialog from '../components/ReportDialog';
import ArrivalPromptDialog from '../components/ArrivalPromptDialog';

const CATEGORIES: { id: RecommendationCategoryFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'Tot', icon: '🌟' },
  { id: 'food', label: 'Gastronomia', icon: '🍽️' },
  { id: 'hidden_gem', label: 'Racons Secrets', icon: '💎' },
  { id: 'transport', label: 'Transport', icon: '🚆' },
  { id: 'practical_tip', label: 'Consells Pràctics', icon: '💡' },
  { id: 'anecdote', label: 'Anècdotes', icon: '📖' },
];

function getCategoryTag(cat: string): { label: string; icon: string } {
  switch (cat) {
    case 'food':
      return { label: 'Gastronomia', icon: '🍽️' };
    case 'hidden_gem':
      return { label: 'Racó Secret', icon: '💎' };
    case 'transport':
      return { label: 'Transport & Mobilitat', icon: '🚆' };
    case 'practical_tip':
      return { label: 'Consell Pràctic', icon: '💡' };
    case 'anecdote':
      return { label: 'Anècdota', icon: '📖' };
    default:
      return { label: cat, icon: '📍' };
  }
}

export default function DestinationDetailView() {
  const { id } = useParams<{ id: string }>();
  const {
    currentDestination,
    recommendations,
    commentsByRecId,
    selectedCategory,
    selectedOriginFilter,
    selectedSort,
    isLoading,
    error,
    fetchDestinationDetail,
    fetchRecommendations,
    toggleVote,
    fetchComments,
    addComment,
    updatePhotoSharing,
    setCategory,
    setOriginFilter,
    setSort,
  } = useCommunityStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: 'recommendation' | 'comment';
    id: string;
    title?: string;
  }>({ type: 'recommendation', id: '' });
  const [arrivalPromptOpen, setArrivalPromptOpen] = useState(false);

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      fetchDestinationDetail(id);
      fetchRecommendations(id);
    }
  }, [id]);

  const handleCategoryClick = (cat: RecommendationCategoryFilter) => {
    setCategory(cat);
    if (id) {
      fetchRecommendations(id, cat, selectedOriginFilter, selectedSort);
    }
  };

  const handleOriginFilterChange = (filter: OriginFilter) => {
    setOriginFilter(filter);
    if (id) {
      fetchRecommendations(id, selectedCategory, filter, selectedSort);
    }
  };

  const handleSortChange = (sort: SortOrder) => {
    setSort(sort);
    if (id) {
      fetchRecommendations(id, selectedCategory, selectedOriginFilter, sort);
    }
  };

  const handleToggleComments = (recId: string) => {
    setExpandedComments((prev) => {
      const nextState = !prev[recId];
      if (nextState && !commentsByRecId[recId]) {
        fetchComments(recId);
      }
      return { ...prev, [recId]: nextState };
    });
  };

  const handleAddCommentSubmit = async (recId: string) => {
    const text = commentInputs[recId]?.trim();
    if (!text) return;

    setCommentSubmitting((prev) => ({ ...prev, [recId]: true }));
    try {
      await addComment(recId, text);
      setCommentInputs((prev) => ({ ...prev, [recId]: '' }));
    } finally {
      setCommentSubmitting((prev) => ({ ...prev, [recId]: false }));
    }
  };

  const handleReportClick = (
    type: 'recommendation' | 'comment',
    targetId: string,
    title?: string
  ) => {
    setReportTarget({ type, id: targetId, title });
    setReportDialogOpen(true);
  };

  const handlePhotoSharingConfirm = async (mode: PhotoSharingMode) => {
    if (id) {
      await updatePhotoSharing(id, mode);
      setArrivalPromptOpen(false);
    }
  };

  if (isLoading && !currentDestination) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: '#C85A32' }} />
      </Box>
    );
  }

  if (error && !currentDestination) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0', py: 5 }}>
        <Container maxWidth="md">
          <Button
            component={RouterLink}
            to="/destinations"
            startIcon={<ArrowBackIcon />}
            sx={{ color: '#C85A32', mb: 3, textTransform: 'none', fontWeight: 600 }}
          >
            Tornar a la llista de destinacions
          </Button>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  const destName = currentDestination?.name || 'Destinació';
  const destRegion = [currentDestination?.region_name, currentDestination?.country_name]
    .filter(Boolean)
    .join(' • ');

  // Count recommendations per category
  const categoryCounts = recommendations.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      {/* Hero Banner with Earth Dark Gradient & Backdrop */}
      <Box
        sx={{
          background: `linear-gradient(180deg, rgba(44, 34, 30, 0.75) 0%, rgba(44, 34, 30, 0.95) 100%), url('${
            currentDestination?.banner_url || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1400&auto=format&fit=crop&q=80'
          }') center/cover`,
          color: '#FFFFFF',
          pt: 4,
          pb: 5,
          px: { xs: 2, md: 4 },
          borderRadius: '0 0 24px 24px',
          mb: 4,
          boxShadow: '0 4px 20px rgba(44, 34, 30, 0.15)',
        }}
      >
        <Container maxWidth="lg">
          <Button
            component={RouterLink}
            to="/destinations"
            startIcon={<ArrowBackIcon />}
            sx={{
              color: '#FFE082',
              textTransform: 'none',
              fontWeight: 600,
              mb: 2,
              p: 0,
              '&:hover': { bgcolor: 'transparent', color: '#FFFFFF' },
            }}
          >
            ‹ Destinacions
          </Button>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'flex-end' },
              gap: 3,
            }}
          >
            <Box>
              <Chip
                label={`${currentDestination?.flag_emoji || '📍'} ${destRegion || currentDestination?.country_code || ''}`}
                sx={{
                  bgcolor: 'rgba(200, 90, 50, 0.9)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  mb: 1.5,
                }}
              />
              <Typography
                variant="h3"
                sx={{ fontWeight: 800, color: '#FFFFFF', mb: 1, fontSize: { xs: '2rem', md: '2.8rem' } }}
              >
                {destName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', opacity: 0.9, fontSize: '0.95rem' }}>
                <span>✨ {currentDestination?.total_recommendations ?? recommendations.length} recomanacions de FELAGIS</span>
                {currentDestination?.total_visitors_count !== undefined && (
                  <span>📍 {currentDestination.total_visitors_count} viatgers registrats</span>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  p: 1.5,
                  px: 2.5,
                  borderRadius: 3,
                  textAlign: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFE082' }}>
                  {currentDestination?.active_felagis_count ?? 0}
                </Typography>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  FELAGIS Ara
                </Typography>
              </Box>

              <Box
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  p: 1.5,
                  px: 2.5,
                  borderRadius: 3,
                  textAlign: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFE082' }}>
                  {currentDestination?.total_visitors_count ?? recommendations.length * 2 + 5}
                </Typography>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Han Viatjat
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content Area */}
      <Container maxWidth="lg" sx={{ pb: 6 }}>
        {/* Live Alert Card (Active Travelling) */}
        {currentDestination?.user_is_travelling_now && (
          <Box
            sx={{
              bgcolor: '#FFF8E1',
              border: '1px solid #FFE082',
              borderRadius: 4,
              p: { xs: 2, sm: 2.5 },
              mb: 3.5,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  bgcolor: '#E65100',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 0 rgba(230, 81, 0, 0.7)',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(230, 81, 0, 0.7)' },
                    '70%': { transform: 'scale(1)', boxShadow: '0 0 0 8px rgba(230, 81, 0, 0)' },
                    '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(230, 81, 0, 0)' },
                  },
                }}
              />
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#E65100', fontWeight: 800, lineHeight: 1.2 }}>
                  Estàs viatjant a {destName} ara mateix! 🗼
                </Typography>
                <Typography variant="body2" sx={{ color: '#786C65', mt: 0.3 }}>
                  Hi ha {currentDestination.active_felagis_count ?? 1} FELAGIS a la ciutat amb el teu mateix interval de dates.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SecurityIcon />}
                onClick={() => setArrivalPromptOpen(true)}
                sx={{
                  color: '#703817',
                  borderColor: '#D4A373',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#FFF3E0', borderColor: '#C85A32' },
                }}
              >
                Privadesa
              </Button>
              <Button
                component={RouterLink}
                to={`/destinations/${id}/live`}
                variant="contained"
                startIcon={<PhotoCameraIcon />}
                sx={{
                  bgcolor: '#C85A32',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#A0471D' },
                }}
              >
                📸 Fotos en Directe
              </Button>
            </Box>
          </Box>
        )}

        {/* Controls Bar (Categories, Filters, Sort & Action) */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            gap: 2,
            mb: 3,
          }}
        >
          {/* Category Tabs */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              py: 0.5,
              '&::-webkit-scrollbar': { height: 6 },
            }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count = cat.id === 'all' ? recommendations.length : categoryCounts[cat.id] || 0;
              return (
                <Chip
                  key={cat.id}
                  label={`${cat.icon} ${cat.label} (${count})`}
                  onClick={() => handleCategoryClick(cat.id)}
                  sx={{
                    bgcolor: isActive ? '#C85A32' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#2C221E',
                    border: '1px solid',
                    borderColor: isActive ? '#C85A32' : '#E8E2D9',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: isActive ? '#A0471D' : '#FAF7F2',
                    },
                  }}
                />
              );
            })}
          </Box>

          {/* Filters, Sort & New Recommendation Button */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 190 }}>
              <Select
                value={selectedOriginFilter}
                onChange={(e) => handleOriginFilterChange(e.target.value as OriginFilter)}
                sx={{
                  bgcolor: '#FFFFFF',
                  borderRadius: 2,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  '& fieldset': { borderColor: '#E8E2D9' },
                }}
              >
                <MenuItem value="all">🌍 Tots els FELAGIS</MenuItem>
                <MenuItem value="same_origin">🏡 De la meva terra (Catalunya)</MenuItem>
                <MenuItem value="same_town">🥇 Només del meu poble/ciutat</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={selectedSort}
                onChange={(e) => handleSortChange(e.target.value as SortOrder)}
                sx={{
                  bgcolor: '#FFFFFF',
                  borderRadius: 2,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  '& fieldset': { borderColor: '#E8E2D9' },
                }}
              >
                <MenuItem value="useful">👍 Més útils primer</MenuItem>
                <MenuItem value="recent">🕒 Més recents primer</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                bgcolor: '#C85A32',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                px: 2,
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#A0471D' },
              }}
            >
              Publicar
            </Button>
          </Box>
        </Box>

        {/* Recommendations List */}
        {recommendations.length === 0 ? (
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
            <Typography variant="h6" sx={{ color: '#2C221E', fontWeight: 700, mb: 1 }}>
              Encara no hi ha recomanacions en aquesta categoria
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65', mb: 3 }}>
              Sigues el primer FELAGI en compartir un racó especial, consell o experiència a {destName}!
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                bgcolor: '#C85A32',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': { bgcolor: '#A0471D' },
              }}
            >
              Afegir recomanació
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {recommendations.map((rec) => {
              const tag = getCategoryTag(rec.category);
              const comments = commentsByRecId[rec.id] || [];
              const isCommentsOpen = Boolean(expandedComments[rec.id]);
              const commentText = commentInputs[rec.id] || '';
              const isSubmittingComment = Boolean(commentSubmitting[rec.id]);

              return (
                <Card
                  key={rec.id}
                  sx={{
                    borderRadius: 3,
                    bgcolor: '#FFFFFF',
                    border: '1px solid #E8E2D9',
                    boxShadow: '0 2px 8px rgba(74, 46, 43, 0.04)',
                    overflow: 'hidden',
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2.5 }}>
                      {/* Optional Recommendation Image */}
                      {rec.image_url && (
                        <Box
                          component="img"
                          src={rec.image_url}
                          alt={rec.title}
                          sx={{
                            width: { xs: '100%', md: 180 },
                            height: { xs: 180, md: 140 },
                            borderRadius: 2,
                            objectFit: 'cover',
                            bgcolor: '#FAF7F2',
                            flexShrink: 0,
                          }}
                        />
                      )}

                      {/* Main Recommendation Body */}
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            mb: 1,
                            flexWrap: 'wrap',
                            gap: 1,
                          }}
                        >
                          <Chip
                            label={`${tag.icon} ${tag.label}`}
                            size="small"
                            sx={{
                              bgcolor: '#FDEEE9',
                              color: '#C85A32',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                            }}
                          />

                          <Button
                            size="small"
                            startIcon={<ThumbUpIcon fontSize="small" />}
                            onClick={() => toggleVote(rec.id)}
                            sx={{
                              bgcolor: rec.user_has_voted ? '#E8F5E9' : '#F9F6F0',
                              color: rec.user_has_voted ? '#2E7D32' : '#2C221E',
                              border: '1px solid',
                              borderColor: rec.user_has_voted ? '#A5D6A7' : '#E8E2D9',
                              fontWeight: 700,
                              textTransform: 'none',
                              fontSize: '0.85rem',
                              px: 1.5,
                              '&:hover': {
                                bgcolor: rec.user_has_voted ? '#C8E6C9' : '#FAF7F2',
                              },
                            }}
                          >
                            {rec.user_has_voted ? 'Útil 👍' : '👍 Útil'} ({rec.useful_votes_count})
                          </Button>
                        </Box>

                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E', mb: 0.5 }}>
                          {rec.title}
                        </Typography>

                        {rec.location_name && (
                          <Typography variant="caption" sx={{ color: '#C85A32', fontWeight: 600, display: 'block', mb: 1 }}>
                            📍 {rec.location_name}
                          </Typography>
                        )}

                        <Typography variant="body2" sx={{ color: '#6B5E57', lineHeight: 1.6, mb: 2 }}>
                          {rec.description}
                        </Typography>

                        {/* Footer (Author, Comments Trigger & Report) */}
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            pt: 1.5,
                            borderTop: '1px solid #FAF7F2',
                            gap: 1,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C221E' }}>
                              Per <strong>{rec.author.name}</strong>
                            </Typography>
                            {(rec.author.town_name || rec.author.region_name) && (
                              <Chip
                                label={`📍 ${[rec.author.town_name, rec.author.region_name].filter(Boolean).join(' • ')}`}
                                size="small"
                                sx={{
                                  bgcolor: '#FFF3E0',
                                  color: '#E65100',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                }}
                              />
                            )}
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button
                              size="small"
                              startIcon={<ChatBubbleOutlineIcon fontSize="small" />}
                              onClick={() => handleToggleComments(rec.id)}
                              sx={{
                                color: '#786C65',
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                              }}
                            >
                              💬 {rec.comments_count ?? comments.length} comentaris
                            </Button>

                            <IconButton
                              size="small"
                              title="Denunciar recomanació"
                              onClick={() => handleReportClick('recommendation', rec.id, rec.title)}
                              sx={{ color: '#A09893', '&:hover': { color: '#D32F2F' } }}
                            >
                              <FlagOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    {/* Threaded Comments Accordion */}
                    <Collapse in={isCommentsOpen} timeout="auto" unmountOnExit>
                      <Divider sx={{ my: 2, borderColor: '#FAF7F2' }} />
                      <Box sx={{ pl: { xs: 0, sm: 2 } }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2C221E', mb: 1.5 }}>
                          Comentaris ({comments.length})
                        </Typography>

                        {comments.length === 0 ? (
                          <Typography variant="caption" sx={{ color: '#8C7A70', display: 'block', mb: 2 }}>
                            Encara no hi ha comentaris. Fes una pregunta o afegeix un apunt!
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                            {comments.map((comment) => (
                              <Box
                                key={comment.id}
                                sx={{
                                  bgcolor: '#FAF7F2',
                                  borderRadius: 2,
                                  p: 1.5,
                                  border: '1px solid #E8E2D9',
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#2C221E' }}>
                                      {comment.author.name}
                                    </Typography>
                                    {(comment.author.town_name || comment.author.region_name) && (
                                      <Typography variant="caption" sx={{ color: '#C85A32', fontWeight: 600 }}>
                                        📍 {[comment.author.town_name, comment.author.region_name].filter(Boolean).join(' • ')}
                                      </Typography>
                                    )}
                                  </Box>
                                  <IconButton
                                    size="small"
                                    title="Denunciar comentari"
                                    onClick={() => handleReportClick('comment', comment.id)}
                                    sx={{ color: '#A09893', p: 0.5, '&:hover': { color: '#D32F2F' } }}
                                  >
                                    <FlagOutlinedIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Box>
                                <Typography variant="body2" sx={{ color: '#4A3E39' }}>
                                  {comment.content}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}

                        {/* Add Comment Input */}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Escriu un comentari o demana més detalls..."
                            value={commentText}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({ ...prev, [rec.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddCommentSubmit(rec.id);
                              }
                            }}
                            sx={{ bgcolor: '#FAF7F2' }}
                          />
                          <Button
                            variant="contained"
                            disabled={!commentText.trim() || isSubmittingComment}
                            onClick={() => handleAddCommentSubmit(rec.id)}
                            sx={{
                              bgcolor: '#C85A32',
                              color: '#FFFFFF',
                              minWidth: 44,
                              px: 1.5,
                              '&:hover': { bgcolor: '#A0471D' },
                            }}
                          >
                            <SendIcon fontSize="small" />
                          </Button>
                        </Box>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>

      {/* Dialogs */}
      {id && (
        <>
          <CreateRecommendationDialog
            open={createDialogOpen}
            destinationId={id}
            destinationName={destName}
            onClose={() => setCreateDialogOpen(false)}
            onCreated={() => fetchRecommendations(id)}
          />

          <ArrivalPromptDialog
            open={arrivalPromptOpen}
            destinationName={destName}
            flagEmoji={currentDestination?.flag_emoji || '📍'}
            initialMode={currentDestination?.user_photo_sharing_mode || 'all_felagis'}
            onConfirm={handlePhotoSharingConfirm}
            onClose={() => setArrivalPromptOpen(false)}
          />
        </>
      )}

      <ReportDialog
        open={reportDialogOpen}
        targetType={reportTarget.type}
        targetId={reportTarget.id}
        targetTitle={reportTarget.title}
        onClose={() => setReportDialogOpen(false)}
      />
    </Box>
  );
}
