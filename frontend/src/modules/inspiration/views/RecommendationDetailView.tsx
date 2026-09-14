import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardMedia,
  TextField,
  Avatar,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import SendIcon from '@mui/icons-material/Send';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { inspirationApi } from '../api';
import { Comment, Recommendation } from '@/modules/community/types';
import { useChatStore } from '@/modules/chat/store';
import { useAuthStore } from '@/modules/auth/store';
import ReportDialog from '@/modules/community/components/ReportDialog';

export default function RecommendationDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createOrGetConversation } = useChatStore();

  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New comment state
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Connecting chat state
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Report dialog state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetType, setReportTargetType] = useState<'recommendation' | 'comment'>('recommendation');
  const [reportTargetId, setReportTargetId] = useState('');
  const [reportTargetTitle, setReportTargetTitle] = useState('');

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    Promise.allSettled([
      inspirationApi.getRecommendationDetail(id),
      inspirationApi.getRecommendationComments(id),
    ])
      .then(([recRes, comRes]) => {
        if (recRes.status === 'fulfilled') {
          setRecommendation(recRes.value);
        } else {
          setError('No s’ha pogut carregar el detall de la recomanació.');
        }

        if (comRes.status === 'fulfilled') {
          setComments(comRes.value);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleToggleVote = async () => {
    if (!recommendation) return;
    const prevVoted = !!recommendation.user_has_voted;
    const prevCount = recommendation.useful_votes_count;

    // Optimistic update
    const nextVoted = !prevVoted;
    const nextCount = nextVoted ? prevCount + 1 : Math.max(0, prevCount - 1);
    setRecommendation({
      ...recommendation,
      user_has_voted: nextVoted,
      useful_votes_count: nextCount,
    });

    try {
      const res = await inspirationApi.voteRecommendation(recommendation.id);
      setRecommendation((prev) =>
        prev
          ? {
              ...prev,
              user_has_voted: res.voted,
              useful_votes_count: res.useful_votes_count,
            }
          : null
      );
    } catch {
      // Revert if failed
      setRecommendation((prev) =>
        prev
          ? {
              ...prev,
              user_has_voted: prevVoted,
              useful_votes_count: prevCount,
            }
          : null
      );
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      const created = await inspirationApi.createRecommendationComment(id, newComment.trim());
      setComments((prev) => [...prev, created]);
      setNewComment('');
      setRecommendation((prev) => (prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : null));
    } catch (err: any) {
      setCommentError(err.response?.data?.error?.message || err.message || 'Error en publicar el comentari.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleStartChat = async (targetUserId: string) => {
    if (!targetUserId || connectingUserId) return;
    if (user && user.id === targetUserId) return;

    setConnectingUserId(targetUserId);
    try {
      const conv = await createOrGetConversation(targetUserId);
      if (conv && conv.id) {
        navigate(`/chats/${conv.id}`);
      } else {
        navigate('/chats');
      }
    } catch {
      navigate('/chats');
    } finally {
      setConnectingUserId(null);
    }
  };

  const handleOpenReport = (type: 'recommendation' | 'comment', targetId: string, title?: string) => {
    setReportTargetType(type);
    setReportTargetId(targetId);
    setReportTargetTitle(title || '');
    setReportOpen(true);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: recommendation?.title || 'Consell a FELAG',
          text: `Consell de viatge a FELAG: ${recommendation?.title} - ${recommendation?.description}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'food':
        return { label: 'Gastronomia', emoji: '🍽️', color: '#D97706', bg: '#FEF3C7' };
      case 'hidden_gem':
        return { label: 'Racó Secret', emoji: '💎', color: '#059669', bg: '#D1FAE5' };
      case 'practical_tip':
        return { label: 'Consell Pràctic', emoji: '💡', color: '#2563EB', bg: '#DBEAFE' };
      case 'transport':
        return { label: 'Transport', emoji: '🚆', color: '#7C3AED', bg: '#EDE9FE' };
      case 'anecdote':
        return { label: 'Anècdota', emoji: '📖', color: '#DB2777', bg: '#FCE7F3' };
      default:
        return { label: 'Recomanació', emoji: '✨', color: '#C85A32', bg: '#FDEEE9' };
    }
  };

  const catBadge = getCategoryBadge(recommendation?.category);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Back Button */}
        <Button
          component={RouterLink}
          to="/inspiration"
          startIcon={<ArrowBackIcon />}
          sx={{
            color: '#C85A32',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            mb: 2.5,
            '&:hover': { bgcolor: 'transparent', color: '#A0471D' },
          }}
        >
          ‹ Tornar a Inspiració
        </Button>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: 3 }}>
            {error}
          </Alert>
        ) : recommendation ? (
          <Box>
            {/* Main Recommendation Card */}
            <Card
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                border: '1px solid #E8E2D9',
                boxShadow: '0 8px 32px rgba(44, 34, 30, 0.08)',
                bgcolor: '#FFFFFF',
                mb: 4,
              }}
            >
              {/* Optional Cover Image */}
              {recommendation.image_url && (
                <Box sx={{ position: 'relative', height: { xs: 200, sm: 300 } }}>
                  <CardMedia
                    component="img"
                    image={recommendation.image_url}
                    alt={recommendation.title}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              )}

              {/* Card Body */}
              <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
                {/* Header Pills */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip
                      label={`${catBadge.emoji} ${catBadge.label}`}
                      sx={{
                        bgcolor: catBadge.bg,
                        color: catBadge.color,
                        fontWeight: 800,
                        fontSize: '0.8rem',
                      }}
                    />
                    {recommendation.location_name && (
                      <Chip
                        icon={<LocationOnIcon sx={{ fontSize: '1rem !important', color: '#C85A32' }} />}
                        label={recommendation.location_name}
                        size="small"
                        sx={{
                          bgcolor: '#FAF7F2',
                          color: '#5C4339',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          border: '1px solid #E8E2D9',
                        }}
                      />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <Tooltip title={copiedLink ? 'Enllaç copiat!' : 'Compartir'}>
                      <IconButton onClick={handleShare} sx={{ color: '#786C65', '&:hover': { color: '#C85A32' } }}>
                        <ShareIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Denunciar consell">
                      <IconButton
                        onClick={() => handleOpenReport('recommendation', recommendation.id, recommendation.title)}
                        sx={{ color: '#786C65', '&:hover': { color: '#D32F2F' } }}
                      >
                        <FlagOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Title */}
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    color: '#2C221E',
                    lineHeight: 1.25,
                    mb: 2,
                    fontSize: { xs: '1.4rem', sm: '1.85rem' },
                  }}
                >
                  {recommendation.title}
                </Typography>

                {/* Description */}
                <Typography
                  variant="body1"
                  sx={{
                    color: '#4A3B32',
                    fontSize: '1.05rem',
                    lineHeight: 1.7,
                    mb: 3,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {recommendation.description}
                </Typography>

                {/* Vote Aval Button & Stats */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: 3,
                    bgcolor: '#FAF7F2',
                    border: '1px solid #E8E2D9',
                    mb: 3,
                    flexWrap: 'wrap',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant={recommendation.user_has_voted ? 'contained' : 'outlined'}
                      onClick={handleToggleVote}
                      startIcon={recommendation.user_has_voted ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        borderRadius: 2.5,
                        borderColor: '#C85A32',
                        color: recommendation.user_has_voted ? '#FFFFFF' : '#C85A32',
                        bgcolor: recommendation.user_has_voted ? '#C85A32' : 'transparent',
                        '&:hover': {
                          bgcolor: recommendation.user_has_voted ? '#A0471D' : 'rgba(200,90,50,0.08)',
                        },
                      }}
                    >
                      {recommendation.user_has_voted ? 'Avalat 👍' : 'Avalar consell 👍'}
                    </Button>

                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#5C4339', ml: 1 }}>
                      {recommendation.useful_votes_count}{' '}
                      {recommendation.useful_votes_count === 1 ? 'felagi ho avala' : 'felagis ho avalen'}
                    </Typography>
                  </Box>

                  <Typography sx={{ fontSize: '0.8rem', color: '#786C65' }}>
                    {new Date(recommendation.created_at).toLocaleDateString('ca-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Typography>
                </Box>

                {/* Author Card Box */}
                <Box
                  sx={{
                    bgcolor: '#FFFFFF',
                    border: '1px solid #E8E2D9',
                    borderRadius: 3,
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      src={recommendation.author.avatar_url || undefined}
                      sx={{ width: 44, height: 44, bgcolor: '#F4ECE1', color: '#C85A32', fontWeight: 700 }}
                    >
                      {recommendation.author.name ? recommendation.author.name[0] : 'F'}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: '#2C221E', fontSize: '0.95rem' }}>
                        {recommendation.author.name || 'Un felagi'}
                        {(recommendation.author.town_name || recommendation.author.region_name) && (
                          <span style={{ fontWeight: 500, color: '#786C65', fontSize: '0.85rem' }}>
                            {' '}
                            ({recommendation.author.town_name || recommendation.author.region_name})
                          </span>
                        )}
                      </Typography>
                      <Typography sx={{ color: '#786C65', fontSize: '0.78rem' }}>
                        Autor d'aquest consell a la comunitat
                      </Typography>
                    </Box>
                  </Box>

                  {user && user.id !== recommendation.author.id && (
                    <Button
                      variant="contained"
                      onClick={() => handleStartChat(recommendation.author.id)}
                      disabled={connectingUserId === recommendation.author.id}
                      startIcon={
                        connectingUserId === recommendation.author.id ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <ChatBubbleOutlineIcon />
                        )
                      }
                      sx={{
                        bgcolor: '#4A2E2B',
                        color: '#FFFFFF',
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2.5,
                        px: 2.5,
                        py: 0.9,
                        '&:hover': { bgcolor: '#2C221E' },
                      }}
                    >
                      Xatejar amb l'autor 💬
                    </Button>
                  )}
                </Box>
              </Box>
            </Card>

            {/* Interactive Comments Section */}
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                borderRadius: 4,
                border: '1px solid #E8E2D9',
                p: { xs: 2.5, sm: 4 },
                boxShadow: '0 2px 12px rgba(44,34,30,0.03)',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#2C221E', mb: 0.5 }}>
                💬 Comentaris i aportacions ({comments.length})
              </Typography>
              <Typography variant="body2" sx={{ color: '#786C65', mb: 3 }}>
                Fes preguntes a l'autor o afegeix la teva experiència complementària en aquesta recomanació.
              </Typography>

              {/* Add Comment Form */}
              <Box component="form" onSubmit={handleAddComment} sx={{ mb: 4 }}>
                {commentError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {commentError}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  multiline
                  rows={2.5}
                  placeholder="Escriu una pregunta, agraïment o consell addicional..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  sx={{
                    mb: 1.5,
                    bgcolor: '#FAF7F2',
                    borderRadius: 3,
                    '& fieldset': { borderColor: '#E8E2D9' },
                    '&:hover fieldset': { borderColor: '#C85A32' },
                    '&.Mui-focused fieldset': { borderColor: '#C85A32' },
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!newComment.trim() || isSubmittingComment}
                    startIcon={isSubmittingComment ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                    sx={{
                      bgcolor: '#C85A32',
                      color: '#FFFFFF',
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 2.5,
                      px: 3,
                      py: 1,
                      '&:hover': { bgcolor: '#A0471D' },
                    }}
                  >
                    {isSubmittingComment ? 'Publicant...' : 'Publicar comentari'}
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Comments List */}
              {comments.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ fontSize: '0.9rem', color: '#786C65' }}>
                    Encara no hi ha cap comentari en aquesta recomanació. Sé el primer a comentar!
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {comments.map((c) => (
                    <Box
                      key={c.id}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: '#FAF7F2',
                        border: '1px solid #E8E2D9',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Avatar
                            src={c.author.avatar_url || undefined}
                            sx={{ width: 32, height: 32, bgcolor: '#F4ECE1', color: '#C85A32', fontSize: 13, fontWeight: 700 }}
                          >
                            {c.author.name ? c.author.name[0] : 'F'}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: '#2C221E' }}>
                              {c.author.name}
                              {(c.author.town_name || c.author.region_name) && (
                                <span style={{ fontWeight: 500, color: '#786C65', fontSize: '0.78rem' }}>
                                  {' '}
                                  • {c.author.town_name || c.author.region_name}
                                </span>
                              )}
                            </Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: '#786C65' }}>
                              {new Date(c.created_at).toLocaleString('ca-ES', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          {user && user.id !== c.author.id && (
                            <Tooltip title="Xatejar amb l'usuari">
                              <IconButton
                                size="small"
                                onClick={() => handleStartChat(c.author.id)}
                                disabled={connectingUserId === c.author.id}
                                sx={{ color: '#786C65', '&:hover': { color: '#C85A32' } }}
                              >
                                <ChatBubbleOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Denunciar comentari">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenReport('comment', c.id, c.content)}
                              sx={{ color: '#786C65', '&:hover': { color: '#D32F2F' } }}
                            >
                              <FlagOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Typography sx={{ fontSize: '0.92rem', color: '#3E2F29', pl: { sm: 5 }, whiteSpace: 'pre-line' }}>
                        {c.content}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        ) : null}
      </Container>

      {/* Report Modal */}
      <ReportDialog
        open={reportOpen}
        targetType={reportTargetType}
        targetId={reportTargetId}
        targetTitle={reportTargetTitle}
        onClose={() => setReportOpen(false)}
      />
    </Box>
  );
}
