import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { usePostTripStore } from '../store';
import { CommunityTip, CommunityTipCategory } from '../types';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      tripId?: string;
      tripTitle?: string;
    };
  };
}

const TIP_CATEGORIES: { key: CommunityTipCategory; label: string; icon: string }[] = [
  { key: 'food', label: 'Gastronomia', icon: '🍜' },
  { key: 'hidden_gem', label: 'Lloc secret', icon: '💎' },
  { key: 'transport', label: 'Transport', icon: '🚆' },
  { key: 'practical_tip', label: 'Consell pràctic', icon: '💡' },
  { key: 'anecdote', label: 'Anècdota', icon: '📖' },
];

export default function TripWrapupScreen({ navigation, route }: Props) {
  const tripId = route?.params?.tripId || '';
  const tripTitle = route?.params?.tripTitle || 'Viatge a Japó';

  const {
    wrapupStatus,
    isLoading,
    isSubmittingFeedback,
    error,
    fetchWrapupStatus,
    submitFeedback,
    clearError,
  } = usePostTripStore();

  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [includeTip, setIncludeTip] = useState(false);
  const [tipCategory, setTipCategory] = useState<CommunityTipCategory>('food');
  const [tipTitle, setTipTitle] = useState('');
  const [tipDescription, setTipDescription] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    if (tripId) {
      fetchWrapupStatus(tripId);
    }
  }, [tripId, fetchWrapupStatus]);

  const onRefresh = () => {
    if (tripId) {
      fetchWrapupStatus(tripId);
    }
  };

  const handleSubmitFeedback = async () => {
    clearError();
    const tips: CommunityTip[] = [];
    if (includeTip && tipTitle.trim() && tipDescription.trim()) {
      tips.push({
        category: tipCategory,
        title: tipTitle.trim(),
        description: tipDescription.trim(),
      });
    }

    try {
      await submitFeedback(tripId, {
        rating,
        comments: comments.trim() || undefined,
        community_tips: tips.length > 0 ? tips : undefined,
      });
      setFeedbackSubmitted(true);
      Alert.alert(
        '🙏 Gràcies pel teu feedback!',
        'La teva valoració i consells ajudaran a tota la comunitat de FELAGIS.'
      );
    } catch {
      // Error handled by store
    }
  };

  const isCompleted = wrapupStatus?.feedback_completed || feedbackSubmitted;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Tornar</Text>
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.headerTitle}>
          ✨ Tancament del Viatge
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {error ? (
        <HelperText type="error" visible style={{ paddingHorizontal: 16 }}>
          {error}
        </HelperText>
      ) : null}

      {isLoading && !wrapupStatus ? (
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
          {/* Hero Banner */}
          <Card style={styles.heroCard}>
            <Card.Content style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>✨ DIA FINAL DEL VIATGE</Text>
              </View>
              <Text variant="titleLarge" style={styles.heroTitle}>
                Has completat el teu viatge! 🎉
              </Text>
              <Text variant="bodySmall" style={styles.heroSub}>
                {tripTitle} • Felicitats per l'aventura viscuda!
              </Text>
            </Card.Content>
          </Card>

          {/* Wrapup Checklist / Progress */}
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionHeading}>Ritual de Tancament FELAG</Text>
              <View style={styles.checklist}>
                <View style={styles.checkItem}>
                  <Text style={styles.checkIcon}>
                    {wrapupStatus?.celebration_completed ? '✅' : '📸'}
                  </Text>
                  <View style={styles.checkTexts}>
                    <Text style={styles.checkTitle}>Celebration Cards amb companys</Text>
                    <Text style={styles.checkSub}>Immortalitza les trobades en ruta</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('CelebrationCard', { tripId, tripTitle })}
                  >
                    <Text style={styles.linkText}>Veure ›</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.checkItem}>
                  <Text style={styles.checkIcon}>{isCompleted ? '✅' : '⭐'}</Text>
                  <View style={styles.checkTexts}>
                    <Text style={styles.checkTitle}>Valoració i consells per a la terra</Text>
                    <Text style={styles.checkSub}>
                      {isCompleted ? 'Completat amb èxit' : 'Pendent de valoració'}
                    </Text>
                  </View>
                </View>

                <View style={styles.checkItem}>
                  <Text style={styles.checkIcon}>📱</Text>
                  <View style={styles.checkTexts}>
                    <Text style={styles.checkTitle}>Reportatge Instagram Stories 9:16</Text>
                    <Text style={styles.checkSub}>Llest per a compartir a xarxes</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('InstagramStories', { tripId, tripTitle })}
                  >
                    <Text style={styles.linkText}>Obrir ›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Feedback Form */}
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionHeading}>Com ha anat l'experiència?</Text>
              <Text style={styles.formSub}>
                Valora el teu viatge i deixa recomanacions per als futurs FELAGIS.
              </Text>

              {/* Star Rating */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => !isCompleted && setRating(star)}
                    activeOpacity={0.7}
                    style={styles.starTouch}
                  >
                    <Text style={[styles.starIcon, rating >= star && styles.starActive]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingLabel}>
                {rating === 5
                  ? '🌟 Inoblidable!'
                  : rating === 4
                  ? '😊 Molt bo!'
                  : rating === 3
                  ? '👍 Correcte'
                  : rating === 2
                  ? '😐 Regular'
                  : '😞 Millorable'}
              </Text>

              <TextInput
                label="Comentaris sobre el viatge (opcional)"
                value={comments}
                onChangeText={setComments}
                mode="outlined"
                multiline
                numberOfLines={3}
                disabled={isCompleted}
                outlineColor="#E8E2D9"
                activeOutlineColor="#C85A32"
                style={styles.input}
              />

              {/* Toggle Community Tip */}
              {!isCompleted && (
                <TouchableOpacity
                  style={styles.tipToggle}
                  onPress={() => setIncludeTip(!includeTip)}
                >
                  <Text style={styles.tipToggleText}>
                    {includeTip ? '➖ Treure consell per a la comunitat' : '➕ Afegir un consell o racó secret'}
                  </Text>
                </TouchableOpacity>
              )}

              {includeTip && !isCompleted && (
                <View style={styles.tipBox}>
                  <Text style={styles.tipBoxTitle}>💡 Consell per a altres viatgers:</Text>
                  <View style={styles.chipsRow}>
                    {TIP_CATEGORIES.map((cat) => (
                      <Chip
                        key={cat.key}
                        selected={tipCategory === cat.key}
                        onPress={() => setTipCategory(cat.key)}
                        style={[
                          styles.catChip,
                          tipCategory === cat.key && styles.catChipSelected,
                        ]}
                        textStyle={[
                          styles.catChipText,
                          tipCategory === cat.key && styles.catChipTextSelected,
                        ]}
                      >
                        {cat.icon} {cat.label}
                      </Chip>
                    ))}
                  </View>

                  <TextInput
                    label="Títol del consell (ex: Millor Ramen de Shinjuku)"
                    value={tipTitle}
                    onChangeText={setTipTitle}
                    mode="outlined"
                    outlineColor="#E8E2D9"
                    activeOutlineColor="#C85A32"
                    style={styles.input}
                  />

                  <TextInput
                    label="Descripció i recomanació"
                    value={tipDescription}
                    onChangeText={setTipDescription}
                    mode="outlined"
                    multiline
                    numberOfLines={2}
                    outlineColor="#E8E2D9"
                    activeOutlineColor="#C85A32"
                    style={styles.input}
                  />
                </View>
              )}

              {!isCompleted ? (
                <Button
                  mode="contained"
                  buttonColor="#C85A32"
                  style={styles.submitBtn}
                  loading={isSubmittingFeedback}
                  disabled={isSubmittingFeedback}
                  onPress={handleSubmitFeedback}
                >
                  Enviar Valoració del Viatge ✨
                </Button>
              ) : (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>
                    ✅ Valoració enviada correctament!
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Instagram Stories CTA */}
          <TouchableOpacity
            style={styles.storiesCTA}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('InstagramStories', { tripId, tripTitle })}
          >
            <Text style={styles.storiesCTATitle}>📲 Compartir a Instagram Stories (9:16)</Text>
            <Text style={styles.storiesCTASub}>
              Mostra les teves etapes, FELAGIS coneguts i les teves fotos destacades.
            </Text>
          </TouchableOpacity>
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
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    borderRadius: 16,
    marginBottom: 16,
  },
  heroContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  heroBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  heroBadgeText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    fontWeight: '800',
    color: '#2C221E',
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSub: {
    color: '#786C65',
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2C221E',
    marginBottom: 10,
  },
  checklist: {
    gap: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  checkIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  checkTexts: {
    flex: 1,
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C221E',
  },
  checkSub: {
    fontSize: 11,
    color: '#786C65',
    marginTop: 2,
  },
  linkText: {
    color: '#C85A32',
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 4,
  },
  formSub: {
    fontSize: 12,
    color: '#786C65',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  starTouch: {
    padding: 4,
  },
  starIcon: {
    fontSize: 36,
    color: '#D1C7BD',
  },
  starActive: {
    color: '#FFA000',
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#703817',
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    fontSize: 13,
  },
  tipToggle: {
    paddingVertical: 8,
    marginBottom: 6,
  },
  tipToggleText: {
    color: '#C85A32',
    fontWeight: '700',
    fontSize: 12,
  },
  tipBox: {
    backgroundColor: '#FAF7F2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginBottom: 12,
  },
  tipBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C221E',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  catChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
  },
  catChipSelected: {
    backgroundColor: '#C85A32',
  },
  catChipText: {
    fontSize: 11,
    color: '#4A3E39',
  },
  catChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  submitBtn: {
    marginTop: 6,
    borderRadius: 10,
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  completedBadgeText: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 13,
  },
  storiesCTA: {
    backgroundColor: '#2C221E',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  storiesCTATitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 4,
  },
  storiesCTASub: {
    color: '#E8E2D9',
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.85,
  },
});
