/**
 * Storage adapter for Zustand's `persist` middleware.
 *
 * CURRENT: @react-native-async-storage/async-storage  ← Expo Go compatible
 *   - Works in Expo Go and any managed/bare build
 *   - Slightly slower than MMKV (async I/O), but unnoticeable for this data size
 *
 * FUTURE (EAS / custom dev build only): react-native-mmkv
 *   - Synchronous reads, 10-100× faster
 *   - Requires NitroModules native build — NOT supported in Expo Go
 *
 * HOW TO SWITCH TO MMKV LATER (EAS build only):
 *   1. Add react-native-mmkv back: `npm install react-native-mmkv`
 *   2. Replace the AsyncStorage block below with:
 *      import { createMMKV } from 'react-native-mmkv';
 *      const _mmkv = createMMKV({ id: 'fovere-store' });
 *      export const appStorage: StateStorage = {
 *        getItem:    (key) => _mmkv.getString(key) ?? null,
 *        setItem:    (key, value) => _mmkv.set(key, value),
 *        removeItem: (key) => void _mmkv.remove(key),
 *      };
 *   3. Run: eas build --profile development
 *   No changes needed in habitStore.ts or settingsStore.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

export const appStorage: StateStorage = {
  getItem:    (key: string) => AsyncStorage.getItem(key),
  setItem:    (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};
