import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { tripsApi } from '../api';
import { FelagiUserSummary } from '../types';

interface Props {
  selectedCompanions: FelagiUserSummary[];
  onChange: (companions: FelagiUserSummary[]) => void;
  disabled?: boolean;
  excludedUserIds?: string[];
}

export const CompanionSelector: React.FC<Props> = ({
  selectedCompanions,
  onChange,
  disabled = false,
  excludedUserIds = [],
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<FelagiUserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    let active = true;

    if (inputValue.trim().length < 2) {
      setOptions([]);
      return undefined;
    }

    setLoading(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const results = await tripsApi.searchUsers(inputValue);
        if (active) {
          // Filter out already selected or excluded
          const filtered = results.filter(
            (u) =>
              !selectedCompanions.some((selected) => selected.id === u.id) &&
              !excludedUserIds.includes(u.id)
          );
          setOptions(filtered);
        }
      } catch (err) {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(debounceTimer);
    };
  }, [inputValue, selectedCompanions, excludedUserIds]);

  return (
    <Box sx={{ my: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <GroupIcon sx={{ color: '#C85A32' }} />
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#2C221E' }}>
          Amb qui viatjo? (Acompanyants FELAGIS)
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: '#786C65', mb: 1.5 }}>
        Afegeix altres usuaris de FELAG que viatgen amb tu (ex: viatge en família o amics). Tots podran
        pujar fotos a l'àlbum i veure coincidències externes, però no fareu match entre vosaltres.
      </Typography>

      <Autocomplete
        multiple
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        getOptionLabel={(option) => option.name}
        options={options}
        loading={loading}
        value={selectedCompanions}
        disabled={disabled}
        onChange={(_, newValue) => onChange(newValue)}
        onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={selectedCompanions.length === 0 ? 'Cerca per nom o municipi...' : ''}
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <PersonAddIcon sx={{ color: '#A09088', ml: 0.5, mr: 0.5 }} />
                  {params.InputProps.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: '#C85A32',
                },
              },
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box
            component="li"
            {...props}
            key={option.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 1,
              px: 2,
              '&:hover': { backgroundColor: '#F9F6F0' },
            }}
          >
            <Avatar
              src={option.avatar_url || undefined}
              alt={option.name}
              sx={{ width: 32, height: 32, bgcolor: '#C85A32', fontSize: '0.85rem' }}
            >
              {option.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ color: '#2C221E' }}>
                {option.name}
              </Typography>
              {option.origin_summary && (
                <Typography variant="caption" sx={{ color: '#8C7A70' }}>
                  📍 {option.origin_summary}
                </Typography>
              )}
            </Box>
          </Box>
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.id}
              avatar={
                <Avatar
                  src={option.avatar_url || undefined}
                  sx={{ bgcolor: '#C85A32', color: '#FFF' }}
                >
                  {option.name.charAt(0).toUpperCase()}
                </Avatar>
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {option.name}
                  </Typography>
                  {option.town_name && (
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      ({option.town_name})
                    </Typography>
                  )}
                </Box>
              }
              sx={{
                bgcolor: '#F4ECE1',
                color: '#703817',
                border: '1px solid #E8E2D9',
                m: 0.5,
                '& .MuiChip-deleteIcon': {
                  color: '#C85A32',
                  '&:hover': { color: '#9E3E1B' },
                },
              }}
            />
          ))
        }
      />
    </Box>
  );
};
