import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  IconButton,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import { useCommunityStore } from '../store';
import { useAuthStore } from '@/modules/auth/store';
import { useChatStore } from '@/modules/chat/store';
import {
  Comment,
  OriginFilter,
  PublicTripSummary,
  Recommendation,
  RecommendationCategory,
  ReportReason,
  SortBy,
} from '../types';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      destinationId?: string;
    };
  };
}

const CATEGORIES: { id: RecommendationCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'Tot', icon: '🌟' },
  { id: 'food', label: 'Gastronomia', icon: '🍽️' },
  { id: 'hidden_gem', label: 'Racons', icon: '💎' },
  { id: 'transport', label: 'Transport', icon: '🚆' },
  { id: 'practical_tip', label: 'Consells', icon: '💡' },
  { id: 'anecdote', label: 'Anècdotes', icon: '📖' },
];

export default function DestinationDetailScreen({ navigation, route }: Props) {
  const destinationId = route?.params?.destinationId || '';
  const { user } = useAuthStore();
  const { createOrGetConversation } = useChatStore();

  const {
    currentDestination,
    recommendations,
    publicTrips,
    selectedCategory,
    originFilter,
    sortBy,
    isLoading,
    isLoadingTrips,
    error,
    fetchDestinationDetail,
    fetchRecommendations,
    fetchPublicTrips,
    toggleVote,
    fetchComments,
    addComment,
    reportContent,
    setSelectedCategory,
    setOriginFilter,
    setSortBy,
  } = useCommunityStore();

  const [activeTab, setActiveTab] = useState<'trips' | 'recommendations'>('trips');
  const [refreshing, setRefreshing] = useState(false);
  const [activeCommentsRec, setActiveCommentsRec] = useState<Recommendation | null>(null);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [chatStartingId, setChatStartingId] = useState<string | null>(null);

  useEffect(() => {
    if (destinationId) {
      fetchDestinationDetail(destinationId);
      fetchPublicTrips(destinationId);
      fetchRecommendations(destinationId);
    }
  }, [destinationId, selectedCategory, originFilter, sortBy]);

  const onRefresh = async () => {
    if (!destinationId) return;
    setRefreshing(true);
    await Promise.all([
      fetchDestinationDetail(destinationId),
      fetchPublicTrips(destinationId),
      fetchRecommendations(destinationId),
    ]);
    setRefreshing(false);
  };

  const handleStartChatWithAuthor = async (authorId: string, authorTitle: string) => {
    if (!authorId) return;
    if (user?.id === authorId) {
      Alert.alert('Informació', 'Aquest és el teu propi viatge.');
      return;
    }

    setChatStartingId(authorId);
    try {
      const conv = await createOrGetConversation(authorId);
      navigation.navigate('ChatRoom', {
        conversationId: conv.id,
        otherUserName: authorTitle,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No s’ha pogut obrir la conversa.');
    } finally {
      setChatStartingId(null);
    }
  };

  const handleOpenComments = async (rec: Recommendation) => {
    setActiveCommentsRec(rec);
    setLoadingComments(true);
    setNewCommentText('');
    const comments = await fetchComments(rec.id);
    setCommentsList(comments);
    setLoadingComments(false);
  };

  const handleAddComment = async () => {
    if (!activeCommentsRec || !newCommentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const created = await addComment(activeCommentsRec.id, newCommentText.trim());
      setCommentsList((prev) => [...prev, created]);
      setNewCommentText('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No s’ha pogut afegir el comentari.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleReportRecommendation = (rec: Recommendation) => {
    Alert.alert(
      'Denunciar contingut',
      'Vols reportar aquest consell per moderació?',
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Spam',
          onPress: async () => {
            await reportContent({
              target_type: 'recommendation',
              target_id: rec.id,
              reason: 'spam',
            });
            Alert.alert('Gràcies', 'Hem enviat la teva denúncia a l’equip de moderació.');
          },
        },
        {
          text: 'Contingut inapropiat',
          style: 'destructive',
          onPress: async () => {
            await reportContent({
              target_type: 'recommendation',
              target_id: rec.id,
              reason: 'inappropriate_content',
            });
            Alert.alert('Gràcies', 'Hem enviat la teva denúncia a l’equip de moderació.');
          },
        },
      ]
    );
  };

  const renderPublicTripCard = ({ item }: { item: PublicTripSummary }) => {
    const isCurrentUserAuthor = user?.id === item.author.id;
    const isStartingChat = chatStartingId === item.author.id;

    return (
      <Card style={styles.tripCard}>
        <Card.Content style={styles.tripCardContent}>
          {/* Author Header (Anonymized) */}
          <View style={styles.authorHeader}>
            <View style={styles.authorAvatarBox}>
              <Text style={styles.authorAvatarEmoji}>🧭</Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorTitle}>{item.author.anonymous_title}</Text>
              <Text style={styles.tripPeriod}>{item.formatted_period}</Text>
            </View>
          </View>

          {/* Trip Title & Description */}
          <Text style={styles.tripTitle}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.tripDesc}>{item.description}</Text>
          ) : null}

          {/* Stages Timeline Route */}
          {item.stages && item.stages.length > 0 ? (
            <View style={styles.stagesContainer}>
              <Text style={styles.stagesHeading}>Itinerari:</Text>
              <View style={styles.stagesRow}>
                {item.stages.map((stage, idx) => (
                  <View key={stage.id || idx} style={styles.stageChipWrapper}>
                    <View style={styles.stageChip}>
                      <Text style={styles.stageOrderNumber}>{idx + 1}</Text>
                      <Text style={styles.stageName}>{stage.destination_name}</Text>
                    </View>
                    {idx < item.stages.length - 1 && (
                      <Text style={styles.stageArrow}>➔</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Photos Gallery */}
          {item.photos && item.photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosScroll}
              contentContainerStyle={styles.photosContent}
            >
              {item.photos.map((photo, pIdx) => (
                <View key={photo.id || pIdx} style={styles.tripPhotoWrapper}>
                  <Image source={{ uri: photo.image_url }} style={styles.tripPhoto} />
                </View>
              ))}
            </ScrollView>
          ) : null}

          {/* Chat Action Button */}
          {!isCurrentUserAuthor && (
            <TouchableOpacity
              style={styles.chatAuthorBtn}
              onPress={() => handleStartChatWithAuthor(item.author.id, item.author.anonymous_title)}
              disabled={isStartingChat}
              activeOpacity={0.8}
            >
              {isStartingChat ? (
                <ActivityIndicator size="small" color="#C85A32" />
              ) : (
                <>
                  <Text style={styles.chatAuthorBtnIcon}>💬</Text>
                  <Text style={styles.chatAuthorBtnText}>Demanar més informació a l'autor</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderRecommendationCard = ({ item }: { item: Recommendation }) => {
    const isVoted = item.user_has_voted;
    return (
      <Card style={styles.recCard}>
        <Card.Content>
          <View style={styles.recHeader}>
            <View style={styles.authorArea}>
              <View style={styles.recAvatar}>
                <Text style={styles.recAvatarText}>
                  {item.author.name ? item.author.name[0].toUpperCase() : 'F'}
                </Text>
              </View>
              <View>
                <Text style={styles.recAuthorName}>{item.author.name}</Text>
                <Text style={styles.recAuthorOrigin}>
                  {[item.author.town_name, item.author.region_name].filter(Boolean).join(', ') || 'Felagi'}
                </Text>
              </View>
            </View>

            <IconButton
              icon="flag-outline"
              size={18}
              iconColor="#A89A90"
              onPress={() => handleReportRecommendation(item)}
            />
          </View>

          <Text style={styles.recTitle}>{item.title}</Text>
          <Text style={styles.recDesc}>{item.description}</Text>

          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.recImage} resizeMode="cover" />
          ) : null}

          {item.location_name ? (
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>{item.location_name}</Text>
            </View>
          ) : null}

          <View style={styles.recFooter}>
            <TouchableOpacity
              style={[styles.voteBtn, isVoted && styles.voteBtnActive]}
              onPress={() => toggleVote(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.voteIcon}>{isVoted ? '❤️' : '🤍'}</Text>
              <Text style={[styles.voteCount, isVoted && styles.voteCountActive]}>
                {item.useful_votes_count || 0} aval{item.useful_votes_count === 1 ? '' : 's'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.commentBtn}
              onPress={() => handleOpenComments(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.commentIcon}>💬</Text>
              <Text style={styles.commentCount}>
                {item.comments_count || 0} comentari{item.comments_count === 1 ? '' : 's'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Enrere</Text>
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.topBarTitle} numberOfLines={1}>
          {currentDestination?.name || 'Destí'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C85A32"
          />
        }
      >
        {/* Destination Hero Banner */}
        <View style={styles.heroBanner}>
          {currentDestination?.banner_url ? (
            <Image source={{ uri: currentDestination.banner_url }} style={styles.heroImage} />
          ) : (
            <View style={styles.fallbackHero}>
              <Text style={styles.fallbackHeroFlag}>
                {currentDestination?.flag_emoji || '🗺️'}
              </Text>
            </View>
          )}

          <View style={styles.heroOverlay}>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroName}>{currentDestination?.name}</Text>
              <Text style={styles.heroFlag}>{currentDestination?.flag_emoji}</Text>
            </View>
            <Text style={styles.heroRegion}>
              {[currentDestination?.region_name, currentDestination?.country_name]
                .filter(Boolean)
                .join(', ')}
            </Text>

            {/* Quick Stats Badges */}
            <View style={styles.heroBadgesRow}>
              <View style={styles.heroStatBadge}>
                <Text style={styles.heroStatText}>
                  ✈️ {currentDestination?.public_trips_count || publicTrips.length || 0} viatges
                </Text>
              </View>
              <View style={styles.heroStatBadge}>
                <Text style={styles.heroStatText}>
                  💡 {currentDestination?.total_recommendations || recommendations.length || 0} consells
                </Text>
              </View>
              {(currentDestination?.active_felagis_count || 0) > 0 ? (
                <View style={styles.heroLiveBadge}>
                  <View style={styles.heroLiveDot} />
                  <Text style={styles.heroLiveText}>
                    {currentDestination?.active_felagis_count} felagis ara
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Tab Navigation Segmented Buttons */}
        <View style={styles.tabSelectorWrapper}>
          <SegmentedButtons
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'trips' | 'recommendations')}
            buttons={[
              {
                value: 'trips',
                label: `Viatges (${publicTrips.length})`,
                icon: 'airplane',
              },
              {
                value: 'recommendations',
                label: `Consells (${recommendations.length})`,
                icon: 'lightbulb-outline',
              },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* TAB 1: Viatges Públics de la Comunitat */}
        {activeTab === 'trips' && (
          <View style={styles.tabContent}>
            {isLoadingTrips && publicTrips.length === 0 ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#C85A32" />
              </View>
            ) : publicTrips.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🗺️</Text>
                <Text style={styles.emptyTitle}>Cap viatge completat encara</Text>
                <Text style={styles.emptySubtitle}>
                  Sigues el primer a compartir el teu itinerari quan finalitzis el viatge a {currentDestination?.name || 'aquest destí'}!
                </Text>
              </View>
            ) : (
              <FlatList
                data={publicTrips}
                keyExtractor={(item) => item.id}
                renderItem={renderPublicTripCard}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        {/* TAB 2: Recomanacions i Consells */}
        {activeTab === 'recommendations' && (
          <View style={styles.tabContent}>
            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScroll}
              contentContainerStyle={styles.catScrollContent}
            >
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat.id}
                  selected={selectedCategory === cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.catChip,
                    selectedCategory === cat.id && styles.catChipActive,
                  ]}
                  textStyle={[
                    styles.catChipText,
                    selectedCategory === cat.id && styles.catChipTextActive,
                  ]}
                >
                  {cat.icon} {cat.label}
                </Chip>
              ))}
            </ScrollView>

            {/* Action to create recommendation */}
            <View style={styles.actionRow}>
              <Button
                mode="contained"
                icon="plus"
                buttonColor="#C85A32"
                textColor="#FFFFFF"
                onPress={() =>
                  navigation.navigate('RecommendationCreate', {
                    destinationId,
                    destinationName: currentDestination?.name,
                  })
                }
                style={styles.addRecBtn}
              >
                Compartir consell
              </Button>
            </View>

            {isLoading && recommendations.length === 0 ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#C85A32" />
              </View>
            ) : recommendations.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>💡</Text>
                <Text style={styles.emptyTitle}>Cap consell en aquesta categoria</Text>
                <Text style={styles.emptySubtitle}>
                  Tens algun racó secret o recomanació per a {currentDestination?.name}? Comparteix-lo amb la comunitat!
                </Text>
              </View>
            ) : (
              <FlatList
                data={recommendations}
                keyExtractor={(item) => item.id}
                renderItem={renderRecommendationCard}
                scrollEnabled={false}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Comments Modal */}
      <Modal
        visible={activeCommentsRec !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveCommentsRec(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Comentaris
              </Text>
              <TouchableOpacity onPress={() => setActiveCommentsRec(null)}>
                <Text style={styles.modalCloseText}>Tancar</Text>
              </TouchableOpacity>
            </View>
            <Divider />

            {loadingComments ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="small" color="#C85A32" />
              </View>
            ) : (
              <FlatList
                data={commentsList}
                keyExtractor={(c) => c.id}
                style={styles.commentsList}
                renderItem={({ item: c }) => (
                  <View style={styles.commentItem}>
                    <Text style={styles.commentAuthor}>{c.author.name}</Text>
                    <Text style={styles.commentBody}>{c.content}</Text>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyCommentText}>Encara no hi ha comentaris.</Text>
                }
              />
            )}

            <View style={styles.commentInputRow}>
              <TextInput
                placeholder="Escriu un comentari..."
                value={newCommentText}
                onChangeText={setNewCommentText}
                mode="outlined"
                outlineColor="#E8E2D9"
                activeOutlineColor="#C85A32"
                style={styles.commentInput}
                dense
              />
              <Button
                mode="contained"
                buttonColor="#C85A32"
                textColor="#FFFFFF"
                onPress={handleAddComment}
                loading={commentSubmitting}
                disabled={!newCommentText.trim() || commentSubmitting}
                style={styles.commentSendBtn}
              >
                Enviar
              </Button>
            </View>
          </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backText: {
    color: '#C85A32',
    fontWeight: '700',
    fontSize: 15,
  },
  topBarTitle: {
    fontWeight: '800',
    color: '#2C221E',
    textAlign: 'center',
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  heroBanner: {
    position: 'relative',
    height: 180,
    width: '100%',
    backgroundColor: '#3E2F2B',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fallbackHero: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4A3B32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackHeroFlag: {
    fontSize: 54,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(28, 18, 14, 0.72)',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroFlag: {
    fontSize: 22,
  },
  heroRegion: {
    fontSize: 13,
    color: '#E8E2D9',
    marginTop: 2,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  heroStatBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroStatText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  heroLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(67, 160, 71, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  heroLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  heroLiveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tabSelectorWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
  },
  segmentedButtons: {
    backgroundColor: '#F9F6F0',
  },
  tabContent: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginBottom: 14,
    elevation: 2,
  },
  tripCardContent: {
    padding: 14,
  },
  authorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  authorAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF2EB',
    borderWidth: 1,
    borderColor: '#FCD8C5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorAvatarEmoji: {
    fontSize: 18,
  },
  authorInfo: {
    flex: 1,
  },
  authorTitle: {
    fontWeight: '700',
    color: '#2C221E',
    fontSize: 15,
  },
  tripPeriod: {
    color: '#786C65',
    fontSize: 12,
    marginTop: 1,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C85A32',
    marginBottom: 4,
  },
  tripDesc: {
    fontSize: 13,
    color: '#554A44',
    lineHeight: 18,
    marginBottom: 10,
  },
  stagesContainer: {
    marginTop: 6,
    marginBottom: 10,
  },
  stagesHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#786C65',
    marginBottom: 6,
  },
  stagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  stageChipWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EFE6',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  stageOrderNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C85A32',
  },
  stageName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C221E',
  },
  stageArrow: {
    fontSize: 11,
    color: '#A89A90',
  },
  photosScroll: {
    marginVertical: 8,
  },
  photosContent: {
    gap: 8,
  },
  tripPhotoWrapper: {
    width: 110,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E8E2D9',
  },
  tripPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  chatAuthorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF2EB',
    borderWidth: 1,
    borderColor: '#FCD8C5',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 6,
  },
  chatAuthorBtnIcon: {
    fontSize: 16,
  },
  chatAuthorBtnText: {
    color: '#C85A32',
    fontWeight: '700',
    fontSize: 13,
  },
  catScroll: {
    marginBottom: 12,
  },
  catScrollContent: {
    gap: 6,
  },
  catChip: {
    backgroundColor: '#F0EBE1',
    borderColor: '#E8E2D9',
  },
  catChipActive: {
    backgroundColor: '#C85A32',
  },
  catChipText: {
    color: '#6B5E57',
    fontSize: 12,
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionRow: {
    marginBottom: 12,
  },
  addRecBtn: {
    borderRadius: 10,
  },
  recCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginBottom: 12,
    elevation: 2,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  authorArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C85A32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  recAuthorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C221E',
  },
  recAuthorOrigin: {
    fontSize: 11,
    color: '#786C65',
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C221E',
    marginTop: 4,
    marginBottom: 4,
  },
  recDesc: {
    fontSize: 13,
    color: '#554A44',
    lineHeight: 18,
    marginBottom: 8,
  },
  recImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationIcon: {
    fontSize: 13,
  },
  locationText: {
    fontSize: 12,
    color: '#786C65',
  },
  recFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0EBE1',
    paddingTop: 8,
    marginTop: 4,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EFE6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  voteBtnActive: {
    backgroundColor: '#FFF2EB',
    borderWidth: 1,
    borderColor: '#FCD8C5',
  },
  voteIcon: {
    fontSize: 14,
  },
  voteCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5E57',
  },
  voteCountActive: {
    color: '#C85A32',
    fontWeight: '700',
  },
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EFE6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  commentIcon: {
    fontSize: 14,
  },
  commentCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5E57',
  },
  centerLoading: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C221E',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#786C65',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  modalTitle: {
    fontWeight: '700',
    color: '#2C221E',
  },
  modalCloseText: {
    color: '#C85A32',
    fontWeight: '700',
  },
  commentsList: {
    maxHeight: 280,
    marginVertical: 10,
  },
  commentItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE6',
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C221E',
  },
  commentBody: {
    fontSize: 13,
    color: '#554A44',
    marginTop: 2,
  },
  emptyCommentText: {
    textAlign: 'center',
    color: '#786C65',
    paddingVertical: 16,
    fontSize: 13,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F9F6F0',
  },
  commentSendBtn: {
    borderRadius: 8,
  },
});
