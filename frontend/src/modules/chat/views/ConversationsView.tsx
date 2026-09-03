import { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  Avatar,
  Badge,
  CircularProgress,
  Alert,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { Link as RouterLink } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { useChatStore } from '../store';
import { useAuthStore } from '@/modules/auth/store';

function formatMessageTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  if (isYesterday) {
    return 'Ahir';
  }

  const months = ['Gen', 'Febr', 'Març', 'Abr', 'Maig', 'Juny', 'Jul', 'Ag', 'Set', 'Oct', 'Nov', 'Des'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function getUserInitials(name: string): string {
  if (!name) return 'FL';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ConversationsView() {
  const { conversations, fetchConversations, isLoading, error, initWebSocket } = useChatStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
      const cleanupWs = initWebSocket();
      return cleanupWs;
    }
  }, [isAuthenticated, fetchConversations, initWebSocket]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      <Container maxWidth="md" sx={{ py: 5 }}>
        {/* Page Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 3,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C221E' }}>
            Missatges
          </Typography>

          <Box
            sx={{
              fontSize: '0.8rem',
              color: '#786C65',
              bgcolor: '#FAF7F2',
              px: 2,
              py: 0.8,
              borderRadius: '20px',
              border: '1px solid #E8E2D9',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <LockIcon sx={{ fontSize: 16, color: '#786C65' }} />
            <Typography variant="caption" sx={{ fontWeight: 500, color: '#786C65' }}>
              Xifrat en repòs AES-256
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {isLoading && conversations.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        )}

        {!isLoading && conversations.length === 0 && (
          <Card
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px dashed #DDCFBF',
              bgcolor: '#FAF7F2',
            }}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 56, color: '#8C7A70', mb: 1.5 }} />
            <Typography variant="h6" sx={{ color: '#2C221E', fontWeight: 700, mb: 1 }}>
              Encara no tens cap conversa
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65', maxWidth: 460, mx: 'auto' }}>
              Quan coincideixis amb altres FELAGIS als teus viatges i connectis amb ells, les converses apareixeran aquí.
            </Typography>
          </Card>
        )}

        {conversations.length > 0 && (
          <Card
            sx={{
              bgcolor: '#FFFFFF',
              border: '1px solid #E8E2D9',
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(74, 46, 43, 0.05)',
              overflow: 'hidden',
            }}
          >
            {conversations.map((conv, index) => {
              const isUnread = conv.unread_count > 0;
              const hasBorder = index < conversations.length - 1;

              return (
                <Box
                  key={conv.id}
                  component={RouterLink}
                  to={`/chats/${conv.id}`}
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    px: { xs: 2.5, sm: 3 },
                    borderBottom: hasBorder ? '1px solid #E8E2D9' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: 'inherit',
                    bgcolor: isUnread ? '#FFF9F4' : '#FFFFFF',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      bgcolor: isUnread ? '#FFF3E8' : '#FAF7F2',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', minWidth: 0 }}>
                    <Avatar
                      src={conv.other_participant.avatar_url || undefined}
                      sx={{
                        width: 52,
                        height: 52,
                        bgcolor: '#F4ECE1',
                        color: '#703817',
                        border: '2px solid #C85A32',
                        fontSize: 18,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getUserInitials(conv.other_participant.name)}
                    </Avatar>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 700,
                          color: '#2C221E',
                          lineHeight: 1.2,
                          mb: 0.3,
                        }}
                      >
                        {conv.other_participant.name}
                      </Typography>

                      {conv.other_participant.origin_summary && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#703817',
                            fontWeight: 600,
                            display: 'block',
                            mb: 0.4,
                          }}
                        >
                          📍 {conv.other_participant.origin_summary}
                        </Typography>
                      )}

                      <Typography
                        variant="body2"
                        sx={{
                          color: isUnread ? '#2C221E' : '#4A3E39',
                          fontWeight: isUnread ? 600 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: { xs: 200, sm: 420, md: 500 },
                        }}
                      >
                        {conv.last_message_preview || 'Cap missatge encara'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      textAlign: 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 0.8,
                      flexShrink: 0,
                      ml: 2,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#786C65', fontSize: 12 }}>
                      {formatMessageTime(conv.last_message_at)}
                    </Typography>

                    {conv.unread_count > 0 && (
                      <Badge
                        badgeContent={conv.unread_count}
                        sx={{
                          '& .MuiBadge-badge': {
                            bgcolor: '#C85A32',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: 20,
                            minWidth: 20,
                            borderRadius: '50%',
                            position: 'static',
                            transform: 'none',
                          },
                        }}
                      />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Card>
        )}
      </Container>
    </Box>
  );
}
