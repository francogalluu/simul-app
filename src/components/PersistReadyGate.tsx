import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { useTasksStore } from '@/store/tasksStore';
import { useGoalsStore } from '@/store/goalsStore';
import { S } from '@/lib/simulTheme';

/** If persist hydration errors or hangs, Zustand never sets hasHydrated — avoid infinite splash. */
const HYDRATION_FALLBACK_MS = 5_000;

const STORES = [useSettingsStore, useTasksStore, useGoalsStore];
const allHydrated = () => STORES.every((s) => s.persist.hasHydrated());

/** Renders children only after every persisted store has rehydrated from AsyncStorage. */
export function PersistReadyGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(allHydrated);
  const fallbackFired = useRef(false);

  useEffect(() => {
    if (allHydrated()) {
      setReady(true);
      return;
    }
    const tryReady = () => {
      if (allHydrated()) setReady(true);
    };
    const unsubs = STORES.map((s) => s.persist.onFinishHydration(tryReady));
    tryReady();

    const t = setTimeout(() => {
      if (fallbackFired.current) return;
      fallbackFired.current = true;
      if (__DEV__ && !allHydrated()) {
        console.warn('[PersistReadyGate] Hydration did not finish in time; continuing anyway.');
      }
      setReady(true);
    }, HYDRATION_FALLBACK_MS);

    return () => {
      clearTimeout(t);
      unsubs.forEach((u) => u());
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: S.bg }}>
        <ActivityIndicator size="large" color={S.accent} />
      </View>
    );
  }

  return <>{children}</>;
}
