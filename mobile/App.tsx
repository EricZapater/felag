import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import AppNavigation from './src/navigation';

export default function App() {
  return (
    <PaperProvider>
      <AppNavigation />
      <StatusBar style="auto" />
    </PaperProvider>
  );
}
