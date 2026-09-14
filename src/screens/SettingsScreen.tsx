import React from 'react';
import {
  View, Text, Switch, Pressable, ScrollView, StyleSheet, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  SlidersHorizontal,
  Target,
  Trash2,
  Database,
  Download,
  HelpCircle,
  Moon,
  Languages,
  Bell,
  Clock,
  Smartphone,
  Calendar,
  Shield,
  FileText,
  Info,
  BookOpen,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from '@/navigation/types';
import { useSettingsStore } from '@/store/settingsStore';
import { useHabitStore } from '@/store';
import { useTheme } from '@/context/ThemeContext';
import type { Palette } from '@/lib/theme';
import { i18n } from '@/i18n';
import type { Habit, HabitEntry } from '@/types/habit';
import { getHabitUnitLabel } from '@/lib/habitUnitLabel';

// ─── CSV export ──────────────────────────────────────────────────────────────

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildHabitsCsv(habits: Habit[], entries: HabitEntry[], t: (key: string) => string): string {
  const habitMap = new Map(habits.map(h => [h.id, h]));
  const header = 'Habit,Date,Value,Unit,Target';
  const rows = entries
    .filter(e => habitMap.has(e.habitId))
    .map(e => {
      const h = habitMap.get(e.habitId)!;
      return [
        escapeCsvCell(h.name),
        e.date,
        String(e.value),
        escapeCsvCell(getHabitUnitLabel(h, t)),
        String(h.target ?? 1),
      ].join(',');
    });
  return [header, ...rows].join('\n');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const {
    hapticFeedback,     setHapticFeedback,
    weekStartsOn,       setWeekStartsOn,
    darkMode,           setDarkMode,
    strictScoreMode,    setStrictScoreMode,
    language,
    setLanguage,
    dailyReminderEnabled,
    dailyReminderTime,
  } = useSettingsStore();

  const handleWeekStartPress = () => {
    Alert.alert(
      t('alerts.weekStartsOn'),
      undefined,
      [
        { text: t('settings.sunday'),  onPress: () => setWeekStartsOn(0), style: 'default' },
        { text: t('settings.monday'),  onPress: () => setWeekStartsOn(1), style: 'default' },
        { text: t('common.cancel'),  style: 'cancel' },
      ],
    );
  };

  const handleLanguagePress = () => {
    Alert.alert(
      t('settings.language'),
      undefined,
      [
        { text: t('settings.english'), onPress: () => { setLanguage('en'); i18n.changeLanguage('en'); }, style: 'default' },
        { text: t('settings.spanish'), onPress: () => { setLanguage('es'); i18n.changeLanguage('es'); }, style: 'default' },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  const handleComingSoon = (feature: string) => {
    Alert.alert(feature, t('settings.comingSoon'), [{ text: t('common.ok') }]);
  };

  const handleExportToCsv = async () => {
    const { habits, entries } = useHabitStore.getState();
    const csv = buildHabitsCsv(habits, entries, t);
    try {
      await Share.share({
        message: csv,
        title: t('settings.exportToCsv'),
      });
    } catch (err) {
      if ((err as { message?: string })?.message?.includes('cancel') || (err as { code?: string })?.code === 'ECANCELLED') return;
      Alert.alert(t('settings.exportToCsv'), (err as Error)?.message ?? t('settings.exportError'), [{ text: t('common.ok') }]);
    }
  };

  const reminderSummary = dailyReminderEnabled
    ? formatTimeSummary(dailyReminderTime)
    : t('settings.off');

  const languageDisplay = (language === 'es' ? t('settings.spanish') : t('settings.english'));

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <Text style={[s.title, { color: colors.text1 }]}>{t('settings.title')}</Text>

        {/* ── Preferences ─────────────────────────────────────────────── */}
        <Section title={t('settings.preferences')} icon={SlidersHorizontal} colors={colors}>
          <SettingRow
            icon={Moon}
            label={t('settings.darkMode')}
            right={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: colors.separatorLight, true: colors.teal }}
                thumbColor={colors.white}
              />
            }
            colors={colors}
          />
          <SettingRow
            icon={Languages}
            label={t('settings.language')}
            value={languageDisplay}
            onPress={handleLanguagePress}
            showChevron
            colors={colors}
          />
          <SettingRow
            icon={Bell}
            label={t('settings.notifications')}
            value={reminderSummary}
            onPress={() => navigation.navigate('Notifications')}
            showChevron
            colors={colors}
          />
          <SettingRow
            icon={Clock}
            label={t('settings.habitReminders')}
            onPress={() => navigation.navigate('HabitReminders')}
            showChevron
            colors={colors}
          />
          <SettingRow
            icon={Smartphone}
            label={t('settings.hapticFeedback')}
            right={
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{ false: colors.separatorLight, true: colors.teal }}
                thumbColor={colors.white}
              />
            }
            colors={colors}
          />
          <SettingRow
            icon={Target}
            label={t('settings.strictScoreMode')}
            right={
              <Switch
                value={strictScoreMode}
                onValueChange={setStrictScoreMode}
                trackColor={{ false: colors.separatorLight, true: colors.teal }}
                thumbColor={colors.white}
              />
            }
            footerText={t('settings.strictScoreModeDescription')}
            colors={colors}
          />
          <SettingRow
            icon={Calendar}
            label={t('settings.weekStartsOn')}
            value={weekStartsOn === 0 ? t('settings.sunday') : t('settings.monday')}
            onPress={handleWeekStartPress}
            showChevron
            last
            colors={colors}
          />
        </Section>

        {/* ── Data ────────────────────────────────────────────────────── */}
        <Section title={t('settings.data')} icon={Database} colors={colors}>
          <SettingRow
            icon={Download}
            label={t('settings.exportToCsv')}
            onPress={handleExportToCsv}
            showChevron
            colors={colors}
          />
          <SettingRow
            icon={Trash2}
            label={t('settings.deletedHabits')}
            onPress={() => navigation.navigate('DeletedHabits')}
            showChevron
            last
            colors={colors}
          />
        </Section>

        {/* ── About ───────────────────────────────────────────────────── */}
        <Section title={t('settings.about')} icon={HelpCircle} colors={colors}>
          <SettingRow
            icon={FileText}
            label={t('settings.habitsAndScoring')}
            onPress={() => navigation.navigate('HabitsScoring')}
            showChevron
            colors={colors}
          />
          <SettingRow icon={Info} label={t('settings.version')} value="1.0.0" colors={colors} />
          <SettingRow
            icon={BookOpen}
            label={t('settings.viewOnboarding')}
            onPress={() => navigation.navigate('OnboardingWelcome')}
            showChevron
            colors={colors}
          />
          <SettingRow
            icon={Shield}
            label={t('settings.privacyPolicy')}
            onPress={() => navigation.navigate('PrivacyPolicy')}
            showChevron
            colors={colors}
          />
          <SettingRow
            icon={FileText}
            label={t('settings.termsOfService')}
            onPress={() => navigation.navigate('TermsOfService')}
            showChevron
            last
            colors={colors}
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type LucideIcon = typeof ChevronRight;

function Section({
  title,
  icon: Icon,
  children,
  colors,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  colors: Palette;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionTitleRow}>
        <Icon size={16} color={colors.text2} strokeWidth={2} style={s.sectionIcon} />
        <Text style={[s.sectionTitle, { color: colors.text2 }]}>{title}</Text>
      </View>
      <View style={[s.sectionCard, { backgroundColor: colors.bgCard }]}>{children}</View>
    </View>
  );
}

function SettingRow({
  icon: Icon,
  label,
  value,
  right,
  onPress,
  showChevron = false,
  last = false,
  footerText,
  colors,
}: {
  icon?: LucideIcon;
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  last?: boolean;
  /** Secondary copy shown under the row (e.g. setting explanation). */
  footerText?: string;
  colors: Palette;
}) {
  const footerInsetLeft = Icon ? 16 + 20 + 12 : 16;

  const row = (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        s.row,
        footerText ? s.rowWithFooter : s.rowPadVertical,
        { backgroundColor: colors.bgCard },
        !footerText && !last && [s.rowBorder, { borderBottomColor: colors.separator }],
        pressed && onPress && { backgroundColor: colors.bgSecondary },
      ]}
    >
      <View style={s.rowLeft}>
        {Icon ? (
          <Icon size={20} color={colors.text2} strokeWidth={2} style={s.rowIcon} />
        ) : null}
        <Text style={[s.rowLabel, { color: colors.text1 }]}>{label}</Text>
      </View>
      <View style={s.rowRight}>
        {value ? <Text style={[s.rowValue, { color: colors.text4 }]}>{value}</Text> : null}
        {right ?? null}
        {showChevron && !right ? (
          <ChevronRight size={20} color={colors.chevron} strokeWidth={2.5} />
        ) : null}
      </View>
    </Pressable>
  );

  if (footerText) {
    return (
      <View
        style={[
          { backgroundColor: colors.bgCard },
          !last && [s.rowBorder, { borderBottomColor: colors.separator }],
        ]}
      >
        {row}
        <View style={[s.rowFooterBlock, { paddingLeft: footerInsetLeft }]}>
          <Text style={[s.rowFooter, { color: colors.text4 }]}>{footerText}</Text>
        </View>
      </View>
    );
  }

  return row;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 20 },

  title: {
    fontSize: 34, fontWeight: '700',
    letterSpacing: -0.68, paddingHorizontal: 24,
    paddingTop: 16, paddingBottom: 24,
  },

  section:        { marginBottom: 32 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionIcon:     { marginRight: 6 },
  sectionTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  rowPadVertical: {
    paddingVertical: 14,
  },
  rowWithFooter: {
    paddingTop: 14,
    paddingBottom: 6,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  rowIcon: { marginRight: 12 },
  rowLabel: { fontSize: 17, flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue: { fontSize: 17 },
  rowFooterBlock: {
    paddingRight: 16,
    paddingTop: 2,
    paddingBottom: 14,
    maxWidth: '100%',
  },
  rowFooter: {
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
});

function formatTimeSummary(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const mm = String(m).padStart(2, '0');
  return `${h12}:${mm} ${ampm}`;
}
