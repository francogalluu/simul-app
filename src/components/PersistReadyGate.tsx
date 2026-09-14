import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { useHabitStore } from '@/store/habitStore';

/** If persist hydration errors or hangs, Zustand never sets hasHydrated — avoid infinite splash. */
const HYDRATION_FALLBACK_MS = 5_000;

/**
 * Renders children only after both persisted stores have rehydrated from AsyncStorage,
 * so navigation initialRouteName and onboarding state match stored user data.
 */
export function PersistReadyGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(
    () => useSettingsStore.persist.hasHydrated() && useHabitStore.persist.hasHydrated(),
  );
  const fallbackFired = useRef(false);

  useEffect(() => {
    if (useSettingsStore.persist.hasHydrated() && useHabitStore.persist.hasHydrated()) {
      setReady(true);
      return;
    }

    const tryReady = () => {
      if (useSettingsStore.persist.hasHydrated() && useHabitStore.persist.hasHydrated()) {
        setReady(true);
      }
    };

    const unsubSettings = useSettingsStore.persist.onFinishHydration(tryReady);
    const unsubHabits = useHabitStore.persist.onFinishHydration(tryReady);
    tryReady();

    const t = setTimeout(() => {
      if (fallbackFired.current) return;
      fallbackFired.current = true;
      if (!useSettingsStore.persist.hasHydrated() || !useHabitStore.persist.hasHydrated()) {
        if (__DEV__) {
          console.warn(
            '[PersistReadyGate] Hydration did not finish in time; continuing anyway (check AsyncStorage / persist errors).',
          );
        }
      }
      // Always proceed: fixes edge cases where hasHydrated stays false forever on release builds.
      setReady(true);
    }, HYDRATION_FALLBACK_MS);

    return () => {
      clearTimeout(t);
      unsubSettings();
      unsubHabits();
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
