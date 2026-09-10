import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { usePostTripStore } from '../store';
import { CelebrationCard } from '../types';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      tripId?: string;
      tripTitle?: string;
      destinationName?: string;
    };
  };
}

export default function CelebrationCardScreen({ navigation, route }: Props) {
  const tripId = route?.params?.tripId || '';
  const tripTitle = route?.params?.tripTitle || 'Viatge';
  const destinationName = route?.params?.destinationName || 'Destinació';

  const {
    celebrationCards,
    isLoading,
    isCreatingCard,
    error,
    fetchCelebrationCards,
    createCelebrationCard,
    clearError,
  } = usePostTripStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [companionId, setCompanionId] = useState('user-felagi-friend-1');
  const [companionName, setCompanionName] = useState('Marc');
  const [companionTown, setCompanionTown] = useState('Sabadell');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [locationName, setLocationName] = useState('Shibuya Crossing');
  const [caption, setCaption] = useState('Ens hem trobat de casualitat!');

  useEffect(() => {
    if (tripId) {
      fetchCelebrationCards(tripId);
    }
  }, [tripId, fetchCelebrationCards]);

  const onRefresh = () => {
    if (tripId) {
      fetchCelebrationCards(tripId);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      setIsPickingImage(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permís necessari',
          'Cal concedir permís per accedir a la galeria de fotos del dispositiu.'
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
    } catch {
      Alert.alert('Error', 'No s\'ha pogut carregar la imatge de la galeria.');
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
          'Cal concedir permís per accedir a la càmera del dispositiu.'
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
    } catch {
      Alert.alert('Error', 'No s\'ha pogut fer la foto.');
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleCreateCard = async () => {
    const finalImage = selectedImageBase64 || imageUrl.trim();
    if (!finalImage || !locationName.trim()) {
      Alert.alert('Camps obligatoris', 'Cal fer/triar una foto i indicar la ubicació de la trobada.');
      return;
    }
    clearError();
    try {
      await createCelebrationCard(tripId, {
        user_2_id: companionId,
        image_url: finalImage,
        location_name: locationName.trim(),
        caption: caption.trim() || undefined,
      });
      setShowCreateForm(false);
      setSelectedImageUri(null);
      setSelectedImageBase64(null);
      setImageUrl('');
      Alert.alert('🎉 Targeta creada!', 'La teva Celebration Card s’ha generat amb èxit.');
    } catch {
      // Error handled by store
    }
  };

  const handleShareCard = async (card: CelebrationCard) => {
    try {
      const message = `🎉 ${card.title}\n${card.headline}\n${card.subheadline || ''} • ${card.location_name}\n\nCreat amb FELAG ✈️`;
      await Share.share({
        title: card.title,
        message,
        url: card.image_url,
      });
    } catch (err) {
      // User cancelled share
    }
  };

  const handleSendToChat = (card: CelebrationCard) => {
    Alert.alert(
      'Enviar al Xat',
      'Vols compartir aquesta targeta al xat amb els teus companys de viatge?',
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Anar al Xat',
          onPress: () => {
            navigation.navigate('Conversations');
          },
        },
      ]
    );
  };

  const handleSaveToGallery = () => {
    Alert.alert('📥 Guardat!', 'La Celebration Card s’ha desat correctament al teu carret.');
  };

  const activeCard: CelebrationCard | null =
    celebrationCards.length > 0 ? celebrationCards[0] : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Tornar</Text>
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.headerTitle}>
          📸 Celebration Card
        </Text>
        <TouchableOpacity
          onPress={() => setShowCreateForm(!showCreateForm)}
          style={styles.headerRightBtn}
        >
          <Text style={styles.headerRightBtnText}>
            {showCreateForm ? 'Veure' : '+ Nova'}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <HelperText type="error" visible style={{ paddingHorizontal: 16 }}>
          {error}
        </HelperText>
      ) : null}

      {isLoading && celebrationCards.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#C85A32" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              colors={['#C85A32']}
              tintColor="#C85A32"
            />
          }
        >
          {showCreateForm || celebrationCards.length === 0 ? (
            <Card style={styles.formCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.formTitle}>
                  🎉 Crear Celebration Card ("We Met! 📸")
                </Text>
                <Text style={styles.formSub}>
                  Celebra la trobada amb un altre FELAGI durant la teva aventura.
                </Text>

                {selectedImageUri ? (
                  <View style={styles.selectedImageContainer}>
                    <Image source={{ uri: selectedImageUri }} style={styles.selectedImagePreview} resizeMode="cover" />
                    <View style={styles.imageActionRow}>
                      <Text style={styles.imageBadge}>✓ Selfie / Foto a punt</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedImageUri(null);
                          setSelectedImageBase64(null);
                        }}
                        style={styles.removeImageBtn}
                      >
                        <Text style={styles.removeImageText}>✕ Canviar foto</Text>
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
                        Fer selfie / foto
                      </Button>
                      <Button
                        mode="outlined"
                        icon="image"
                        onPress={handlePickFromGallery}
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
                      label="O introdueix URL del Selfie"
                      value={imageUrl}
                      onChangeText={(txt) => {
                        setImageUrl(txt);
                        if (txt) {
                          setSelectedImageUri(null);
                          setSelectedImageBase64(null);
                        }
                      }}
                      mode="outlined"
                      outlineColor="#E8E2D9"
                      activeOutlineColor="#C85A32"
                      style={[styles.input, { marginTop: 8 }]}
                    />
                  </View>
                )}

                <TextInput
                  label="Nom del company FELAGI"
                  value={companionName}
                  onChangeText={setCompanionName}
                  mode="outlined"
                  outlineColor="#E8E2D9"
                  activeOutlineColor="#C85A32"
                  style={styles.input}
                />

                <TextInput
                  label="Poble / Ciutat d'origen del company"
                  value={companionTown}
                  onChangeText={setCompanionTown}
                  mode="outlined"
                  outlineColor="#E8E2D9"
                  activeOutlineColor="#C85A32"
                  style={styles.input}
                />

                <TextInput
                  label="Lloc de la trobada (ex: Shibuya Crossing)"
                  value={locationName}
                  onChangeText={setLocationName}
                  mode="outlined"
                  outlineColor="#E8E2D9"
                  activeOutlineColor="#C85A32"
                  style={styles.input}
                />

                <TextInput
                  label="Descripció / Comentari"
                  value={caption}
                  onChangeText={setCaption}
                  mode="outlined"
                  outlineColor="#E8E2D9"
                  activeOutlineColor="#C85A32"
                  style={styles.input}
                />

                <Button
                  mode="contained"
                  buttonColor="#C85A32"
                  style={styles.btnSubmit}
                  loading={isCreatingCard}
                  disabled={isCreatingCard}
                  onPress={handleCreateCard}
                >
                  Generar Celebration Card ✨
                </Button>
              </Card.Content>
            </Card>
          ) : (
            <View>
              {celebrationCards.map((card) => {
                const user1Name = card.user_1?.name || 'Tu';
                const user2Name = card.user_2?.name || companionName;
                const user1Town = card.user_1?.town_name || 'Terrassa';
                const user2Town = card.user_2?.town_name || companionTown;

                return (
                  <View key={card.id} style={styles.cardContainer}>
                    {/* Commemorative Celebration Card */}
                    <View style={styles.celebrationCard}>
                      <View style={styles.badgeWrap}>
                        <Text style={styles.badgeText}>🎉 ENS HEM TROBAT!</Text>
                      </View>

                      <Image source={{ uri: card.image_url }} style={styles.cardImage} />

                      <Text style={styles.cardTitle}>
                        {card.title || `${user1Name} i ${user2Name} a ${destinationName}! 🗼✨`}
                      </Text>

                      <Text style={styles.cardSub}>
                        {user1Town} 🤝 {user2Town} • {card.location_name}
                      </Text>

                      <View style={styles.cardFooter}>
                        <Text style={styles.cardFooterText}>FELAG • {destinationName}</Text>
                        <Text style={styles.cardFooterText}>
                          {new Date(card.created_at).toLocaleDateString('ca-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.btnActionsGroup}>
                      <TouchableOpacity
                        style={styles.btnPrimary}
                        activeOpacity={0.8}
                        onPress={() => handleShareCard(card)}
                      >
                        <Text style={styles.btnPrimaryText}>📲 Enviar al Xat & Compartir</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.btnSecondary}
                        activeOpacity={0.8}
                        onPress={handleSaveToGallery}
                      >
                        <Text style={styles.btnSecondaryText}>📥 Desar al Carret</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
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
    paddingVertical: 12,
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
    fontWeight: 'bold',
    color: '#2C221E',
  },
  headerRightBtn: {
    backgroundColor: '#F4ECE1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerRightBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C85A32',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    marginBottom: 24,
  },
  celebrationCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#C85A32',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#C85A32',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeWrap: {
    backgroundColor: '#FDEEE9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  badgeText: {
    color: '#C85A32',
    fontSize: 11,
    fontWeight: '800',
  },
  cardImage: {
    width: '100%',
    height: 210,
    borderRadius: 14,
    backgroundColor: '#E8E2D9',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2C221E',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#6B5E57',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardFooter: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#E8E2D9',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardFooterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C85A32',
  },
  btnActionsGroup: {
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: '#C85A32',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  btnSecondary: {
    backgroundColor: '#2C221E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  formTitle: {
    fontWeight: 'bold',
    color: '#2C221E',
    marginBottom: 4,
  },
  formSub: {
    color: '#786C65',
    fontSize: 12,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#786C65',
    marginBottom: 8,
  },
  presetsScroll: {
    marginBottom: 12,
  },
  presetCard: {
    marginRight: 10,
    width: 110,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    borderRadius: 8,
    padding: 4,
  },
  presetCardActive: {
    borderColor: '#C85A32',
    backgroundColor: '#FDEEE9',
  },
  presetImage: {
    width: 100,
    height: 70,
    borderRadius: 6,
    backgroundColor: '#E8E2D9',
  },
  presetText: {
    fontSize: 10,
    color: '#4A3E39',
    marginTop: 4,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    fontSize: 13,
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
  btnSubmit: {
    marginTop: 10,
    borderRadius: 10,
  },
});
