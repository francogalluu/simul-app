import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useKindTranslation } from '@/lib/kind';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { SmoothChart } from '../../modules/simul-chart';
import type { RootStackParamList } from '@/navigation/types';
import { useTasksStore } from '@/store/tasksStore';
import { partnerOf, useMe, usePeople } from '@/lib/people';
import { computeHabitStats } from '@/lib/habitStats';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';

const WINDOW_DAYS = 30;

// Per-habit stats, presented as a native formSheet from the edit-habit sheet (see RootNavigator).
export default function HabitStatsScreen() {
  const { t } = useKindTranslation();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'HabitStats'>>();
  const me = useMe();
  const partnerName = usePeople()[partnerOf(me)].name;
  const habits = useTasksStore((s) => s.habits);
  const completions = useTasksStore((s) => s.completions);
  const habit = habits.find((h) => h.id === params.habitId);

  React.useEffect(() => {
    if (!habit) navigation.goBack();
  }, [habit, navigation]);

  const stats = useMemo(
    () => (habit ? computeHabitStats(habit, completions, WINDOW_DAYS) : null),
    [habit, completions],
  );
  if (!habit || !stats) return null;

  const ratePct = stats.rate == null ? '–' : `${Math.round(stats.rate * 100)}%`;
  const who = habit.owner === 'both' ? t('habit.who_together', { name: partnerName }) : habit.owner === me ? t('habit.who_you') : t('habit.who_partner', { name: partnerName });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Text style={styles.heroEmoji}>{habit.icon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.heroName} numberOfLines={1}>{habit.name}</Text>
          <Text style={styles.heroSub}>{who} • {t(`times.${habit.time}`, { defaultValue: habit.time })}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat emoji="🔥" value={`${stats.currentStreak}`} label={t('stats.streak')} />
        <View style={styles.statDivider} />
        <Stat emoji="🏆" value={`${stats.bestStreak}`} label={t('stats.best')} />
        <View style={styles.statDivider} />
        <Stat emoji="🎯" value={ratePct} label={t('stats.days30')} />
        <View style={styles.statDivider} />
        <Stat emoji="✅" value={`${stats.totalDone}`} label={t('stats.total')} />
      </View>

      <Text style={styles.sectionLabel}>{t('stats.consistency')}</Text>
      <View style={styles.card}>
        {stats.bestStreak === 0 ? (
          <Text style={styles.empty}>{t('stats.empty')}</Text>
        ) : (
          <>
            <SmoothChart values={stats.trend.map((v) => v * 100)} maxValue={100} color={S.accent} style={styles.chart} />
            <View style={styles.chartCaption}>
              <Text style={styles.captionText}>{t('stats.ago30')}</Text>
              <Text style={styles.captionText}>{t('stats.last7')}</Text>
              <Text style={styles.captionText}>{t('common.today')}</Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Stat({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: S.bg },
  content: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 32 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: S.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  heroEmoji: { fontSize: 28 },
  heroName: { fontFamily: fonts.bold, fontSize: 22, color: S.ink900 },
  heroSub: { marginTop: 2, fontSize: 13, color: S.tertiary },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: S.card,
    borderRadius: 18,
    paddingVertical: 12,
    marginTop: 16,
    ...cardShadow,
  },
  stat: { flex: 1, alignItems: 'center', gap: 1 },
  statEmoji: { fontSize: 14 },
  statValue: { fontFamily: fonts.bold, fontSize: 20, color: S.ink900 },
  statLabel: { fontSize: 11, fontWeight: '600', color: S.tertiary },
  statDivider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: S.line },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: S.tertiary,
    marginTop: 22,
    marginBottom: 10,
  },
  card: { backgroundColor: S.card, borderRadius: 20, padding: 16, ...cardShadow },
  chart: { width: '100%', height: 170 },
  chartCaption: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  captionText: { fontSize: 11, fontWeight: '600', color: S.tertiary },
  empty: { fontSize: 14, color: S.tertiary, textAlign: 'center', paddingVertical: 24 },
});
