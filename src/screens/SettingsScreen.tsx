import React from 'react';
import { View, Text, Image, Switch, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';
import { useTasksStore } from '@/store/tasksStore';
import { useGoalsStore } from '@/store/goalsStore';
import { i18n } from '@/i18n';
import { PEOPLE, type Person } from '@/lib/people';
import { haptic } from '@/lib/haptics';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const {
    hapticFeedback, setHapticFeedback,
    weekStartsOn, setWeekStartsOn,
    language, setLanguage,
    perspective, setPerspective,
  } = useSettingsStore();
  const resetTasks = useTasksStore((s) => s.resetToSample);
  const clearTasks = useTasksStore((s) => s.clearAll);
  const clearGoals = useGoalsStore((s) => s.clearAll);

  const pickWeekStart = () =>
    Alert.alert(t('alerts.weekStartsOn'), undefined, [
      { text: t('settings.sunday'), onPress: () => setWeekStartsOn(0) },
      { text: t('settings.monday'), onPress: () => setWeekStartsOn(1) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  const pickLanguage = () =>
    Alert.alert(t('settings.language'), undefined, [
      { text: t('settings.english'), onPress: () => { setLanguage('en'); i18n.changeLanguage('en'); } },
      { text: t('settings.spanish'), onPress: () => { setLanguage('es'); i18n.changeLanguage('es'); } },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  const confirmReset = () =>
    Alert.alert(t('settings.resetSample'), t('settings.resetSampleMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.ok'), onPress: () => { haptic.success(); resetTasks(); clearGoals(); } },
    ]);

  const confirmClear = () =>
    Alert.alert(t('settings.clearAll'), t('settings.clearAllMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => { haptic.warning(); clearTasks(); clearGoals(); } },
    ]);

  const switchPerspective = (p: Person) => {
    if (p === perspective) return;
    haptic.medium();
    setPerspective(p);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('settings.title')}</Text>

        <Text style={styles.sectionLabel}>{t('settings.preview')}</Text>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>{t('settings.viewAs')}</Text>
          <View style={styles.personRow}>
            {(['A', 'S'] as Person[]).map((p) => {
              const active = perspective === p;
              return (
                <Pressable key={p} onPress={() => switchPerspective(p)} style={[styles.personOption, active && styles.personOptionActive]}>
                  <Image source={PEOPLE[p].avatar} style={[styles.personAvatar, active && { borderColor: '#FFFFFF' }]} />
                  <Text style={[styles.personName, active && styles.personNameActive]}>{PEOPLE[p].name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>{t('settings.viewAsHint')}</Text>
        </View>

        <Text style={styles.sectionLabel}>{t('settings.preferences')}</Text>
        <View style={styles.card}>
          <Row label={t('settings.language')} value={language === 'es' ? t('settings.spanish') : t('settings.english')} onPress={pickLanguage} />
          <Divider />
          <Row
            label={t('settings.hapticFeedback')}
            right={
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{ false: S.line, true: S.accent }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <Divider />
          <Row label={t('settings.weekStartsOn')} value={weekStartsOn === 0 ? t('settings.sunday') : t('settings.monday')} onPress={pickWeekStart} last />
        </View>

        <Text style={styles.sectionLabel}>{t('settings.data')}</Text>
        <View style={styles.card}>
          <Row label={t('settings.resetSample')} onPress={confirmReset} />
          <Divider />
          <Row label={t('settings.clearAll')} onPress={confirmClear} danger last />
        </View>

        <Text style={styles.sectionLabel}>{t('settings.about')}</Text>
        <View style={styles.card}>
          <Row label={t('settings.version')} value="1.0.0" last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  right,
  onPress,
  danger,
  last,
}: {
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.6 }]}>
      <Text style={[styles.rowLabel, danger && { color: S.danger }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {right ?? null}
        {onPress && !right ? <ChevronRight size={18} color={S.muted} strokeWidth={2.4} /> : null}
      </View>
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: S.bg,
  },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 32,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: S.ink900,
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: S.tertiary,
    marginTop: 22,
    marginBottom: 10,
  },
  card: {
    backgroundColor: S.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    ...cardShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: S.ink900,
    flexShrink: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontSize: 14,
    color: S.tertiary,
  },
  divider: {
    height: 1,
    backgroundColor: S.lineSoft,
  },
  personRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  personOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: S.bg,
    borderRadius: 14,
    padding: 10,
  },
  personOptionActive: {
    backgroundColor: S.accent,
  },
  personAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  personName: {
    fontSize: 14,
    fontWeight: '700',
    color: S.ink900,
  },
  personNameActive: {
    color: '#FFFFFF',
  },
  hint: {
    marginTop: 12,
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 17,
    color: S.tertiary,
  },
});
