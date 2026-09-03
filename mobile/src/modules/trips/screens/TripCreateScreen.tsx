import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Divider,
  HelperText,
  IconButton,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import { useTripsStore } from '../store';
import { CreateTripRequest, TripStageInput, TripVisibility } from '../types';

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

export default function TripCreateScreen({ navigation, route }: Props) {
  const tripId = route?.params?.tripId;
  const isEditing = Boolean(tripId);

  const { createTrip, updateTrip, fetchTripById, currentTrip, isLoading, error, clearError } =
    useTripsStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visibility, setVisibility] = useState<TripVisibility>('public');
  const [stages, setStages] = useState<TripStageInput[]>([]);

  // Modal for adding / editing a stage
  const [modalVisible, setModalVisible] = useState(false);
  const [stageDest, setStageDest] = useState('');
  const [stageCountry, setStageCountry] = useState('');
  const [stageStart, setStageStart] = useState('');
  const [stageEnd, setStageEnd] = useState('');
  const [stageNotes, setStageNotes] = useState('');
  const [stageModalError, setStageModalError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    clearError();
    if (isEditing && tripId) {
      if (currentTrip && currentTrip.id === tripId) {
        setTitle(currentTrip.title);
        setDescription(currentTrip.description || '');
        setStartDate(currentTrip.start_date);
        setEndDate(currentTrip.end_date);
        setVisibility(currentTrip.visibility);
        setStages(
          currentTrip.stages.map((s) => ({
            stage_order: s.stage_order,
            destination_name: s.destination_name,
            country_code: s.country_code || '',
            start_date: s.start_date,
            end_date: s.end_date,
            notes: s.notes || '',
          }))
        );
      } else {
        fetchTripById(tripId).then((t) => {
          setTitle(t.title);
          setDescription(t.description || '');
          setStartDate(t.start_date);
          setEndDate(t.end_date);
          setVisibility(t.visibility);
          setStages(
            t.stages.map((s) => ({
              stage_order: s.stage_order,
              destination_name: s.destination_name,
              country_code: s.country_code || '',
              start_date: s.start_date,
              end_date: s.end_date,
              notes: s.notes || '',
            }))
          );
        });
      }
    }
  }, [isEditing, tripId]);

  const handleOpenAddStage = () => {
    setStageDest('');
    setStageCountry('');
    setStageStart(startDate || '');
    setStageEnd(endDate || '');
    setStageNotes('');
    setStageModalError('');
    setModalVisible(true);
  };

  const handleSaveStage = () => {
    if (!stageDest.trim()) {
      setStageModalError('Cal indicar el nom de la destinació.');
      return;
    }
    if (!stageStart.trim() || !stageEnd.trim()) {
      setStageModalError('Les dates d’inici i fi de l’etapa són obligatòries.');
      return;
    }
    if (stageStart > stageEnd) {
      setStageModalError("La data d'inici de l'etapa ha de ser anterior o igual a la de fi.");
      return;
    }

    const newStage: TripStageInput = {
      stage_order: stages.length + 1,
      destination_name: stageDest.trim(),
      country_code: stageCountry.trim() ? stageCountry.trim().toUpperCase() : null,
      start_date: stageStart.trim(),
      end_date: stageEnd.trim(),
      notes: stageNotes.trim() ? stageNotes.trim() : null,
    };

    setStages([...stages, newStage]);
    setModalVisible(false);
  };

  const handleRemoveStage = (index: number) => {
    const updated = stages
      .filter((_, i) => i !== index)
      .map((s, idx) => ({ ...s, stage_order: idx + 1 }));
    setStages(updated);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!title.trim()) {
      setFormError('El títol del viatge és obligatori.');
      return;
    }
    if (!startDate.trim() || !endDate.trim()) {
      setFormError('Les dates generals del viatge són obligatòries.');
      return;
    }
    if (startDate > endDate) {
      setFormError("La data d'inici del viatge ha de ser anterior a la data de fi.");
      return;
    }
    if (stages.length === 0) {
      setFormError('Has d’afegir almenys una etapa / destinació al viatge.');
      return;
    }

    const payload: CreateTripRequest = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      start_date: startDate.trim(),
      end_date: endDate.trim(),
      visibility,
      stages: stages.map((s, idx) => ({
        stage_order: idx + 1,
        destination_name: s.destination_name,
        country_code: s.country_code || null,
        start_date: s.start_date,
        end_date: s.end_date,
        notes: s.notes || null,
      })),
    };

    try {
      if (isEditing && tripId) {
        await updateTrip(tripId, payload);
        Alert.alert('Èxit', 'Viatge actualitzat correctament!', [
          { text: 'D’acord', onPress: () => navigation.goBack() },
        ]);
      } else {
        const created = await createTrip(payload);
        Alert.alert('Èxit', 'Viatge creat correctament!', [
          {
            text: 'D’acord',
            onPress: () => navigation.navigate('TripDetail', { tripId: created.id }),
          },
        ]);
      }
    } catch (err) {
      // Error handled by store
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Enrere</Text>
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.headerTitle}>
          {isEditing ? 'Editar viatge' : 'Nou viatge'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {formError ? <HelperText type="error" visible>{formError}</HelperText> : null}
        {error ? <HelperText type="error" visible>{error}</HelperText> : null}

        {/* General Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.cardTitle}>
              Dades del viatge
            </Text>

            <TextInput
              label="Títol del viatge *"
              placeholder="Ex: Ruta per Escandinàvia"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              activeOutlineColor="#C85A32"
              mode="outlined"
            />

            <TextInput
              label="Descripció (opcional)"
              placeholder="Descriu el teu viatge..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              style={styles.input}
              activeOutlineColor="#C85A32"
              mode="outlined"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <TextInput
                  label="Data inici (AAAA-MM-DD) *"
                  placeholder="2026-10-10"
                  value={startDate}
                  onChangeText={setStartDate}
                  style={styles.input}
                  activeOutlineColor="#C85A32"
                  mode="outlined"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  label="Data fi (AAAA-MM-DD) *"
                  placeholder="2026-10-24"
                  value={endDate}
                  onChangeText={setEndDate}
                  style={styles.input}
                  activeOutlineColor="#C85A32"
                  mode="outlined"
                />
              </View>
            </View>

            <Text variant="labelMedium" style={styles.label}>
              Visibilitat
            </Text>
            <SegmentedButtons
              value={visibility}
              onValueChange={(val) => setVisibility(val as TripVisibility)}
              buttons={[
                { value: 'public', label: 'Públic' },
                { value: 'contacts_only', label: 'Contactes' },
                { value: 'private', label: 'Privat' },
              ]}
              style={styles.segmented}
              theme={{ colors: { secondaryContainer: '#F4ECE1', onSecondaryContainer: '#703817' } }}
            />
          </Card.Content>
        </Card>

        {/* Stages Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.cardTitle}>
              Etapes / Destinacions ({stages.length})
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Afegeix les ciutats o parades que faràs en la teva ruta.
            </Text>

            {stages.map((stage, index) => (
              <View key={index} style={styles.stageItem}>
                <View style={styles.stageHeader}>
                  <Text style={styles.stageTitle}>
                    {stage.stage_order}. {stage.destination_name}
                    {stage.country_code ? ` (${stage.country_code})` : ''}
                  </Text>
                  <IconButton
                    icon="close"
                    size={16}
                    iconColor="#d32f2f"
                    onPress={() => handleRemoveStage(index)}
                    style={{ margin: 0 }}
                  />
                </View>
                <Text style={styles.stageDates}>
                  📅 {stage.start_date} – {stage.end_date}
                </Text>
                {stage.notes ? (
                  <Text style={styles.stageNotes} numberOfLines={2}>
                    💬 {stage.notes}
                  </Text>
                ) : null}
              </View>
            ))}

            <Button
              mode="outlined"
              icon="plus"
              onPress={handleOpenAddStage}
              textColor="#C85A32"
              style={styles.btnAddStage}
            >
              Afegir destinació
            </Button>
          </Card.Content>
        </Card>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          buttonColor="#C85A32"
          style={styles.btnSave}
          contentStyle={{ paddingVertical: 6 }}
        >
          {isEditing ? 'Desar canvis' : 'Crear viatge'}
        </Button>
      </ScrollView>

      {/* Modal to add Stage */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Nova etapa / Destinació
              </Text>

              {stageModalError ? (
                <HelperText type="error" visible>
                  {stageModalError}
                </HelperText>
              ) : null}

              <TextInput
                label="Nom de la ciutat / destinació *"
                placeholder="Ex: Estocolm"
                value={stageDest}
                onChangeText={setStageDest}
                style={styles.input}
                activeOutlineColor="#C85A32"
                mode="outlined"
              />

              <TextInput
                label="Codi de país (2 lletres ISO, ex: SE, JP, ES)"
                placeholder="SE"
                value={stageCountry}
                onChangeText={setStageCountry}
                maxLength={2}
                autoCapitalize="characters"
                style={styles.input}
                activeOutlineColor="#C85A32"
                mode="outlined"
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <TextInput
                    label="Data inici *"
                    placeholder="AAAA-MM-DD"
                    value={stageStart}
                    onChangeText={setStageStart}
                    style={styles.input}
                    activeOutlineColor="#C85A32"
                    mode="outlined"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    label="Data fi *"
                    placeholder="AAAA-MM-DD"
                    value={stageEnd}
                    onChangeText={setStageEnd}
                    style={styles.input}
                    activeOutlineColor="#C85A32"
                    mode="outlined"
                  />
                </View>
              </View>

              <TextInput
                label="Notes / Plans per aquesta etapa"
                placeholder="Ex: Visitar museus, trobada..."
                value={stageNotes}
                onChangeText={setStageNotes}
                multiline
                numberOfLines={2}
                style={styles.input}
                activeOutlineColor="#C85A32"
                mode="outlined"
              />

              <View style={styles.modalActions}>
                <Button
                  mode="text"
                  onPress={() => setModalVisible(false)}
                  textColor="#786C65"
                >
                  Cancel·lar
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#C85A32"
                  onPress={handleSaveStage}
                >
                  Afegir etapa
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>
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
  cardTitle: {
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 12,
  },
  subtitle: {
    color: '#786C65',
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    color: '#4A3E39',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 6,
  },
  segmented: {
    marginTop: 4,
  },
  stageItem: {
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stageTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#C85A32',
    flex: 1,
  },
  stageDates: {
    fontSize: 12,
    color: '#786C65',
  },
  stageNotes: {
    fontSize: 11,
    color: '#4A3E39',
    marginTop: 4,
    fontStyle: 'italic',
  },
  btnAddStage: {
    borderColor: '#C85A32',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  btnSave: {
    marginTop: 8,
    borderRadius: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#2C221E',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
