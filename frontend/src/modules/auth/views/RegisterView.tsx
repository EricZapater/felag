import React, { useState } from 'react';
import { Box, Button, Card, CardContent, TextField, Typography, Alert, Link } from '@mui/material';
import { useAuthStore } from '../store';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

export default function RegisterView() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(name, email, password);
      navigate('/profile');
    } catch (err) {
      // Error handled in store
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F9F6F0' }}>
      <Card sx={{ maxWidth: 440, width: '100%', p: 2, boxShadow: '0 4px 20px rgba(74, 46, 43, 0.08)', borderRadius: 3, border: '1px solid #E8E2D9' }}>
        <CardContent>
          <Typography variant="h4" component="h1" align="center" sx={{ color: '#C85A32', fontWeight: 700, letterSpacing: 2, mb: 1 }}>
            FELAG
          </Typography>
          <Typography variant="body2" align="center" sx={{ color: '#786C65', mb: 3 }}>
            Crea el teu compte i connecta amb la teva gent
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Nom complet"
              name="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C85A32' } }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correu electrònic"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C85A32' } }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contrasenya"
              type="password"
              id="password"
              autoComplete="new-password"
              helperText="Mínim 8 caràcters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C85A32' } }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2, py: 1.5, bgcolor: '#C85A32', '&:hover': { bgcolor: '#A0471D' }, borderRadius: 2 }}
            >
              {isLoading ? 'Creant compte...' : 'Crear compte'}
            </Button>
            <Box textAlign="center" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: '#786C65' }}>
                Ja tens compte?{' '}
                <Link component={RouterLink} to="/login" sx={{ color: '#C85A32', fontWeight: 600 }}>
                  Inicia sessió
                </Link>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
