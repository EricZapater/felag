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
import { usePublicProfileStore } from '../store';
import { useChatStore } from '@/modules/chat/store';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      userId?: string;
    };
  };
}

export default function PublicProfileScreen({ navigation, route }: Props) {
  const userId = route?.params?.userId;
  const { profile, isLoading, error, fetchPublicProfile } = usePublicProfileStore();
  const { createOrGetConversation } = useChatStore();

  useEffect(() => {
    if (userId) {
      fetchPublicProfile(userId);
    }
  }, [userId, fetchPublicProfile]);

  const onRefresh = () => {
    if (userId) {
      fetchPublicProfile(userId);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return '';
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startStr = start.toLocaleDateString('ca-ES', { day: 'numeric' });
      const endStr = end.toLocaleDateString('ca-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return `${startStr}–${endStr}`;
    } catch {
      return `${startDate} – ${endDate}`;
    }
  };

  const handleOpenChat = async () => {
    if (!userId || !profile) return;
    try {
      const conv = await createOrGetConversation(userId);
      navigation.navigate('ChatRoom', {
        conversationId: conv.id,
        otherParticipant: conv.other_participant,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No s’ha pogut obrir el xat.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.appHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>‹ Enrere</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil de FELAGI</Text>
        <View style={{ width: 60 }} />
      </View>

      {error ? (
        <HelperText type="error" visible style={{ paddingHorizontal: 16 }}>
          {error}
        </HelperText>
      ) : null}

      {isLoading && !profile ? (
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
          {profile && (
            <>
              {/* Profile Main Box */}
              <View style={styles.profileBox}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
                  </View>
                )}

                <Text style={styles.name}>{profile.name}</Text>

                {profile.origin_summary ? (
                  <View style={styles.badgeTownContainer}>
                    <Text style={styles.badgeTownText}>📍 {profile.origin_summary}</Text>
                  </View>
                ) : null}

                {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

                <Button
                  mode="contained"
                  buttonColor="#C85A32"
                  textColor="#FFFFFF"
                  style={styles.btnChat}
                  labelStyle={styles.btnChatLabel}
                  onPress={handleOpenChat}
                >
                  Obrir Xat 💬
                </Button>
              </View>

              {/* Public Trips Section */}
              <Text style={styles.sectionTitle}>Viatges públics</Text>

              {profile.public_trips && profile.public_trips.length > 0 ? (
                profile.public_trips.map((trip) => (
                  <View key={trip.id} style={styles.tripCard}>
                    <View style={styles.tripRow}>
                      <View style={styles.tripMain}>
                        <Text style={styles.tripDest}>{trip.title}</Text>
                        {trip.destination_summary ? (
                          <Text style={styles.tripSubDest}>📍 {trip.destination_summary}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.tripDate}>
                        {formatDateRange(trip.start_date, trip.end_date)}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Card style={styles.emptyTripsCard}>
                  <Card.Content style={styles.emptyTripsContent}>
                    <Text variant="bodySmall" style={styles.emptyTripsText}>
                      Aquest usuari encara no té viatges públics registrats.
                    </Text>
                  </Card.Content>
                </Card>
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
  appHeader: {
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
  backBtnText: {
    color: '#C85A32',
    fontWeight: '600',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C221E',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#4A2E2B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F4ECE1',
    borderWidth: 2,
    borderColor: '#C85A32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#C85A32',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#703817',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C221E',
    marginBottom: 6,
    textAlign: 'center',
  },
  badgeTownContainer: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  badgeTownText: {
    color: '#E65100',
    fontSize: 11,
    fontWeight: '700',
  },
  bio: {
    fontSize: 13,
    color: '#4A3E39',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  btnChat: {
    borderRadius: 20,
    paddingHorizontal: 8,
  },
  btnChatLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#786C65',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripMain: {
    flex: 1,
    marginRight: 8,
  },
  tripDest: {
    fontWeight: '700',
    fontSize: 14,
    color: '#2C221E',
  },
  tripSubDest: {
    fontSize: 12,
    color: '#786C65',
    marginTop: 2,
  },
  tripDate: {
    color: '#786C65',
    fontSize: 11,
    fontWeight: '500',
  },
  emptyTripsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    borderRadius: 12,
  },
  emptyTripsContent: {
    padding: 16,
    alignItems: 'center',
  },
  emptyTripsText: {
    color: '#786C65',
    fontStyle: 'italic',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
