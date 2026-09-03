import { useState, useEffect, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { communityApi } from '@/modules/community/api';
import { TownSearchResult } from '@/modules/community/types';

interface DestinationAutocompleteProps {
  value: string;
  countryCode?: string;
  townId?: string;
  onChange: (data: {
    destination_name: string;
    country_code: string;
    town_id?: string;
    region_id?: string;
  }) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

export default function DestinationAutocomplete({
  value,
  countryCode,
  townId,
  onChange,
  label = 'Ciutat / Destinació',
  placeholder = 'Ex: Tòquio, Girona, París...',
  required = false,
  error = false,
  helperText,
  disabled = false,
}: DestinationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<TownSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');

  // Keep inputValue in sync if parent resets value
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    let active = true;

    if (!inputValue || inputValue.trim().length < 2) {
      setOptions([]);
      return undefined;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await communityApi.searchTowns(inputValue.trim());
        if (active) {
          setOptions(results || []);
        }
      } catch {
        if (active) {
          setOptions([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [inputValue]);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    const found = options.find(
      (opt) =>
        (townId && opt.id === townId) ||
        opt.name.toLowerCase() === value.toLowerCase()
    );
    if (found) return found;
    return {
      id: townId || '',
      name: value,
      country_code: countryCode || '',
    };
  }, [value, townId, countryCode, options]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      freeSolo
      value={selectedOption}
      inputValue={inputValue}
      onInputChange={(_, newInputValue, reason) => {
        setInputValue(newInputValue);
        if (reason === 'input') {
          onChange({
            destination_name: newInputValue,
            country_code: countryCode || '',
            town_id: undefined,
          });
        }
      }}
      onChange={(_, newValue) => {
        if (typeof newValue === 'string') {
          onChange({
            destination_name: newValue,
            country_code: countryCode || '',
          });
        } else if (newValue && newValue.name) {
          onChange({
            destination_name: newValue.name,
            country_code: newValue.country_code || '',
            town_id: newValue.id,
            region_id: newValue.region_id,
          });
          setInputValue(newValue.name);
        } else {
          onChange({
            destination_name: '',
            country_code: '',
            town_id: undefined,
          });
          setInputValue('');
        }
      }}
      options={options}
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option;
        return option.name;
      }}
      isOptionEqualToValue={(option, val) => {
        if (!option || !val) return false;
        return option.id === val.id || option.name === val.name;
      }}
      loading={loading}
      disabled={disabled}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props;
        return (
          <Box
            component="li"
            key={option.id || option.name}
            {...otherProps}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 1,
              px: 2,
              '&:hover': { bgcolor: '#FDF7F4' },
            }}
          >
            <LocationOnIcon sx={{ color: '#C85A32', fontSize: 20 }} />
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#2C221E' }}>
                {option.name}
              </Typography>
              {(option.region_name || option.country_name || option.country_code) && (
                <Typography variant="caption" sx={{ color: '#786C65' }}>
                  {[option.region_name, option.country_name || option.country_code]
                    .filter(Boolean)
                    .join(' • ')}
                </Typography>
              )}
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={label}
          placeholder={placeholder}
          required={required}
          error={error}
          helperText={helperText}
          sx={{ bgcolor: '#FFFFFF' }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} sx={{ color: '#C85A32' }} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
