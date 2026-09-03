import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuthStore } from '@/modules/auth/store';
import LoginScreen from '@/modules/auth/screens/LoginScreen';
import RegisterScreen from '@/modules/auth/screens/RegisterScreen';
import ProfileScreen from '@/modules/profile/screens/ProfileScreen';
import OriginSelectorScreen from '@/modules/profile/screens/OriginSelectorScreen';
import TripsListScreen from '@/modules/trips/screens/TripsListScreen';
import TripCreateScreen from '@/modules/trips/screens/TripCreateScreen';
import TripDetailScreen from '@/modules/trips/screens/TripDetailScreen';

export default function AppNavigation() {
  const { isAuthenticated } = useAuthStore();
  const [screenStack, setScreenStack] = useState<{ name: string; params?: any }[]>([
    { name: 'TripsList' },
  ]);

  const current = screenStack[screenStack.length - 1] || { name: 'TripsList' };
  const currentScreen = current.name;
  const currentParams = current.params;

  const navigate = (screenName: string, params?: any) => {
    // If switching between bottom tabs, replace stack
    if (screenName === 'TripsList' || screenName === 'Profile') {
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

  const isMainTab = currentScreen === 'TripsList' || currentScreen === 'Profile';

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
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
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
