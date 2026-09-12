import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { usePostTripStore } from '../store';

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

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&auto=format&fit=crop&q=80',
];

export default function InstagramStoriesScreen({ navigation, route }: Props) {
  const tripId = route?.params?.tripId || '';
  const fallbackTitle = route?.params?.tripTitle || 'Japó: Tòquio i Kyoto';

  const cardRef = useRef<View>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPhotoCount, setSelectedPhotoCount] = useState<number>(4);

  const {
    storiesCardData,
    photos: albumPhotos,
    isLoading,
    error,
    fetchStoriesCardData,
    fetchPhotos,
  } = usePostTripStore();

  useEffect(() => {
    if (tripId) {
      fetchStoriesCardData(tripId);
      fetchPhotos(tripId);
    }
  }, [tripId, fetchStoriesCardData, fetchPhotos]);

  const onRefresh = () => {
    if (tripId) {
      fetchStoriesCardData(tripId);
      fetchPhotos(tripId);
    }
  };

  const allAvailablePhotos = Array.from(
    new Set([
      ...(storiesCardData?.featured_photos || []),
      ...(albumPhotos?.map((p) => p.image_url) || []),
      ...FALLBACK_PHOTOS,
    ])
  );

  const activePhotos = allAvailablePhotos.slice(0, selectedPhotoCount);

  // Native Image Sharing with Expo Sharing (Instagram Stories, WhatsApp, etc.)
  const handleShareStories = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Compartir Stories 9:16 — ${storiesCardData?.trip_title || fallbackTitle}`,
          UTI: 'public.png',
        });
      } else {
        Alert.alert(
          'Compartir no disponible',
          'La compartició de fitxers no està suportada en aquest dispositiu.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', 'No s’ha pogut generar la imatge per compartir.');
    } finally {
      setIsExporting(false);
    }
  };

  // Save real image to Camera Roll
  const handleSaveToGallery = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permís necessari',
          'Cal concedir permís d’accés a la galeria per desar la imatge.'
        );
        return;
      }

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(
        '📥 Desat al carret!',
        'La targeta 9:16 s’ha guardat correctament a la galeria de fotos del dispositiu.'
      );
    } catch (err: any) {
      Alert.alert('Error', 'No s’ha pogut desar la imatge a la galeria.');
    } finally {
      setIsExporting(false);
    }
  };

  const data = storiesCardData;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Tornar</Text>
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.headerTitle}>
          📱 Instagram Stories (9:16)
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {error ? (
        <HelperText type="error" visible style={{ paddingHorizontal: 16 }}>
          {error}
        </HelperText>
      ) : null}

      {isLoading && !storiesCardData ? (
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
          {/* Informative notice */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              ℹ️ <Text style={{ fontWeight: 'bold' }}>Plantilla Stories 9:16:</Text> Admet de 1 a 4 fotos per oferir un disseny net i impactant a xarxes.
            </Text>
          </View>

          {/* Layout Selector Chips */}
          <View style={styles.layoutSelectorRow}>
            {[1, 2, 3, 4].map((cnt) => (
              <TouchableOpacity
                key={cnt}
                onPress={() => setSelectedPhotoCount(cnt)}
                style={[
                  styles.layoutChip,
                  selectedPhotoCount === cnt && styles.layoutChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.layoutChipText,
                    selectedPhotoCount === cnt && styles.layoutChipTextActive,
                  ]}
                >
                  {cnt === 1 ? '1 Hero' : `${cnt} Fotos`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 9:16 Vertical Story Card (Captured as Image) */}
          <View ref={cardRef} collapsable={false} style={styles.storyCard}>
            {/* Top Bar */}
            <View style={styles.storyTop}>
              <View style={styles.brandRow}>
                <Text style={styles.storyBrand}>FELAG</Text>
                <Text style={styles.storyPlane}>✈️</Text>
              </View>
              <Text style={styles.countryFlag}>{data?.country_flag || '🇯🇵'}</Text>
            </View>

            {/* Trip Info */}
            <Text style={styles.storyTitle} numberOfLines={2}>
              {data?.trip_title || fallbackTitle}
            </Text>

            <Text style={styles.storyAuthor}>
              {data?.author_name || 'FELAGI'} {data?.author_origin ? `• ${data.author_origin}` : '• Catalunya'}
            </Text>

            {/* 3 Stats Chips */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{data?.total_days || 15}</Text>
                <Text style={styles.statLbl}>Dies</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{data?.stages_count || 2}</Text>
                <Text style={styles.statLbl}>Etapes</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{data?.felagis_met_count || 3}</Text>
                <Text style={styles.statLbl}>FELAGIS</Text>
              </View>
            </View>

            {/* Dynamic Photo Mosaic / Layout */}
            {selectedPhotoCount === 1 ? (
              <View style={styles.heroPhotoContainer}>
                <Image source={{ uri: activePhotos[0] }} style={styles.heroImage} />
              </View>
            ) : selectedPhotoCount === 2 ? (
              <View style={styles.splitPhotoContainer}>
                {activePhotos.map((url, i) => (
                  <View key={i} style={styles.splitItem}>
                    <Image source={{ uri: url }} style={styles.splitImage} />
                  </View>
                ))}
              </View>
            ) : selectedPhotoCount === 3 ? (
              <View style={styles.collagePhotoContainer}>
                <View style={styles.collageTop}>
                  <Image source={{ uri: activePhotos[0] }} style={styles.collageTopImage} />
                </View>
                <View style={styles.collageBottomRow}>
                  {activePhotos.slice(1, 3).map((url, i) => (
                    <View key={i} style={styles.collageBottomItem}>
                      <Image source={{ uri: url }} style={styles.collageBottomImage} />
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.mosaicGrid}>
                {activePhotos.slice(0, 4).map((url, i) => (
                  <View key={i} style={styles.mosaicItem}>
                    <Image source={{ uri: url }} style={styles.mosaicImage} />
                  </View>
                ))}
              </View>
            )}

            {/* Slogan Footer */}
            <View style={styles.storyFooter}>
              <Text style={styles.storyFooterText}>
                Viatja pel món, connecta amb la teva terra
              </Text>
              <Text style={styles.storyFooterSub}>felag.app</Text>
            </View>
          </View>

          {/* Action Buttons: Native Share Image + Save to Gallery */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.shareBtn}
              activeOpacity={0.85}
              disabled={isExporting}
              onPress={handleShareStories}
            >
              {isExporting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.shareBtnText}>📲 Compartir Imatge (Stories / WhatsApp)</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              activeOpacity={0.85}
              disabled={isExporting}
              onPress={handleSaveToGallery}
            >
              <Text style={styles.saveBtnText}>📥 Guardar al Carret</Text>
            </TouchableOpacity>
          </View>

          <Button
            mode="text"
            textColor="#786C65"
            onPress={() => navigation.navigate('TripGallery', { tripId, tripTitle: fallbackTitle })}
            style={{ marginTop: 6 }}
          >
            🖼️ Canviar fotos de l'àlbum
          </Button>
        </ScrollView>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = Math.min(width - 32, 360);
const mosaicItemWidth = (cardWidth - 44) / 2;

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
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSubtitle: {
    fontSize: 12,
    color: '#786C65',
    textAlign: 'center',
    marginBottom: 16,
  },
  infoBanner: {
    backgroundColor: 'rgba(200, 90, 50, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200, 90, 50, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    width: cardWidth,
  },
  infoText: {
    fontSize: 12,
    color: '#5C4339',
    lineHeight: 16,
    textAlign: 'center',
  },
  layoutSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    width: cardWidth,
  },
  layoutChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C85A32',
    backgroundColor: '#FFFFFF',
  },
  layoutChipActive: {
    backgroundColor: '#C85A32',
  },
  layoutChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C85A32',
  },
  layoutChipTextActive: {
    color: '#FFFFFF',
  },
  storyCard: {
    width: cardWidth,
    backgroundColor: '#2C221E',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#4A3B32',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  storyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storyBrand: {
    color: '#C85A32',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  storyPlane: {
    fontSize: 14,
  },
  countryFlag: {
    fontSize: 22,
  },
  storyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  storyAuthor: {
    color: '#E8E2D9',
    fontSize: 12,
    opacity: 0.85,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    color: '#FFE082',
    fontSize: 16,
    fontWeight: '800',
  },
  statLbl: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.8,
    marginTop: 2,
  },
  heroPhotoContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#4A3B32',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  splitPhotoContainer: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 14,
  },
  splitItem: {
    width: '100%',
    height: 85,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#4A3B32',
  },
  splitImage: {
    width: '100%',
    height: '100%',
  },
  collagePhotoContainer: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 14,
  },
  collageTop: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#4A3B32',
  },
  collageTopImage: {
    width: '100%',
    height: '100%',
  },
  collageBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  collageBottomItem: {
    width: mosaicItemWidth,
    height: 75,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#4A3B32',
  },
  collageBottomImage: {
    width: '100%',
    height: '100%',
  },
  mosaicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  mosaicItem: {
    width: mosaicItemWidth,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#4A3B32',
  },
  mosaicImage: {
    width: '100%',
    height: '100%',
  },
  storyFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 10,
    alignItems: 'center',
  },
  storyFooterText: {
    color: '#FFE082',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  storyFooterSub: {
    color: '#E8E2D9',
    fontSize: 9,
    opacity: 0.7,
    marginTop: 2,
  },
  actionsContainer: {
    width: cardWidth,
    gap: 10,
  },
  shareBtn: {
    width: '100%',
    backgroundColor: '#C85A32',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#C85A32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  saveBtn: {
    width: '100%',
    backgroundColor: '#2C221E',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
