import React, { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Chip, HelperText, IconButton, Text } from 'react-native-paper';
import { useTripsStore } from '../store';
import { Trip, TripFilter } from '../types';
import { usePostTripStore } from '@/modules/posttrip/store';
import ActiveTripHubCard from '@/modules/posttrip/components/ActiveTripHubCard';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack?: () => void;
  };
}

export default function TripsListScreen({ navigation }: Props) {
  const { trips, isLoading, error, filter, setFilter, fetchTrips } = useTripsStore();
  const { activeHub, fetchActiveHub } = usePostTripStore();

  useEffect(() => {
    fetchTrips();
    fetchActiveHub().catch(() => {});
  }, [fetchTrips, fetchActiveHub]);

  const onRefresh = () => {
    fetchTrips();
    fetchActiveHub().catch(() => {});
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('ca-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'Públic';
      case 'contacts_only':
        return 'Contactes';
      case 'private':
        return 'Privat';
      default:
        return visibility;
    }
  };

  const getVisibilityBadgeStyle = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'contacts_only':
        return { bg: '#FFF3E0', text: '#E65100' };
      case 'private':
        return { bg: '#ECEFF1', text: '#455A64' };
      default:
        return { bg: '#F4ECE1', text: '#703817' };
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const { upcomingTrips, pastTrips } = useMemo(() => {
    const upcoming: Trip[] = [];
    const past: Trip[] = [];

    trips.forEach((trip) => {
      if (trip.end_date < todayStr || trip.status === 'completed') {
        past.push(trip);
      } else {
        upcoming.push(trip);
      }
    });

    return { upcomingTrips: upcoming, pastTrips: past };
  }, [trips, todayStr]);

  const renderStagesSummary = (trip: Trip) => {
    if (!trip.stages || trip.stages.length === 0) {
      return 'Sense etapes definides';
    }
    const names = trip.stages
      .slice()
      .sort((a, b) => a.stage_order - b.stage_order)
      .map((s) => s.destination_name)
      .join(' ➔ ');
    const count = trip.stages.length;
    return `📍 ${names} (${count} ${count === 1 ? 'etapa' : 'etapes'})`;
  };

  const renderTripCard = (trip: Trip, isPast = false) => {
    const badge = getVisibilityBadgeStyle(trip.visibility);
    return (
      <TouchableOpacity
        key={trip.id}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
      >
        <Card style={[styles.card, isPast && styles.pastCard]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="titleMedium" style={styles.tripTitle} numberOfLines={1}>
                {trip.title}
              </Text>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>
                  {getVisibilityLabel(trip.visibility)}
                </Text>
              </View>
            </View>

            <Text variant="bodySmall" style={styles.dates}>
              📅 {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
            </Text>

            <View style={styles.stagesSummaryBox}>
              <Text variant="bodySmall" style={styles.stagesText} numberOfLines={2}>
                {renderStagesSummary(trip)}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Els meus viatges
        </Text>
        <IconButton
          icon="plus"
          mode="contained"
          containerColor="#C85A32"
          iconColor="#FFFFFF"
          size={22}
          onPress={() => navigation.navigate('TripCreate')}
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['all', 'upcoming', 'past'] as TripFilter[]).map((f) => (
          <Chip
            key={f}
            selected={filter === f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.selectedChip]}
            textStyle={[styles.chipText, filter === f && styles.selectedChipText]}
          >
            {f === 'all' ? 'Tots' : f === 'upcoming' ? 'Propers' : 'Passats'}
          </Chip>
        ))}
      </View>

      {error ? (
        <HelperText type="error" visible style={{ paddingHorizontal: 16 }}>
          {error}
        </HelperText>
      ) : null}

      {isLoading && trips.length === 0 ? (
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
          {activeHub && activeHub.has_active_trip && (
            <ActiveTripHubCard data={activeHub} navigation={navigation} />
          )}

          {trips.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>✈️</Text>
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  No tens cap viatge registrat
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtitle}>
                  Crea el teu primer viatge per afegir etapes i descobrir coincidències amb altres viatgers.
                </Text>
                <Button
                  mode="contained"
                  buttonColor="#C85A32"
                  onPress={() => navigation.navigate('TripCreate')}
                  style={{ marginTop: 16 }}
                >
                  Crear viatge
                </Button>
              </Card.Content>
            </Card>
          ) : filter === 'upcoming' ? (
            <View>
              <Text style={styles.sectionHeader}>Propers i en curs ({upcomingTrips.length})</Text>
              {upcomingTrips.length === 0 ? (
                <Text style={styles.emptySectionText}>No hi ha viatges propers.</Text>
              ) : (
                upcomingTrips.map((t) => renderTripCard(t, false))
              )}
            </View>
          ) : filter === 'past' ? (
            <View>
              <Text style={styles.sectionHeader}>Passats ({pastTrips.length})</Text>
              {pastTrips.length === 0 ? (
                <Text style={styles.emptySectionText}>No hi ha viatges passats.</Text>
              ) : (
                pastTrips.map((t) => renderTripCard(t, true))
              )}
            </View>
          ) : (
            <>
              {upcomingTrips.length > 0 && (
                <View>
                  <Text style={styles.sectionHeader}>Propers i en curs</Text>
                  {upcomingTrips.map((t) => renderTripCard(t, false))}
                </View>
              )}

              {pastTrips.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.sectionHeader}>Passats</Text>
                  {pastTrips.map((t) => renderTripCard(t, true))}
                </View>
              )}
            </>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#C85A32',
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9F6F0',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
  },
  selectedChip: {
    backgroundColor: '#C85A32',
  },
  chipText: {
    color: '#4A3E39',
    fontSize: 12,
  },
  selectedChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#786C65',
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  emptySectionText: {
    color: '#786C65',
    fontStyle: 'italic',
    marginBottom: 16,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  pastCard: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tripTitle: {
    fontWeight: 'bold',
    color: '#2C221E',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dates: {
    color: '#786C65',
    marginBottom: 10,
  },
  stagesSummaryBox: {
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  stagesText: {
    color: '#4A3E39',
    fontSize: 12,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  emptySubtitle: {
    color: '#786C65',
    textAlign: 'center',
    lineHeight: 18,
  },
});
