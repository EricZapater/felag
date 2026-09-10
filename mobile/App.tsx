import React, { useEffect, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppNavigation from './src/navigation';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadAppFonts() {
      try {
        if (!Font.isLoaded('material-community')) {
          await Font.loadAsync(MaterialCommunityIcons.font);
        }
      } catch {
        // Font already loaded or ignored safely on reload
      } finally {
        setFontsLoaded(true);
      }
    }
    loadAppFonts();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider
        settings={{
          icon: (props) => <MaterialCommunityIcons {...props} />,
        }}
      >
        <AppNavigation />
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
