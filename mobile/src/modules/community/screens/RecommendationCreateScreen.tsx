import React, { useState } from 'react';
import {
  ActivityIndicator,
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
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useCommunityStore } from '../store';
import { communityApi } from '../api';
import { DestinationSummary, RecommendationCategory } from '../types';

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
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedTown, setSelectedTown] = useState<{ id: string; name: string } | null>(null);
  const [townSearchQuery, setTownSearchQuery] = useState('');
  const [townSearchResults, setTownSearchResults] = useState<Array<{ id: string; name: string; country_name?: string }>>([]);
  const [formError, setFormError] = useState('');

  const handlePickImageFromGallery = async () => {
    try {
      setIsPickingImage(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permís necessari',
          'Cal concedir permís per accedir a la galeria de fotos del teu dispositiu.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Str = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setSelectedImageUri(asset.uri);
        setSelectedImageBase64(base64Str);
        setImageUrl('');
      }
    } catch (err: any) {
      Alert.alert('Error', 'No s\'ha pogut seleccionar la imatge.');
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsPickingImage(true);
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permís necessari',
          'Cal concedir permís per accedir a la càmera del teu dispositiu.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Str = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setSelectedImageUri(asset.uri);
        setSelectedImageBase64(base64Str);
        setImageUrl('');
      }
    } catch (err: any) {
      Alert.alert('Error', 'No s\'ha pogut fer la foto.');
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageUri(null);
    setSelectedImageBase64(null);
  };

  const handleSearchTowns = async (text: string) => {
    setTownSearchQuery(text);
    if (text.trim().length < 2) {
      setTownSearchResults([]);
      return;
    }
    try {
      const results = await communityApi.searchDestinations(text.trim(), 10);
      setTownSearchResults(results.map((r: DestinationSummary) => ({ id: r.id, name: r.name, country_name: r.country_name })));
    } catch {
      setTownSearchResults([]);
    }
  };

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

    const finalImage = selectedImageBase64 || (imageUrl.trim() ? imageUrl.trim() : undefined);

    try {
      await createRecommendation(destinationId, {
        category,
        title: title.trim(),
        description: description.trim(),
        location_name: locationName.trim() ? locationName.trim() : undefined,
        image_url: finalImage,
        town_id: selectedTown ? selectedTown.id : undefined,
        is_public: isPublic,
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
              label="Poble o Ciutat específica (opcional)"
              placeholder="Cerca poble o ciutat..."
              value={selectedTown ? selectedTown.name : townSearchQuery}
              onChangeText={(txt) => {
                if (selectedTown) setSelectedTown(null);
                handleSearchTowns(txt);
              }}
              style={styles.input}
              activeOutlineColor="#C85A32"
              mode="outlined"
            />
            {townSearchResults.length > 0 && !selectedTown ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {townSearchResults.slice(0, 5).map((t) => (
                  <Chip
                    key={t.id}
                    onPress={() => {
                      setSelectedTown({ id: t.id, name: t.name });
                      setTownSearchResults([]);
                      setTownSearchQuery('');
                    }}
                    style={{ backgroundColor: '#FDEEE9' }}
                    textStyle={{ color: '#C85A32', fontSize: 12, fontWeight: '700' }}
                  >
                    📍 {t.name}
                  </Chip>
                ))}
              </View>
            ) : null}
            {selectedTown ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Chip
                  onClose={() => setSelectedTown(null)}
                  style={{ backgroundColor: '#C85A32' }}
                  textStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                >
                  📍 {selectedTown.name}
                </Chip>
              </View>
            ) : null}

            <TextInput
              label="Ubicació / Adreça (opcional)"
              placeholder="Ex: Barri de Yanaka / Carrer Major 12"
              value={locationName}
              onChangeText={setLocationName}
              style={styles.input}
              activeOutlineColor="#C85A32"
              mode="outlined"
            />

            {/* Photo Selection */}
            <Text variant="titleSmall" style={[styles.sectionTitle, { marginTop: 8, marginBottom: 8 }]}>
              Fotografia (opcional) 📷
            </Text>

            {selectedImageUri ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImageUri }} style={styles.selectedImagePreview} resizeMode="cover" />
                <View style={styles.imageActionRow}>
                  <Text style={styles.imageBadge}>✓ Imatge carregada</Text>
                  <TouchableOpacity onPress={handleRemoveImage} style={styles.removeImageBtn}>
                    <Text style={styles.removeImageText}>✕ Eliminar foto</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: 12 }}>
                <View style={styles.imageBtnRow}>
                  <Button
                    mode="outlined"
                    icon="camera"
                    onPress={handleTakePhoto}
                    disabled={isPickingImage}
                    textColor="#C85A32"
                    style={styles.imagePickerBtn}
                  >
                    Fer foto
                  </Button>
                  <Button
                    mode="outlined"
                    icon="image"
                    onPress={handlePickImageFromGallery}
                    disabled={isPickingImage}
                    textColor="#C85A32"
                    style={styles.imagePickerBtn}
                  >
                    Galeria
                  </Button>
                </View>
                {isPickingImage ? (
                  <ActivityIndicator size="small" color="#C85A32" style={{ marginVertical: 8 }} />
                ) : null}

                <TextInput
                  label="O introdueix URL de la imatge"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChangeText={(txt) => {
                    setImageUrl(txt);
                    if (txt) {
                      setSelectedImageUri(null);
                      setSelectedImageBase64(null);
                    }
                  }}
                  style={[styles.input, { marginTop: 8 }]}
                  activeOutlineColor="#C85A32"
                  mode="outlined"
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingVertical: 4 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontWeight: 'bold', color: '#2C221E', fontSize: 14 }}>
                  🌍 Mostrar a la guia web pública
                </Text>
                <Text style={{ color: '#786C65', fontSize: 12, marginTop: 2 }}>
                  Ajuda altres viatgers que cerquin a Google (sense mostrar el teu nom).
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                color="#C85A32"
              />
            </View>
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

              {selectedImageUri || imageUrl ? (
                <Image
                  source={{ uri: selectedImageUri || imageUrl }}
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
  imageBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  imagePickerBtn: {
    flex: 1,
    borderColor: '#C85A32',
    borderRadius: 10,
  },
  selectedImageContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    padding: 8,
  },
  selectedImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  imageActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  imageBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  removeImageBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FDEEE9',
  },
  removeImageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C85A32',
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
    height: 140,
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
