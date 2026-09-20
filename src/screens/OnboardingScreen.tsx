import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@/components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKindTranslation } from '@/lib/kind';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore, cleanName, MAX_NAME_LENGTH, type HouseholdKind } from '@/store/householdStore';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { randomAvatarColor } from '@/lib/avatarColors';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';
import { TextField, PrimaryButton, ErrorText } from '@/components/FormControls';
import { AvatarPicker, type AvatarValue } from '@/components/AvatarPicker';
import { ColorPicker } from '@/components/ColorPicker';
import { NativeSegmented } from '@/components/NativeControls';
import { MeshBackground } from '@/components/MeshBackground';

/** Formats raw input as XXXX-XXXX using the invite-code alphabet. */
const formatCode = (raw: string) => {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
};

/** Signed in but not in a household yet: pick a name, then create one or join with a code. */
export default function OnboardingScreen() {
  // Who this household is for. Onboarding runs before a household exists, so the wording follows this choice.
  const [kind, setKind] = useState<HouseholdKind>('couple');
  const { t } = useKindTranslation(kind);
  const userId = useAuthStore((s) => s.session?.user.id);
  const signOut = useAuthStore((s) => s.signOut);
  const createHousehold = useHouseholdStore((s) => s.createHousehold);
  const joinHousehold = useHouseholdStore((s) => s.joinHousehold);

  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [avatar, setAvatar] = useState<AvatarValue>({ path: null, url: null });
  const [color, setColor] = useState<string>(randomAvatarColor);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nameOk = cleanName(name).length > 0;

  const run = async (action: 'create' | 'join') => {
    if (!nameOk) {
      setError(errorMessage('name_required'));
      return;
    }
    setBusy(action);
    setError(null);
    const profile = { color, avatarPath: avatar.path };
    const res = action === 'create' ? await createHousehold(name, profile, kind) : await joinHousehold(code, name, profile);
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('onboarding.title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>

          <View style={styles.form}>
            <View style={styles.card}>
              {userId && (
                <View style={styles.avatarRow}>
                  <AvatarPicker
                    userId={userId}
                    value={avatar}
                    color={color}
                    initial={(cleanName(name)[0] ?? '?').toUpperCase()}
                    onChange={setAvatar}
                  />
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
                returnKeyType="done"
              />

              <View style={styles.colorBlock}>
                <Text style={styles.colorLabel}>{t('onboarding.colorLabel')}</Text>
                <ColorPicker value={color} onChange={setColor} />
              </View>
            </View>

            {mode === 'choose' ? (
              <>
                <View style={styles.kindBlock}>
                  <Text style={styles.colorLabel}>{t('onboarding.kindLabel')}</Text>
                  <NativeSegmented
                    value={kind}
                    onChange={(next: HouseholdKind) => { haptic.tap(); setKind(next); }}
                    options={[
                      { value: 'couple', label: t('onboarding.kindCouple') },
                      { value: 'friend', label: t('onboarding.kindFriend') },
                    ]}
                  />
                  <Text style={styles.hint}>{t(kind === 'friend' ? 'onboarding.kindHint_friend' : 'onboarding.kindHint_couple')}</Text>
                </View>
                <View style={styles.option}>
                  <PrimaryButton label={t('onboarding.create')} onPress={() => run('create')} loading={busy === 'create'} disabled={busy != null} />
                  <Text style={styles.hint}>{t('onboarding.createHint')}</Text>
                </View>
                <View style={styles.option}>
                  <PrimaryButton
                    variant="secondary"
                    label={t('onboarding.join')}
                    onPress={() => { setMode('join'); setError(null); }}
                    disabled={busy != null}
                  />
                  <Text style={styles.hint}>{t('onboarding.joinHint')}</Text>
                </View>
              </>
            ) : (
              <>
                <TextField
                  label={t('onboarding.codeLabel')}
                  value={code}
                  onChangeText={(v) => { setCode(formatCode(v)); setError(null); }}
                  placeholder={t('onboarding.codePlaceholder')}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="off"
                  maxLength={9}
                  code
                  onSubmitEditing={() => run('join')}
                />
                <PrimaryButton
                  label={t('onboarding.joinButton')}
                  onPress={() => run('join')}
                  loading={busy === 'join'}
                  disabled={busy != null || code.replace('-', '').length !== 8}
                />
                <PrimaryButton variant="link" label={t('onboarding.back')} onPress={() => { setMode('choose'); setError(null); }} disabled={busy != null} />
              </>
            )}
            <ErrorText message={error} />
          </View>

          <PrimaryButton variant="link" label={t('onboarding.signOut')} onPress={signOut} disabled={busy != null} />
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
    gap: 8,
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
    marginBottom: 20,
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  option: {
    gap: 6,
  },
  card: {
    backgroundColor: S.card,
    borderRadius: 24,
    padding: 18,
    gap: 18,
    ...cardShadow,
  },
  avatarRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  kindBlock: {
    gap: 10,
  },
  colorBlock: {
    gap: 10,
  },
  colorLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: S.tertiary,
  },
  hint: {
    fontSize: 12,
    color: S.tertiary,
    textAlign: 'center',
  },
});
