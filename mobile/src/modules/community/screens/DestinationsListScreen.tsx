import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, Chip, Searchbar, Text } from 'react-native-paper';
import { useCommunityStore } from '../store';
import { DestinationSummary } from '../types';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export default function DestinationsListScreen({ navigation }: Props) {
  const { destinations, searchDestinations, isLoading, error } = useCommunityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'trips' | 'active'>('all');

  useEffect(() => {
    searchDestinations('');
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await searchDestinations(searchQuery);
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchDestinations(query);
  };

  const filteredDestinations = destinations.filter((item) => {
    if (filterType === 'active') {
      return (item.active_felagis_count || 0) > 0;
    }
    if (filterType === 'trips') {
      return (item.public_trips_count || 0) > 0;
    }
    return true;
  });

  const renderDestinationCard = ({ item }: { item: DestinationSummary }) => {
    const hasActiveFelagis = (item.active_felagis_count || 0) > 0;
    const tripsCount = item.public_trips_count || 0;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('DestinationDetail', { destinationId: item.id || item.name })}
        style={styles.cardTouchable}
      >
        <Card style={styles.card}>
          {item.banner_url ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: item.banner_url }} style={styles.cardImage} />
              <View style={styles.flagOverlay}>
                <Text style={styles.flagEmojiText}>{item.flag_emoji || '🗺️'}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.fallbackHeader}>
              <Text style={styles.fallbackFlag}>{item.flag_emoji || '🗺️'}</Text>
            </View>
          )}

          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.titleArea}>
                <View style={styles.destNameRow}>
                  <Text variant="titleMedium" style={styles.destName}>
                    {item.name}
                  </Text>
                  {item.country_code ? (
                    <Text style={styles.countryCodeBadge}>
                      {item.country_code}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.destRegion}>
                  {[item.region_name, item.country_name].filter(Boolean).join(', ')}
                </Text>
              </View>

              <Text style={styles.arrowIcon}>›</Text>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.tripBadge}>
                <Text style={styles.tripBadgeText}>
                  ✈️ {tripsCount === 1 ? '1 viatge completat' : `${tripsCount} viatges completats`}
                </Text>
              </View>

              {hasActiveFelagis ? (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>
                    {item.active_felagis_count} FELAGIS ara
                  </Text>
                </View>
              ) : null}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Viatges de la Comunitat 🗺️
        </Text>
        <Text variant="bodySmall" style={styles.headerSubtitle}>
          Explora els itineraris i rutes reals completades pels felagis arreu del món
        </Text>

        <Searchbar
          placeholder="Cerca ciutats o països..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor="#C85A32"
        />

        {/* Quick Filter Chips */}
        <View style={styles.chipRow}>
          <Chip
            selected={filterType === 'all'}
            onPress={() => setFilterType('all')}
            style={[styles.chip, filterType === 'all' && styles.chipActive]}
            textStyle={[styles.chipText, filterType === 'all' && styles.chipTextActive]}
          >
            🌟 Tots
          </Chip>
          <Chip
            selected={filterType === 'trips'}
            onPress={() => setFilterType('trips')}
            style={[styles.chip, filterType === 'trips' && styles.chipActive]}
            textStyle={[styles.chipText, filterType === 'trips' && styles.chipTextActive]}
          >
            ✈️ Amb viatges
          </Chip>
          <Chip
            selected={filterType === 'active'}
            onPress={() => setFilterType('active')}
            style={[styles.chip, filterType === 'active' && styles.chipActive]}
            textStyle={[styles.chipText, filterType === 'active' && styles.chipTextActive]}
          >
            🔥 Amb FELAGIS ara
          </Chip>
        </View>
      </View>

      {/* Main List */}
      {isLoading && !refreshing && destinations.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#C85A32" />
        </View>
      ) : (
        <FlatList
          data={filteredDestinations}
          keyExtractor={(item) => item.id}
          renderItem={renderDestinationCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#C85A32"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🌍</Text>
              <Text style={styles.emptyTitle}>Cap destinació trobada</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `No s'han trobat destins que coincideixin amb "${searchQuery}".`
                  : 'Encara no hi ha viatges públics registrats en cap destinació.'}
              </Text>
            </View>
          }
        />
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
  },
  headerTitle: {
    fontWeight: '800',
    color: '#2C221E',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#6B5E57',
    marginTop: 2,
    marginBottom: 10,
  },
  searchbar: {
    backgroundColor: '#F9F6F0',
    borderRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    height: 44,
  },
  searchInput: {
    minHeight: 44,
    fontSize: 14,
    color: '#2C221E',
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  chip: {
    backgroundColor: '#F0EBE1',
    borderColor: '#E8E2D9',
  },
  chipActive: {
    backgroundColor: '#C85A32',
  },
  chipText: {
    color: '#6B5E57',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  cardTouchable: {
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    elevation: 2,
  },
  imageWrapper: {
    position: 'relative',
    height: 120,
    width: '100%',
    backgroundColor: '#EDE6DB',
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  flagOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  flagEmojiText: {
    fontSize: 18,
  },
  fallbackHeader: {
    height: 60,
    backgroundColor: '#F5EFE6',
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackFlag: {
    fontSize: 32,
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleArea: {
    flex: 1,
  },
  destNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  destName: {
    fontWeight: '700',
    color: '#2C221E',
    fontSize: 17,
  },
  countryCodeBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A7A70',
    backgroundColor: '#F0EBE1',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  destRegion: {
    fontSize: 13,
    color: '#786C65',
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 22,
    color: '#C85A32',
    fontWeight: '600',
    marginLeft: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  tripBadge: {
    backgroundColor: '#FFF2EB',
    borderWidth: 1,
    borderColor: '#FCD8C5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tripBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C85A32',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#43A047',
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C221E',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#786C65',
    textAlign: 'center',
    lineHeight: 20,
  },
});
