import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import SendIcon from '@mui/icons-material/Send';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BlockIcon from '@mui/icons-material/Block';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { useChatStore } from '../store';
import { useAuthStore } from '@/modules/auth/store';
import { ReportUserReason } from '../types';

function formatTimeOnly(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getUserInitials(name: string): string {
  if (!name) return 'FL';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ChatRoomView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    conversations,
    activeConversation,
    messages,
    isLoading,
    isSending,
    error,
    fetchConversations,
    fetchMessages,
    setActiveConversation,
    sendMessage,
    blockUser,
    reportUser,
    initWebSocket,
    clearError,
  } = useChatStore();

  const [inputContent, setInputContent] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportUserReason>('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize conversations, active conversation and WS
  useEffect(() => {
    fetchConversations();
    const cleanupWs = initWebSocket();
    return cleanupWs;
  }, [fetchConversations, initWebSocket]);

  useEffect(() => {
    if (id) {
      fetchMessages(id);
    }
  }, [id, fetchMessages]);

  useEffect(() => {
    if (id && conversations.length > 0) {
      const conv = conversations.find((c) => c.id === id) || null;
      setActiveConversation(conv);
    }
  }, [id, conversations, setActiveConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!id || !inputContent.trim() || isSending) return;

    const content = inputContent.trim();
    setInputContent('');
    try {
      await sendMessage(id, content);
    } catch (err) {
      // Error handled by store
    }
  };

  const handleBlockConfirm = async () => {
    if (!activeConversation) return;
    try {
      await blockUser(activeConversation.other_participant.id);
      setBlockDialogOpen(false);
      setToastMessage("S'ha bloquejat l'usuari correctament.");
      setTimeout(() => {
        navigate('/chats');
      }, 1200);
    } catch (err) {
      // Error handled by store
    }
  };

  const handleReportSubmit = async () => {
    if (!activeConversation || !reportDetails.trim()) return;
    try {
      await reportUser(activeConversation.other_participant.id, reportReason, reportDetails.trim());
      setReportDialogOpen(false);
      setReportDetails('');
      setToastMessage("S'ha enviat la denúncia a l'equip de moderació.");
    } catch (err) {
      // Error handled by store
    }
  };

  const otherParticipant = activeConversation?.other_participant;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />

      <Box
        sx={{
          flex: 1,
          maxWidth: 860,
          width: '100%',
          mx: 'auto',
          my: { xs: 1.5, sm: 3 },
          px: { xs: 1.5, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          height: { xs: 'calc(100vh - 90px)', sm: 'calc(100vh - 120px)' },
        }}
      >
        {/* Main Chat Card Container */}
        <Box
          sx={{
            flex: 1,
            bgcolor: '#FFFFFF',
            border: '1px solid #E8E2D9',
            borderRadius: 3,
            boxShadow: '0 2px 16px rgba(74, 46, 43, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Chat Header */}
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              px: { xs: 2, sm: 3 },
              borderBottom: '1px solid #E8E2D9',
              bgcolor: '#FAF7F2',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minWidth: 0 }}>
              <Button
                component={RouterLink}
                to="/chats"
                size="small"
                sx={{
                  color: '#C85A32',
                  minWidth: 'auto',
                  p: 0.5,
                  mr: 0.5,
                }}
              >
                <ArrowBackIcon />
              </Button>

              {otherParticipant ? (
                <Box
                  component={RouterLink}
                  to={`/users/${otherParticipant.id}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    textDecoration: 'none',
                    color: 'inherit',
                    minWidth: 0,
                    '&:hover .felagi-name': { color: '#C85A32' },
                  }}
                >
                  <Avatar
                    src={otherParticipant.avatar_url || undefined}
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: '#F4ECE1',
                      color: '#703817',
                      border: '2px solid #C85A32',
                      fontSize: 16,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getUserInitials(otherParticipant.name)}
                  </Avatar>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      className="felagi-name"
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        color: '#2C221E',
                        lineHeight: 1.2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        transition: 'color 0.2s',
                      }}
                    >
                      {otherParticipant.name}
                      <span style={{ color: '#786C65', fontSize: '14px' }}>›</span>
                    </Typography>

                    {otherParticipant.origin_summary && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#703817',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: { xs: 180, sm: 360 },
                        }}
                      >
                        📍 {otherParticipant.origin_summary}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ) : (
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2C221E' }}>
                  Xat
                </Typography>
              )}
            </Box>

            {/* Header Actions (Block & Report) */}
            {otherParticipant && (
              <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, alignItems: 'center', flexShrink: 0 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setReportDialogOpen(true)}
                  startIcon={<WarningAmberIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    color: '#786C65',
                    borderColor: '#E8E2D9',
                    textTransform: 'none',
                    fontSize: { xs: '0.75rem', sm: '0.8rem' },
                    px: { xs: 1, sm: 1.5 },
                    py: 0.4,
                    borderRadius: 1.5,
                    '&:hover': { borderColor: '#C85A32', color: '#C85A32' },
                  }}
                >
                  Denunciar
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setBlockDialogOpen(true)}
                  startIcon={<BlockIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    color: '#786C65',
                    borderColor: '#E8E2D9',
                    textTransform: 'none',
                    fontSize: { xs: '0.75rem', sm: '0.8rem' },
                    px: { xs: 1, sm: 1.5 },
                    py: 0.4,
                    borderRadius: 1.5,
                    '&:hover': { borderColor: '#C85A32', color: '#C85A32' },
                  }}
                >
                  Bloquejar
                </Button>
              </Box>
            )}
          </Box>

          {/* Messages Scroll Area */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: { xs: 2, sm: 3 },
              bgcolor: '#F9F6F0',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {/* Security AES-256 Badge */}
            <Box
              sx={{
                alignSelf: 'center',
                fontSize: '0.75rem',
                color: '#786C65',
                bgcolor: '#FFFFFF',
                border: '1px solid #E8E2D9',
                px: 2,
                py: 0.5,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                mb: 1,
              }}
            >
              <LockIcon sx={{ fontSize: 14, color: '#786C65' }} />
              <Typography variant="caption" sx={{ fontWeight: 500, color: '#786C65' }}>
                Missatges xifrats en repòs amb AES-256
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" onClose={clearError} sx={{ mb: 1 }}>
                {error}
              </Alert>
            )}

            {isLoading && messages.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress sx={{ color: '#C85A32' }} />
              </Box>
            )}

            {!isLoading && messages.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" sx={{ color: '#786C65' }}>
                  No hi ha missatges en aquest xat. Sigues el primer a saludar! 💬
                </Typography>
              </Box>
            )}

            {/* Messages list */}
            {messages.map((msg) => {
              const isOutgoing = msg.sender_id === user?.id;

              return (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
                    maxWidth: { xs: '85%', sm: '70%' },
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      px: 2,
                      borderRadius: 2.5,
                      fontSize: '0.9rem',
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                      bgcolor: isOutgoing ? '#C85A32' : '#FFFFFF',
                      color: isOutgoing ? '#FFFFFF' : '#2C221E',
                      border: isOutgoing ? 'none' : '1px solid #E8E2D9',
                      borderBottomRightRadius: isOutgoing ? '2px' : undefined,
                      borderBottomLeftRadius: !isOutgoing ? '2px' : undefined,
                      boxShadow: '0 1px 4px rgba(74, 46, 43, 0.04)',
                    }}
                  >
                    {msg.content}
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.7rem',
                      color: '#786C65',
                      mt: 0.5,
                      px: 0.5,
                      textAlign: isOutgoing ? 'right' : 'left',
                    }}
                  >
                    {formatTimeOnly(msg.created_at)}
                    {isOutgoing ? ' • Enviat' : ''}
                  </Typography>
                </Box>
              );
            })}

            <div ref={messagesEndRef} />
          </Box>

          {/* Input Bar */}
          <Box
            component="form"
            onSubmit={handleSendMessage}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderTop: '1px solid #E8E2D9',
              bgcolor: '#FFFFFF',
              display: 'flex',
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder={`Escriu un missatge${otherParticipant ? ` a ${otherParticipant.name.split(' ')[0]}` : ''}...`}
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              disabled={isSending}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '24px',
                  bgcolor: '#FAF7F2',
                  fontSize: '0.9rem',
                  '& fieldset': { borderColor: '#E8E2D9' },
                  '&:hover fieldset': { borderColor: '#C85A32' },
                  '&.Mui-focused fieldset': { borderColor: '#C85A32' },
                  '&.Mui-focused': { bgcolor: '#FFFFFF' },
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!inputContent.trim() || isSending}
              endIcon={<SendIcon />}
              sx={{
                bgcolor: '#C85A32',
                color: '#FFFFFF',
                borderRadius: '24px',
                px: { xs: 2, sm: 3 },
                py: 1,
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { bgcolor: '#A0471D' },
                '&:disabled': { bgcolor: '#E8E2D9', color: '#786C65' },
              }}
            >
              Enviar
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Block Confirmation Dialog */}
      <Dialog
        open={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#2C221E' }}>
          Bloquejar usuari
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#786C65' }}>
            Estàs segur que vols bloquejar a <strong>{otherParticipant?.name}</strong>? Aquest usuari no podrà enviar-te missatges ni veure els teus viatges ni perfils.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBlockDialogOpen(false)} sx={{ color: '#786C65' }}>
            Cancel·lar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBlockConfirm}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Confirmar Bloqueig
          </Button>
        </DialogActions>
      </Dialog>

      {/* Report User Dialog */}
      <Dialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#2C221E' }}>
          Denunciar usuari per moderació
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#786C65', mb: 2.5 }}>
            La teva denúncia serà tractada amb confidencialitat per l'equip de moderació de FELAG. En cas necessari, les proves xifrades es posaran a disposició de les autoritats competents.
          </DialogContentText>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel id="report-reason-label">Motiu de la denúncia</InputLabel>
            <Select
              labelId="report-reason-label"
              value={reportReason}
              label="Motiu de la denúncia"
              onChange={(e) => setReportReason(e.target.value as ReportUserReason)}
            >
              <MenuItem value="harassment">Assetjament o conductes intimidatòries</MenuItem>
              <MenuItem value="spam">Spam o publicitat no desitjada</MenuItem>
              <MenuItem value="inappropriate_content">Contingut inapropiat o ofensiu</MenuItem>
              <MenuItem value="safety_concern">Motius de seguretat personal</MenuItem>
              <MenuItem value="other">Altre motiu</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            size="small"
            label="Detalls de la denúncia"
            placeholder="Descriu què ha passat amb el màxim detall possible (mínim 5 caràcters)..."
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReportDialogOpen(false)} sx={{ color: '#786C65' }}>
            Cancel·lar
          </Button>
          <Button
            variant="contained"
            disabled={reportDetails.trim().length < 5}
            onClick={handleReportSubmit}
            sx={{
              bgcolor: '#C85A32',
              '&:hover': { bgcolor: '#A0471D' },
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            Enviar denúncia
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        message={toastMessage}
      />
    </Box>
  );
}
