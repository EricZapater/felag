import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Avatar,
  IconButton,
  Alert,
  Divider,
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { useProfileStore } from '../store';
import { useAuthStore } from '@/modules/auth/store';
import { Link as RouterLink } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';

export default function ProfileView() {
  const { profile, fetchProfile, updateProfile, uploadAvatar, isLoading, error } = useProfileStore();
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhoneNumber(profile.phone_number || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    try {
      await updateProfile(name, phoneNumber, bio);
      setSuccessMsg('Perfil actualitzat amb èxit!');
    } catch (err) {
      // Error in store
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        await uploadAvatar(e.target.files[0]);
        setSuccessMsg('Foto de perfil actualitzada!');
      } catch (err) {
        // Error in store
      }
    }
  };

  const originStr = profile?.origin
    ? `${profile.origin.country.name} ➔ ${profile.origin.region.name} ➔ ${profile.origin.town.name}`
    : 'Cap origen definit';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />
      <Container maxWidth="md" sx={{ py: 4 }}>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(74, 46, 43, 0.05)', border: '1px solid #E8E2D9', mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={profile?.avatar_url || undefined}
                  sx={{ width: 90, height: 90, bgcolor: '#F4ECE1', color: '#703817', border: '3px solid #C85A32', fontSize: 32, fontWeight: 700 }}
                >
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
                </Avatar>
                <IconButton
                  color="primary"
                  aria-label="upload picture"
                  component="label"
                  sx={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    bgcolor: '#C85A32',
                    color: '#fff',
                    '&:hover': { bgcolor: '#A0471D' },
                    width: 32,
                    height: 32,
                  }}
                >
                  <input hidden accept="image/*" type="file" onChange={handleAvatarChange} />
                  <PhotoCamera sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C221E' }}>
                  {profile?.name || user?.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#786C65' }}>
                  {profile?.email || user?.email}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#3E2723', mb: 1 }}>
              Origen definit (Jerarquia)
            </Typography>

            <Box
              sx={{
                bgcolor: '#F4ECE1',
                border: '1px solid #DDCFBF',
                borderRadius: 2,
                p: 2.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#8C7A70', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                  Origen actual
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#703817', mt: 0.5 }}>
                  {originStr}
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to="/origin"
                variant="outlined"
                sx={{
                  color: '#C85A32',
                  borderColor: '#C85A32',
                  whiteSpace: 'nowrap',
                  ml: 'auto',
                  '&:hover': { bgcolor: '#F4ECE1', borderColor: '#A0471D' },
                }}
              >
                Canviar origen
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(74, 46, 43, 0.05)', border: '1px solid #E8E2D9' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#3E2723', mb: 2 }}>
              Informació del perfil
            </Typography>

            <Box component="form" onSubmit={handleSave}>
              <TextField
                margin="normal"
                fullWidth
                label="Nom complet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="normal"
                fullWidth
                label="Telèfon de contacte / MFA"
                placeholder="+34 612 34 56 78"
                helperText="Utilitzat per a la verificació en dos passos (MFA)."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="normal"
                fullWidth
                multiline
                rows={3}
                label="Biografia curta"
                placeholder="Explica una mica sobre tu..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
                sx={{ bgcolor: '#C85A32', '&:hover': { bgcolor: '#A0471D' }, py: 1.2, px: 4, borderRadius: 2 }}
              >
                {isLoading ? 'Desant...' : 'Desar canvis'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
