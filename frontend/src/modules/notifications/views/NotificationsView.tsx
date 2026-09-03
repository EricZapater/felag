import { useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Container,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { useNotificationStore } from '../store';
import { Notification } from '../types';

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return 'Ara mateix';
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'Ara mateix';
    if (diffMinutes === 1) return 'Fa 1 minut';
    if (diffMinutes < 60) return `Fa ${diffMinutes} minuts`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return 'Fa 1 hora';
    if (diffHours < 24) return `Fa ${diffHours} hores`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Fa 1 dia';
    if (diffDays < 30) return `Fa ${diffDays} dies`;
    return d.toLocaleDateString('ca-ES');
  } catch {
    return dateStr;
  }
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'new_match':
      return '✨';
    case 'trip_reminder':
      return '✈️';
    case 'system':
    default:
      return '👋';
  }
}

export default function NotificationsView() {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, isLoading, error } =
    useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }

    if (notif.data && notif.data.trip_id) {
      navigate(`/trips/${notif.data.trip_id}/matches`);
    } else if (notif.data && notif.data.match_id) {
      navigate('/trips');
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      <Container maxWidth="md" sx={{ py: 5 }}>
        {/* Header Action */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2C221E', fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
            Notificacions
          </Typography>

          {unreadCount > 0 && (
            <Button
              variant="text"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllAsRead}
              sx={{
                color: '#C85A32',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: 14,
                '&:hover': { bgcolor: 'transparent', color: '#A0471D', textDecoration: 'underline' },
              }}
            >
              Marcar-ho tot com a llegit
            </Button>
          )}
        </Box>

        {/* Loading / Error States */}
        {isLoading && notifications.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#C85A32' }} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Empty state */}
        {!isLoading && !error && notifications.length === 0 && (
          <Card
            sx={{
              p: 5,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px dashed #DDCFBF',
              bgcolor: '#FAF7F2',
            }}
          >
            <NotificationsNoneIcon sx={{ fontSize: 48, color: '#8C7A70', mb: 1.5 }} />
            <Typography variant="h6" sx={{ color: '#2C221E', fontWeight: 600, mb: 1 }}>
              No tens cap notificació
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65' }}>
              Quan hi hagi novetats sobre els teus viatges o noves coincidències amb altres FELAGIS, les veuràs aquí.
            </Typography>
          </Card>
        )}

        {/* Notifications List Card */}
        {notifications.length > 0 && (
          <Card
            sx={{
              bgcolor: '#FFFFFF',
              border: '1px solid #E8E2D9',
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(74, 46, 43, 0.05)',
              overflow: 'hidden',
            }}
          >
            {notifications.map((notif, idx) => {
              const icon = getNotificationIcon(notif.type);
              const isLast = idx === notifications.length - 1;

              return (
                <Box
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderBottom: isLast ? 'none' : '1px solid #E8E2D9',
                    display: 'flex',
                    gap: 2,
                    alignItems: 'flex-start',
                    bgcolor: notif.read ? '#FFFFFF' : '#FFF9F4',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      bgcolor: '#FAF7F2',
                    },
                  }}
                >
                  {/* Icon */}
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      bgcolor: '#F4ECE1',
                      color: '#C85A32',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </Box>

                  {/* Content */}
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontSize: 15,
                        fontWeight: notif.read ? 600 : 700,
                        color: '#2C221E',
                        mb: 0.5,
                      }}
                    >
                      {notif.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#4A3E39', mb: 0.8, lineHeight: 1.4 }}>
                      {notif.body}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#786C65', fontSize: 12 }}>
                      {formatRelativeTime(notif.created_at)}
                    </Typography>
                  </Box>

                  {/* Unread indicator */}
                  {!notif.read && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: '#C85A32',
                        mt: 1,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Card>
        )}
      </Container>
    </Box>
  );
}
