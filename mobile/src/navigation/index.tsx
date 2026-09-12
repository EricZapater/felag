import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import InspirationScreen from '@/modules/inspiration/screens/InspirationScreen';
import DestinationsListScreen from '@/modules/community/screens/DestinationsListScreen';
import DestinationDetailScreen from '@/modules/community/screens/DestinationDetailScreen';
import RecommendationCreateScreen from '@/modules/community/screens/RecommendationCreateScreen';
import LiveFeedScreen from '@/modules/community/screens/LiveFeedScreen';
import TripGalleryScreen from '@/modules/posttrip/screens/TripGalleryScreen';
import CelebrationCardScreen from '@/modules/posttrip/screens/CelebrationCardScreen';
import TripWrapupScreen from '@/modules/posttrip/screens/TripWrapupScreen';
import InstagramStoriesScreen from '@/modules/posttrip/screens/InstagramStoriesScreen';
import ExploreDestinationsScreen from '@/modules/explore/screens/ExploreDestinationsScreen';

export default function AppNavigation() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, accessToken, isAutoLoggingIn, autoLoginSilent } = useAuthStore();
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
    autoLoginSilent();
  }, []);

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
  }, [isAuthenticated, accessToken]);

  const current = screenStack[screenStack.length - 1] || { name: 'TripsList' };
  const currentScreen = current.name;
  const currentParams = current.params;

  const navigate = (screenName: string, params?: any) => {
    // If switching between bottom tabs, replace stack
    if (
      screenName === 'TripsList' ||
      screenName === 'Inspiration' ||
      screenName === 'InspirationScreen' ||
      screenName === 'Conversations' ||
      screenName === 'Profile'
    ) {
      const normalizedName = screenName === 'InspirationScreen' ? 'Inspiration' : screenName;
      setScreenStack([{ name: normalizedName, params }]);
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

  if (isAutoLoggingIn) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Text style={{ fontSize: 28, marginBottom: 12 }}>✈️</Text>
        <Text style={{ color: '#786C65', fontSize: 13, fontWeight: '600' }}>
          Connectant a FELAG...
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {currentScreen === 'Register' ? (
          <RegisterScreen navigation={navigation} />
        ) : (
          <LoginScreen navigation={navigation} />
        )}
      </View>
    );
  }

  const getActiveTab = (
    screen: string
  ): 'trips' | 'inspiration' | 'chats' | 'profile' | null => {
    switch (screen) {
      case 'TripsList':
      case 'TripCreate':
      case 'TripDetail':
      case 'TripMatches':
      case 'TripGallery':
      case 'CelebrationCard':
      case 'TripWrapup':
      case 'InstagramStories':
        return 'trips';

      case 'Inspiration':
      case 'InspirationScreen':
      case 'ExploreDestinations':
      case 'DestinationsList':
      case 'DestinationDetail':
      case 'RecommendationCreate':
      case 'LiveFeed':
        return 'inspiration';

      case 'Conversations':
      case 'PublicProfile':
        return 'chats';

      case 'Notifications':
      case 'Profile':
      case 'OriginSelector':
        return 'profile';

      case 'ChatRoom':
        return null; // hide bottom menu in individual chat room so keyboard/input area is optimal

      default:
        return 'trips';
    }
  };

  const activeTab = getActiveTab(currentScreen);
  const showBottomNav = activeTab !== null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
        {(currentScreen === 'Inspiration' || currentScreen === 'InspirationScreen') && (
          <InspirationScreen navigation={navigation} />
        )}
        {currentScreen === 'ExploreDestinations' && (
          <ExploreDestinationsScreen navigation={navigation} />
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
        {currentScreen === 'TripGallery' && (
          <TripGalleryScreen navigation={navigation} route={{ params: currentParams }} />
        )}
        {currentScreen === 'CelebrationCard' && (
          <CelebrationCardScreen navigation={navigation} route={{ params: currentParams }} />
        )}
        {currentScreen === 'TripWrapup' && (
          <TripWrapupScreen navigation={navigation} route={{ params: currentParams }} />
        )}
        {currentScreen === 'InstagramStories' && (
          <InstagramStoriesScreen navigation={navigation} route={{ params: currentParams }} />
        )}
      </View>

      {/* Simplified Bottom Navigation Bar - 4 Clean Tabs */}
      {showBottomNav && (
        <View
          style={[
            styles.navBar,
            {
              paddingBottom: Math.max(insets.bottom, 4),
              height: 56 + Math.max(insets.bottom, 4),
            },
          ]}
        >
          {/* 1. ✈️ Viatges */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigate('TripsList')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, activeTab === 'trips' && styles.navActiveText]}>
              ✈️
            </Text>
            <Text style={[styles.navLabel, activeTab === 'trips' && styles.navActiveText]}>
              Viatges
            </Text>
          </TouchableOpacity>

          {/* 2. 💡 Inspiració */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigate('Inspiration')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navIcon,
                activeTab === 'inspiration' && styles.navActiveText,
              ]}
            >
              💡
            </Text>
            <Text
              style={[
                styles.navLabel,
                activeTab === 'inspiration' && styles.navActiveText,
              ]}
            >
              Inspiració
            </Text>
          </TouchableOpacity>

          {/* 3. 💬 Xats */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigate('Conversations')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text
                style={[
                  styles.navIcon,
                  activeTab === 'chats' && styles.navActiveText,
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
                activeTab === 'chats' && styles.navActiveText,
              ]}
            >
              Xats
            </Text>
          </TouchableOpacity>

          {/* 4. 👤 Perfil & Avisos */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigate('Profile')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text style={[styles.navIcon, activeTab === 'profile' && styles.navActiveText]}>
                👤
              </Text>
              {unreadCount > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.navLabel, activeTab === 'profile' && styles.navActiveText]}>
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
    fontSize: 19,
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
    fontSize: 11,
    color: '#786C65',
    fontWeight: '500',
  },
  navActiveText: {
    color: '#C85A32',
    fontWeight: 'bold',
  },
});
