import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { S } from '@/lib/simulTheme';

/**
 * Dev-only shortcut around the email round-trip, for iterating without burning
 * Supabase's default-sender rate limit (2 emails/hour on the whole project).
 * Signs into one of the two seeded test accounts with a real password — the
 * normal auth path, just skipping the inbox — so it exercises the same code
 * as a real sign-in. Renders nothing outside __DEV__, so it's not part of
 * what ships to real users.
 */
export function DevSignInRow() {
  if (!__DEV__) return null;
  const devSignIn = useAuthStore((s) => s.devSignIn);
  const [busy, setBusy] = useState<'a' | 'b' | null>(null);

  const press = async (which: 'a' | 'b') => {
    setBusy(which);
    await devSignIn(which);
    setBusy(null);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>DEV ONLY</Text>
      <View style={styles.row}>
        <Pressable onPress={() => press('a')} disabled={busy != null} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}>
          <Text style={styles.buttonText}>{busy === 'a' ? '…' : 'Sign in as A'}</Text>
        </Pressable>
        <Pressable onPress={() => press('b')} disabled={busy != null} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}>
          <Text style={styles.buttonText}>{busy === 'b' ? '…' : 'Sign in as B'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: S.line,
    borderStyle: 'dashed',
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    color: S.muted,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: S.cardMuted,
    borderWidth: 1,
    borderColor: S.line,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: S.ink600,
  },
});
