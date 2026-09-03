import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
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
import {
  Comment,
  OriginFilter,
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

  const {
    currentDestination,
    recommendations,
    selectedCategory,
    originFilter,
    sortBy,
    isLoading,
    error,
    fetchDestinationDetail,
    fetchRecommendations,
    toggleVote,
    fetchComments,
    addComment,
    reportContent,
    setSelectedCategory,
    setOriginFilter,
    setSortBy,
  } = useCommunityStore();

  const [refreshing, setRefreshing] = useState(false);
  const [activeCommentsRec, setActiveCommentsRec] = useState<Recommendation | null>(null);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  useEffect(() => {
    if (destinationId) {
      fetchDestinationDetail(destinationId);
      fetchRecommendations(destinationId);
    }
  }, [destinationId, selectedCategory, originFilter, sortBy]);

  const onRefresh = async () => {
    if (!destinationId) return;
    setRefreshing(true);
    await Promise.all([
      fetchDestinationDetail(destinationId),
      fetchRecommendations(destinationId),
    ]);
    setRefreshing(false);
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

  const getCategoryMeta = (cat: string) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found ? `${found.icon} ${found.label}` : cat;
  };

  const destName = currentDestination?.name || destinationId;
  const activeFelagis = currentDestination?.active_felagis_count || 0;
  const totalTips = currentDestination?.total_recommendations || recommendations.length;

  const renderRecommendationCard = ({ item }: { item: Recommendation }) => {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.cardInner}>
          {/* Card Top: Category and Helpful Vote */}
          <View style={styles.cardTop}>
            <Text style={styles.cardCatBadge}>{getCategoryMeta(item.category)}</Text>
            <TouchableOpacity
              style={[styles.btnVote, item.user_has_voted && styles.btnVoteActive]}
              activeOpacity={0.7}
              onPress={() => toggleVote(item.id)}
            >
              <Text style={[styles.btnVoteText, item.user_has_voted && styles.btnVoteTextActive]}>
                👍 {item.useful_votes_count || 0}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Optional Image */}
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : null}

          {/* Title & Description */}
          <Text variant="titleMedium" style={styles.cardTitle}>
            {item.title}
          </Text>
          <Text style={styles.cardDesc}>{item.description}</Text>

          {item.location_name ? (
            <Text style={styles.cardLocation}>📍 {item.location_name}</Text>
          ) : null}

          {/* Author info & footer */}
          <Divider style={styles.cardDivider} />
          <View style={styles.cardAuthorRow}>
            <View style={styles.authorDetails}>
              <Text style={styles.authorName}>
                Per <Text style={{ fontWeight: '700' }}>{item.author.name}</Text>
              </Text>
              {item.author.town_name || item.author.region_name ? (
                <View style={styles.authorPill}>
                  <Text style={styles.authorPillText}>
                    📍 {item.author.town_name || item.author.region_name}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={styles.commentActionBtn}
                onPress={() => handleOpenComments(item)}
              >
                <Text style={styles.commentActionText}>
                  💬 {item.comments_count || 0}
                </Text>
              </TouchableOpacity>

              <IconButton
                icon="flag-outline"
                size={16}
                iconColor="#8C7A70"
                onPress={() => handleReportRecommendation(item)}
                style={{ margin: 0 }}
              />
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Hero Header with Dynamic Community Banner */}
      <ImageBackground
        source={{
          uri:
            currentDestination?.banner_url ||
            'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80',
        }}
        style={styles.hero}
        imageStyle={{ opacity: 0.45 }}
      >
        <View style={styles.heroTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnBack}>
            <Text style={styles.btnBackText}>‹</Text>
          </TouchableOpacity>

          {currentDestination?.country_name || currentDestination?.country_code ? (
            <View style={styles.countryBadge}>
              <Text style={styles.countryBadgeText}>
                {currentDestination.flag_emoji || '🌐'}{' '}
                {currentDestination.country_name || currentDestination.country_code}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.heroBottom}>
          <Text style={styles.heroTitle}>{destName}</Text>
          <Text style={styles.heroSub}>
            {totalTips} consells • {activeFelagis} FELAGIS ara mateix
          </Text>
        </View>
      </ImageBackground>

      {/* Live Alert Chip */}
      <View style={styles.liveChipContainer}>
        <View style={styles.liveChipTextRow}>
          <View style={styles.livePulseDot} />
          <Text style={styles.liveChipText}>
            {activeFelagis} FELAGIS a {destName} ara
          </Text>
        </View>

        <TouchableOpacity
          style={styles.liveFeedBtn}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('LiveFeed', {
              destinationId: currentDestination?.id || destinationId,
              destinationName: destName,
            })
          }
        >
          <Text style={styles.liveFeedBtnText}>📸 Feed en Viu ›</Text>
        </TouchableOpacity>
      </View>

      {/* Categories Scroll */}
      <View style={styles.categoryScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, isActive && styles.catChipActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>
                  {cat.icon} {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter and Sort Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.originFilterRow}>
          <TouchableOpacity
            style={[
              styles.originFilterBtn,
              originFilter === 'all' && styles.originFilterBtnActive,
            ]}
            onPress={() => setOriginFilter('all')}
          >
            <Text
              style={[
                styles.originFilterBtnText,
                originFilter === 'all' && styles.originFilterBtnTextActive,
              ]}
            >
              Tots
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.originFilterBtn,
              originFilter === 'same_origin' && styles.originFilterBtnActive,
            ]}
            onPress={() => setOriginFilter('same_origin')}
          >
            <Text
              style={[
                styles.originFilterBtnText,
                originFilter === 'same_origin' && styles.originFilterBtnTextActive,
              ]}
            >
              🏡 De la meva terra
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.sortToggleBtn}
          onPress={() => setSortBy(sortBy === 'useful' ? 'recent' : 'useful')}
        >
          <Text style={styles.sortToggleText}>
            {sortBy === 'useful' ? '🔥 Més útils' : '🕒 Més recents'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Recommendations Stream */}
      {isLoading && !refreshing && recommendations.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#C85A32" />
        </View>
      ) : (
        <FlatList
          data={recommendations}
          keyExtractor={(item) => item.id}
          renderItem={renderRecommendationCard}
          contentContainerStyle={styles.streamContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#C85A32"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💡</Text>
              <Text style={styles.emptyTitle}>Cap consell en aquesta categoria</Text>
              <Text style={styles.emptyText}>
                Sigues el primer FELAGI en compartir un racó o consell pràctic per a {destName}!
              </Text>
              <Button
                mode="contained"
                buttonColor="#C85A32"
                icon="plus"
                onPress={() =>
                  navigation.navigate('RecommendationCreate', {
                    destinationId: currentDestination?.id || destinationId,
                    destinationName: destName,
                  })
                }
                style={{ marginTop: 16, borderRadius: 20 }}
              >
                Afegir consell
              </Button>
            </View>
          }
        />
      )}

      {/* Floating Action Button (+) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('RecommendationCreate', {
            destinationId: currentDestination?.id || destinationId,
            destinationName: destName,
          })
        }
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Comments Modal */}
      <Modal
        visible={Boolean(activeCommentsRec)}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveCommentsRec(null)}
      >
        <View style={styles.commentsOverlay}>
          <View style={styles.commentsSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.commentsHeader}>
              <Text variant="titleMedium" style={styles.commentsTitle}>
                💬 Comentaris
              </Text>
              <TouchableOpacity onPress={() => setActiveCommentsRec(null)}>
                <Text style={styles.closeBtnText}>Tancar</Text>
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#C85A32" />
              </View>
            ) : (
              <FlatList
                data={commentsList}
                keyExtractor={(c) => c.id}
                style={styles.commentsList}
                ListEmptyComponent={
                  <Text style={styles.emptyCommentText}>
                    Encara no hi ha comentaris. Deixa el primer!
                  </Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <View style={styles.commentAuthorRow}>
                      <Text style={styles.commentAuthorName}>{item.author.name}</Text>
                      {item.author.town_name ? (
                        <Text style={styles.commentAuthorTown}>
                          📍 {item.author.town_name}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.commentContent}>{item.content}</Text>
                  </View>
                )}
              />
            )}

            <View style={styles.commentInputRow}>
              <TextInput
                placeholder="Escriu un comentari o pregunta..."
                value={newCommentText}
                onChangeText={setNewCommentText}
                style={styles.commentInput}
                activeOutlineColor="#C85A32"
                mode="outlined"
              />
              <Button
                mode="contained"
                buttonColor="#C85A32"
                onPress={handleAddComment}
                loading={commentSubmitting}
                disabled={commentSubmitting || !newCommentText.trim()}
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
  hero: {
    backgroundColor: '#2C221E',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    justifyContent: 'space-between',
    minHeight: 160,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  btnBack: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBackText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  countryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroBottom: {},
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  liveChipContainer: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFE082',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveChipTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E65100',
  },
  liveChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65100',
  },
  liveFeedBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  liveFeedBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C85A32',
  },
  categoryScrollContainer: {
    marginTop: 12,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  catChipActive: {
    backgroundColor: '#C85A32',
    borderColor: '#C85A32',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C221E',
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  originFilterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  originFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  originFilterBtnActive: {
    backgroundColor: '#F4ECE1',
    borderColor: '#C85A32',
  },
  originFilterBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B5E57',
  },
  originFilterBtnTextActive: {
    color: '#C85A32',
    fontWeight: '700',
  },
  sortToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sortToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#703817',
  },
  streamContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginBottom: 14,
    elevation: 1,
  },
  cardInner: {
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCatBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C85A32',
    backgroundColor: '#FDEEE9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  btnVote: {
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  btnVoteActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  btnVoteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C221E',
  },
  btnVoteTextActive: {
    color: '#2E7D32',
  },
  cardImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontWeight: '800',
    color: '#2C221E',
    marginBottom: 4,
    fontSize: 16,
  },
  cardDesc: {
    fontSize: 13,
    color: '#6B5E57',
    lineHeight: 18,
    marginBottom: 6,
  },
  cardLocation: {
    fontSize: 11,
    fontWeight: '600',
    color: '#703817',
    marginBottom: 6,
  },
  cardDivider: {
    marginVertical: 10,
    backgroundColor: '#F0EBE3',
  },
  cardAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  authorName: {
    fontSize: 12,
    color: '#6B5E57',
  },
  authorPill: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  authorPillText: {
    color: '#E65100',
    fontSize: 11,
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FAF7F2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  commentActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5E57',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C85A32',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C85A32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 30,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 32,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
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
    fontWeight: '800',
    color: '#2C221E',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B5E57',
    textAlign: 'center',
  },
  commentsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 34, 30, 0.6)',
    justifyContent: 'flex-end',
  },
  commentsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
    padding: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E8E2D9',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  commentsTitle: {
    fontWeight: '800',
    color: '#2C221E',
  },
  closeBtnText: {
    color: '#C85A32',
    fontWeight: '700',
  },
  commentsList: {
    flexGrow: 1,
    marginBottom: 12,
  },
  commentItem: {
    backgroundColor: '#FAF7F2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  commentAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C221E',
  },
  commentAuthorTown: {
    fontSize: 11,
    color: '#E65100',
    fontWeight: '600',
  },
  commentContent: {
    fontSize: 13,
    color: '#4A3E39',
  },
  emptyCommentText: {
    color: '#6B5E57',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  commentSendBtn: {
    borderRadius: 10,
  },
});
