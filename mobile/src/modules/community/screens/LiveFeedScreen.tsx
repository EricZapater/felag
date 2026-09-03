import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, HelperText, IconButton, Text, TextInput } from 'react-native-paper';
import { useLiveFeedStore } from '../store';
import { LiveMoment, PhotoSharingMode, ReportReason } from '../types';
import ArrivalPromptModal from '../components/ArrivalPromptModal';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      destinationId?: string;
      destinationName?: string;
      tripId?: string;
    };
  };
}

export default function LiveFeedScreen({ navigation, route }: Props) {
  const destinationId = route?.params?.destinationId || '';
  const destinationName = route?.params?.destinationName || 'Destinació';
  const tripId = route?.params?.tripId;

  const {
    moments,
    activeFelagisCount,
    isLoading,
    isPosting,
    error,
    fetchLiveFeed,
    createLiveMoment,
    updatePhotoSharingMode,
  } = useLiveFeedStore();

  const [refreshing, setRefreshing] = useState(false);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [postError, setPostError] = useState('');

  useEffect(() => {
    if (destinationId) {
      fetchLiveFeed(destinationId);
    }
  }, [destinationId]);

  const onRefresh = async () => {
    if (!destinationId) return;
    setRefreshing(true);
    await fetchLiveFeed(destinationId);
    setRefreshing(false);
  };

  const handleCreatePost = async () => {
    if (!imageUrl.trim()) {
      setPostError("L'enllaç de la imatge és obligatori.");
      return;
    }
    setPostError('');
    try {
      await createLiveMoment(destinationId, {
        image_url: imageUrl.trim(),
        caption: caption.trim() ? caption.trim() : undefined,
      });
      setImageUrl('');
      setCaption('');
      setPostModalVisible(false);
      Alert.alert('Publicat! 📸', 'La teva foto ja és visible al feed en directe.');
    } catch (err: any) {
      setPostError(err.message || 'Error en publicar la imatge.');
    }
  };

  const handleReportMoment = (moment: LiveMoment) => {
    Alert.alert(
      'Denunciar foto',
      'Vols denunciar aquesta publicació com a inapropiada?',
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Spam',
          onPress: () => submitReport(moment.id, 'spam'),
        },
        {
          text: 'Contingut inapropiat',
          onPress: () => submitReport(moment.id, 'inappropriate_content'),
          style: 'destructive',
        },
      ]
    );
  };

  const submitReport = (id: string, reason: ReportReason) => {
    Alert.alert('Gràcies', 'Hem rebut la teva denúncia per a la revisió de moderació.');
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'fa una estona';
      if (diffHours < 24) return `fa ${diffHours}h`;
      return `fa ${Math.floor(diffHours / 24)}d`;
    } catch {
      return '';
    }
  };

  const renderMomentItem = ({ item }: { item: LiveMoment }) => {
    return (
      <Card style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postUserRow}>
          <View style={styles.authorInfo}>
            <Text style={styles.postAuthorName}>{item.author.name}</Text>
            {item.author.town_name || item.author.region_name ? (
              <View style={styles.originPill}>
                <Text style={styles.originPillText}>
                  📍 {item.author.town_name || item.author.region_name}
                </Text>
              </View>
            ) : null}
          </View>

          <IconButton
            icon="dots-horizontal"
            size={18}
            iconColor="#786C65"
            onPress={() => handleReportMoment(item)}
            style={{ margin: 0 }}
          />
        </View>

        {/* Image */}
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.postImage}
            resizeMode="cover"
          />
        ) : null}

        {/* Caption */}
        {item.caption ? (
          <View style={styles.postCaptionBox}>
            <Text style={styles.postCaptionText}>
              {item.caption}{' '}
              <Text style={styles.postTimeText}>({formatTimeAgo(item.created_at)})</Text>
            </Text>
          </View>
        ) : (
          <View style={styles.postCaptionBox}>
            <Text style={styles.postTimeText}>{formatTimeAgo(item.created_at)}</Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Enrere</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>📸 {destinationName} en Viu</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>EN DIRECTE</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>
            {activeFelagisCount || 0} FELAGIS a la ciutat
          </Text>
        </View>

        <TouchableOpacity
          style={styles.privacyBtn}
          onPress={() => setPrivacyModalVisible(true)}
        >
          <Text style={styles.privacyIcon}>🔒</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <HelperText type="error" visible style={{ paddingHorizontal: 16 }}>
          {error}
        </HelperText>
      ) : null}

      {isLoading && !refreshing && moments.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#C85A32" />
        </View>
      ) : (
        <FlatList
          data={moments}
          keyExtractor={(item) => item.id}
          renderItem={renderMomentItem}
          contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#C85A32"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📷</Text>
              <Text style={styles.emptyTitle}>Cap foto en directe encara</Text>
              <Text style={styles.emptyText}>
                Sigues el primer FELAGI en compartir una foto d'aquest viatge!
              </Text>
              <Button
                mode="contained"
                buttonColor="#C85A32"
                icon="camera"
                onPress={() => setPostModalVisible(true)}
                style={{ marginTop: 16, borderRadius: 20 }}
              >
                Publicar primera foto
              </Button>
            </View>
          }
        />
      )}

      {/* Floating Action Button (Camera) */}
      <TouchableOpacity
        style={styles.fabCam}
        activeOpacity={0.85}
        onPress={() => setPostModalVisible(true)}
      >
        <Text style={styles.fabCamIcon}>📷</Text>
      </TouchableOpacity>

      {/* Modal to Post Live Moment */}
      <Modal visible={postModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Compartir Moment en Viu 📸
              </Text>
              <Text style={styles.modalSubtitle}>
                Aquesta foto serà visible per als FELAGIS que estan a {destinationName} ara mateix.
              </Text>

              {postError ? (
                <HelperText type="error" visible>
                  {postError}
                </HelperText>
              ) : null}

              <TextInput
                label="URL de la imatge *"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChangeText={setImageUrl}
                style={styles.input}
                activeOutlineColor="#C85A32"
                mode="outlined"
              />

              <TextInput
                label="Peu de foto (opcional)"
                placeholder="Ex: Gaudiant del capvespre des del mirador..."
                value={caption}
                onChangeText={setCaption}
                maxLength={280}
                multiline
                numberOfLines={2}
                style={styles.input}
                activeOutlineColor="#C85A32"
                mode="outlined"
              />

              <View style={styles.modalActions}>
                <Button
                  mode="text"
                  onPress={() => setPostModalVisible(false)}
                  textColor="#786C65"
                >
                  Cancel·lar
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#C85A32"
                  onPress={handleCreatePost}
                  loading={isPosting}
                  disabled={isPosting}
                >
                  Publicar
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>

      {/* Arrival Prompt / Privacy Settings Modal */}
      <ArrivalPromptModal
        visible={privacyModalVisible}
        destinationName={destinationName}
        onClose={() => setPrivacyModalVisible(false)}
        onSave={async (mode: PhotoSharingMode) => {
          if (tripId) {
            await updatePhotoSharingMode(tripId, mode);
          }
          Alert.alert('Privadesa actualitzada', 'El teu mode de fotos en directe s’ha desat.');
        }}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  backText: {
    color: '#C85A32',
    fontWeight: 'bold',
    fontSize: 15,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2C221E',
  },
  liveBadge: {
    backgroundColor: '#E65100',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    color: '#6B5E57',
    marginTop: 1,
  },
  privacyBtn: {
    padding: 6,
    backgroundColor: '#FAF7F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  privacyIcon: {
    fontSize: 16,
  },
  feedContent: {
    padding: 16,
    paddingBottom: 90,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 1,
  },
  postUserRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postAuthorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C221E',
  },
  originPill: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  originPillText: {
    color: '#E65100',
    fontSize: 11,
    fontWeight: '700',
  },
  postImage: {
    width: '100%',
    height: 260,
    backgroundColor: '#E8E2D9',
  },
  postCaptionBox: {
    padding: 12,
  },
  postCaptionText: {
    fontSize: 13,
    color: '#2C221E',
    lineHeight: 18,
  },
  postTimeText: {
    fontSize: 12,
    color: '#786C65',
  },
  fabCam: {
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
  fabCamIcon: {
    fontSize: 24,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 64,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2C221E',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B5E57',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 34, 30, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  modalTitle: {
    fontWeight: '800',
    color: '#2C221E',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B5E57',
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
