import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuthStore } from '@/modules/auth/store';
import { useNotificationsStore } from '@/modules/notifications/store';
import { useChatStore } from '@/modules/chat/store';
import LoginScreen from '@/modules/auth/screens/LoginScreen';
import RegisterScreen from '@/modules/auth/screens/RegisterScreen';
import ProfileScreen from '@/modules/profile/screens/ProfileScreen';
import OriginSelectorScreen from '@/modules/profile/screens/OriginSelectorScreen';
import TripsListScreen from '@/modules/trips/screens/TripsListScreen';
import TripCreateScreen from '@/modules/trips/screens/TripCreateScreen';
import TripDetailScreen from '@/modules/trips/screens/TripDetailScreen';
import TripMatchesScreen from '@/modules/matching/screens/TripMatchesScreen';
import NotificationsScreen from '@/modules/notifications/screens/NotificationsScreen';
import ConversationsScreen from '@/modules/chat/screens/ConversationsScreen';
import ChatRoomScreen from '@/modules/chat/screens/ChatRoomScreen';
import PublicProfileScreen from '@/modules/users/screens/PublicProfileScreen';
import DestinationsListScreen from '@/modules/community/screens/DestinationsListScreen';
import DestinationDetailScreen from '@/modules/community/screens/DestinationDetailScreen';
import RecommendationCreateScreen from '@/modules/community/screens/RecommendationCreateScreen';
import LiveFeedScreen from '@/modules/community/screens/LiveFeedScreen';

export default function AppNavigation() {
  const { isAuthenticated, accessToken } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationsStore();
  const {
    totalUnreadCount: unreadChatCount,
    fetchConversations,
    initWebSocket,
    closeWebSocket,
  } = useChatStore();

  const [screenStack, setScreenStack] = useState<{ name: string; params?: any }[]>([
    { name: 'TripsList' },
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchConversations();
      if (accessToken) {
        initWebSocket(accessToken);
      }
    } else {
      closeWebSocket();
    }

    return () => {
      closeWebSocket();
    };
  }, [isAuthenticated, accessToken, fetchNotifications, fetchConversations, initWebSocket, closeWebSocket]);

  const current = screenStack[screenStack.length - 1] || { name: 'TripsList' };
  const currentScreen = current.name;
  const currentParams = current.params;

  const navigate = (screenName: string, params?: any) => {
    // If switching between bottom tabs, replace stack
    if (
      screenName === 'TripsList' ||
      screenName === 'DestinationsList' ||
      screenName === 'Conversations' ||
      screenName === 'Notifications' ||
      screenName === 'Profile'
    ) {
      setScreenStack([{ name: screenName, params }]);
    } else {
      setScreenStack((prev) => [...prev, { name: screenName, params }]);
    }
  };

  const goBack = () => {
    setScreenStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : [{ name: 'TripsList' }]));
  };

  const navigation = {
    navigate,
    goBack,
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        {currentScreen === 'Register' ? (
          <RegisterScreen navigation={navigation} />
        ) : (
          <LoginScreen navigation={navigation} />
        )}
      </View>
    );
  }

  const isMainTab =
    currentScreen === 'TripsList' ||
    currentScreen === 'DestinationsList' ||
    currentScreen === 'Conversations' ||
    currentScreen === 'Notifications' ||
    currentScreen === 'Profile';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {currentScreen === 'TripsList' && <TripsListScreen navigation={navigation} />}
        {currentScreen === 'TripCreate' && (
          <TripCreateScreen navigation={navigation} route={{ params: currentParams }} />
        )}
        {currentScreen === 'TripDetail' && (
          <TripDetailScreen navigation={navigation} route={{ params: currentParams }} />
        )}
        {currentScreen === 'TripMatches' && (
          <TripMatchesScreen navigation={navigation} route={{ params: currentParams }} />
        )}
        {currentScreen === 'DestinationsList' && (
          <DestinationsListScreen navigation={navigation} />
        )}
        {currentScreen === 'DestinationDetail' && (
          <DestinationDetailScreen navigation={navigation} route={{ params: currentParams }} />
        )}
        {currentScreen === 'RecommendationCreate' && (
          <RecommendationCreateScreen navigation={navigation} route={{ params: currentParams }} />
        )}
        {currentScreen === 'LiveFeed' && (
          <LiveFeedScreen navigation={navigation} route={{ params: currentParams }} />
        )}
        {currentScreen === 'Conversations' && <ConversationsScreen navigation={navigation} />}
        {currentScreen === 'ChatRoom' && (
          <ChatRoomScreen navigation={navigation} route={{ params: currentParams }} />
        )}
        {currentScreen === 'PublicProfile' && (
          <PublicProfileScreen navigation={navigation} route={{ params: currentParams }} />
        )}
        {currentScreen === 'Notifications' && <NotificationsScreen navigation={navigation} />}
        {currentScreen === 'Profile' && <ProfileScreen navigation={navigation} />}
        {currentScreen === 'OriginSelector' && <OriginSelectorScreen navigation={navigation} />}
      </View>

      {/* Bottom Navigation Bar */}
      {isMainTab && (
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigate('TripsList')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, currentScreen === 'TripsList' && styles.navActiveText]}>
              ✈️
            </Text>
            <Text style={[styles.navLabel, currentScreen === 'TripsList' && styles.navActiveText]}>
              Viatges
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigate('DestinationsList')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navIcon,
                currentScreen === 'DestinationsList' && styles.navActiveText,
              ]}
            >
              🗺️
            </Text>
            <Text
              style={[
                styles.navLabel,
                currentScreen === 'DestinationsList' && styles.navActiveText,
              ]}
            >
              Destins
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigate('Conversations')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text
                style={[
                  styles.navIcon,
                  currentScreen === 'Conversations' && styles.navActiveText,
                ]}
              >
                💬
              </Text>
              {unreadChatCount > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.navLabel,
                currentScreen === 'Conversations' && styles.navActiveText,
              ]}
            >
              Xats
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigate('Notifications')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text
                style={[
                  styles.navIcon,
                  currentScreen === 'Notifications' && styles.navActiveText,
                ]}
              >
                🔔
              </Text>
              {unreadCount > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.navLabel,
                currentScreen === 'Notifications' && styles.navActiveText,
              ]}
            >
              Avisos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigate('Profile')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, currentScreen === 'Profile' && styles.navActiveText]}>
              👤
            </Text>
            <Text style={[styles.navLabel, currentScreen === 'Profile' && styles.navActiveText]}>
              Perfil
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F6F0',
  },
  content: {
    flex: 1,
  },
  navBar: {
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E2D9',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#C85A32',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  navLabel: {
    fontSize: 12,
    color: '#786C65',
    fontWeight: '500',
  },
  navActiveText: {
    color: '#C85A32',
    fontWeight: 'bold',
  },
});
