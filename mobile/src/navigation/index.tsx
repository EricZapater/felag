import React from 'react';
import { useAuthStore } from '@/modules/auth/store';
import LoginScreen from '@/modules/auth/screens/LoginScreen';
import RegisterScreen from '@/modules/auth/screens/RegisterScreen';
import ProfileScreen from '@/modules/profile/screens/ProfileScreen';
import OriginSelectorScreen from '@/modules/profile/screens/OriginSelectorScreen';
import { View, StyleSheet } from 'react-native';

export default function AppNavigation() {
  const { isAuthenticated } = useAuthStore();
  const [currentScreen, setCurrentScreen] = React.useState<string>('Login');

  const navigation = {
    navigate: (screenName: string) => setCurrentScreen(screenName),
    goBack: () => setCurrentScreen('Profile'),
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

  return (
    <View style={styles.container}>
      {currentScreen === 'OriginSelector' ? (
        <OriginSelectorScreen navigation={navigation} />
      ) : (
        <ProfileScreen navigation={navigation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F6F0',
  },
});
