import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * expo-notifications throws as soon as it's imported on Android inside Expo Go
 * (remote push support was dropped there in SDK 53+). Dev/production builds
 * are unaffected. Any module that imports expo-notifications on Android must
 * check this first and use a deferred `require` instead of a static import.
 */
export const notificationsUnsupported =
  Platform.OS === 'android' && Constants.appOwnership === 'expo';
