import { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CollectionsIcon from '@mui/icons-material/Collections';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LockIcon from '@mui/icons-material/Lock';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { ActiveTripHubResponse, PhotoSharingMode } from '../types';
import { useCommunityStore } from '@/modules/community/store';

interface ActiveTripHubCardProps {
  hubData?: ActiveTripHubResponse | null;
  tripId?: string;
  tripTitle?: string;
  destinationName?: string;
  countryFlag?: string;
  currentDay?: number;
  totalDays?: number;
  isFinalDayOrPast?: boolean;
  photosCount?: number;
  activeFelagisCount?: number;
}

export default function ActiveTripHubCard({
  hubData,
  tripId: propTripId,
  tripTitle: propTitle,
  destinationName: propDestName,
  countryFlag: propFlag,
  currentDay: propCurrentDay,
  totalDays: propTotalDays,
  isFinalDayOrPast: propIsFinalDay,
  photosCount: propPhotosCount,
  activeFelagisCount: propActiveFelagis,
}: ActiveTripHubCardProps) {
  const { updatePhotoSharing } = useCommunityStore();

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<PhotoSharingMode>(
    hubData?.photo_sharing_mode || 'all_felagis'
  );
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  const tripId = propTripId || hubData?.trip_id || '';
  const title = propTitle || hubData?.trip_title || 'Viatge en curs';
  const destination = propDestName || hubData?.destination_name || 'Destinació';
  const flag = propFlag || hubData?.country_flag || '✈️';
  const currentDay = propCurrentDay ?? hubData?.current_day ?? 1;
  const totalDays = propTotalDays ?? hubData?.total_days ?? 1;
  const isFinalDay = propIsFinalDay ?? hubData?.is_final_day_or_past ?? false;
  const photosCount = propPhotosCount ?? hubData?.photos_count ?? 0;
  const activeFelagisCount = propActiveFelagis ?? hubData?.active_felagis_count ?? 0;

  const handleSavePrivacy = async () => {
    if (!tripId) return;
    setIsSavingPrivacy(true);
    try {
      await updatePhotoSharing(tripId, selectedMode);
      setPrivacyOpen(false);
    } catch {
      // handled in store
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const privacyModeLabel =
    selectedMode === 'all_felagis'
      ? 'Tots els FELAGIS'
      : selectedMode === 'close_origin'
      ? 'Mateix origen'
      : 'Privat';

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #2C221E 0%, #4A3B32 100%)',
        color: '#FFFFFF',
        borderRadius: 4,
        p: { xs: 2.5, md: 3.5 },
        mb: 4,
        boxShadow: '0 10px 30px rgba(44,34,30,0.18)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Live Badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Chip
          label={isFinalDay ? '✨ DIA FINAL / TANCAMENT' : '⚡ VIATGE EN CURS'}
          size="small"
          sx={{
            bgcolor: isFinalDay ? '#2E7D32' : '#E65100',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '0.75rem',
            letterSpacing: 0.5,
            px: 0.5,
          }}
        />
        {isFinalDay && (
          <Button
            component={RouterLink}
            to={`/trips/${tripId}/wrapup`}
            variant="contained"
            size="small"
            startIcon={<AutoAwesomeIcon />}
            sx={{
              bgcolor: '#C85A32',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: '#A0471D' },
            }}
          >
            Completar Ritual de Tancament & Stories 9:16
          </Button>
        )}
      </Box>

      {/* Main Title */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          color: '#FFFFFF',
          mb: 0.5,
          fontSize: { xs: '1.25rem', md: '1.65rem' },
        }}
      >
        {title} {flag}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: 'rgba(255, 255, 255, 0.85)',
          mb: 3,
          fontSize: '0.9rem',
        }}
      >
        📍 {destination} • Dia {currentDay} de {totalDays}
      </Typography>

      {/* Quick Actions Hub Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 1.5,
        }}
      >
        {/* Celebration Card */}
        <Box
          component={RouterLink}
          to={`/trips/${tripId}/celebrate`}
          sx={{
            background: 'rgba(255, 255, 255, 0.10)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: 3,
            p: 2,
            textAlign: 'center',
            textDecoration: 'none',
            color: '#FFFFFF',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.20)',
              transform: 'translateY(-3px)',
              borderColor: 'rgba(255, 255, 255, 0.35)',
            },
          }}
        >
          <PhotoCameraIcon sx={{ fontSize: 32, mb: 0.8, color: '#FFE082' }} />
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.2 }}>
            Celebration Card
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', opacity: 0.8, mt: 0.5 }}>
            "Ens hem trobat! 🎉"
          </Typography>
        </Box>

        {/* Trip Album */}
        <Box
          component={RouterLink}
          to={`/trips/${tripId}/gallery`}
          sx={{
            background: 'rgba(255, 255, 255, 0.10)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: 3,
            p: 2,
            textAlign: 'center',
            textDecoration: 'none',
            color: '#FFFFFF',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.20)',
              transform: 'translateY(-3px)',
              borderColor: 'rgba(255, 255, 255, 0.35)',
            },
          }}
        >
          <CollectionsIcon sx={{ fontSize: 32, mb: 0.8, color: '#81D4FA' }} />
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.2 }}>
            Àlbum del Viatge
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', opacity: 0.8, mt: 0.5 }}>
            {photosCount} {photosCount === 1 ? 'foto pujada' : 'fotos pujades'}
          </Typography>
        </Box>

        {/* Live Feed */}
        <Box
          component={RouterLink}
          to={`/destinations/${encodeURIComponent(destination)}/live`}
          sx={{
            background: 'rgba(255, 255, 255, 0.10)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: 3,
            p: 2,
            textAlign: 'center',
            textDecoration: 'none',
            color: '#FFFFFF',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.20)',
              transform: 'translateY(-3px)',
              borderColor: 'rgba(255, 255, 255, 0.35)',
            },
          }}
        >
          <LocationOnIcon sx={{ fontSize: 32, mb: 0.8, color: '#A5D6A7' }} />
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.2 }}>
            Feed en Viu
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', opacity: 0.8, mt: 0.5 }}>
            {activeFelagisCount} {activeFelagisCount === 1 ? 'FELAGI a prop' : 'FELAGIS a prop'}
          </Typography>
        </Box>

        {/* Privacy Settings */}
        <Box
          onClick={() => setPrivacyOpen(true)}
          sx={{
            background: 'rgba(255, 255, 255, 0.10)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: 3,
            p: 2,
            textAlign: 'center',
            color: '#FFFFFF',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.20)',
              transform: 'translateY(-3px)',
              borderColor: 'rgba(255, 255, 255, 0.35)',
            },
          }}
        >
          <LockIcon sx={{ fontSize: 32, mb: 0.8, color: '#CE93D8' }} />
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.2 }}>
            Privadesa
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', opacity: 0.8, mt: 0.5 }}>
            {privacyModeLabel}
          </Typography>
        </Box>
      </Box>

      {/* Privacy Dialog */}
      <Dialog
        open={privacyOpen}
        onClose={() => !isSavingPrivacy && setPrivacyOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#2C221E' }}>
          🔒 Privadesa de les teves fotos
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#786C65', mb: 2 }}>
            Tria qui pot veure les fotos que pugis al feed en viu d'aquest viatge:
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as PhotoSharingMode)}
            >
              <FormControlLabel
                value="all_felagis"
                control={<Radio sx={{ color: '#C85A32', '&.Mui-checked': { color: '#C85A32' } }} />}
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#2C221E' }}>
                      Tots els FELAGIS
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#786C65' }}>
                      Visible per a qualsevol viatger verificat a la mateixa ciutat.
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1.5 }}
              />
              <FormControlLabel
                value="close_origin"
                control={<Radio sx={{ color: '#C85A32', '&.Mui-checked': { color: '#C85A32' } }} />}
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#2C221E' }}>
                      Només viatgers de la meva terra
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#786C65' }}>
                      Visible només per a viatgers del teu mateix poble o comarca.
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1.5 }}
              />
              <FormControlLabel
                value="none"
                control={<Radio sx={{ color: '#C85A32', '&.Mui-checked': { color: '#C85A32' } }} />}
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#2C221E' }}>
                      No compartir fotos al feed en viu
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#786C65' }}>
                      Les teves fotos només seran visibles al teu àlbum privat.
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setPrivacyOpen(false)}
            disabled={isSavingPrivacy}
            sx={{ color: '#786C65', textTransform: 'none' }}
          >
            Cancel·lar
          </Button>
          <Button
            onClick={handleSavePrivacy}
            variant="contained"
            disabled={isSavingPrivacy}
            sx={{
              bgcolor: '#C85A32',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              '&:hover': { bgcolor: '#A0471D' },
            }}
          >
            {isSavingPrivacy ? 'Desant...' : 'Desar canvis'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
