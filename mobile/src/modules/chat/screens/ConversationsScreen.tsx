import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useChatStore } from '../store';
import { Conversation } from '../types';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export default function ConversationsScreen({ navigation }: Props) {
  const {
    conversations,
    isLoadingConversations,
    fetchConversations,
  } = useChatStore();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = () => {
    fetchConversations();
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatMessageTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

      if (isToday) {
        return date.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
      } else if (isYesterday) {
        return 'Ahir';
      } else {
        return date.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
      }
    } catch {
      return '';
    }
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const isUnread = item.unread_count > 0;
    const initials = getInitials(item.other_participant.name);

    return (
      <TouchableOpacity
        style={[styles.convItem, isUnread && styles.convItemUnread]}
        onPress={() =>
          navigation.navigate('ChatRoom', {
            conversationId: item.id,
            otherParticipant: item.other_participant,
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.userLeft}>
          {item.other_participant.avatar_url ? (
            <Image
              source={{ uri: item.other_participant.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}

          <View style={styles.userInfo}>
            <Text style={styles.nameLine} numberOfLines={1}>
              {item.other_participant.name}
            </Text>
            {item.other_participant.origin_summary ? (
              <Text style={styles.originLine} numberOfLines={1}>
                📍 {item.other_participant.origin_summary}
              </Text>
            ) : null}
            <Text
              style={[styles.msgPreview, isUnread && styles.msgPreviewUnread]}
              numberOfLines={1}
            >
              {item.last_message_preview || 'Cap missatge encara'}
            </Text>
          </View>
        </View>

        <View style={styles.rightCol}>
          <Text style={styles.time}>{formatMessageTime(item.last_message_at)}</Text>
          {isUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.unread_count > 9 ? '9+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.appHeader}>
        <Text style={styles.headerTitle}>Missatges</Text>
        <Text style={styles.headerSecBadge}>🔒 AES-256</Text>
      </View>

      {/* Content */}
      {isLoadingConversations && conversations.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#C85A32" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            conversations.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoadingConversations}
              onRefresh={onRefresh}
              colors={['#C85A32']}
              tintColor="#C85A32"
            />
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  Cap conversa oberta
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtitle}>
                  Quan trobis coincidències amb altres FELAGIS als teus viatges, podràs iniciar
                  converses privades i xifrades d'extrem a extrem en repòs.
                </Text>
              </Card.Content>
            </Card>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C221E',
  },
  headerSecBadge: {
    fontSize: 11,
    color: '#786C65',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  convItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convItemUnread: {
    backgroundColor: '#FFF9F4',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F4ECE1',
    borderWidth: 2,
    borderColor: '#C85A32',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#C85A32',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#703817',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  nameLine: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C221E',
  },
  originLine: {
    fontSize: 11,
    color: '#703817',
    fontWeight: '600',
    marginTop: 1,
  },
  msgPreview: {
    fontSize: 12,
    color: '#786C65',
    marginTop: 2,
  },
  msgPreviewUnread: {
    color: '#2C221E',
    fontWeight: '600',
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 0,
  },
  time: {
    fontSize: 11,
    color: '#786C65',
  },
  badge: {
    backgroundColor: '#C85A32',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
    borderWidth: 1,
    borderRadius: 12,
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
