import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, HelperText, Text } from 'react-native-paper';
import { useMatchingStore } from '../store';
import { useTripsStore } from '@/modules/trips/store';
import { AffinityLevel, Match } from '../types';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      tripId?: string;
    };
  };
}

export default function TripMatchesScreen({ navigation, route }: Props) {
  const tripId = route?.params?.tripId;
  const { matches, isLoading, error, fetchTripMatches } = useMatchingStore();
  const { currentTrip, fetchTripById } = useTripsStore();

  useEffect(() => {
    if (tripId) {
      fetchTripMatches(tripId);
      if (!currentTrip || currentTrip.id !== tripId) {
        fetchTripById(tripId);
      }
    }
  }, [tripId, fetchTripMatches, fetchTripById]);

  const onRefresh = () => {
    if (tripId) {
      fetchTripMatches(tripId);
      fetchTripById(tripId);
    }
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

  const formatShortDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAffinityBadge = (level: AffinityLevel) => {
    switch (level) {
      case 'town':
        return {
          label: '🥇 Mateix poble',
          style: styles.badgeTown,
          textStyle: styles.badgeTownText,
        };
      case 'region':
        return {
          label: '🥈 Mateixa regió',
          style: styles.badgeRegion,
          textStyle: styles.badgeRegionText,
        };
      case 'country':
      default:
        return {
          label: '🥉 Mateix país',
          style: styles.badgeCountry,
          textStyle: styles.badgeCountryText,
        };
    }
  };

  const handleConnect = (match: Match) => {
    const firstName = match.matched_user.name.split(' ')[0];
    Alert.alert(
      `Connectar amb ${firstName}`,
      `Vols enviar una sol·licitud de connexió a ${match.matched_user.name}? Podreu xatejar i compartir plans durant la vostra estada a ${match.destination_name}.`,
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Enviar sol·licitud',
          onPress: () => {
            Alert.alert('Sol·licitud enviada!', `Hem notificat a ${firstName}.`);
          },
        },
      ]
    );
  };

  const tripTitle = currentTrip?.title || 'Viatge';
  const tripDatesText =
    currentTrip?.start_date && currentTrip?.end_date
      ? `${formatDate(currentTrip.start_date)} – ${formatDate(currentTrip.end_date)}`
      : '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Viatge</Text>
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.headerTitle}>
          Coincidències
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {error ? (
        <HelperText type="error" visible style={{ paddingHorizontal: 16 }}>
          {error}
        </HelperText>
      ) : null}

      {isLoading && matches.length === 0 ? (
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
          {/* Trip Summary Box */}
          <View style={styles.tripSummaryBox}>
            <Text style={styles.tripTitle}>{tripTitle}</Text>
            <Text style={styles.tripSub}>
              {tripDatesText ? `📅 ${tripDatesText} • ` : ''}
              {matches.length} {matches.length === 1 ? 'FELAGI coincident' : 'FELAGIS coincidents'}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>FELAGIS trobats</Text>

          {matches.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>🔍</Text>
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  Cap coincidència trobada encara
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtitle}>
                  T'avisarem automàticament per notificació push quan algun altre viatger de la teva
                  terra coincideixi amb les teves dates i destinacions.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            matches.map((match) => {
              const badge = getAffinityBadge(match.affinity_level);
              const initials = getInitials(match.matched_user.name);
              const firstName = match.matched_user.name.split(' ')[0];

              return (
                <View key={match.id} style={styles.matchCard}>
                  <View style={styles.matchTop}>
                    <View style={styles.avatarWrapper}>
                      {match.matched_user.avatar_url ? (
                        <Image
                          source={{ uri: match.matched_user.avatar_url }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                      )}
                      <View style={styles.userInfo}>
                        <Text style={styles.name}>{match.matched_user.name}</Text>
                        <Text style={styles.origin}>
                          📍 {match.matched_user.origin_summary || 'Origen desconegut'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.badge, badge.style]}>
                      <Text style={[styles.badgeText, badge.textStyle]}>{badge.label}</Text>
                    </View>
                  </View>

                  <View style={styles.explanationBox}>
                    <Text style={styles.explanationText}>✨ {match.explanation}</Text>
                  </View>

                  <Text style={styles.datesInfo}>
                    📅 {formatShortDate(match.overlap_start_date)} –{' '}
                    {formatShortDate(match.overlap_end_date)} ({match.destination_name})
                  </Text>

                  <Button
                    mode="contained"
                    buttonColor="#C85A32"
                    textColor="#FFFFFF"
                    onPress={() => handleConnect(match)}
                    style={styles.btnAction}
                    labelStyle={styles.btnActionLabel}
                  >
                    Connectar amb {firstName}
                  </Button>
                </View>
              );
            })
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backText: {
    color: '#C85A32',
    fontWeight: 'bold',
    fontSize: 15,
  },
  headerTitle: {
    color: '#2C221E',
    fontWeight: 'bold',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tripSummaryBox: {
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C221E',
  },
  tripSub: {
    fontSize: 12,
    color: '#786C65',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#786C65',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginBottom: 14,
    shadowColor: '#4A2E2B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  matchTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  avatarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F4ECE1',
    borderWidth: 2,
    borderColor: '#C85A32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#C85A32',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#703817',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C221E',
  },
  origin: {
    fontSize: 12,
    color: '#703817',
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeTown: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFE0B2',
    borderWidth: 1,
  },
  badgeTownText: {
    color: '#E65100',
  },
  badgeRegion: {
    backgroundColor: '#F4ECE1',
    borderColor: '#DDCFBF',
    borderWidth: 1,
  },
  badgeRegionText: {
    color: '#703817',
  },
  badgeCountry: {
    backgroundColor: '#EFEBE9',
    borderColor: '#D7CCC8',
    borderWidth: 1,
  },
  badgeCountryText: {
    color: '#4E342E',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  explanationBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginBottom: 10,
  },
  explanationText: {
    fontSize: 11,
    color: '#4A3E39',
    lineHeight: 16,
  },
  datesInfo: {
    fontSize: 12,
    color: '#786C65',
    marginBottom: 12,
  },
  btnAction: {
    borderRadius: 20,
  },
  btnActionLabel: {
    fontSize: 13,
    fontWeight: '600',
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
    marginTop: 10,
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
});
