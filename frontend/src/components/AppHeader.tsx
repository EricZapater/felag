import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Badge,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/modules/auth/store';
import { useNotificationStore } from '@/modules/notifications/store';
import { useChatStore } from '@/modules/chat/store';

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAuthenticated, user } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { conversations, fetchConversations } = useChatStore();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchConversations();
    }
  }, [isAuthenticated, fetchNotifications, fetchConversations]);

  const handleLogout = async () => {
    handleCloseMenu();
    await logout();
    navigate('/login');
  };

  const isTripsActive = location.pathname.startsWith('/trips');
  const isExploreActive = location.pathname.startsWith('/explore');
  const isDestinationsActive = location.pathname.startsWith('/destinations');
  const isChatsActive = location.pathname.startsWith('/chats');
  const isNotificationsActive = location.pathname.startsWith('/notifications');

  const chatUnreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'FE';

  return (
    <Box
      component="header"
      sx={{
        bgcolor: '#FFFFFF',
        borderBottom: '1px solid #E8E2D9',
        px: { xs: 2, md: 5 },
        py: 1.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {/* Brand Logo */}
      <Typography
        component={RouterLink}
        to="/trips"
        variant="h5"
        sx={{
          color: '#C85A32',
          fontWeight: 800,
          letterSpacing: 1.5,
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        FELAG
      </Typography>

      {/* Right Navigation & User Avatar */}
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
          Viatges ✈️
        </Typography>

        <Typography
          component={RouterLink}
          to="/explore"
          sx={{
            color: isExploreActive ? '#C85A32' : '#786C65',
            textDecoration: 'none',
            fontWeight: isExploreActive ? 700 : 500,
            fontSize: 15,
            '&:hover': { color: '#C85A32' },
          }}
        >
          Explorar 🧭
        </Typography>

        <Typography
          component={RouterLink}
          to="/destinations"
          sx={{
            color: isDestinationsActive ? '#C85A32' : '#786C65',
            textDecoration: 'none',
            fontWeight: isDestinationsActive ? 700 : 500,
            fontSize: 15,
            '&:hover': { color: '#C85A32' },
          }}
        >
          Destins 🗺️
        </Typography>

        <Box
          component={RouterLink}
          to="/chats"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: isChatsActive ? '#C85A32' : '#786C65',
            fontWeight: isChatsActive ? 700 : 500,
            fontSize: 15,
            '&:hover': { color: '#C85A32' },
          }}
        >
          <Badge
            badgeContent={chatUnreadCount}
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
            <span>Xats 💬</span>
          </Badge>
        </Box>

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

        {/* User Profile Avatar with Dropdown Menu */}
        <IconButton
          onClick={handleOpenMenu}
          sx={{
            p: 0.5,
            border: '2px solid #E8E2D9',
            '&:hover': { borderColor: '#C85A32' },
          }}
          aria-controls={openMenu ? 'user-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={openMenu ? 'true' : undefined}
        >
          <Avatar
            src={user?.avatar_url || undefined}
            sx={{
              width: 36,
              height: 36,
              bgcolor: '#F4ECE1',
              color: '#C85A32',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {initials}
          </Avatar>
        </IconButton>

        <Menu
          id="user-menu"
          anchorEl={anchorEl}
          open={openMenu}
          onClose={handleCloseMenu}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 3,
            sx: {
              minWidth: 220,
              borderRadius: 3,
              mt: 1.5,
              border: '1px solid #E8E2D9',
              boxShadow: '0 8px 24px rgba(44, 34, 30, 0.12)',
            },
          }}
        >
          {/* User Info Header in Menu */}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2C221E' }}>
                {user?.name || 'Viatger FELAG'}
              </Typography>
              {user?.role === 'admin' && (
                <Chip
                  label="Admin"
                  size="small"
                  sx={{
                    bgcolor: '#C85A32',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    height: 20,
                  }}
                />
              )}
            </Box>
            <Typography variant="body2" sx={{ color: '#786C65', fontSize: 13 }}>
              {user?.email}
            </Typography>
          </Box>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem
            onClick={() => {
              handleCloseMenu();
              navigate('/profile');
            }}
          >
            <ListItemIcon>
              <PersonIcon fontSize="small" sx={{ color: '#C85A32' }} />
            </ListItemIcon>
            <ListItemText primary="El meu perfil" primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }} />
          </MenuItem>

          <MenuItem
            onClick={() => {
              handleCloseMenu();
              navigate('/origin');
            }}
          >
            <ListItemIcon>
              <LocationCityIcon fontSize="small" sx={{ color: '#C85A32' }} />
            </ListItemIcon>
            <ListItemText primary="Canviar origen" primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }} />
          </MenuItem>

          {user?.role === 'admin' && (
            <MenuItem
              onClick={() => {
                handleCloseMenu();
                navigate('/admin');
              }}
            >
              <ListItemIcon>
                <AdminPanelSettingsIcon fontSize="small" sx={{ color: '#C85A32' }} />
              </ListItemIcon>
              <ListItemText
                primary="Consola d'Administració"
                primaryTypographyProps={{ fontWeight: 700, fontSize: 14, color: '#C85A32' }}
              />
            </MenuItem>
          )}

          <Divider sx={{ my: 0.5 }} />

          <MenuItem onClick={handleLogout} sx={{ color: '#D32F2F' }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" sx={{ color: '#D32F2F' }} />
            </ListItemIcon>
            <ListItemText primary="Tancar sessió" primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }} />
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
