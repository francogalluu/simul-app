import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts, Lora_400Regular, Lora_700Bold } from '@expo-google-fonts/lora';
import { ThemeProvider } from './src/context/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { PersistReadyGate } from './src/components/PersistReadyGate';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { i18n, getDeviceLocale } from './src/i18n';
import { useSettingsStore } from './src/store/settingsStore';
import { useAuthStore } from './src/store/authStore';

// Ensure i18n is initialized (side-effect import).
void i18n;

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

export default function App() {
  const [fontsLoaded] = useFonts({ Lora_400Regular, Lora_700Bold });

  // Restore the Supabase session and listen for sign-in / sign-out.
  useEffect(() => useAuthStore.getState().init(), []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <PersistReadyGate>
              <LanguageSync>
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
