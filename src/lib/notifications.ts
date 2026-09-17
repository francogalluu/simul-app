import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * expo-notifications throws on import on Android inside Expo Go (remote push was
 * dropped there in SDK 53+) — a hard crash in current SDKs, not just a warning.
 * Any code that touches expo-notifications must check this first and use a
 * deferred `require`/`import()` instead of a static import, so the module is
 * never even loaded in Expo Go on Android.
 */
export const notificationsUnsupported =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export type NotificationPermission = 'granted' | 'denied' | 'unsupported';

/** Requests OS notification permission. Safe to call anywhere, including Expo Go on Android. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (notificationsUnsupported) return 'unsupported';
  try {
    const Notifications = await import('expo-notifications');
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return 'granted';
    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}
