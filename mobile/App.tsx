import React, { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppNavigation from './src/navigation';

// Suppress benign development warnings in React Native Paper and Expo Vector Icons
LogBox.ignoreLogs([
  'Font with family name',
  'already loaded',
  'when setting overflow to hidden on surface',
  'overflow to hidden on surface',
]);

const renderPaperIcon = (props: any) => <MaterialCommunityIcons {...props} />;

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadAppFonts() {
      try {
        if (!Font.isLoaded('material-community')) {
          await Font.loadAsync(MaterialCommunityIcons.font);
        }
      } catch {
        // Font already loaded or ignored safely
      } finally {
        if (isMounted) {
          setFontsLoaded(true);
        }
      }
    }
    loadAppFonts();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider
        settings={{
          icon: renderPaperIcon,
        }}
      >
        <AppNavigation />
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

