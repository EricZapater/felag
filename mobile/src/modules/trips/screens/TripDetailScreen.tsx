import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Avatar, Button, Card, Chip, Divider, HelperText, IconButton, Text } from 'react-native-paper';
import { useTripsStore } from '../store';
import { FelagiUserSummary, Trip } from '../types';
import { tripsApi } from '../api';
import CompanionPickerModal from '../components/CompanionPickerModal';
import { usePostTripStore } from '@/modules/posttrip/store';
import ActiveTripHubCard from '@/modules/posttrip/components/ActiveTripHubCard';

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

export default function TripDetailScreen({ navigation, route }: Props) {
  const tripId = route?.params?.tripId;
  const { currentTrip, fetchTripById, deleteTrip, isLoading, error } = useTripsStore();
  const { activeHub, fetchActiveHub } = usePostTripStore();
  const [deleting, setDeleting] = useState(false);
  const [companionPickerVisible, setCompanionPickerVisible] = useState(false);
  const [managingCompanion, setManagingCompanion] = useState(false);

  useEffect(() => {
    if (tripId) {
      fetchTripById(tripId);
      fetchActiveHub().catch(() => {});
    }
  }, [tripId, fetchTripById, fetchActiveHub]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('ca-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const calculateDays = (startStr: string, endStr: string) => {
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    } catch {
      return 1;
    }
  };

  const handleAddCompanion = async (companion: FelagiUserSummary) => {
    if (!tripId) return;
    setManagingCompanion(true);
    try {
      await tripsApi.addCompanion(tripId, companion.id);
      await fetchTripById(tripId);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'No s’ha pogut afegir l’acompanyant.');
    } finally {
      setManagingCompanion(false);
    }
  };

  const handleRemoveCompanion = (userId: string, userName: string) => {
    if (!tripId) return;
    Alert.alert(
      'Eliminar acompanyant',
      `Vols eliminar ${userName} d'aquest viatge?`,
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setManagingCompanion(true);
            try {
              await tripsApi.removeCompanion(tripId, userId);
              await fetchTripById(tripId);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'No s’ha pogut eliminar l’acompanyant.');
            } finally {
              setManagingCompanion(false);
            }
          },
        },
      ]
    );
  };

  const handleLeaveTrip = () => {
    if (!tripId) return;
    Alert.alert(
      'Sortir del viatge',
      'Estàs segur que vols sortir d’aquest viatge compartit? Ja no apareixeràs al grup.',
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Sortir',
          style: 'destructive',
          onPress: async () => {
            setManagingCompanion(true);
            try {
              const me = currentTrip?.companions?.find((c) => c.role !== 'owner');
              if (me) {
                await tripsApi.removeCompanion(tripId, me.user_id);
              }
              navigation.navigate('TripsList');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'No s’ha pogut sortir del viatge.');
              setManagingCompanion(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!tripId) return;

    Alert.alert(
      'Eliminar viatge',
      'Estàs segur que vols eliminar aquest viatge? Aquesta acció no es pot desfer.',
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteTrip(tripId);
              navigation.navigate('TripsList');
            } catch (err) {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading && !currentTrip) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#C85A32" />
      </View>
    );
  }

  const trip: Trip | null = currentTrip && currentTrip.id === tripId ? currentTrip : null;

  if (!trip && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Viatges</Text>
          </TouchableOpacity>
          <Text variant="titleMedium" style={styles.headerTitle}>
            Detall
          </Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.notFoundBox}>
          <Text variant="bodyLarge" style={{ color: '#786C65' }}>
            No s'ha pogut trobar el viatge.
          </Text>
          <Button
            mode="contained"
            buttonColor="#C85A32"
            onPress={() => navigation.navigate('TripsList')}
            style={{ marginTop: 16 }}
          >
            Tornar a la llista
          </Button>
        </View>
      </View>
    );
  }

  const totalDays = trip ? calculateDays(trip.start_date, trip.end_date) : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Viatges</Text>
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.headerTitle}>
          Detall
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {error ? (
        <HelperText type="error" visible style={{ paddingHorizontal: 16 }}>
          {error}
        </HelperText>
      ) : null}

      {trip && (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {activeHub && activeHub.has_active_trip && activeHub.trip_id === trip.id && (
            <ActiveTripHubCard data={activeHub} navigation={navigation} />
          )}

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.tripTitle}>
                {trip.title}
              </Text>

              <Text variant="bodyMedium" style={styles.tripDates}>
                📅 {formatDate(trip.start_date)} – {formatDate(trip.end_date)} ({totalDays} dies)
              </Text>

              <View style={styles.visibilityBox}>
                {trip.visibility === 'public' && (
                  <Text style={styles.visibilityPublic}>👁️ Públic (Aptat per a matching)</Text>
                )}
                {trip.visibility === 'contacts_only' && (
                  <Text style={styles.visibilityContacts}>👥 Només visible per als teus contactes</Text>
                )}
                {trip.visibility === 'private' && (
                  <Text style={styles.visibilityPrivate}>🔒 Privat (Només tu pots veure'l)</Text>
                )}
              </View>

              {trip.description ? (
                <Text variant="bodyMedium" style={styles.tripDescription}>
                  {trip.description}
                </Text>
              ) : null}

              <Text style={styles.sectionTitle}>Etapes de la ruta ({trip.stages?.length || 0})</Text>

              {trip.stages && trip.stages.length > 0 ? (
                trip.stages
                  .slice()
                  .sort((a, b) => a.stage_order - b.stage_order)
                  .map((stage) => {
                    const stageDays = calculateDays(stage.start_date, stage.end_date);
                    return (
                      <TouchableOpacity
                        key={stage.id || stage.stage_order}
                        style={styles.stageItem}
                        activeOpacity={0.7}
                        onPress={() =>
                          navigation.navigate('DestinationDetail', {
                            destinationId: stage.destination_name,
                          })
                        }
                      >
                        <View style={styles.stageHeaderRow}>
                          <Text style={styles.stageTitle}>
                            {stage.stage_order}. {stage.destination_name}
                            {stage.country_code ? ` (${stage.country_code})` : ''}
                          </Text>
                          <Text style={styles.stageExploreBtn}>Guia 🗺️ ›</Text>
                        </View>
                        <Text style={styles.stageDates}>
                          {formatDate(stage.start_date)} – {formatDate(stage.end_date)} ({stageDays}{' '}
                          {stageDays === 1 ? 'dia' : 'dies'})
                        </Text>
                        {stage.notes ? (
                          <Text style={styles.stageNotes}>💬 {stage.notes}</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
              ) : (
                <Text style={styles.emptyStages}>Cap etapa definida.</Text>
              )}

              {trip.visibility === 'public' ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('TripMatches', { tripId: trip.id })}
                  style={styles.matchingBox}
                >
                  <View style={styles.matchingHeaderRow}>
                    <Text style={styles.matchingTitle}>✨ Coincidències de viatge</Text>
                    <Text style={styles.matchingLink}>Veure ›</Text>
                  </View>
                  <Text style={styles.matchingSub}>
                    Comprova quins FELAGIS de la teva terra coincideixen amb tu en dates i destinacions.
                  </Text>
                </TouchableOpacity>
              ) : null}

              {/* Post-Trip & Memories Box */}
              <View style={styles.postTripSectionBox}>
                <Text style={styles.postTripSectionTitle}>📸 Records & Experiència Post-Trip</Text>
                <View style={styles.postTripBtnRow}>
                  <TouchableOpacity
                    style={styles.postTripBtn}
                    onPress={() =>
                      navigation.navigate('TripGallery', {
                        tripId: trip.id,
                        tripTitle: trip.title,
                      })
                    }
                  >
                    <Text style={styles.postTripBtnIcon}>🖼️</Text>
                    <Text style={styles.postTripBtnText}>Àlbum</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.postTripBtn}
                    onPress={() =>
                      navigation.navigate('CelebrationCard', {
                        tripId: trip.id,
                        tripTitle: trip.title,
                      })
                    }
                  >
                    <Text style={styles.postTripBtnIcon}>📸</Text>
                    <Text style={styles.postTripBtnText}>Celebration</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.postTripBtn}
                    onPress={() =>
                      navigation.navigate('TripWrapup', {
                        tripId: trip.id,
                        tripTitle: trip.title,
                      })
                    }
                  >
                    <Text style={styles.postTripBtnIcon}>✨</Text>
                    <Text style={styles.postTripBtnText}>Ritual</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.postTripBtn}
                    onPress={() =>
                      navigation.navigate('InstagramStories', {
                        tripId: trip.id,
                        tripTitle: trip.title,
                      })
                    }
                  >
                    <Text style={styles.postTripBtnIcon}>📱</Text>
                    <Text style={styles.postTripBtnText}>Stories</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card.Content>
          </Card>

              {/* Travel Companions Section */}
              <View style={styles.companionsSectionBox}>
                <View style={styles.companionsHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    Amb qui viatjo ({trip.companions?.length || 1})
                  </Text>
                  {trip.is_owner !== false && (
                    <Button
                      mode="text"
                      compact
                      textColor="#C85A32"
                      icon="account-plus"
                      onPress={() => setCompanionPickerVisible(true)}
                    >
                      Afegir
                    </Button>
                  )}
                </View>

                {(trip.companions || []).map((comp) => {
                  const isCreator = comp.role === 'owner';
                  return (
                    <View key={comp.id || comp.user_id} style={styles.companionItem}>
                      <Avatar.Text
                        size={32}
                        label={(comp.name || 'F').slice(0, 2).toUpperCase()}
                        style={[styles.avatar, isCreator && styles.creatorAvatar]}
                        color="#FFFFFF"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.companionName}>{comp.name || 'Felagi'}</Text>
                        <Text style={styles.companionMeta}>
                          {comp.town_name ? `📍 ${comp.town_name}` : comp.origin_summary || 'FELAGI'}
                        </Text>
                      </View>
                      <View style={styles.companionRight}>
                        <View
                          style={[
                            styles.roleBadge,
                            isCreator ? styles.creatorRoleBadge : styles.companionRoleBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleBadgeText,
                              isCreator ? styles.creatorRoleText : styles.companionRoleText,
                            ]}
                          >
                            {isCreator ? '👑 Creador' : '✈️ Acompanyant'}
                          </Text>
                        </View>
                        {trip.is_owner !== false && !isCreator && (
                          <IconButton
                            icon="close"
                            size={16}
                            iconColor="#d32f2f"
                            onPress={() => handleRemoveCompanion(comp.user_id, comp.name)}
                            style={{ margin: 0 }}
                          />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.actions}>
                {trip.is_owner !== false ? (
                  <>
                    <Button
                      mode="contained"
                      buttonColor="#C85A32"
                      onPress={() => navigation.navigate('TripCreate', { tripId: trip.id })}
                      style={styles.btnEdit}
                      contentStyle={{ paddingVertical: 6 }}
                    >
                      Editar viatge
                    </Button>

                    <Button
                      mode="text"
                      textColor="#d32f2f"
                      onPress={handleDelete}
                      loading={deleting}
                      disabled={deleting}
                      style={styles.btnDel}
                    >
                      Eliminar viatge
                    </Button>
                  </>
                ) : (
                  <Button
                    mode="contained"
                    buttonColor="#ED6C02"
                    onPress={handleLeaveTrip}
                    loading={managingCompanion}
                    disabled={managingCompanion}
                    style={styles.btnEdit}
                    contentStyle={{ paddingVertical: 6 }}
                  >
                    Sortir del viatge
                  </Button>
                )}
              </View>
            </ScrollView>
          )}

          <CompanionPickerModal
            visible={companionPickerVisible}
            onClose={() => setCompanionPickerVisible(false)}
            excludedUserIds={(trip?.companions || []).map((c) => c.user_id)}
            onSelect={handleAddCompanion}
          />
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
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  tripTitle: {
    fontWeight: 'bold',
    color: '#2C221E',
    marginBottom: 6,
  },
  tripDates: {
    color: '#786C65',
    marginBottom: 8,
  },
  visibilityBox: {
    marginBottom: 12,
  },
  visibilityPublic: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  visibilityContacts: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
  },
  visibilityPrivate: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '600',
  },
  tripDescription: {
    color: '#4A3E39',
    marginBottom: 16,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#786C65',
    marginVertical: 12,
    letterSpacing: 0.5,
  },
  stageItem: {
    backgroundColor: '#FAF7F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    padding: 12,
    marginBottom: 10,
  },
  stageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  stageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C221E',
    flex: 1,
  },
  stageExploreBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C85A32',
    backgroundColor: '#FDF7F4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1DDD6',
  },
  stageDates: {
    fontSize: 12,
    color: '#703817',
    fontWeight: '600',
    marginTop: 2,
  },
  stageNotes: {
    fontSize: 12,
    color: '#4A3E39',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyStages: {
    color: '#786C65',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  matchingBox: {
    backgroundColor: '#F4ECE1',
    borderColor: '#DDCFBF',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  matchingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#703817',
  },
  matchingLink: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#C85A32',
  },
  matchingSub: {
    fontSize: 11,
    color: '#8C7A70',
    lineHeight: 16,
  },
  postTripSectionBox: {
    marginTop: 16,
    backgroundColor: '#FAF7F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    padding: 12,
  },
  postTripSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2C221E',
    marginBottom: 10,
  },
  postTripBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  postTripBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  postTripBtnIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  postTripBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A3E39',
  },
  companionsSectionBox: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E2D9',
  },
  companionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  companionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    padding: 10,
    marginBottom: 8,
  },
  avatar: {
    backgroundColor: '#8C7A70',
    marginRight: 10,
  },
  creatorAvatar: {
    backgroundColor: '#C85A32',
  },
  companionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C221E',
  },
  companionMeta: {
    fontSize: 12,
    color: '#786C65',
    marginTop: 1,
  },
  companionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  creatorRoleBadge: {
    backgroundColor: '#FFF3E0',
  },
  companionRoleBadge: {
    backgroundColor: '#EDE7F6',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  creatorRoleText: {
    color: '#E65100',
  },
  companionRoleText: {
    color: '#512DA8',
  },
  actions: {
    marginTop: 8,
    gap: 8,
  },
  btnEdit: {
    borderRadius: 28,
  },
  btnDel: {
    marginTop: 4,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F6F0',
  },
  notFoundBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
