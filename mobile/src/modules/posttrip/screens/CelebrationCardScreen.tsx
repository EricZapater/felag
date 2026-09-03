import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import { usePostTripStore } from '../store';
import { CelebrationCard } from '../types';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      tripId?: string;
      tripTitle?: string;
      destinationName?: string;
    };
  };
}

const DEFAULT_SELFIE_PRESETS = [
  {
    url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop&q=80',
    title: 'Selfie a Shibuya',
    location: 'Shibuya Crossing',
  },
  {
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&auto=format&fit=crop&q=80',
    title: 'Sopar de ramen junts',
    location: 'Shinjuku Omoide Yokocho',
  },
];

export default function CelebrationCardScreen({ navigation, route }: Props) {
  const tripId = route?.params?.tripId || '';
  const tripTitle = route?.params?.tripTitle || 'Viatge';
  const destinationName = route?.params?.destinationName || 'Destinació';

  const {
    celebrationCards,
    isLoading,
    isCreatingCard,
    error,
    fetchCelebrationCards,
    createCelebrationCard,
    clearError,
  } = usePostTripStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [companionId, setCompanionId] = useState('user-felagi-friend-1');
  const [companionName, setCompanionName] = useState('Marc');
  const [companionTown, setCompanionTown] = useState('Sabadell');
  const [imageUrl, setImageUrl] = useState(DEFAULT_SELFIE_PRESETS[0].url);
  const [locationName, setLocationName] = useState('Shibuya Crossing');
  const [caption, setCaption] = useState('Ens hem trobat de casualitat a Tòquio!');

  useEffect(() => {
    if (tripId) {
      fetchCelebrationCards(tripId);
    }
  }, [tripId, fetchCelebrationCards]);

  const onRefresh = () => {
    if (tripId) {
      fetchCelebrationCards(tripId);
    }
  };

  const handleCreateCard = async () => {
    if (!imageUrl.trim() || !locationName.trim()) {
      Alert.alert('Camps obligatoris', 'Cal indicar la foto i la ubicació de la trobada.');
      return;
    }
    clearError();
    try {
      await createCelebrationCard(tripId, {
        user_2_id: companionId,
        image_url: imageUrl.trim(),
        location_name: locationName.trim(),
        caption: caption.trim() || undefined,
      });
      setShowCreateForm(false);
      Alert.alert('🎉 Targeta creada!', 'La teva Celebration Card s’ha generat amb èxit.');
    } catch {
      // Error handled by store
    }
  };

  const handleShareCard = async (card: CelebrationCard) => {
    try {
      const message = `🎉 ${card.title}\n${card.headline}\n${card.subheadline || ''} • ${card.location_name}\n\nCreat amb FELAG ✈️`;
      await Share.share({
        title: card.title,
        message,
        url: card.image_url,
      });
    } catch (err) {
      // User cancelled share
    }
  };

  const handleSendToChat = (card: CelebrationCard) => {
    Alert.alert(
      'Enviar al Xat',
      'Vols compartir aquesta targeta al xat amb els teus companys de viatge?',
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Anar al Xat',
          onPress: () => {
            navigation.navigate('Conversations');
          },
        },
      ]
    );
  };

  const handleSaveToGallery = () => {
    Alert.alert('📥 Guardat!', 'La Celebration Card s’ha desat correctament al teu carret.');
  };

  const activeCard: CelebrationCard | null =
    celebrationCards.length > 0 ? celebrationCards[0] : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Tornar</Text>
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.headerTitle}>
          📸 Celebration Card
        </Text>
        <TouchableOpacity
          onPress={() => setShowCreateForm(!showCreateForm)}
          style={styles.headerRightBtn}
        >
          <Text style={styles.headerRightBtnText}>
            {showCreateForm ? 'Veure' : '+ Nova'}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <HelperText type="error" visible style={{ paddingHorizontal: 16 }}>
          {error}
        </HelperText>
      ) : null}

      {isLoading && celebrationCards.length === 0 ? (
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
          {showCreateForm || celebrationCards.length === 0 ? (
            <Card style={styles.formCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.formTitle}>
                  🎉 Crear Celebration Card ("We Met! 📸")
                </Text>
                <Text style={styles.formSub}>
                  Celebra la trobada amb un altre FELAGI durant la teva aventura.
                </Text>

                <Text style={styles.fieldLabel}>Tria una imatge / selfie de mostra:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.presetsScroll}
                >
                  {DEFAULT_SELFIE_PRESETS.map((p, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.presetCard,
                        imageUrl === p.url && styles.presetCardActive,
                      ]}
                      onPress={() => {
                        setImageUrl(p.url);
                        setLocationName(p.location);
                      }}
                    >
                      <Image source={{ uri: p.url }} style={styles.presetImage} />
                      <Text style={styles.presetText} numberOfLines={1}>
                        {p.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TextInput
                  label="URL del Selfie / Foto"
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  mode="outlined"
                  outlineColor="#E8E2D9"
                  activeOutlineColor="#C85A32"
                  style={styles.input}
                />

                <TextInput
                  label="Nom del company FELAGI"
                  value={companionName}
                  onChangeText={setCompanionName}
                  mode="outlined"
                  outlineColor="#E8E2D9"
                  activeOutlineColor="#C85A32"
                  style={styles.input}
                />

                <TextInput
                  label="Poble / Ciutat d'origen del company"
                  value={companionTown}
                  onChangeText={setCompanionTown}
                  mode="outlined"
                  outlineColor="#E8E2D9"
                  activeOutlineColor="#C85A32"
                  style={styles.input}
                />

                <TextInput
                  label="Lloc de la trobada (ex: Shibuya Crossing)"
                  value={locationName}
                  onChangeText={setLocationName}
                  mode="outlined"
                  outlineColor="#E8E2D9"
                  activeOutlineColor="#C85A32"
                  style={styles.input}
                />

                <TextInput
                  label="Descripció / Comentari"
                  value={caption}
                  onChangeText={setCaption}
                  mode="outlined"
                  outlineColor="#E8E2D9"
                  activeOutlineColor="#C85A32"
                  style={styles.input}
                />

                <Button
                  mode="contained"
                  buttonColor="#C85A32"
                  style={styles.btnSubmit}
                  loading={isCreatingCard}
                  disabled={isCreatingCard}
                  onPress={handleCreateCard}
                >
                  Generar Celebration Card ✨
                </Button>
              </Card.Content>
            </Card>
          ) : (
            <View>
              {celebrationCards.map((card) => {
                const user1Name = card.user_1?.name || 'Tu';
                const user2Name = card.user_2?.name || companionName;
                const user1Town = card.user_1?.town_name || 'Terrassa';
                const user2Town = card.user_2?.town_name || companionTown;

                return (
                  <View key={card.id} style={styles.cardContainer}>
                    {/* Commemorative Celebration Card */}
                    <View style={styles.celebrationCard}>
                      <View style={styles.badgeWrap}>
                        <Text style={styles.badgeText}>🎉 ENS HEM TROBAT!</Text>
                      </View>

                      <Image source={{ uri: card.image_url }} style={styles.cardImage} />

                      <Text style={styles.cardTitle}>
                        {card.title || `${user1Name} i ${user2Name} a ${destinationName}! 🗼✨`}
                      </Text>

                      <Text style={styles.cardSub}>
                        {user1Town} 🤝 {user2Town} • {card.location_name}
                      </Text>

                      <View style={styles.cardFooter}>
                        <Text style={styles.cardFooterText}>FELAG • {destinationName}</Text>
                        <Text style={styles.cardFooterText}>
                          {new Date(card.created_at).toLocaleDateString('ca-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.btnActionsGroup}>
                      <TouchableOpacity
                        style={styles.btnPrimary}
                        activeOpacity={0.8}
                        onPress={() => handleShareCard(card)}
                      >
                        <Text style={styles.btnPrimaryText}>📲 Enviar al Xat & Compartir</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.btnSecondary}
                        activeOpacity={0.8}
                        onPress={handleSaveToGallery}
                      >
                        <Text style={styles.btnSecondaryText}>📥 Desar al Carret</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  backText: {
    color: '#C85A32',
    fontWeight: 'bold',
    fontSize: 15,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#2C221E',
  },
  headerRightBtn: {
    backgroundColor: '#F4ECE1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerRightBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C85A32',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    marginBottom: 24,
  },
  celebrationCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#C85A32',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#C85A32',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeWrap: {
    backgroundColor: '#FDEEE9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  badgeText: {
    color: '#C85A32',
    fontSize: 11,
    fontWeight: '800',
  },
  cardImage: {
    width: '100%',
    height: 210,
    borderRadius: 14,
    backgroundColor: '#E8E2D9',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2C221E',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#6B5E57',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardFooter: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#E8E2D9',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardFooterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C85A32',
  },
  btnActionsGroup: {
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: '#C85A32',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  btnSecondary: {
    backgroundColor: '#2C221E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  formTitle: {
    fontWeight: 'bold',
    color: '#2C221E',
    marginBottom: 4,
  },
  formSub: {
    color: '#786C65',
    fontSize: 12,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#786C65',
    marginBottom: 8,
  },
  presetsScroll: {
    marginBottom: 12,
  },
  presetCard: {
    marginRight: 10,
    width: 110,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    borderRadius: 8,
    padding: 4,
  },
  presetCardActive: {
    borderColor: '#C85A32',
    backgroundColor: '#FDEEE9',
  },
  presetImage: {
    width: 100,
    height: 70,
    borderRadius: 6,
    backgroundColor: '#E8E2D9',
  },
  presetText: {
    fontSize: 10,
    color: '#4A3E39',
    marginTop: 4,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    fontSize: 13,
  },
  btnSubmit: {
    marginTop: 10,
    borderRadius: 10,
  },
});
