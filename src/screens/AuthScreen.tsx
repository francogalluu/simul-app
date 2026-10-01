import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Linking, Pressable } from 'react-native';
import { Text } from '@/components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '@/store/authStore';
import { MeshBackground } from '@/components/MeshBackground';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { S, fonts, SCREEN_PADDING } from '@/lib/simulTheme';
import { TextField, PrimaryButton, ErrorText } from '@/components/FormControls';
import type { NativeTextFieldHandle } from '@/components/NativeControls';

const RESEND_SECONDS = 60;
/** Supabase's email code length (Auth → Providers → Email, default 6). */
const CODE_LENGTH = 6;
/** Set EXPO_PUBLIC_PRIVACY_URL to show the privacy policy link under the form. */
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;

/** Passwordless sign-in: email → one-time code. New emails get an account automatically. */
export default function AuthScreen() {
  const { t } = useTranslation();
  const sendCode = useAuthStore((s) => s.sendCode);
  const verifyCode = useAuthStore((s) => s.verifyCode);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const signInDev = useAuthStore((s) => s.signInDev);
  const linkError = useAuthStore((s) => s.linkError);
  const clearLinkError = useAuthStore((s) => s.clearLinkError);

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const codeRef = useRef<NativeTextFieldHandle>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    const res = await sendCode(email);
    setBusy(false);
    if (res.error) {
      haptic.warning();
      setError(errorMessage(res.error));
      return;
    }
    haptic.success();
    setCode('');
    setStep('code');
    setCooldown(RESEND_SECONDS);
    setTimeout(() => codeRef.current?.focus(), 250);
  };

  const appleSignIn = async () => {
    setBusy(true);
    setError(null);
    const res = await signInWithApple();
    // On success the auth listener swaps the whole navigator, so don't touch state.
    if (res.error) {
      setBusy(false);
      if (res.error === 'canceled') return;
      haptic.warning();
      setError(errorMessage(res.error));
    }
  };

  const devSignIn = async () => {
    setBusy(true);
    setError(null);
    const res = await signInDev();
    if (res.error) {
      setBusy(false);
      setError(res.error === 'unconfigured' ? 'Set EXPO_PUBLIC_DEV_EMAIL and EXPO_PUBLIC_DEV_PASSWORD in .env' : 'Dev sign-in failed');
    }
  };

  const submitCode = async (value: string = code) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await verifyCode(email, value);
    // On success the auth listener swaps the whole navigator, so don't touch state.
    if (res.error) {
      setBusy(false);
      haptic.warning();
      setError(errorMessage(res.error));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <MeshBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.logo}>Simul</Text>
            <Text style={styles.tagline}>{step === 'email' ? t('auth.tagline') : t('auth.codeTitle')}</Text>
          </View>

          {step === 'email' ? (
            <View style={styles.form}>
              {appleAvailable ? (
                <>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={14}
                    style={[styles.appleButton, busy && { opacity: 0.5 }]}
                    onPress={busy ? () => {} : appleSignIn}
                  />
                  <Text style={styles.or}>{t('auth.or')}</Text>
                </>
              ) : null}
              <TextField
                label={t('auth.emailLabel')}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(null); }}
                placeholder={t('auth.emailPlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="send"
                maxLength={254}
                onSubmitEditing={requestCode}
              />
              <ErrorText message={error ?? (linkError ? errorMessage(linkError) : null)} />
              <PrimaryButton label={t('auth.sendCode')} onPress={requestCode} loading={busy} disabled={!email.trim()} />
              <Text style={styles.hint}>{t('auth.noPasswords')}</Text>
              {__DEV__ ? <PrimaryButton variant="link" label="Dev sign in" onPress={devSignIn} disabled={busy} /> : null}
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.body}>{t('auth.linkSentTo', { email: email.trim().toLowerCase() })}</Text>
              <Text style={styles.hint}>{t('auth.codeFallback')}</Text>
              <TextField
                ref={codeRef}
                label={t('auth.codeLabel')}
                value={code}
                onChangeText={(v) => {
                  const next = v.replace(/\D/g, '').slice(0, 10);
                  setCode(next);
                  setError(null);
                  // Submit as soon as the full code is in (typed, pasted or filled from the keyboard suggestion).
                  if (next.length === CODE_LENGTH) void submitCode(next);
                }}
                placeholder={t('auth.codePlaceholder')}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={10}
                code
                onSubmitEditing={() => void submitCode()}
              />
              <ErrorText message={error ?? (linkError ? errorMessage(linkError) : null)} />
              <PrimaryButton label={t('auth.verify')} onPress={() => void submitCode()} loading={busy} disabled={code.length < CODE_LENGTH} />
              <PrimaryButton
                variant="link"
                label={cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resend')}
                onPress={requestCode}
                disabled={cooldown > 0 || busy}
              />
              <PrimaryButton
                variant="link"
                label={t('auth.changeEmail')}
                onPress={() => { setStep('email'); setError(null); setCode(''); clearLinkError(); }}
                disabled={busy}
              />
            </View>
          )}
          {PRIVACY_URL ? (
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(PRIVACY_URL)} hitSlop={10} style={styles.legal}>
              <Text style={styles.legalText}>{t('auth.privacy')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: {
    fontFamily: fonts.bold,
    fontSize: 44,
    color: S.ink900,
  },
  tagline: {
    marginTop: 6,
    fontSize: 16,
    color: S.tertiary,
  },
  form: {
    gap: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: S.ink600,
    textAlign: 'center',
  },
  appleButton: {
    height: 50,
    width: '100%',
  },
  or: {
    fontSize: 13,
    color: S.tertiary,
    textAlign: 'center',
  },
  legal: {
    alignSelf: 'center',
    marginTop: 28,
  },
  legalText: {
    fontSize: 13,
    color: S.tertiary,
    textDecorationLine: 'underline',
  },
  hint: {
    fontSize: 13,
    color: S.tertiary,
    textAlign: 'center',
  },
});
