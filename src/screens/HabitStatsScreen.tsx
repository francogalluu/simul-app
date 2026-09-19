import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Text } from '@/components/AppText';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Chart, Host } from '@expo/ui/swift-ui';
import { format, parseISO } from 'date-fns';
import type { RootStackParamList } from '@/navigation/types';
import { useTasksStore } from '@/store/tasksStore';
import { partnerOf, useMe, usePeople } from '@/lib/people';
import { computeHabitStats } from '@/lib/habitStats';
import { getDateLocale } from '@/lib/dates';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';

const WINDOW_DAYS = 30;
const DOTS_PER_ROW = 10;
const DOTS_PADDING = 12;
const DOT_GAP = 8;

// Per-habit stats, presented as a native formSheet from the edit-habit sheet (see RootNavigator).
export default function HabitStatsScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
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

  const locale = getDateLocale();
  const chartData = stats.days.map((d) => ({
    x: format(parseISO(d.date), 'd MMM', { locale }),
    y: d.streak,
    color: d.done ? S.accent : S.line,
  }));
  // 10 dots per row inside the card (screen padding and card padding taken off).
  const dotSize = Math.floor((width - SCREEN_PADDING * 2 - DOTS_PADDING * 2) / DOTS_PER_ROW) - DOT_GAP;
  const peak = Math.max(0, ...stats.days.map((d) => d.streak));
  const ratePct = stats.rate == null ? '–' : `${Math.round(stats.rate * 100)}%`;
  const who = habit.owner === 'both' ? `Together with ${partnerName}` : habit.owner === me ? 'Just you' : `${partnerName}'s habit`;

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
          <Text style={styles.heroSub}>{who} • {habit.time}</Text>
        </View>
      </View>

      <View style={styles.tiles}>
        <Tile emoji="🔥" label="Current streak" value={`${stats.currentStreak}`} unit={stats.currentStreak === 1 ? 'day' : 'days'} highlight />
        <Tile emoji="🏆" label="Best streak" value={`${stats.bestStreak}`} unit={stats.bestStreak === 1 ? 'day' : 'days'} />
        <Tile emoji="🎯" label="Last 30 days" value={ratePct} />
        <Tile emoji="✅" label="Total done" value={`${stats.totalDone}`} unit={stats.totalDone === 1 ? 'time' : 'times'} />
      </View>

      <Text style={styles.sectionLabel}>Streak, last 30 days</Text>
      <View style={styles.card}>
        {stats.bestStreak === 0 ? (
          <Text style={styles.empty}>Complete this habit to start building a streak.</Text>
        ) : (
          <>
            <Host style={styles.chart}>
              <Chart
                type="area"
                data={chartData}
                areaStyle={{ color: S.accent }}
                lineStyle={{ color: S.accentDeep, width: 2.5 }}
                animate
                showGrid={false}
                style={styles.chart}
              />
            </Host>
            <View style={styles.chartCaption}>
              <Text style={styles.captionText}>{format(parseISO(stats.days[0].date), 'd MMM', { locale })}</Text>
              <Text style={styles.captionText}>Best in this period: {peak} {peak === 1 ? 'day' : 'days'}</Text>
              <Text style={styles.captionText}>Today</Text>
            </View>
          </>
        )}
      </View>

      <Text style={styles.sectionLabel}>Day by day</Text>
      <View style={[styles.card, styles.dots]}>
        {stats.days.map((d) => (
          <View
            key={d.date}
            style={[
              { width: dotSize, height: dotSize, borderRadius: dotSize / 2, margin: DOT_GAP / 2 },
              d.done ? styles.dotDone : d.beforeStart ? styles.dotBefore : styles.dotMissed,
            ]}
          />
        ))}
      </View>
      <View style={styles.legend}>
        <LegendItem style={styles.dotDone} label="Done" />
        <LegendItem style={styles.dotMissed} label="Missed" />
        <LegendItem style={styles.dotBefore} label="Not started" />
      </View>
    </ScrollView>
  );
}

function Tile({ emoji, label, value, unit, highlight }: { emoji: string; label: string; value: string; unit?: string; highlight?: boolean }) {
  return (
    <View style={[styles.tile, highlight && styles.tileHighlight]}>
      <Text style={styles.tileEmoji}>{emoji}</Text>
      <View style={styles.tileValueRow}>
        <Text style={styles.tileValue}>{value}</Text>
        {unit ? <Text style={styles.tileUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function LegendItem({ style, label }: { style: object; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, style]} />
      <Text style={styles.legendText}>{label}</Text>
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
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  tile: {
    width: '48.5%',
    backgroundColor: S.card,
    borderRadius: 18,
    padding: 14,
    ...cardShadow,
  },
  tileHighlight: { backgroundColor: S.goldSoft },
  tileEmoji: { fontSize: 18 },
  tileValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 6 },
  tileValue: { fontFamily: fonts.bold, fontSize: 28, color: S.ink900 },
  tileUnit: { fontSize: 13, fontWeight: '600', color: S.tertiary },
  tileLabel: { marginTop: 2, fontSize: 12, fontWeight: '600', color: S.tertiary },
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
  chart: { width: '100%', height: 150 },
  chartCaption: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  captionText: { fontSize: 11, fontWeight: '600', color: S.tertiary },
  empty: { fontSize: 14, color: S.tertiary, textAlign: 'center', paddingVertical: 24 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', padding: DOTS_PADDING },
  dotDone: { backgroundColor: S.accent },
  dotMissed: { backgroundColor: S.line },
  dotBefore: { backgroundColor: S.bg, borderWidth: 1, borderColor: S.line },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: S.tertiary },
});
