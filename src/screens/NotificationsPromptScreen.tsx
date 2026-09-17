import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';
import { requestNotificationPermission } from '@/lib/notifications';
import { haptic } from '@/lib/haptics';
import { S, fonts, SCREEN_PADDING } from '@/lib/simulTheme';
import { PrimaryButton } from '@/components/FormControls';

/**
 * Shown once, right after a household is set up. Only asks for the OS
 * permission — actual habit reminders (scheduling, per-habit times) aren't
 * built yet, so this just lays the groundwork for that later.
 */
export default function NotificationsPromptScreen() {
  const { t } = useTranslation();
  const setPrompted = useSettingsStore((s) => s.setNotificationsPrompted);
  const setPermission = useSettingsStore((s) => s.setNotificationsPermission);
  const [busy, setBusy] = useState(false);

  const finish = () => setPrompted(true);

  const enable = async () => {
    setBusy(true);
    const result = await requestNotificationPermission();
    setPermission(result);
    setBusy(false);
    if (result === 'granted') haptic.success();
    finish();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔔</Text>
        <Text style={styles.title}>{t('onboarding.notifTitle')}</Text>
        <Text style={styles.body}>{t('onboarding.notifBody')}</Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton label={t('onboarding.notifEnable')} onPress={enable} loading={busy} disabled={busy} />
        <PrimaryButton variant="link" label={t('onboarding.notifSkip')} onPress={finish} disabled={busy} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: S.bg,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SCREEN_PADDING + 8,
    gap: 12,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: S.ink900,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: S.tertiary,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 24,
    gap: 4,
  },
});
