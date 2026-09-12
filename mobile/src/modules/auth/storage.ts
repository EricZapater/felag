import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memoryStore: Record<string, string> = {};

export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(key);
        }
        return memoryStore[key] || null;
      }
      const val = await SecureStore.getItemAsync(key);
      return val ?? memoryStore[key] ?? null;
    } catch {
      return memoryStore[key] || null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    memoryStore[key] = value;
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Memory fallback active
    }
  },

  removeItem: async (key: string): Promise<void> => {
    delete memoryStore[key];
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Memory fallback active
    }
  },
};
