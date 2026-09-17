import { AppState, Platform } from 'react-native';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { secureSessionStorage } from './secureStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'Supabase is not configured. Copy .env.example to .env, fill in the project URL and publishable key, then restart Expo with `npx expo start -c`.',
  );
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL must look like https://<project-ref>.supabase.co');
}

// Everything prefixed EXPO_PUBLIC_ ends up inside the app binary, where anyone
// can extract it. Refuse to start with a key that bypasses row level security.
function isPrivilegedKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}
if (isPrivilegedKey(publishableKey)) {
  throw new Error('A secret/service_role Supabase key was configured in the app. Use the publishable key and rotate the leaked one.');
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    storage: secureSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE: a sign-in link only works on the device that requested it (the
    // verifier never leaves this phone), so an intercepted email is useless.
    flowType: 'pkce',
  },
});

// Only refresh tokens while the app is in the foreground (recommended for RN).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Error codes raised by our Postgres RPCs (see supabase/migrations). */
export type AppErrorCode =
  | 'already_in_household'
  | 'household_full'
  | 'rate_limited'
  | 'invalid_code'
  | 'invite_not_found'
  | 'not_allowed'
  | 'network'
  | 'unknown';

/** Turn Supabase/Postgres errors into a small, user-safe set of codes. Never show raw DB errors to users. */
export function toAppError(error: unknown): AppErrorCode {
  const e = error as Partial<PostgrestError> & { name?: string; message?: string; status?: number };
  const msg = e?.message ?? '';
  for (const code of ['already_in_household', 'household_full', 'rate_limited', 'invite_not_found'] as const) {
    if (msg.includes(code)) return code;
  }
  if (e?.code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) return 'not_allowed';
  if (e?.name === 'AuthRetryableFetchError' || /network|fetch/i.test(msg)) return 'network';
  return 'unknown';
}

export function logError(context: string, error: unknown) {
  // Dev-only and message-only: never log tokens, emails or full payloads.
  if (__DEV__) console.warn(`[${context}]`, (error as { message?: string })?.message ?? error);
}
