import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
  HelperText,
  Searchbar,
  Text,
} from 'react-native-paper';
import { useInspirationStore } from '../store';
import { InspirationCategory, InspirationItem } from '../types';
import { useChatStore } from '@/modules/chat/store';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export default function InspirationScreen({ navigation }: Props) {
  const {
    items,
    categories,
    selectedCategory,
    searchQuery,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    fetchInspiration,
    loadMore,
    setCategory,
    setSearchQuery,
    toggleVote,
  } = useInspirationStore();

  const { createOrGetConversation } = useChatStore();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [contactingAuthorId, setContactingAuthorId] = useState<string | null>(null);

  useEffect(() => {
    fetchInspiration();
  }, []);

  const handleSearchSubmit = () => {
    setSearchQuery(localSearch);
  };

  const handleSearchClear = () => {
    setLocalSearch('');
    setSearchQuery('');
  };

  const handleRefresh = () => {
    fetchInspiration(undefined, true);
  };

  const handleContactAuthor = async (item: InspirationItem) => {
    if (!item.author?.id) return;
    setContactingAuthorId(item.id);
    try {
      const conv = await createOrGetConversation(item.author.id);
      navigation.navigate('ChatRoom', {
        conversationId: conv.id,
        otherParticipant: {
          id: item.author.id,
          name: item.author.name || 'Viatger Felagi',
          avatar_url: item.author.avatar_url,
          origin_summary: item.author.town_name || item.author.country_name || 'Catalunya',
        },
      });
    } catch (err) {
      // Fallback: direct navigation with author params
      navigation.navigate('ChatRoom', {
        userId: item.author.id,
        otherParticipant: {
          id: item.author.id,
          name: item.author.name || 'Viatger Felagi',
          avatar_url: item.author.avatar_url,
          origin_summary: item.author.town_name || item.author.country_name || 'Catalunya',
        },
      });
    } finally {
      setContactingAuthorId(null);
    }
  };

  const renderItineraryCard = (item: InspirationItem) => {
    const isContacting = contactingAuthorId === item.id;
    const authorLocation = [item.author.town_name, item.author.region_name]
      .filter(Boolean)
      .join(', ');

    return (
      <Card style={styles.card} mode="elevated">
        {item.cover_image_url ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.cover_image_url }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={styles.badgeDays}>
              <Text style={styles.badgeDaysText}>
                ⏱️ {item.total_days ? `${item.total_days} dies` : 'Ruta'}
              </Text>
            </View>
            {item.destination_name ? (
              <View style={styles.badgeDest}>
                <Text style={styles.badgeDestText}>
                  {item.flag_emoji || '✈️'} {item.destination_name}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Card.Content style={styles.cardContent}>
          <View style={styles.typeRow}>
            <Text style={styles.typeBadgeItinerary}>🗺️ ITINERARI COMPLET</Text>
          </View>

          <Text variant="titleMedium" style={styles.itemTitle}>
            {item.title}
          </Text>

          {item.description ? (
            <Text variant="bodyMedium" style={styles.itemDesc} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}

          {/* Etapes del viatge */}
          {item.stages && item.stages.length > 0 ? (
            <View style={styles.stagesBox}>
              <Text variant="labelSmall" style={styles.stagesLabel}>
                ETAPES DE LA RUTA:
              </Text>
              <View style={styles.stagesList}>
                {item.stages.map((stage, idx) => (
                  <View key={stage.id || idx} style={styles.stageTag}>
                    <Text style={styles.stageIndex}>{idx + 1}</Text>
                    <Text style={styles.stageName} numberOfLines={1}>
                      {stage.destination_name}
                    </Text>
                    {idx < (item.stages?.length ?? 0) - 1 ? (
                      <Text style={styles.stageArrow}>➔</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Autor i acció */}
          <View style={styles.itineraryFooter}>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>
                👤 {item.author.is_anonymous ? 'Autor anònim Felagi' : item.author.name || 'Felagi'}
              </Text>
              {authorLocation ? (
                <Text style={styles.authorTown}>📍 {authorLocation}</Text>
              ) : (
                <Text style={styles.authorTown}>📍 Comunitat Felag</Text>
              )}
            </View>

            <Button
              mode="contained"
              buttonColor="#C85A32"
              onPress={() => handleContactAuthor(item)}
              loading={isContacting}
              disabled={isContacting}
              style={styles.chatButton}
              labelStyle={styles.chatButtonLabel}
              icon="chat-outline"
            >
              Contactar
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderRecommendationCard = (item: InspirationItem) => {
    const isVoted = !!item.user_has_voted;
    const votesCount = item.useful_votes_count || 0;
    const authorLocation = [item.author.town_name, item.author.region_name]
      .filter(Boolean)
      .join(', ');

    const categoryLabels: Record<string, string> = {
      food: '🍽️ Gastronomia',
      hidden_gem: '💎 Racó Secret',
      practical_tip: '💡 Consell Pràctic',
      transport: '🚆 Transport',
      anecdote: '📖 Anècdota',
    };

    const categoryText = (item.category && categoryLabels[item.category]) || '💡 Recomanació';

    return (
      <Card style={styles.card} mode="elevated">
        {item.image_url ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.image_url }}
              style={styles.cardImageRec}
              resizeMode="cover"
            />
            <View style={styles.badgeCategory}>
              <Text style={styles.badgeCategoryText}>{categoryText}</Text>
            </View>
          </View>
        ) : null}

        <Card.Content style={styles.cardContent}>
          {!item.image_url && (
            <View style={styles.typeRow}>
              <Text style={styles.typeBadgeRec}>{categoryText}</Text>
            </View>
          )}

          <Text variant="titleMedium" style={styles.itemTitle}>
            {item.title}
          </Text>

          {item.location_name || item.destination_name ? (
            <Text style={styles.locationLine}>
              📍 {item.location_name || item.destination_name}
            </Text>
          ) : null}

          {item.description ? (
            <Text variant="bodyMedium" style={styles.itemDesc}>
              {item.description}
            </Text>
          ) : null}

          {/* Footer amb vot d'aval i autor */}
          <View style={styles.recFooter}>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>
                👤 {item.author.name || 'Viatger Felagi'}
              </Text>
              {authorLocation ? (
                <Text style={styles.authorTown}>📍 {authorLocation}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.voteButton, isVoted && styles.voteButtonActive]}
              onPress={() => toggleVote(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.voteEmoji}>{isVoted ? '👍' : '👍🏻'}</Text>
              <Text style={[styles.voteText, isVoted && styles.voteTextActive]}>
                Avalat {votesCount > 0 ? `(${votesCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderItem = ({ item }: { item: InspirationItem }) => {
    if (item.type === 'itinerary') {
      return renderItineraryCard(item);
    }
    return renderRecommendationCard(item);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Searchbar */}
      <Searchbar
        placeholder="Cerca destinacions, pobles o rutes..."
        value={localSearch}
        onChangeText={setLocalSearch}
        onSubmitEditing={handleSearchSubmit}
        onClearIconPress={handleSearchClear}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
        iconColor="#C85A32"
        elevation={1}
      />

      {/* Horizontal Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <Chip
              key={cat.id}
              selected={isSelected}
              onPress={() => setCategory(cat.id as InspirationCategory)}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipUnselected,
              ]}
              textStyle={[
                styles.chipText,
                isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
              ]}
              showSelectedOverlay={false}
            >
              {cat.emoji} {cat.label}
            </Chip>
          );
        })}
      </ScrollView>

      {error ? (
        <HelperText type="error" visible style={styles.errorText}>
          {error}
        </HelperText>
      ) : null}
    </View>
  );

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#C85A32" />
          <Text style={styles.footerLoaderText}>Carregant més idees...</Text>
        </View>
      );
    }
    return <View style={{ height: 20 }} />;
  };

  return (
    <View style={styles.container}>
      {/* App Top Bar */}
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.headerMainTitle}>💡 Inspiració de Viatge</Text>
          <Text style={styles.headerSubtitle}>
            Descobreix rutes i consells verificats per la comunitat
          </Text>
        </View>
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#C85A32" />
          <Text style={styles.loadingText}>Carregant propostes d'inspiració...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#C85A32']}
              tintColor="#C85A32"
            />
          }
          ListEmptyComponent={
            !isLoading ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <Text style={styles.emptyEmoji}>🔍</Text>
                  <Text variant="titleMedium" style={styles.emptyTitle}>
                    Cap resultat trobat
                  </Text>
                  <Text variant="bodySmall" style={styles.emptySubtitle}>
                    Prova de canviar els filtres o cercar una altra destinació.
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      handleSearchClear();
                      setCategory('all');
                    }}
                    textColor="#C85A32"
                    style={{ marginTop: 12, borderColor: '#C85A32' }}
                  >
                    Restablir filtres
                  </Button>
                </Card.Content>
              </Card>
            ) : null
          }
        />
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
  },
  headerMainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C221E',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#786C65',
    marginTop: 2,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchbar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 46,
    borderColor: '#E8E2D9',
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 46,
    alignSelf: 'center',
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    marginRight: 4,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: '#C85A32',
    borderColor: '#C85A32',
  },
  chipUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextUnselected: {
    color: '#52433D',
  },
  errorText: {
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderColor: '#E8E2D9',
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 170,
    backgroundColor: '#EAE3D9',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageRec: {
    width: '100%',
    height: '100%',
  },
  badgeDays: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(44, 34, 30, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeDaysText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeDest: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(200, 90, 50, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeDestText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeCategory: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(44, 34, 30, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCategoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    padding: 14,
  },
  typeRow: {
    marginBottom: 6,
  },
  typeBadgeItinerary: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C85A32',
    letterSpacing: 0.5,
  },
  typeBadgeRec: {
    fontSize: 12,
    fontWeight: '700',
    color: '#703817',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C221E',
    lineHeight: 22,
    marginBottom: 6,
  },
  locationLine: {
    fontSize: 12,
    color: '#703817',
    fontWeight: '600',
    marginBottom: 6,
  },
  itemDesc: {
    fontSize: 13,
    color: '#52433D',
    lineHeight: 19,
    marginBottom: 10,
  },
  stagesBox: {
    backgroundColor: '#F7F3EC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderColor: '#E8E2D9',
    borderWidth: 1,
  },
  stagesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#786C65',
    marginBottom: 6,
  },
  stagesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  stageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderColor: '#DDCFBF',
    borderWidth: 1,
  },
  stageIndex: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C85A32',
    marginRight: 4,
  },
  stageName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2C221E',
  },
  stageArrow: {
    fontSize: 10,
    color: '#A0938A',
    marginLeft: 6,
  },
  itineraryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0EAE1',
    paddingTop: 10,
    marginTop: 4,
  },
  recFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0EAE1',
    paddingTop: 10,
    marginTop: 4,
  },
  authorInfo: {
    flex: 1,
    marginRight: 10,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C221E',
  },
  authorTown: {
    fontSize: 11,
    color: '#786C65',
    marginTop: 1,
  },
  chatButton: {
    borderRadius: 20,
  },
  chatButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 0,
    marginHorizontal: 8,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4ECE1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderColor: '#DDCFBF',
    borderWidth: 1,
    gap: 5,
  },
  voteButtonActive: {
    backgroundColor: '#FFE8DF',
    borderColor: '#C85A32',
  },
  voteEmoji: {
    fontSize: 14,
  },
  voteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#703817',
  },
  voteTextActive: {
    color: '#C85A32',
    fontWeight: '700',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#786C65',
    fontSize: 13,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 12,
    color: '#786C65',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 12,
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
