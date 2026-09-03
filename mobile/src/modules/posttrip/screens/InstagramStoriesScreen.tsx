import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, HelperText, Text } from 'react-native-paper';
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

  const {
    storiesCardData,
    isLoading,
    error,
    fetchStoriesCardData,
  } = usePostTripStore();

  useEffect(() => {
    if (tripId) {
      fetchStoriesCardData(tripId);
    }
  }, [tripId, fetchStoriesCardData]);

  const onRefresh = () => {
    if (tripId) {
      fetchStoriesCardData(tripId);
    }
  };

  const handleShareStories = async () => {
    const title = storiesCardData?.trip_title || fallbackTitle;
    const author = storiesCardData?.author_name || 'Un viatger';
    const origin = storiesCardData?.author_origin || 'Catalunya';
    const totalDays = storiesCardData?.total_days || 15;
    const felagisMet = storiesCardData?.felagis_met_count || 3;

    try {
      await Share.share({
        title: `FELAG Story — ${title}`,
        message: `✨ ${title} ✨\n👤 ${author} (${origin})\n📅 ${totalDays} dies de viatge • 👥 ${felagisMet} FELAGIS coneguts!\n\nViatja pel món, connecta amb la teva terra ✈️ https://felag.app`,
      });
    } catch (err) {
      // User cancelled share
    }
  };

  const data = storiesCardData;
  const photos = data?.featured_photos && data.featured_photos.length > 0
    ? data.featured_photos
    : FALLBACK_PHOTOS;

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
          <Text style={styles.previewSubtitle}>
            Previsualització del reportatge preparat per a Instagram & TikTok Stories:
          </Text>

          {/* 9:16 Vertical Story Card */}
          <View style={styles.storyCard}>
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
              {data?.author_name || 'Èric Zapater'} {data?.author_origin ? `• ${data.author_origin}` : '• Terrassa'}
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

            {/* 2x2 Photo Mosaic */}
            <View style={styles.mosaicGrid}>
              {photos.slice(0, 4).map((url, i) => (
                <View key={i} style={styles.mosaicItem}>
                  <Image source={{ uri: url }} style={styles.mosaicImage} />
                </View>
              ))}
            </View>

            {/* Slogan Footer */}
            <View style={styles.storyFooter}>
              <Text style={styles.storyFooterText}>
                Viatja pel món, connecta amb la teva terra
              </Text>
              <Text style={styles.storyFooterSub}>felag.app</Text>
            </View>
          </View>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.shareBtn}
            activeOpacity={0.85}
            onPress={handleShareStories}
          >
            <Text style={styles.shareBtnText}>📲 Compartir a Instagram Stories</Text>
          </TouchableOpacity>

          <Button
            mode="text"
            textColor="#786C65"
            onPress={() => navigation.navigate('TripGallery', { tripId, tripTitle: fallbackTitle })}
            style={{ marginTop: 6 }}
          >
            🖼️ Canviar fotos destacades a l'àlbum
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
  shareBtn: {
    width: cardWidth,
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
    fontSize: 15,
  },
});
