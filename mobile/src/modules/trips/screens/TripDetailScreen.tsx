import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Divider, HelperText, Text } from 'react-native-paper';
import { useTripsStore } from '../store';
import { Trip } from '../types';

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
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (tripId) {
      fetchTripById(tripId);
    }
  }, [tripId, fetchTripById]);

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
                      <View key={stage.id || stage.stage_order} style={styles.stageItem}>
                        <Text style={styles.stageTitle}>
                          {stage.stage_order}. {stage.destination_name}
                          {stage.country_code ? ` (${stage.country_code})` : ''}
                        </Text>
                        <Text style={styles.stageDates}>
                          {formatDate(stage.start_date)} – {formatDate(stage.end_date)} ({stageDays}{' '}
                          {stageDays === 1 ? 'dia' : 'dies'})
                        </Text>
                        {stage.notes ? (
                          <Text style={styles.stageNotes}>💬 {stage.notes}</Text>
                        ) : null}
                      </View>
                    );
                  })
              ) : (
                <Text style={styles.emptyStages}>Cap etapa definida.</Text>
              )}

              {trip.visibility === 'public' && (
                <View style={styles.matchingBox}>
                  <Text style={styles.matchingTitle}>✨ Matching actiu (Fase 3)</Text>
                  <Text style={styles.matchingSub}>
                    T'avisarem automàticament quan altres viatgers de la teva terra coincideixin amb tu en aquestes destinacions.
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actions}>
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
          </View>
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
  stageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C221E',
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
  matchingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#703817',
    marginBottom: 4,
  },
  matchingSub: {
    fontSize: 11,
    color: '#8C7A70',
    lineHeight: 16,
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
