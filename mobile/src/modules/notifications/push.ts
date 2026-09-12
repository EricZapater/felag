import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationsApi } from './api';
import { PushTokenRequest } from './types';

// Configure how notifications are presented when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let cachedPushToken: string | null = null;

export async function getDevicePushToken(): Promise<string> {
  if (cachedPushToken) {
    return cachedPushToken;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notificacions FELAG',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C85A32',
    });
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted') {
      try {
        const expoTokenResponse = await Notifications.getExpoPushTokenAsync();
        if (expoTokenResponse?.data) {
          cachedPushToken = expoTokenResponse.data;
          return cachedPushToken;
        }
      } catch (tokenErr) {
        console.warn('Could not get official Expo push token, using device ID fallback:', tokenErr);
      }
    }
  } catch (permErr) {
    console.warn('Error checking push permissions:', permErr);
  }

  // Fallback unique device token for simulator or environments without EAS projectId
  const deviceSuffix = Math.random().toString(36).substring(2, 10);
  cachedPushToken = `ExponentPushToken[felag-${Platform.OS}-${deviceSuffix}]`;
  return cachedPushToken;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const token = await getDevicePushToken();
    const deviceType: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

    const payload: PushTokenRequest = {
      token,
      device_type: deviceType,
    };

    await notificationsApi.registerPushToken(payload);
    return token;
  } catch (error) {
    console.warn('Failed to register push token with backend:', error);
    return cachedPushToken;
  }
}

export async function unregisterPushNotificationsAsync(): Promise<void> {
  try {
    if (!cachedPushToken) return;

    const deviceType: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

    const payload: PushTokenRequest = {
      token: cachedPushToken,
      device_type: deviceType,
    };

    await notificationsApi.unregisterPushToken(payload);
  } catch (error) {
    console.warn('Failed to unregister push token with backend:', error);
  }
}
