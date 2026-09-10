import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Checkbox, HelperText, IconButton, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { usePostTripStore } from '../store';
import { TripPhoto } from '../types';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      tripId?: string;
      tripTitle?: string;
    };
  };
}

export default function TripGalleryScreen({ navigation, route }: Props) {
  const tripId = route?.params?.tripId || '';
  const tripTitle = route?.params?.tripTitle || 'Viatge';

  const {
    photos,
    isLoading,
    isUploadingPhoto,
    error,
    fetchPhotos,
    addPhoto,
    togglePhotoFeatured,
    deletePhoto,
    clearError,
  } = usePostTripStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [caption, setCaption] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    if (tripId) {
      fetchPhotos(tripId);
    }
  }, [tripId, fetchPhotos]);

  const onRefresh = () => {
    if (tripId) {
      fetchPhotos(tripId);
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

  const handleRemoveSelectedImage = () => {
    setSelectedImageUri(null);
    setSelectedImageBase64(null);
  };

  const handleOpenAddModal = () => {
    clearError();
    setImageUrl('');
    setSelectedImageUri(null);
    setSelectedImageBase64(null);
    setCaption('');
    setLocationName('');
    setIsFeatured(false);
    setModalVisible(true);
  };

  const handleSavePhoto = async () => {
    const finalImage = selectedImageBase64 || imageUrl.trim();
    if (!finalImage) {
      Alert.alert('Camp obligatori', 'Fes una foto amb la càmera, tria-la de la galeria o indica un URL.');
      return;
    }
    try {
      await addPhoto(tripId, {
        image_url: finalImage,
        caption: caption.trim() || undefined,
        location_name: locationName.trim() || undefined,
        is_featured: isFeatured,
      });
      setModalVisible(false);
      setImageUrl('');
      setSelectedImageUri(null);
      setSelectedImageBase64(null);
      setCaption('');
      setLocationName('');
      setIsFeatured(false);
    } catch {
      // Error handled by store
    }
  };

  const handleToggleFeatured = async (photo: TripPhoto) => {
    try {
      await togglePhotoFeatured(tripId, photo.id);
    } catch {
      // Error handled by store
    }
  };

  const handleDeletePhoto = (photo: TripPhoto) => {
    Alert.alert(
      'Eliminar foto',
      'Vols eliminar aquesta fotografia de l’àlbum del viatge?',
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePhoto(tripId, photo.id);
            } catch {
              // Error handled by store
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Tornar</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text variant="titleMedium" style={styles.headerTitle}>
            🖼️ Àlbum del Viatge
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {tripTitle}
          </Text>
        </View>
        <View style={styles.headerRightBadge}>
          <Text style={styles.headerBadgeText}>
            {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
          </Text>
        </View>
      </View>

      {error ? (
        <HelperText type="error" visible style={{ paddingHorizontal: 16 }}>
          {error}
        </HelperText>
      ) : null}

      {isLoading && photos.length === 0 ? (
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
          {photos.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Text style={{ fontSize: 44, marginBottom: 12 }}>📷</Text>
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  Encara no hi ha fotos a l'àlbum
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtitle}>
                  Afegeix fotos dels teus records i marca-les com a destacades per al teu reportatge 9:16 de Stories.
                </Text>
                <Button
                  mode="contained"
                  buttonColor="#C85A32"
                  onPress={() => handleOpenAddModal()}
                  style={{ marginTop: 16 }}
                >
                  Afegir primera foto
                </Button>
              </Card.Content>
            </Card>
          ) : (
            <View style={styles.grid}>
              {photos.map((photo) => (
                <View key={photo.id} style={styles.photoItem}>
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: photo.image_url }} style={styles.photoImage} />
                    {photo.is_featured && (
                      <View style={styles.featuredBadge}>
                        <Text style={styles.featuredBadgeText}>⭐ Destacada</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.starBtn}
                      activeOpacity={0.8}
                      onPress={() => handleToggleFeatured(photo)}
                    >
                      <Text style={styles.starIcon}>{photo.is_featured ? '⭐' : '☆'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.photoInfo}>
                    <Text style={styles.photoCaption} numberOfLines={1}>
                      {photo.caption || 'Sense títol'}
                    </Text>
                    {photo.location_name ? (
                      <Text style={styles.photoLocation} numberOfLines={1}>
                        📍 {photo.location_name}
                      </Text>
                    ) : null}

                    <View style={styles.photoActionsRow}>
                      <TouchableOpacity
                        style={styles.actionLink}
                        onPress={() => handleToggleFeatured(photo)}
                      >
                        <Text style={styles.actionLinkText}>
                          {photo.is_featured ? 'Treure destacada' : 'Destacar'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteLink}
                        onPress={() => handleDeletePhoto(photo)}
                      >
                        <Text style={styles.deleteLinkText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB to Add Photo */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => handleOpenAddModal()}
      >
        <Text style={styles.fabIcon}>📷 +</Text>
      </TouchableOpacity>

      {/* Add Photo Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text variant="titleMedium" style={styles.modalTitle}>
              📸 Afegir foto a l'àlbum
            </Text>

            {selectedImageUri ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImageUri }} style={styles.selectedImagePreview} resizeMode="cover" />
                <View style={styles.imageActionRow}>
                  <Text style={styles.imageBadge}>✓ Imatge seleccionada</Text>
                  <TouchableOpacity onPress={handleRemoveSelectedImage} style={styles.removeImageBtn}>
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
                    Fer foto
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
                  label="O introdueix URL d'imatge"
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
              label="Peu de foto (caption)"
              placeholder="Ex: Trobada al barri de Yanaka"
              value={caption}
              onChangeText={setCaption}
              mode="outlined"
              outlineColor="#E8E2D9"
              activeOutlineColor="#C85A32"
              style={styles.input}
            />

            <TextInput
              label="Ubicació (ex: Shibuya Crossing, Kyoto...)"
              placeholder="Ex: Tòquio / Shibuya"
              value={locationName}
              onChangeText={setLocationName}
              mode="outlined"
              outlineColor="#E8E2D9"
              activeOutlineColor="#C85A32"
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsFeatured(!isFeatured)}
              activeOpacity={0.7}
            >
              <Checkbox
                status={isFeatured ? 'checked' : 'unchecked'}
                color="#C85A32"
                onPress={() => setIsFeatured(!isFeatured)}
              />
              <Text style={styles.checkboxLabel}>
                ⭐ Marcar com a destacada (apareixerà a Stories 9:16)
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtonsRow}>
              <Button
                mode="outlined"
                textColor="#786C65"
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={isUploadingPhoto}
              >
                Cancel·lar
              </Button>
              <Button
                mode="contained"
                buttonColor="#C85A32"
                style={styles.modalSubmitBtn}
                loading={isUploadingPhoto}
                disabled={isUploadingPhoto}
                onPress={handleSavePhoto}
              >
                Pujar foto 🚀
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width } = Dimensions.get('window');
const itemWidth = (width - 42) / 2;

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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#2C221E',
  },
  headerSub: {
    fontSize: 11,
    color: '#786C65',
  },
  headerRightBadge: {
    backgroundColor: '#F4ECE1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#703817',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  photoItem: {
    width: itemWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    overflow: 'hidden',
    marginBottom: 10,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 130,
    backgroundColor: '#E8E2D9',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  featuredBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(200, 90, 50, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  starBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(44, 34, 30, 0.7)',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 14,
  },
  photoInfo: {
    padding: 8,
  },
  photoCaption: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C221E',
    marginBottom: 2,
  },
  photoLocation: {
    fontSize: 10,
    color: '#786C65',
    marginBottom: 6,
  },
  photoActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FAF7F2',
    paddingTop: 6,
    marginTop: 2,
  },
  actionLink: {
    paddingVertical: 2,
  },
  actionLinkText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C85A32',
  },
  deleteLink: {
    padding: 2,
  },
  deleteLinkText: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#C85A32',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#C85A32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: '#2C221E',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#786C65',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#2C221E',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#786C65',
    marginBottom: 8,
  },
  presetsRow: {
    marginBottom: 12,
  },
  presetThumb: {
    marginRight: 10,
    width: 80,
    alignItems: 'center',
  },
  presetImg: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E8E2D9',
  },
  presetLabel: {
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#4A3E39',
    flex: 1,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    borderColor: '#E8E2D9',
  },
  modalSubmitBtn: {
    borderRadius: 8,
  },
});
