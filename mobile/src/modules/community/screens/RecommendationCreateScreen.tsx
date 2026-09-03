import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  Text,
  TextInput,
} from 'react-native-paper';
import { useCommunityStore } from '../store';
import { RecommendationCategory } from '../types';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      destinationId?: string;
      destinationName?: string;
    };
  };
}

const CATEGORIES: { id: Exclude<RecommendationCategory, 'all'>; label: string; icon: string }[] = [
  { id: 'food', label: 'Gastronomia', icon: '🍽️' },
  { id: 'hidden_gem', label: 'Racó Secret', icon: '💎' },
  { id: 'transport', label: 'Transport', icon: '🚆' },
  { id: 'practical_tip', label: 'Consell Pràctic', icon: '💡' },
  { id: 'anecdote', label: 'Anècdota', icon: '📖' },
];

export default function RecommendationCreateScreen({ navigation, route }: Props) {
  const destinationId = route?.params?.destinationId || '';
  const destinationName = route?.params?.destinationName || 'Destinació';

  const { createRecommendation, isLoading, error } = useCommunityStore();

  const [category, setCategory] = useState<Exclude<RecommendationCategory, 'all'>>('food');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async () => {
    setFormError('');
    if (!destinationId) {
      setFormError('Destinació no especificada.');
      return;
    }
    if (!title.trim()) {
      setFormError('El títol del consell o racó és obligatori.');
      return;
    }
    if (!description.trim()) {
      setFormError('La descripció és obligatòria.');
      return;
    }

    try {
      await createRecommendation(destinationId, {
        category,
        title: title.trim(),
        description: description.trim(),
        location_name: locationName.trim() ? locationName.trim() : undefined,
        image_url: imageUrl.trim() ? imageUrl.trim() : undefined,
      });

      Alert.alert(
        'Recomanació publicada! 🎉',
        'El teu consell ja és visible per a tota la comunitat FELAG.',
        [{ text: 'Genial', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      // Error handled by store
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Enrere</Text>
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.headerTitle}>
          Nou Consell / Racó
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {formError ? <HelperText type="error" visible>{formError}</HelperText> : null}
        {error ? <HelperText type="error" visible>{error}</HelperText> : null}

        <Text style={styles.destContext}>
          📍 Recomanació per a <Text style={{ fontWeight: '800' }}>{destinationName}</Text>
        </Text>

        {/* Category Picker */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Categoria *
            </Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <Chip
                    key={cat.id}
                    selected={isSelected}
                    onPress={() => setCategory(cat.id)}
                    style={[styles.catChip, isSelected && styles.catChipSelected]}
                    textStyle={[styles.catChipText, isSelected && styles.catChipTextSelected]}
                  >
                    {cat.icon} {cat.label}
                  </Chip>
                );
              })}
            </View>
          </Card.Content>
        </Card>

        {/* Details Form Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Detalls de la Recomanació
            </Text>

            <TextInput
              label="Títol del consell o racó * (màx. 120 caràcters)"
              placeholder="Ex: El millor ramen amagat a Shinjuku"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              style={styles.input}
              activeOutlineColor="#C85A32"
              mode="outlined"
            />

            <TextInput
              label="Descripció i consells pràctics * (màx. 2000 caràcters)"
              placeholder="Explica com arribar-hi, preu aproximat, trucs o recomanacions especials..."
              value={description}
              onChangeText={setDescription}
              maxLength={2000}
              multiline
              numberOfLines={4}
              style={styles.input}
              activeOutlineColor="#C85A32"
              mode="outlined"
            />

            <TextInput
              label="Ubicació / Adreça (opcional)"
              placeholder="Ex: Barri de Yanaka / Carrer Major 12"
              value={locationName}
              onChangeText={setLocationName}
              style={styles.input}
              activeOutlineColor="#C85A32"
              mode="outlined"
            />

            <TextInput
              label="URL de la Foto (opcional)"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChangeText={setImageUrl}
              style={styles.input}
              activeOutlineColor="#C85A32"
              mode="outlined"
            />
          </Card.Content>
        </Card>

        {/* Live Preview Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Vista Prèvia 👀
            </Text>
            <View style={styles.previewCard}>
              <View style={styles.previewTop}>
                <Text style={styles.previewCat}>
                  {CATEGORIES.find((c) => c.id === category)?.icon}{' '}
                  {CATEGORIES.find((c) => c.id === category)?.label}
                </Text>
                <View style={styles.previewVote}>
                  <Text style={styles.previewVoteText}>👍 0</Text>
                </View>
              </View>

              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              ) : null}

              <Text style={styles.previewTitle}>
                {title || 'Títol de la recomanació'}
              </Text>
              <Text style={styles.previewDesc}>
                {description || 'La descripció detallada del consell apareixerà aquí...'}
              </Text>

              {locationName ? (
                <Text style={styles.previewLoc}>📍 {locationName}</Text>
              ) : null}
            </View>
          </Card.Content>
        </Card>

        {/* Submit */}
        <Button
          mode="contained"
          buttonColor="#C85A32"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          style={styles.btnSubmit}
          contentStyle={{ paddingVertical: 8 }}
        >
          Publicar Consell 🚀
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F6F0',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  backText: {
    color: '#C85A32',
    fontWeight: 'bold',
    fontSize: 15,
  },
  headerTitle: {
    fontWeight: '800',
    color: '#2C221E',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  destContext: {
    fontSize: 14,
    color: '#703817',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#2C221E',
    marginBottom: 12,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    backgroundColor: '#FAF7F2',
    borderColor: '#E8E2D9',
    borderWidth: 1,
  },
  catChipSelected: {
    backgroundColor: '#C85A32',
    borderColor: '#C85A32',
  },
  catChipText: {
    color: '#6B5E57',
    fontWeight: '600',
    fontSize: 12,
  },
  catChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    padding: 12,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewCat: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C85A32',
    backgroundColor: '#FDEEE9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewVote: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewVoteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2C221E',
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginVertical: 6,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C221E',
    marginBottom: 4,
  },
  previewDesc: {
    fontSize: 12,
    color: '#6B5E57',
    lineHeight: 16,
  },
  previewLoc: {
    fontSize: 11,
    color: '#703817',
    fontWeight: '600',
    marginTop: 6,
  },
  btnSubmit: {
    borderRadius: 28,
    marginTop: 8,
  },
});
