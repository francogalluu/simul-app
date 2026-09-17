import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase, logError } from '@/lib/supabase';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';
export type LinkError = 'link_expired' | 'link_other_device' | 'network' | 'unknown';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  /** Set when an emailed sign-in link couldn't be used. */
  linkError: LinkError | null;
  clearLinkError: () => void;
  /** Called once from App.tsx. */
  init: () => () => void;
  sendCode: (email: string) => Promise<{ error?: 'rate_limited' | 'invalid_email' | 'network' | 'unknown' }>;
  verifyCode: (email: string, code: string) => Promise<{ error?: 'invalid_code' | 'network' | 'unknown' }>;
  signOut: () => Promise<void>;
  /** __DEV__ only: skips the email round-trip against the two seeded test accounts. */
  devSignIn: (which: 'a' | 'b') => Promise<{ error?: 'unknown' }>;
}

// iOS keeps Keychain items after an uninstall. Without this, reinstalling the
// app would silently sign the previous user back in.
const INSTALL_MARKER = 'simul-install-marker';

async function clearSessionFromPreviousInstall() {
  try {
    if (await AsyncStorage.getItem(INSTALL_MARKER)) return;
    await supabase.auth.signOut({ scope: 'local' });
    await AsyncStorage.setItem(INSTALL_MARKER, '1');
  } catch (e) {
    logError('auth.installMarker', e);
  }
}

const AUTH_CALLBACK_PATH = 'auth-callback';
/** simul://auth-callback in builds, exp://<host>/--/auth-callback in Expo Go. */
export const authRedirectUrl = () => Linking.createURL(AUTH_CALLBACK_PATH);

const CODE_RE = /^[A-Za-z0-9-]{8,128}$/;
const handledCodes = new Set<string>();

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Two persistent test accounts seeded directly in the database (see BACKLOG.md),
// used only through this __DEV__-gated path. This branch — and the password below
// with it — is dead code in a production/release build, same as any other
// `if (__DEV__)` in React Native: Metro replaces __DEV__ with a literal and the
// minifier drops the unreachable branch, so it never ships in the app binary
// real users install. It still goes through the normal signInWithPassword() call,
// so no auth or RLS check is bypassed — it only skips the email step.
const DEV_ACCOUNTS = {
  a: 'dev-a@simul.test',
  b: 'dev-b@simul.test',
} as const;
const DEV_PASSWORD = 'dev-only-not-a-real-password-8823';

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'loading',
  session: null,
  linkError: null,
  clearLinkError: () => set({ linkError: null }),

  init: () => {
    let cancelled = false;

    // Only accepts ?code= links (PKCE). Links carrying raw tokens in the URL are
    // ignored on purpose: accepting them would let anyone who sends the user a
    // crafted link sign this phone into *their* account.
    const handleUrl = async (url: string | null) => {
      if (!url || cancelled) return;
      const { path, queryParams } = Linking.parse(url);
      if (!path?.endsWith(AUTH_CALLBACK_PATH)) return;
      if (get().session) return; // already signed in; ignore stray links

      const param = (key: string) => {
        const v = queryParams?.[key];
        return typeof v === 'string' ? v : undefined;
      };
      if (param('error') || param('error_code')) {
        logError('auth.link', { message: param('error_code') ?? param('error') });
        set({ linkError: 'link_expired' });
        return;
      }
      const code = param('code');
      if (!code || !CODE_RE.test(code) || handledCodes.has(code)) return;
      handledCodes.add(code);

      const flowId = param('sb_flow_id');
      const { error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
      if (!error) {
        set({ linkError: null });
        return;
      }
      logError('auth.exchangeCode', error);
      if (error.name === 'AuthPKCECodeVerifierMissingError') set({ linkError: 'link_other_device' });
      else if (error.name === 'AuthRetryableFetchError') set({ linkError: 'network' });
      else if (error.status === 400 || error.status === 403 || error.status === 404) set({ linkError: 'link_expired' });
      else set({ linkError: 'unknown' });
    };

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, status: session ? 'signedIn' : 'signedOut' });
    });
    const urlSub = Linking.addEventListener('url', ({ url }) => void handleUrl(url));

    (async () => {
      await clearSessionFromPreviousInstall();
      const { data: current, error } = await supabase.auth.getSession();
      if (error) logError('auth.getSession', error);
      if (cancelled) return;
      set({ session: current.session, status: current.session ? 'signedIn' : 'signedOut' });
      // App was cold-started by tapping the sign-in link.
      await handleUrl(await Linking.getInitialURL());
    })();

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
      urlSub.remove();
    };
  },

  sendCode: async (rawEmail) => {
    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) return { error: 'invalid_email' };
    set({ linkError: null });
    const redirectTo = authRedirectUrl();
    // Supabase rejects redirect URLs whose host is an IP address and silently falls
    // back to the Site URL, so Expo Go over LAN (exp://192.168.x.x) can't receive links.
    if (__DEV__ && /^exp:\/\/\d{1,3}(\.\d{1,3}){3}/.test(redirectTo)) {
      console.warn('[auth] Sign-in links cannot return to an IP-based Expo URL. Run `npx expo start --tunnel`.');
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
    });
    if (!error) return {};
    logError('auth.sendCode', error);
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') return { error: 'rate_limited' };
    if (error.code === 'email_address_invalid' || error.code === 'validation_failed') return { error: 'invalid_email' };
    if (error.name === 'AuthRetryableFetchError') return { error: 'network' };
    return { error: 'unknown' };
  },

  verifyCode: async (rawEmail, rawCode) => {
    const email = rawEmail.trim().toLowerCase();
    const token = rawCode.replace(/\D/g, '');
    if (token.length < 6) return { error: 'invalid_code' };
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (!error) return {};
    logError('auth.verifyCode', error);
    if (error.name === 'AuthRetryableFetchError') return { error: 'network' };
    if (error.status === 400 || error.status === 403 || error.code === 'otp_expired') return { error: 'invalid_code' };
    return { error: 'unknown' };
  },

  signOut: async () => {
    // Local scope: signs out this device only. The listener above flips status,
    // and the data stores reset themselves when the session goes away.
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) logError('auth.signOut', error);
  },

  devSignIn: async (which) => {
    if (!__DEV__) return { error: 'unknown' };
    const { error } = await supabase.auth.signInWithPassword({ email: DEV_ACCOUNTS[which], password: DEV_PASSWORD });
    if (error) {
      logError('auth.devSignIn', error);
      return { error: 'unknown' };
    }
    return {};
  },
}));
