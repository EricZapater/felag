import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, Text } from 'react-native-paper';
import { useProfileStore } from '../store';

export default function OriginSelectorScreen({ navigation }: any) {
  const { countries, regions, towns, fetchCountries, fetchRegions, fetchTowns, updateOrigin, isLoading, error } =
    useProfileStore();

  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  const handleCountrySelect = (countryId: string) => {
    setSelectedCountry(countryId);
    setSelectedRegion('');
    setSelectedTown('');
    fetchRegions(countryId);
  };

  const handleRegionSelect = (regionId: string) => {
    setSelectedRegion(regionId);
    setSelectedTown('');
    fetchTowns(regionId);
  };

  const handleSaveOrigin = async () => {
    if (!selectedTown) return;
    try {
      await updateOrigin(selectedTown);
      setSuccessMsg('Origen guardat!');
      setTimeout(() => navigation.goBack(), 1000);
    } catch (err) {
      // Error in store
    }
  };

  const currentCountryObj = countries.find((c) => c.id === selectedCountry);
  const currentRegionObj = regions.find((r) => r.id === selectedRegion);
  const currentTownObj = towns.find((t) => t.id === selectedTown);

  const selectedPathStr =
    currentCountryObj && currentRegionObj && currentTownObj
      ? `${currentCountryObj.name} ➔ ${currentRegionObj.name} ➔ ${currentTownObj.name}`
      : 'Incomplet';

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.title}>
            On són les teves arrels?
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Selecciona el teu País, Regió i Poble de les llistes oficials.
          </Text>

          {error ? <HelperText type="error" visible>{error}</HelperText> : null}
          {successMsg ? <HelperText type="info" visible style={{ color: '#2e7d32' }}>{successMsg}</HelperText> : null}

          <Text variant="labelLarge" style={styles.label}>
            1. País d'origen
          </Text>
          <View style={styles.chipContainer}>
            {countries.map((c) => (
              <Button
                key={c.id}
                mode={selectedCountry === c.id ? 'contained' : 'outlined'}
                onPress={() => handleCountrySelect(c.id)}
                buttonColor={selectedCountry === c.id ? '#C85A32' : undefined}
                style={styles.chip}
              >
                {c.name}
              </Button>
            ))}
          </View>

          {selectedCountry ? (
            <>
              <Text variant="labelLarge" style={styles.label}>
                2. Regió / Comunitat
              </Text>
              <View style={styles.chipContainer}>
                {regions.map((r) => (
                  <Button
                    key={r.id}
                    mode={selectedRegion === r.id ? 'contained' : 'outlined'}
                    onPress={() => handleRegionSelect(r.id)}
                    buttonColor={selectedRegion === r.id ? '#C85A32' : undefined}
                    style={styles.chip}
                  >
                    {r.name}
                  </Button>
                ))}
              </View>
            </>
          ) : null}

          {selectedRegion ? (
            <>
              <Text variant="labelLarge" style={styles.label}>
                3. Poble / Ciutat
              </Text>
              <View style={styles.chipContainer}>
                {towns.map((t) => (
                  <Button
                    key={t.id}
                    mode={selectedTown === t.id ? 'contained' : 'outlined'}
                    onPress={() => setSelectedTown(t.id)}
                    buttonColor={selectedTown === t.id ? '#C85A32' : undefined}
                    style={styles.chip}
                  >
                    {t.name}
                  </Button>
                ))}
              </View>
            </>
          ) : null}

          <View style={styles.summaryCard}>
            <Text variant="labelSmall" style={{ color: '#8C7A70', textTransform: 'uppercase' }}>
              Origen seleccionat
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: '#703817', marginTop: 4 }}>
              📍 {selectedPathStr}
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleSaveOrigin}
            disabled={!selectedTown || isLoading}
            loading={isLoading}
            buttonColor="#C85A32"
            style={{ marginTop: 24 }}
          >
            Confirmar origen
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9F6F0',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
  },
  title: {
    fontWeight: 'bold',
    color: '#2C221E',
  },
  subtitle: {
    color: '#786C65',
    marginBottom: 16,
  },
  label: {
    color: '#C85A32',
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 6,
    marginBottom: 6,
  },
  summaryCard: {
    backgroundColor: '#F4ECE1',
    borderColor: '#DDCFBF',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
  },
});
