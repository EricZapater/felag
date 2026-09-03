import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
  const [filterType, setFilterType] = useState<'all' | 'popular' | 'active'>('all');

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
    if (filterType === 'popular') {
      return (item.recommendations_count || 0) > 0;
    }
    return true;
  });

  const renderDestinationCard = ({ item }: { item: DestinationSummary }) => {
    const hasActiveFelagis = (item.active_felagis_count || 0) > 0;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('DestinationDetail', { destinationId: item.id || item.name })}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.titleArea}>
                <View style={styles.destNameRow}>
                  <Text style={styles.destIcon}>
                    {item.type === 'country' ? '🌐' : '📍'}
                  </Text>
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
              <View style={styles.recBadge}>
                <Text style={styles.recBadgeText}>
                  💡 {item.recommendations_count || 0} consells
                </Text>
              </View>

              {hasActiveFelagis ? (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>
                    {item.active_felagis_count} FELAGIS ara
                  </Text>
                </View>
              ) : (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>🌍 Comunitat activa</Text>
                </View>
              )}
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
          Guia de Destins 🗺️
        </Text>
        <Text variant="bodySmall" style={styles.headerSubtitle}>
          Descobreix racons, gastronomia i consells de la comunitat FELAG
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
            selected={filterType === 'active'}
            onPress={() => setFilterType('active')}
            style={[styles.chip, filterType === 'active' && styles.chipActive]}
            textStyle={[styles.chipText, filterType === 'active' && styles.chipTextActive]}
          >
            🔥 Amb FELAGIS ara
          </Chip>
          <Chip
            selected={filterType === 'popular'}
            onPress={() => setFilterType('popular')}
            style={[styles.chip, filterType === 'popular' && styles.chipActive]}
            textStyle={[styles.chipText, filterType === 'popular' && styles.chipTextActive]}
          >
            💎 Amb recomanacions
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
                  ? `No s'han trobat ciutats que coincideixin amb "${searchQuery}".`
                  : 'No hi ha destinacions disponibles ara mateix.'}
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
  },
  headerTitle: {
    fontWeight: '800',
    color: '#2C221E',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: '#6B5E57',
    marginTop: 2,
    marginBottom: 12,
  },
  searchbar: {
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    elevation: 0,
    marginBottom: 10,
  },
  searchInput: {
    fontSize: 14,
    color: '#2C221E',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    backgroundColor: '#FAF7F2',
    borderColor: '#E8E2D9',
    borderWidth: 1,
    height: 32,
  },
  chipActive: {
    backgroundColor: '#C85A32',
    borderColor: '#C85A32',
  },
  chipText: {
    fontSize: 12,
    color: '#6B5E57',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginBottom: 12,
    elevation: 1,
  },
  cardContent: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleArea: {
    flex: 1,
  },
  destNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  destIcon: {
    fontSize: 16,
  },
  destName: {
    fontWeight: '800',
    color: '#2C221E',
  },
  countryCodeBadge: {
    backgroundColor: '#F0EBE3',
    color: '#703817',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  destRegion: {
    fontSize: 12,
    color: '#6B5E57',
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 22,
    color: '#C85A32',
    fontWeight: '700',
    marginLeft: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recBadge: {
    backgroundColor: '#FDF7F4',
    borderColor: '#F1DDD6',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recBadgeText: {
    color: '#C85A32',
    fontSize: 12,
    fontWeight: '700',
  },
  liveBadge: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFE082',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E65100',
  },
  liveBadgeText: {
    color: '#E65100',
    fontSize: 12,
    fontWeight: '700',
  },
  inactiveBadge: {
    backgroundColor: '#F4ECE1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inactiveBadgeText: {
    color: '#703817',
    fontSize: 11,
    fontWeight: '600',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C221E',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B5E57',
    textAlign: 'center',
  },
});
