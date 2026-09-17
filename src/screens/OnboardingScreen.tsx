import React, { useCallback, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Text } from '@/components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore, cleanName, MAX_NAME_LENGTH, MAX_DUO_NAME_LENGTH } from '@/store/householdStore';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { randomAvatarColor } from '@/lib/avatarColors';
import { S, fonts, SCREEN_PADDING } from '@/lib/simulTheme';
import { TextField, PrimaryButton, ErrorText } from '@/components/FormControls';
import { AvatarPicker, type AvatarValue } from '@/components/AvatarPicker';
import { ColorPicker } from '@/components/ColorPicker';
import { MeshBackground } from '@/components/MeshBackground';

/** Formats raw input as XXXX-XXXX using the invite-code alphabet. */
const formatCode = (raw: string) => {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
};

const STEPS = 3;

/**
 * Signed in but not in a household yet. One idea per screen, swipeable:
 *   1. you (name + photo)  →  2. your color  →  3. start a household or join one.
 */
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const userId = useAuthStore((s) => s.session?.user.id);
  const signOut = useAuthStore((s) => s.signOut);
  const createHousehold = useHouseholdStore((s) => s.createHousehold);
  const joinHousehold = useHouseholdStore((s) => s.joinHousehold);

  const pagerRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [name, setName] = useState('');
  const [duoName, setDuoName] = useState('');
  const [code, setCode] = useState('');
  const [avatar, setAvatar] = useState<AvatarValue>({ path: null, url: null });
  const [color, setColor] = useState<string>(randomAvatarColor);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nameOk = cleanName(name).length > 0;
  const initial = (cleanName(name)[0] ?? '?').toUpperCase();

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(STEPS - 1, next));
      pagerRef.current?.scrollTo({ x: clamped * width, animated: true });
      setStep(clamped);
    },
    [width],
  );

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== step) {
      haptic.tap();
      setStep(next);
    }
  };

  const run = async (kind: 'create' | 'join') => {
    if (!nameOk) {
      setError(errorMessage('name_required'));
      goTo(0);
      return;
    }
    setBusy(kind);
    setError(null);
    const profile = { color, avatarPath: avatar.path };
    const res = kind === 'create' ? await createHousehold(name, profile, duoName) : await joinHousehold(code, name, profile);
    // On success the navigator swaps to the app; only handle failures here.
    if (res.error) {
      setBusy(null);
      haptic.warning();
      setError(errorMessage(res.error));
    } else {
      haptic.success();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <MeshBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.progress}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={[styles.progressDot, i === step && styles.progressDotActive, i < step && styles.progressDotDone]} />
          ))}
        </View>

        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          keyboardShouldPersistTaps="handled"
          // Only the last step can scroll past the first two; the earlier steps require a name.
          scrollEnabled={nameOk}
          style={{ flex: 1 }}
        >
          {/* 1 — You */}
          <View style={[styles.page, { width }]}>
            <Animated.View entering={FadeInDown.duration(320)} style={styles.pageInner}>
              <Text style={styles.kicker}>1 / {STEPS}</Text>
              <Text style={styles.title}>{t('onboarding.title')}</Text>
              <Text style={styles.subtitle}>{t('onboarding.stepYou')}</Text>
              {userId && (
                <View style={styles.avatarRow}>
                  <AvatarPicker userId={userId} value={avatar} color={color} initial={initial} size={104} onChange={setAvatar} />
                </View>
              )}
              <TextField
                label={t('onboarding.nameLabel')}
                value={name}
                onChangeText={(v) => { setName(v); setError(null); }}
                placeholder={t('onboarding.namePlaceholder')}
                autoComplete="given-name"
                textContentType="givenName"
                maxLength={MAX_NAME_LENGTH}
                returnKeyType="next"
                onSubmitEditing={() => nameOk && goTo(1)}
              />
              <ErrorText message={step === 0 ? error : null} />
              <View style={styles.pageActions}>
                <PrimaryButton label={t('onboarding.next')} onPress={() => { haptic.tap(); goTo(1); }} disabled={!nameOk} />
                <PrimaryButton variant="link" label={t('onboarding.signOut')} onPress={signOut} disabled={busy != null} />
              </View>
            </Animated.View>
          </View>

          {/* 2 — Your color */}
          <View style={[styles.page, { width }]}>
            <View style={styles.pageInner}>
              <Text style={styles.kicker}>2 / {STEPS}</Text>
              <Text style={styles.title}>{t('onboarding.colorTitle')}</Text>
              <Text style={styles.subtitle}>{t('onboarding.colorBody')}</Text>
              <View style={styles.colorPreviewWrap}>
                <View style={[styles.colorPreview, { backgroundColor: color }]}>
                  <Text style={styles.colorPreviewInitial}>{initial}</Text>
                </View>
                <Text style={[styles.colorPreviewName, { color }]}>{cleanName(name) || '—'}</Text>
              </View>
              <ColorPicker value={color} onChange={setColor} />
              <View style={styles.pageActions}>
                <PrimaryButton label={t('onboarding.next')} onPress={() => { haptic.tap(); goTo(2); }} />
                <PrimaryButton variant="link" label={t('onboarding.back')} onPress={() => goTo(0)} />
              </View>
            </View>
          </View>

          {/* 3 — Start or join */}
          <View style={[styles.page, { width }]}>
            <View style={styles.pageInner}>
              <Text style={styles.kicker}>3 / {STEPS}</Text>
              <Text style={styles.title}>{mode === 'join' ? t('onboarding.join') : t('onboarding.togetherTitle')}</Text>
              <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>

              {mode === 'choose' ? (
                <View style={styles.form}>
                  <TextField
                    label={t('onboarding.duoNameLabel')}
                    value={duoName}
                    onChangeText={setDuoName}
                    placeholder={t('onboarding.duoNamePlaceholder', { name: cleanName(name) || 'You' })}
                    maxLength={MAX_DUO_NAME_LENGTH}
                    returnKeyType="done"
                  />
                  <Text style={styles.hint}>{t('onboarding.duoNameHint')}</Text>
                  <View style={styles.option}>
                    <PrimaryButton label={t('onboarding.create')} onPress={() => run('create')} loading={busy === 'create'} disabled={busy != null} />
                    <Text style={styles.hint}>{t('onboarding.createHint')}</Text>
                  </View>
                  <View style={styles.option}>
                    <PrimaryButton
                      variant="secondary"
                      label={t('onboarding.join')}
                      onPress={() => { haptic.tap(); setMode('join'); setError(null); }}
                      disabled={busy != null}
                    />
                    <Text style={styles.hint}>{t('onboarding.joinHint')}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.form}>
                  <TextField
                    label={t('onboarding.codeLabel')}
                    value={code}
                    onChangeText={(v) => { setCode(formatCode(v)); setError(null); }}
                    placeholder={t('onboarding.codePlaceholder')}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoComplete="off"
                    maxLength={9}
                    style={styles.codeInput}
                    onSubmitEditing={() => run('join')}
                  />
                  <PrimaryButton
                    label={t('onboarding.joinButton')}
                    onPress={() => run('join')}
                    loading={busy === 'join'}
                    disabled={busy != null || code.replace('-', '').length !== 8}
                  />
                  <PrimaryButton variant="link" label={t('onboarding.back')} onPress={() => { setMode('choose'); setError(null); }} disabled={busy != null} />
                </View>
              )}
              <ErrorText message={step === 2 ? error : null} />
              {mode === 'choose' && (
                <Pressable onPress={() => goTo(1)} disabled={busy != null} style={styles.backLink} hitSlop={8}>
                  <Text style={styles.backLinkText}>{t('onboarding.back')}</Text>
                </Pressable>
              )}
            </View>
          </View>
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
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
  },
  progressDot: {
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(38, 32, 25, 0.12)',
  },
  progressDotActive: {
    backgroundColor: S.ink900,
    width: 28,
  },
  progressDotDone: {
    backgroundColor: S.accent,
  },
  page: {
    flex: 1,
  },
  pageInner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 24,
    gap: 8,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: S.tertiary,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: S.ink900,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: S.tertiary,
    marginBottom: 16,
  },
  form: {
    gap: 16,
  },
  option: {
    gap: 6,
  },
  avatarRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  colorPreviewWrap: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  colorPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  colorPreviewInitial: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  colorPreviewName: {
    fontSize: 15,
    fontWeight: '800',
  },
  pageActions: {
    marginTop: 18,
    gap: 4,
  },
  hint: {
    fontSize: 12,
    color: S.tertiary,
    textAlign: 'center',
  },
  codeInput: {
    fontSize: 22,
    letterSpacing: 4,
    textAlign: 'center',
    fontWeight: '700',
  },
  backLink: {
    alignSelf: 'center',
    paddingVertical: 10,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '700',
    color: S.accentDeep,
  },
});
