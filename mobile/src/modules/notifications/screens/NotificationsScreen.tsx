import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, HelperText, Text } from 'react-native-paper';
import { useNotificationsStore } from '../store';
import { Notification, NotificationType } from '../types';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack?: () => void;
  };
}

export default function NotificationsScreen({ navigation }: Props) {
  const { notifications, unreadCount, isLoading, error, fetchNotifications, markAsRead, markAllAsRead } =
    useNotificationsStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    fetchNotifications();
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      if (diffMs < 0) return 'Ara mateix';
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Ara mateix';
      if (diffMins === 1) return 'Fa 1 minut';
      if (diffMins < 60) return `Fa ${diffMins} minuts`;
      if (diffHours === 1) return 'Fa 1 hora';
      if (diffHours < 24) return `Fa ${diffHours} hores`;
      if (diffDays === 1) return 'Fa 1 dia';
      if (diffDays < 7) return `Fa ${diffDays} dies`;
      return d.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'new_match':
        return '✨';
      case 'trip_reminder':
        return '✈️';
      case 'system':
      default:
        return '👋';
    }
  };

  const handleNotificationPress = async (notif: Notification) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }

    if (notif.data?.trip_id) {
      navigation.navigate('TripMatches', { tripId: notif.data.trip_id });
    } else if (notif.type === 'trip_reminder' && notif.data?.trip_id) {
      navigation.navigate('TripDetail', { tripId: notif.data.trip_id });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Notificacions
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => markAllAsRead()} style={styles.readAllBtn}>
            <Text style={styles.readAllText}>Llegir tot</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <HelperText type="error" visible style={{ paddingHorizontal: 16 }}>
          {error}
        </HelperText>
      ) : null}

      {isLoading && notifications.length === 0 ? (
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
          {notifications.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>🔔</Text>
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  No tens cap avís
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtitle}>
                  T'avisarem immediatament quan trobem coincidències amb altres FELAGIS o recordatoris
                  dels teus viatges.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            notifications.map((notif) => (
              <TouchableOpacity
                key={notif.id}
                activeOpacity={0.7}
                onPress={() => handleNotificationPress(notif)}
                style={[styles.notifItem, !notif.read && styles.notifItemUnread]}
              >
                <View style={styles.notifIcon}>
                  <Text style={{ fontSize: 18 }}>{getNotificationIcon(notif.type)}</Text>
                </View>

                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifBody}>{notif.body}</Text>
                  <Text style={styles.notifTime}>{formatRelativeTime(notif.created_at)}</Text>
                </View>

                {!notif.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#2C221E',
    fontWeight: 'bold',
  },
  readAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  readAllText: {
    fontSize: 13,
    color: '#C85A32',
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  notifItem: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notifItemUnread: {
    backgroundColor: '#FFF9F4',
  },
  notifIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4ECE1',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C221E',
    marginBottom: 2,
  },
  notifBody: {
    fontSize: 12,
    color: '#4A3E39',
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    color: '#786C65',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C85A32',
    marginTop: 4,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2D9',
    borderWidth: 1,
    borderRadius: 12,
    margin: 16,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
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
