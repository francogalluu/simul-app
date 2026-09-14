import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import type * as NotificationsType from 'expo-notifications';
import { ThemeProvider } from './src/context/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { PersistReadyGate } from './src/components/PersistReadyGate';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { i18n, getDeviceLocale } from './src/i18n';
import { useSettingsStore } from './src/store/settingsStore';
import { useHabitStore } from './src/store/habitStore';
import { scheduleAllNotifications } from './src/lib/notificationScheduler';
import { notificationsUnsupported } from './src/lib/expoGoGuard';

// Ensure i18n is initialized (side-effect import).
void i18n;

// expo-notifications throws on import on Android inside Expo Go (see expoGoGuard.ts),
// so it must be required lazily rather than statically imported.
if (!notificationsUnsupported) {
  const Notifications = require('expo-notifications') as typeof NotificationsType;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Syncs persisted language (or device locale on first launch) with i18n. */
function LanguageSync({ children }: { children: React.ReactNode }) {
  const language = useSettingsStore(s => s.language);
  const setLanguage = useSettingsStore(s => s.setLanguage);

  useEffect(() => {
    let lang = language;
    if (lang === undefined) {
      lang = getDeviceLocale();
      setLanguage(lang);
    }
    i18n.changeLanguage(lang);
  }, [language, setLanguage]);

  return <>{children}</>;
}

/** Reschedules global + per-habit notifications when habits or daily reminder settings change. */
function NotificationSync() {
  const habits = useHabitStore(s => s.habits);
  const dailyReminderEnabled = useSettingsStore(s => s.dailyReminderEnabled);
  const dailyReminderTime = useSettingsStore(s => s.dailyReminderTime);
  const notificationsEnabled = useSettingsStore(s => s.notificationsEnabled);

  useEffect(() => {
    void scheduleAllNotifications();
  }, [habits, dailyReminderEnabled, dailyReminderTime, notificationsEnabled]);

  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <PersistReadyGate>
              <LanguageSync>
                <NotificationSync />
                <NavigationContainer ref={navigationRef}>
                  <RootNavigator />
                </NavigationContainer>
              </LanguageSync>
            </PersistReadyGate>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
