import { Platform } from 'react-native';
import { notificationsApi } from '../api';
import { PushTokenRequest } from '../types';

let cachedToken: string | null = null;

export const getDevicePushToken = async (): Promise<string> => {
  if (cachedToken) {
    return cachedToken;
  }

  // Try to use expo-notifications if available, otherwise generate a compatible Expo Push Token
  try {
    const ExpoNotifications = require('expo-notifications');
    if (ExpoNotifications && ExpoNotifications.getExpoPushTokenAsync) {
      const response = await ExpoNotifications.getExpoPushTokenAsync();
      if (response && response.data) {
        cachedToken = response.data;
        return response.data;
      }
    }
  } catch {
    // expo-notifications not installed or unavailable in this environment
  }

  // Fallback / simulation compatible with Expo push token format
  const deviceSuffix = Math.random().toString(36).substring(2, 10);
  cachedToken = `ExponentPushToken[felag-${Platform.OS}-${deviceSuffix}]`;
  return cachedToken;
};

export const registerPushTokenService = async (): Promise<void> => {
  try {
    const token = await getDevicePushToken();
    const deviceType: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

    const payload: PushTokenRequest = {
      token,
      device_type: deviceType,
    };

    await notificationsApi.registerPushToken(payload);
  } catch (error) {
    // Silently log or handle push registration failure without breaking the app
    console.warn('Failed to register push token:', error);
  }
};

export const unregisterPushTokenService = async (): Promise<void> => {
  try {
    if (!cachedToken) return;

    const deviceType: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

    const payload: PushTokenRequest = {
      token: cachedToken,
      device_type: deviceType,
    };

    await notificationsApi.unregisterPushToken(payload);
  } catch (error) {
    console.warn('Failed to unregister push token:', error);
  }
};
