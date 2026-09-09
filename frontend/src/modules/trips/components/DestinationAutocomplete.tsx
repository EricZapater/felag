import { useState, useEffect, useRef } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { placesApi } from '@/modules/places/api';
import { communityApi } from '@/modules/community/api';

export interface DestinationChangeData {
  destination_name: string;
  country_code: string;
  town_id?: string;
  region_id?: string;
  place_id?: string;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
}

export interface DestinationOption {
  id?: string;
  google_place_id?: string;
  name: string;
  secondary_text?: string;
  country_code?: string;
  country_name?: string;
  region_name?: string;
  latitude?: number;
  longitude?: number;
}

interface DestinationAutocompleteProps {
  value: string;
  countryCode?: string;
  townId?: string;
  onChange: (data: DestinationChangeData) => void;
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
  onChange,
  label = 'Ciutat / Destinació',
  placeholder = 'Ex: Tòquio, Girona, París, Marràqueix...',
  required = false,
  error = false,
  helperText,
  disabled = false,
}: DestinationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<DestinationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');

  // Keep track of internal vs prop updates
  const lastEmittedValue = useRef<string>(value || '');

  useEffect(() => {
    if (value !== undefined && value !== lastEmittedValue.current) {
      lastEmittedValue.current = value;
      setInputValue(value);
    }
  }, [value]);

  useEffect(() => {
    let active = true;
    const query = inputValue.trim();

    if (!query || query.length < 2) {
      setOptions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        // 1. Try Google Places Autocomplete first
        const predictions = await placesApi.autocomplete(query, 'ca', countryCode);
        
        if (!active) return;

        if (predictions && predictions.length > 0) {
          const mapped: DestinationOption[] = predictions.map((p) => ({
            google_place_id: p.google_place_id,
            name: p.main_text || p.full_text,
            secondary_text: p.secondary_text,
          }));
          setOptions(mapped);
          return;
        }

        // 2. Fallback to local geographic database if no Google predictions
        const townResults = await communityApi.searchTowns(query);
        if (!active) return;

        if (townResults && townResults.length > 0) {
          const mappedTowns: DestinationOption[] = townResults.map((t) => ({
            id: t.id,
            name: t.name,
            secondary_text: [t.region_name, t.country_name || t.country_code]
              .filter(Boolean)
              .join(' • '),
            country_code: t.country_code,
            country_name: t.country_name,
            region_name: t.region_name,
          }));
          setOptions(mappedTowns);
        } else {
          setOptions([]);
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
  }, [inputValue, countryCode]);

  const handleSelectOption = async (option: DestinationOption | string | null) => {
    if (!option) {
      lastEmittedValue.current = '';
      setInputValue('');
      onChange({
        destination_name: '',
        country_code: '',
      });
      return;
    }

    if (typeof option === 'string') {
      lastEmittedValue.current = option;
      setInputValue(option);
      onChange({
        destination_name: option,
        country_code: countryCode || '',
      });
      return;
    }

    const placeName = option.name;
    lastEmittedValue.current = placeName;
    setInputValue(placeName);

    // If it's a Google Place, resolve it to get accurate country code, coords & place_id
    if (option.google_place_id) {
      // Immediate callback with what we have
      onChange({
        destination_name: placeName,
        country_code: option.country_code || countryCode || '',
        google_place_id: option.google_place_id,
      });

      try {
        const placeDetails = await placesApi.resolvePlace(option.google_place_id, 'ca');
        if (placeDetails) {
          onChange({
            destination_name: placeDetails.name || placeName,
            country_code: placeDetails.country_code || option.country_code || countryCode || '',
            place_id: placeDetails.id,
            google_place_id: option.google_place_id,
            latitude: placeDetails.latitude,
            longitude: placeDetails.longitude,
          });
        }
      } catch {
        // Keep initial details on resolution failure
      }
    } else {
      onChange({
        destination_name: placeName,
        country_code: option.country_code || countryCode || '',
        town_id: option.id,
        region_id: option.region_name,
      });
    }
  };

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      freeSolo
      filterOptions={(x) => x} // Disable client-side filtering since server already filtered
      value={value || ''}
      inputValue={inputValue}
      onInputChange={(_, newInputValue, reason) => {
        setInputValue(newInputValue);
        if (reason === 'input') {
          lastEmittedValue.current = newInputValue;
          onChange({
            destination_name: newInputValue,
            country_code: countryCode || '',
            town_id: undefined,
            place_id: undefined,
            google_place_id: undefined,
          });
        }
      }}
      onChange={(_, newValue) => {
        handleSelectOption(newValue);
      }}
      options={options}
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option;
        return option.name || '';
      }}
      isOptionEqualToValue={(option, val) => {
        if (!option || !val) return false;
        if (typeof val === 'string') {
          return option.name.toLowerCase() === (val as string).toLowerCase();
        }
        const valObj = val as DestinationOption;
        return (
          Boolean(option.google_place_id && option.google_place_id === valObj.google_place_id) ||
          Boolean(option.id && option.id === valObj.id) ||
          option.name.toLowerCase() === (valObj.name || '').toLowerCase()
        );
      }}
      loading={loading}
      disabled={disabled}
      noOptionsText={inputValue.length < 2 ? 'Escriu almenys 2 caràcters' : 'Sense resultats trobats'}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props;
        return (
          <Box
            component="li"
            key={option.google_place_id || option.id || option.name}
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
            <LocationOnIcon sx={{ color: '#C85A32', fontSize: 20, flexShrink: 0 }} />
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#2C221E' }}>
                {option.name}
              </Typography>
              {option.secondary_text && (
                <Typography variant="caption" sx={{ color: '#786C65', display: 'block' }} noWrap>
                  {option.secondary_text}
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
