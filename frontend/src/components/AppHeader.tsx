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
  Drawer,
  List,
  ListItem,
  ListItemButton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PersonIcon from '@mui/icons-material/Person';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
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

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    handleCloseMenu();
    setMobileDrawerOpen(false);
    await logout();
    navigate('/login');
  };

  const isTripsActive = location.pathname.startsWith('/trips');
  const isInspirationActive =
    location.pathname.startsWith('/inspiration') || location.pathname.startsWith('/destinations');
  const isChatsActive = location.pathname.startsWith('/chats');
  const isNotificationsActive = location.pathname.startsWith('/notifications');
  const isProfileActive = location.pathname.startsWith('/profile');
  const isOriginActive = location.pathname.startsWith('/origin');
  const isAdminActive = location.pathname.startsWith('/admin');

  const chatUnreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const totalAlertsCount = unreadCount + chatUnreadCount;

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
        px: { xs: 2, sm: 3, md: 5 },
        py: 1.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
      }}
    >
      {/* Brand Logo */}
      <Box
        component={RouterLink}
        to={isAuthenticated ? '/trips' : '/'}
        sx={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
        }}
      >
        <Box
          component="img"
          src="/logo.png"
          alt="FELAG"
          sx={{
            height: { xs: 28, md: 32 },
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </Box>

      {/* 🖥️ Desktop Navigation (Visible on md and up) */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: 'center' }}>
        {isAuthenticated ? (
          <>
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
              to="/inspiration"
              sx={{
                color: isInspirationActive ? '#C85A32' : '#786C65',
                textDecoration: 'none',
                fontWeight: isInspirationActive ? 700 : 500,
                fontSize: 15,
                '&:hover': { color: '#C85A32' },
              }}
            >
              Inspiració 💡
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
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography
              component={RouterLink}
              to="/inspiration"
              sx={{
                color: isInspirationActive ? '#C85A32' : '#786C65',
                textDecoration: 'none',
                fontWeight: isInspirationActive ? 700 : 500,
                fontSize: 15,
                '&:hover': { color: '#C85A32' },
              }}
            >
              Inspiració 💡
            </Typography>
            <Typography
              component={RouterLink}
              to="/login"
              sx={{
                color: '#C85A32',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
                px: 2,
                py: 0.8,
                borderRadius: 2,
                border: '1px solid #C85A32',
                '&:hover': { bgcolor: '#FFF6F0' },
              }}
            >
              Iniciar sessió
            </Typography>
          </Box>
        )}
      </Box>

      {/* 📱 Mobile Actions & Hamburger Button (Visible on xs and sm) */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
        {isAuthenticated && (
          <IconButton
            onClick={() => navigate('/notifications')}
            sx={{ color: isNotificationsActive ? '#C85A32' : '#786C65', p: 1 }}
            aria-label="Notificacions"
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: '#C85A32',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  height: 16,
                  minWidth: 16,
                },
              }}
            >
              <NotificationsNoneIcon fontSize="medium" />
            </Badge>
          </IconButton>
        )}

        <IconButton
          onClick={() => setMobileDrawerOpen(true)}
          sx={{
            p: 1,
            color: '#2C221E',
            border: '1px solid #E8E2D9',
            borderRadius: 2,
            bgcolor: mobileDrawerOpen ? '#F4ECE1' : '#FFFFFF',
            '&:hover': { bgcolor: '#FAF7F2', borderColor: '#C85A32' },
          }}
          aria-label="Obrir menú de navegació"
        >
          <Badge
            variant="dot"
            invisible={totalAlertsCount === 0}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: '#C85A32',
              },
            }}
          >
            <MenuIcon fontSize="medium" />
          </Badge>
        </IconButton>
      </Box>

      {/* 📱 Mobile Navigation Drawer */}
      <Drawer
        anchor="right"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '85vw', sm: 320 },
            maxWidth: 340,
            bgcolor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '-4px 0 24px rgba(44, 34, 30, 0.15)',
          },
        }}
      >
        <Box sx={{ p: 2.5 }}>
          {/* Drawer Top Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box
              component="img"
              src="/logo.png"
              alt="FELAG"
              sx={{ height: 26, width: 'auto', objectFit: 'contain' }}
            />
            <IconButton
              onClick={() => setMobileDrawerOpen(false)}
              sx={{ color: '#786C65', '&:hover': { color: '#2C221E' } }}
              aria-label="Tancar menú"
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* User Profile Card (if authenticated) */}
          {isAuthenticated && user && (
            <Box
              sx={{
                p: 2,
                mb: 2.5,
                bgcolor: '#FAF7F2',
                borderRadius: 3,
                border: '1px solid #E8E2D9',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Avatar
                src={user.avatar_url || undefined}
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: '#C85A32',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                {initials}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="subtitle2"
                    noWrap
                    sx={{ fontWeight: 700, color: '#2C221E', fontSize: 15 }}
                  >
                    {user.name || 'Viatger FELAG'}
                  </Typography>
                  {user.role === 'admin' && (
                    <Chip
                      label="Admin"
                      size="small"
                      sx={{
                        bgcolor: '#C85A32',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '0.6rem',
                        height: 18,
                      }}
                    />
                  )}
                </Box>
                <Typography variant="caption" noWrap sx={{ color: '#786C65', display: 'block' }}>
                  {user.email}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Main Navigation Links */}
          <List sx={{ p: 0, '& .MuiListItemButton-root': { borderRadius: 2, mb: 0.8, py: 1.2 } }}>
            {isAuthenticated ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/trips"
                    selected={isTripsActive}
                    sx={{
                      bgcolor: isTripsActive ? '#FFF4EE' : 'transparent',
                      color: isTripsActive ? '#C85A32' : '#2C221E',
                      '&.Mui-selected': { bgcolor: '#FFF4EE', color: '#C85A32' },
                      '&.Mui-selected:hover': { bgcolor: '#FFEADB' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: isTripsActive ? '#C85A32' : '#786C65' }}>
                      <FlightTakeoffIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Viatges"
                      primaryTypographyProps={{ fontWeight: isTripsActive ? 700 : 600, fontSize: 15 }}
                    />
                  </ListItemButton>
                </ListItem>

                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/inspiration"
                    selected={isInspirationActive}
                    sx={{
                      bgcolor: isInspirationActive ? '#FFF4EE' : 'transparent',
                      color: isInspirationActive ? '#C85A32' : '#2C221E',
                      '&.Mui-selected': { bgcolor: '#FFF4EE', color: '#C85A32' },
                      '&.Mui-selected:hover': { bgcolor: '#FFEADB' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: isInspirationActive ? '#C85A32' : '#786C65' }}>
                      <LightbulbOutlinedIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Inspiració"
                      primaryTypographyProps={{ fontWeight: isInspirationActive ? 700 : 600, fontSize: 15 }}
                    />
                  </ListItemButton>
                </ListItem>

                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/chats"
                    selected={isChatsActive}
                    sx={{
                      bgcolor: isChatsActive ? '#FFF4EE' : 'transparent',
                      color: isChatsActive ? '#C85A32' : '#2C221E',
                      '&.Mui-selected': { bgcolor: '#FFF4EE', color: '#C85A32' },
                      '&.Mui-selected:hover': { bgcolor: '#FFEADB' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: isChatsActive ? '#C85A32' : '#786C65' }}>
                      <Badge badgeContent={chatUnreadCount} color="error">
                        <ChatBubbleOutlineIcon />
                      </Badge>
                    </ListItemIcon>
                    <ListItemText
                      primary="Xats"
                      primaryTypographyProps={{ fontWeight: isChatsActive ? 700 : 600, fontSize: 15 }}
                    />
                    {chatUnreadCount > 0 && (
                      <Chip
                        label={chatUnreadCount}
                        size="small"
                        sx={{ bgcolor: '#C85A32', color: '#FFFFFF', fontWeight: 700, height: 20 }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>

                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/notifications"
                    selected={isNotificationsActive}
                    sx={{
                      bgcolor: isNotificationsActive ? '#FFF4EE' : 'transparent',
                      color: isNotificationsActive ? '#C85A32' : '#2C221E',
                      '&.Mui-selected': { bgcolor: '#FFF4EE', color: '#C85A32' },
                      '&.Mui-selected:hover': { bgcolor: '#FFEADB' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: isNotificationsActive ? '#C85A32' : '#786C65' }}>
                      <Badge badgeContent={unreadCount} color="error">
                        <NotificationsNoneIcon />
                      </Badge>
                    </ListItemIcon>
                    <ListItemText
                      primary="Notificacions"
                      primaryTypographyProps={{ fontWeight: isNotificationsActive ? 700 : 600, fontSize: 15 }}
                    />
                    {unreadCount > 0 && (
                      <Chip
                        label={unreadCount}
                        size="small"
                        sx={{ bgcolor: '#C85A32', color: '#FFFFFF', fontWeight: 700, height: 20 }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>

                <Divider sx={{ my: 1.5 }} />

                {/* Profile & Settings in Drawer */}
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/profile"
                    selected={isProfileActive}
                    sx={{
                      bgcolor: isProfileActive ? '#FFF4EE' : 'transparent',
                      color: isProfileActive ? '#C85A32' : '#2C221E',
                      '&.Mui-selected': { bgcolor: '#FFF4EE', color: '#C85A32' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: isProfileActive ? '#C85A32' : '#786C65' }}>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="El meu perfil"
                      primaryTypographyProps={{ fontWeight: isProfileActive ? 700 : 500, fontSize: 14 }}
                    />
                  </ListItemButton>
                </ListItem>

                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/origin"
                    selected={isOriginActive}
                    sx={{
                      bgcolor: isOriginActive ? '#FFF4EE' : 'transparent',
                      color: isOriginActive ? '#C85A32' : '#2C221E',
                      '&.Mui-selected': { bgcolor: '#FFF4EE', color: '#C85A32' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: isOriginActive ? '#C85A32' : '#786C65' }}>
                      <LocationCityIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Canviar origen"
                      primaryTypographyProps={{ fontWeight: isOriginActive ? 700 : 500, fontSize: 14 }}
                    />
                  </ListItemButton>
                </ListItem>

                {user?.role === 'admin' && (
                  <ListItem disablePadding>
                    <ListItemButton
                      component={RouterLink}
                      to="/admin"
                      selected={isAdminActive}
                      sx={{
                        bgcolor: isAdminActive ? '#FFF4EE' : 'transparent',
                        color: isAdminActive ? '#C85A32' : '#2C221E',
                        '&.Mui-selected': { bgcolor: '#FFF4EE', color: '#C85A32' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: '#C85A32' }}>
                        <AdminPanelSettingsIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Consola d'Administració"
                        primaryTypographyProps={{ fontWeight: 700, fontSize: 14, color: '#C85A32' }}
                      />
                    </ListItemButton>
                  </ListItem>
                )}
              </>
            ) : (
              <>
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/inspiration"
                    selected={isInspirationActive}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: '#C85A32' }}>
                      <LightbulbOutlinedIcon />
                    </ListItemIcon>
                    <ListItemText primary="Inspiració" primaryTypographyProps={{ fontWeight: 600, fontSize: 15 }} />
                  </ListItemButton>
                </ListItem>

                <ListItem disablePadding>
                  <ListItemButton component={RouterLink} to="/login">
                    <ListItemIcon sx={{ minWidth: 40, color: '#C85A32' }}>
                      <LoginIcon />
                    </ListItemIcon>
                    <ListItemText primary="Iniciar sessió" primaryTypographyProps={{ fontWeight: 600, fontSize: 15 }} />
                  </ListItemButton>
                </ListItem>

                <ListItem disablePadding>
                  <ListItemButton component={RouterLink} to="/register">
                    <ListItemIcon sx={{ minWidth: 40, color: '#C85A32' }}>
                      <PersonAddIcon />
                    </ListItemIcon>
                    <ListItemText primary="Registra't" primaryTypographyProps={{ fontWeight: 600, fontSize: 15 }} />
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </Box>

        {/* Drawer Bottom Actions (Logout) */}
        {isAuthenticated && (
          <Box sx={{ p: 2.5, borderTop: '1px solid #E8E2D9', bgcolor: '#FAF7F2' }}>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                color: '#D32F2F',
                '&:hover': { bgcolor: '#FDECEC' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: '#D32F2F' }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText
                primary="Tancar sessió"
                primaryTypographyProps={{ fontWeight: 700, fontSize: 14, color: '#D32F2F' }}
              />
            </ListItemButton>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
