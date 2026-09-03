import { useEffect } from 'react';
import { Box, Button, Typography, Badge } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/modules/auth/store';
import { useNotificationStore } from '@/modules/notifications/store';

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isTripsActive = location.pathname.startsWith('/trips');
  const isNotificationsActive = location.pathname.startsWith('/notifications');
  const isProfileActive = location.pathname.startsWith('/profile') || location.pathname.startsWith('/origin');

  return (
    <Box
      component="header"
      sx={{
        bgcolor: '#FFFFFF',
        borderBottom: '1px solid #E8E2D9',
        px: { xs: 2, md: 5 },
        py: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 4 } }}>
        <Typography
          component={RouterLink}
          to="/trips"
          variant="h5"
          sx={{
            color: '#C85A32',
            fontWeight: 700,
            letterSpacing: 1,
            textDecoration: 'none',
          }}
        >
          FELAG
        </Typography>
        <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 3 }, alignItems: 'center' }}>
          <Typography
            component={RouterLink}
            to="/trips"
            sx={{
              color: isTripsActive ? '#C85A32' : '#786C65',
              textDecoration: 'none',
              fontWeight: isTripsActive ? 700 : 500,
              fontSize: 15,
              '&:hover': { color: '#C85A32' },
            }}
          >
            Viatges
          </Typography>

          <Box
            component={RouterLink}
            to="/notifications"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: isNotificationsActive ? '#C85A32' : '#786C65',
              fontWeight: isNotificationsActive ? 700 : 500,
              fontSize: 15,
              '&:hover': { color: '#C85A32' },
            }}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: '#C85A32',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 18,
                  minWidth: 18,
                  right: -8,
                  top: -2,
                },
              }}
            >
              <span>Notificacions 🔔</span>
            </Badge>
          </Box>

          <Typography
            component={RouterLink}
            to="/profile"
            sx={{
              color: isProfileActive ? '#C85A32' : '#786C65',
              textDecoration: 'none',
              fontWeight: isProfileActive ? 700 : 500,
              fontSize: 15,
              '&:hover': { color: '#C85A32' },
            }}
          >
            Perfil
          </Typography>
        </Box>
      </Box>

      <Button
        variant="outlined"
        color="error"
        size="small"
        onClick={handleLogout}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 2,
        }}
      >
        Tancar sessió
      </Button>
    </Box>
  );
}
