import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, type TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { DevSignInRow } from '@/components/DevSignInRow';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { S, fonts, SCREEN_PADDING } from '@/lib/simulTheme';
import { TextField, PrimaryButton, ErrorText } from '@/components/FormControls';

const RESEND_SECONDS = 60;

/** Passwordless sign-in: email → one-time code. New emails get an account automatically. */
export default function AuthScreen() {
  const { t } = useTranslation();
  const sendCode = useAuthStore((s) => s.sendCode);
  const verifyCode = useAuthStore((s) => s.verifyCode);
  const linkError = useAuthStore((s) => s.linkError);
  const clearLinkError = useAuthStore((s) => s.clearLinkError);

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<TextInput>(null);

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

  const submitCode = async () => {
    setBusy(true);
    setError(null);
    const res = await verifyCode(email, code);
    // On success the auth listener swaps the whole navigator, so don't touch state.
    if (res.error) {
      setBusy(false);
      haptic.warning();
      setError(errorMessage(res.error));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.logo}>Simul</Text>
            <Text style={styles.tagline}>{step === 'email' ? t('auth.tagline') : t('auth.codeTitle')}</Text>
          </View>

          {step === 'email' ? (
            <View style={styles.form}>
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
              <DevSignInRow />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.body}>{t('auth.linkSentTo', { email: email.trim().toLowerCase() })}</Text>
              <Text style={styles.hint}>{t('auth.codeFallback')}</Text>
              <TextField
                ref={codeRef}
                label={t('auth.codeLabel')}
                value={code}
                onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 10)); setError(null); }}
                placeholder={t('auth.codePlaceholder')}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={10}
                style={styles.codeInput}
                onSubmitEditing={submitCode}
              />
              <ErrorText message={error ?? (linkError ? errorMessage(linkError) : null)} />
              <PrimaryButton label={t('auth.verify')} onPress={submitCode} loading={busy} disabled={code.length < 6} />
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: S.bg,
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
  hint: {
    fontSize: 13,
    color: S.tertiary,
    textAlign: 'center',
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
});
