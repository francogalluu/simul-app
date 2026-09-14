import { LogBox, Platform } from 'react-native';

/** Expo Go on Android: expo-notifications logs console.error on import (remote push removed SDK 53+). Local scheduling still works. */
if (Platform.OS === 'android') {
  LogBox.ignoreLogs(['expo-notifications: Android Push']);
}
