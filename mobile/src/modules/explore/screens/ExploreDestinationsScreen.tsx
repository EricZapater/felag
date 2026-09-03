import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, HelperText, Text, TextInput } from 'react-native-paper';
import { useExploreStore } from '../store';
import { ExploreDestinationItem } from '../types';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack?: () => void;
  };
}

const FALLBACK_DESTINATIONS: ExploreDestinationItem[] = [
  {
    id: 'tokyo',
    name: 'Tòquio',
    region_name: 'Regió de Kantō',
    country_name: 'Japó',
    country_code: 'JP',
    flag_emoji: '🇯🇵',
    banner_url:
      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80',
    total_recommendations: 24,
    active_felagis_count: 8,
    affinity_reason: 'Molt popular entre viatgers de Terrassa i Vallès Occidental',
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    region_name: 'Regió de Kansai',
    country_name: 'Japó',
    country_code: 'JP',
    flag_emoji: '🇯🇵',
    banner_url:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop&q=80',
    total_recommendations: 18,
    active_felagis_count: 4,
    affinity_reason: 'Preferit pels amants de la cultura i temples tradicionals',
  },
  {
    id: 'reykjavik',
    name: 'Reykjavík',
    region_name: 'Regió de la Capital',
    country_name: 'Islàndia',
    country_code: 'IS',
    flag_emoji: '🇮🇸',
    banner_url:
      'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=600&auto=format&fit=crop&q=80',
    total_recommendations: 15,
    active_felagis_count: 6,
    affinity_reason: 'Ruta popular per a aurores boreals i natura salvatge',
  },
];

export default function ExploreDestinationsScreen({ navigation }: Props) {
  const { recommendations, isLoading, error, fetchRecommendations } = useExploreStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const onRefresh = () => {
    fetchRecommendations();
  };

  const rawList = recommendations.length > 0 ? recommendations : FALLBACK_DESTINATIONS;
  const filteredList = rawList.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.country_name.toLowerCase().includes(q) ||
      (item.region_name && item.region_name.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Explorar Destins 🗺️✨
        </Text>
        <TextInput
          placeholder="🔍 Cerca ciutat o país..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          outlineColor="#E8E2D9"
          activeOutlineColor="#C85A32"
          style={styles.searchInput}
          dense
        />
      </View>

      {error ? (
        <HelperText type="error" visible style={{ paddingHorizontal: 16 }}>
          {error}
        </HelperText>
      ) : null}

      {isLoading && recommendations.length === 0 ? (
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
          <Text style={styles.sectionHeading}>🏡 Destins populars (Catalunya)</Text>

          {filteredList.map((dest) => (
            <TouchableOpacity
              key={dest.id}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('DestinationDetail', {
                  destinationId: dest.name,
                  destinationName: dest.name,
                })
              }
            >
              <Card style={styles.destCard}>
                {dest.banner_url ? (
                  <Image source={{ uri: dest.banner_url }} style={styles.bannerImage} />
                ) : (
                  <View style={[styles.bannerImage, styles.bannerFallback]}>
                    <Text style={{ fontSize: 32 }}>{dest.flag_emoji || '✈️'}</Text>
                  </View>
                )}

                <Card.Content style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <Text variant="titleMedium" style={styles.destName}>
                      {dest.flag_emoji ? `${dest.flag_emoji} ` : ''}
                      {dest.name}
                    </Text>
                  </View>

                  <Text variant="bodySmall" style={styles.destSub}>
                    {dest.country_name}
                    {dest.region_name ? ` • ${dest.region_name}` : ''}
                  </Text>

                  {dest.affinity_reason ? (
                    <Text style={styles.affinityText}>🌱 {dest.affinity_reason}</Text>
                  ) : null}

                  <View style={styles.destFooter}>
                    <Text style={styles.recommendationsText}>
                      ✨ {dest.total_recommendations || 0} recomanacions
                    </Text>
                    {dest.active_felagis_count ? (
                      <View style={styles.felagisBadge}>
                        <Text style={styles.felagisBadgeText}>
                          {dest.active_felagis_count} FELAGIS
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
  },
  headerTitle: {
    color: '#C85A32',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#FAF7F2',
    fontSize: 13,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2C221E',
    marginBottom: 12,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginBottom: 14,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E8E2D9',
  },
  bannerFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  destName: {
    fontWeight: '800',
    color: '#2C221E',
  },
  destSub: {
    color: '#786C65',
    marginBottom: 6,
  },
  affinityText: {
    fontSize: 11,
    color: '#703817',
    backgroundColor: '#F4ECE1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  destFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FAF7F2',
    paddingTop: 8,
    marginTop: 2,
  },
  recommendationsText: {
    fontSize: 12,
    color: '#4A3E39',
    fontWeight: '600',
  },
  felagisBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  felagisBadgeText: {
    color: '#E65100',
    fontSize: 11,
    fontWeight: '800',
  },
});
