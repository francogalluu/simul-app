import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Auth-session storage for supabase-js.
 *
 * Tokens go in the iOS Keychain / Android Keystore (expo-secure-store), never in
 * plain AsyncStorage. SecureStore values should stay under ~2 KB and a Supabase
 * session is usually bigger, so values are split across numbered chunks.
 *
 * `THIS_DEVICE_ONLY` keeps tokens out of iCloud / device-transfer backups.
 * Web has no keychain; it falls back to AsyncStorage (localStorage).
 */

const CHUNK_SIZE = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

// SecureStore keys may only contain [A-Za-z0-9._-].
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');
const countKey = (key: string) => `${safeKey(key)}.chunks`;
const chunkKey = (key: string, i: number) => `${safeKey(key)}.${i}`;

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key), OPTIONS);
  const n = raw == null ? 0 : parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function removeChunks(key: string, from: number, to: number) {
  for (let i = from; i < to; i++) {
    await SecureStore.deleteItemAsync(chunkKey(key, i), OPTIONS);
  }
}

const nativeStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await readCount(key);
    if (count === 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i), OPTIONS);
      if (part == null) return null; // partial write — treat as signed out
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const previous = await readCount(key);
    const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), OPTIONS);
    }
    await SecureStore.setItemAsync(countKey(key), String(count), OPTIONS);
    if (previous > count) await removeChunks(key, count, previous);
  },

  async removeItem(key: string): Promise<void> {
    const count = await readCount(key);
    await SecureStore.deleteItemAsync(countKey(key), OPTIONS);
    await removeChunks(key, 0, count);
  },
};

export const secureSessionStorage = Platform.OS === 'web' ? AsyncStorage : nativeStorage;
