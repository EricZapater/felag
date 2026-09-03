import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { ActiveTripHubResponse } from '../types';

interface Props {
  data: ActiveTripHubResponse;
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export default function ActiveTripHubCard({ data, navigation }: Props) {
  if (!data.has_active_trip || !data.trip_id) {
    return null;
  }

  const tripId = data.trip_id;
  const destination = data.destination_name || 'Destinació';
  const flag = data.country_flag || '';
  const currentDay = data.current_day || 1;
  const totalDays = data.total_days || 1;
  const photosCount = data.photos_count || 0;
  const isFinal = data.is_final_day_or_past;

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        {/* Top Header */}
        <View style={styles.badgeRow}>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>⚡ VIATGE EN CURS</Text>
          </View>
          {isFinal && (
            <View style={styles.finalBadge}>
              <Text style={styles.finalBadgeText}>✨ DIA FINAL</Text>
            </View>
          )}
        </View>

        <Text variant="titleLarge" style={styles.title} numberOfLines={1}>
          {data.trip_title || `${destination} ${flag}`}
        </Text>

        <Text variant="bodySmall" style={styles.subtitle}>
          {destination} {flag} • Dia {currentDay} de {totalDays}
          {data.active_felagis_count ? ` • 👥 ${data.active_felagis_count} FELAGIS a la zona` : ''}
        </Text>

        {/* 2x2 Action Grid */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridBtn}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('CelebrationCard', {
                tripId,
                tripTitle: data.trip_title,
                destinationName: data.destination_name,
              })
            }
          >
            <Text style={styles.gridIcon}>📸</Text>
            <Text style={styles.gridLabel}>Celebration Card</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridBtn}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('TripGallery', {
                tripId,
                tripTitle: data.trip_title,
              })
            }
          >
            <Text style={styles.gridIcon}>🖼️</Text>
            <Text style={styles.gridLabel}>
              Àlbum ({photosCount} {photosCount === 1 ? 'foto' : 'fotos'})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridBtn}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('LiveFeed', {
                destinationId: data.destination_name || tripId,
                destinationName: data.destination_name,
              })
            }
          >
            <Text style={styles.gridIcon}>📍</Text>
            <Text style={styles.gridLabel}>Feed en Viu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridBtn}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('TripWrapup', {
                tripId,
                tripTitle: data.trip_title,
              })
            }
          >
            <Text style={styles.gridIcon}>✨</Text>
            <Text style={styles.gridLabel}>Tancament & Ritual</Text>
          </TouchableOpacity>
        </View>

        {/* Instagram Stories Banner Preview */}
        <TouchableOpacity
          style={styles.storiesBanner}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('InstagramStories', {
              tripId,
              tripTitle: data.trip_title,
            })
          }
        >
          <View style={styles.storiesBannerText}>
            <Text style={styles.storiesBannerTitle}>Reportatge Instagram Stories 9:16 ✨</Text>
            <Text style={styles.storiesBannerSub}>Genera la targeta vertical per a xarxes</Text>
          </View>
          <View style={styles.storiesBtnBadge}>
            <Text style={styles.storiesBtnText}>📲 Stories</Text>
          </View>
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2C221E',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4A3B32',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  content: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: '#E65100',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  finalBadge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  finalBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 4,
    fontSize: 18,
  },
  subtitle: {
    color: '#E8E2D9',
    fontSize: 12,
    marginBottom: 14,
    opacity: 0.9,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  gridBtn: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  gridIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  gridLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  storiesBanner: {
    marginTop: 14,
    backgroundColor: 'rgba(200, 90, 50, 0.25)',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C85A32',
  },
  storiesBannerText: {
    flex: 1,
    marginRight: 8,
  },
  storiesBannerTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  storiesBannerSub: {
    color: '#E8E2D9',
    fontSize: 10,
    opacity: 0.85,
    marginTop: 2,
  },
  storiesBtnBadge: {
    backgroundColor: '#C85A32',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  storiesBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
