import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';
import { Text } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { CoupleAvatars } from '@/components/CoupleAvatars';
import { WeeklyRecapCard } from '@/components/home/WeeklyRecapCard';
import { useTabBarInset } from '@/navigation/CustomTabBar';
import { useTasksStore, type Completions, type Habit } from '@/store/tasksStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useHouseholdStore } from '@/store/householdStore';
import { partnerOf, useMe, usePeople, type Person } from '@/lib/people';
import {
  addDays, addMonths, datesInRange, getDateLocale, getDayOfWeekColumnIndex, getMonthRange, getShortDayLabels, getWeekDates, today,
} from '@/lib/dates';
import {
  completionRate, habitLongestStreak, habitStreak, isHabitActiveOn, isPausedNow, longestStreak, personDayComplete, personStreak,
  summarizeDay, togetherDayComplete, togetherStreak,
} from '@/lib/streaks';
import { computeMilestones, daysTogether } from '@/lib/milestones';
import { haptic } from '@/lib/haptics';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';

/**
 * The couple's numbers in one place: who's more consistent this month, the
 * streaks (each of you, and together), a GitHub-style month heatmap, per-habit
 * streak history, the shareable weekly recap, and the milestones coming up.
 */
export default function StatsScreen() {
  const me = useMe();
  const partner = partnerOf(me);
  const people = usePeople();
  const tabInset = useTabBarInset();
  const habits = useTasksStore((s) => s.habits);
  const completions = useTasksStore((s) => s.completions);
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  const anniversary = useHouseholdStore((s) => s.household?.anniversary ?? null);
  const t = today();
  const [monthAnchor, setMonthAnchor] = useState(t);

  const month = useMemo(() => {
    const { start, end } = getMonthRange(monthAnchor);
    return {
      start,
      end,
      label: format(new Date(start + 'T00:00:00'), 'MMMM yyyy', { locale: getDateLocale() }),
      a: completionRate(habits, completions, 'A', start, end),
      s: completionRate(habits, completions, 'S', start, end),
    };
  }, [monthAnchor, habits, completions]);

  const streaks = useMemo(() => {
    const dates = Object.keys(completions);
    return {
      together: togetherStreak(habits, completions),
      togetherBest: longestStreak(dates, (d) => togetherDayComplete(habits, completions, d)),
      A: personStreak(habits, completions, 'A'),
      ABest: longestStreak(dates, (d) => personDayComplete(habits, completions, d, 'A')),
      S: personStreak(habits, completions, 'S'),
      SBest: longestStreak(dates, (d) => personDayComplete(habits, completions, d, 'S')),
    };
  }, [habits, completions]);

  const lastWeek = useMemo(() => getWeekDates(addDays(t, -7), weekStartsOn), [t, weekStartsOn]);
  const thisWeek = useMemo(() => getWeekDates(t, weekStartsOn), [t, weekStartsOn]);
  const milestones = useMemo(() => computeMilestones(anniversary, habits, completions), [anniversary, habits, completions]);
  const together = daysTogether(anniversary);
  const activeHabits = habits.filter((h) => h.status === 'active');

  const leader = (() => {
    if (month.a.rate === null && month.s.rate === null) return null;
    const a = month.a.rate ?? 0;
    const s = month.s.rate ?? 0;
    if (Math.abs(a - s) < 0.02) return { text: 'Neck and neck this month', who: null as Person | null };
    const who: Person = a > s ? 'A' : 'S';
    return { text: `${people[who].name} is ${who === me ? 'ahead' : 'more consistent'} this month`, who };
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabInset }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Stats</Text>

        {/* This month: the two of you */}
        <View style={styles.card}>
          <View style={styles.monthHeader}>
            <Pressable onPress={() => { haptic.tap(); setMonthAnchor(addMonths(monthAnchor, -1)); }} hitSlop={10} style={styles.navButton}>
              <ChevronLeft size={18} color={S.ink900} strokeWidth={2.4} />
            </Pressable>
            <Text style={styles.monthLabel}>{month.label}</Text>
            <Pressable onPress={() => { haptic.tap(); setMonthAnchor(addMonths(monthAnchor, 1)); }} hitSlop={10} disabled={month.end >= t} style={[styles.navButton, month.end >= t && { opacity: 0.3 }]}>
              <ChevronRight size={18} color={S.ink900} strokeWidth={2.4} />
            </Pressable>
          </View>

          <View style={styles.compareRow}>
            <PersonRate person="A" rate={month.a.rate} done={month.a.done} possible={month.a.possible} highlight={leader?.who === 'A'} />
            <View style={styles.compareMiddle}>
              <CoupleAvatars size={28} />
            </View>
            <PersonRate person="S" rate={month.s.rate} done={month.s.done} possible={month.s.possible} highlight={leader?.who === 'S'} right />
          </View>
          {leader && <Text style={styles.leaderText}>{leader.text}</Text>}

          <Heatmap start={month.start} end={month.end} habits={habits} completions={completions} weekStartsOn={weekStartsOn} />
        </View>

        {/* Streaks */}
        <Text style={styles.sectionLabel}>Streaks</Text>
        <View style={styles.card}>
          <StreakRow label="Together" current={streaks.together} best={streaks.togetherBest} avatar={<CoupleAvatars size={22} ring={false} />} accent />
          <Divider />
          <StreakRow label={people.A.name} current={streaks.A} best={streaks.ABest} avatar={<Avatar person="A" size={22} />} />
          <Divider />
          <StreakRow label={people.S.name} current={streaks.S} best={streaks.SBest} avatar={<Avatar person="S" size={22} />} />
        </View>

        {/* Weekly recap */}
        <Text style={styles.sectionLabel}>Weekly recap</Text>
        <WeeklyRecapCard weekDates={t === thisWeek[6] ? thisWeek : lastWeek} title={t === thisWeek[6] ? 'This week' : 'Last week'} habits={habits} completions={completions} />

        {/* Per-habit */}
        {activeHabits.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>By habit</Text>
            <View style={styles.card}>
              {activeHabits.map((h, i) => (
                <HabitRow key={h.id} habit={h} completions={completions} me={me} partner={partner} first={i === 0} />
              ))}
            </View>
          </>
        )}

        {/* Milestones */}
        <Text style={styles.sectionLabel}>Moments</Text>
        <View style={styles.card}>
          {together !== null ? (
            <View style={styles.momentRow}>
              <Text style={styles.momentIcon}>💞</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.momentTitle}>{together.toLocaleString()} days together</Text>
                <Text style={styles.momentBody}>Since {format(new Date(anniversary! + 'T00:00:00'), 'd MMMM yyyy', { locale: getDateLocale() })}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.momentRow}>
              <Text style={styles.momentIcon}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.momentTitle}>Set your start date</Text>
                <Text style={styles.momentBody}>Settings → Household. Simul will mark 100 days, one year, and the rest.</Text>
              </View>
            </View>
          )}
          {milestones.today.map((m) => (
            <React.Fragment key={m.id}>
              <Divider />
              <View style={styles.momentRow}>
                <Text style={styles.momentIcon}>{m.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.momentTitle}>{m.title} — today!</Text>
                  <Text style={styles.momentBody}>{m.subtitle}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
          {milestones.upcoming.map((m) => (
            <React.Fragment key={m.id}>
              <Divider />
              <View style={styles.momentRow}>
                <Text style={styles.momentIcon}>{m.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.momentTitle}>{m.title}</Text>
                  <Text style={styles.momentBody}>{format(new Date(m.date + 'T00:00:00'), 'd MMMM', { locale: getDateLocale() })} · {m.subtitle}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
          {milestones.past.slice(0, 3).map((m) => (
            <React.Fragment key={m.id}>
              <Divider />
              <View style={[styles.momentRow, { opacity: 0.65 }]}>
                <Text style={styles.momentIcon}>{m.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.momentTitle}>{m.title}</Text>
                  <Text style={styles.momentBody}>{format(new Date(m.date + 'T00:00:00'), 'd MMMM yyyy', { locale: getDateLocale() })}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PersonRate({ person, rate, done, possible, highlight, right }: { person: Person; rate: number | null; done: number; possible: number; highlight: boolean; right?: boolean }) {
  const p = usePeople()[person];
  return (
    <View style={[styles.personRate, right && { alignItems: 'flex-end' }]}>
      <View style={[styles.personNameRow, right && { flexDirection: 'row-reverse' }]}>
        <Avatar person={person} size={20} />
        <Text style={[styles.personName, { color: p.color }]} numberOfLines={1}>{p.name}</Text>
      </View>
      <Text style={[styles.personPct, highlight && { color: S.accentDeep }]}>{rate === null ? '—' : `${Math.round(rate * 100)}%`}</Text>
      <Text style={styles.personSub}>{possible ? `${done} of ${possible}` : 'nothing yet'}</Text>
    </View>
  );
}

function StreakRow({ label, current, best, avatar, accent }: { label: string; current: number; best: number; avatar: React.ReactNode; accent?: boolean }) {
  return (
    <View style={styles.streakRow}>
      {avatar}
      <Text style={styles.streakLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.streakNums}>
        <Text style={[styles.streakCurrent, accent && { color: S.accentDeep }]}>{current}<Text style={styles.streakUnit}> d</Text></Text>
        <Text style={styles.streakBest}>best {best}</Text>
      </View>
    </View>
  );
}

function HabitRow({ habit, completions, me, partner, first }: { habit: Habit; completions: Completions; me: Person; partner: Person; first: boolean }) {
  const shared = habit.owner === 'both';
  const who: Person | undefined = habit.owner === 'both' ? undefined : habit.owner;
  const current = habitStreak(habit, completions, who);
  const best = habitLongestStreak(habit, completions, who);
  const mine = shared ? habitStreak(habit, completions, me) : null;
  const theirs = shared ? habitStreak(habit, completions, partner) : null;
  const paused = isPausedNow(habit);
  const t = today();
  const last30 = datesInRange(addDays(t, -29), t);
  const p = usePeople();
  return (
    <View style={[styles.habitRow, !first && { borderTopWidth: 1, borderTopColor: S.lineSoft }]}>
      <View style={styles.habitTop}>
        <Text style={styles.habitIcon}>{habit.icon}</Text>
        <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
        {paused && <Text style={styles.habitPaused}>Paused</Text>}
        <Text style={styles.habitStreak}>{current}<Text style={styles.streakUnit}> d</Text><Text style={styles.habitBest}> · best {best}</Text></Text>
      </View>
      <View style={styles.sparkRow}>
        {last30.map((d) => {
          const active = isHabitActiveOn(habit, d);
          const a = Boolean(completions[d]?.[habit.id]?.A);
          const s = Boolean(completions[d]?.[habit.id]?.S);
          const done = shared ? a && s : habit.owner === 'A' ? a : s;
          const partial = shared && (a || s) && !done;
          return (
            <View
              key={d}
              style={[
                styles.spark,
                !active && styles.sparkInactive,
                done && { backgroundColor: shared ? S.accent : p[habit.owner as Person].color },
                partial && { backgroundColor: a ? p.A.color : p.S.color, opacity: 0.45 },
              ]}
            />
          );
        })}
      </View>
      {shared && mine !== null && theirs !== null && (
        <Text style={styles.habitSub}>You {mine} d · {p[partner].name} {theirs} d</Text>
      )}
    </View>
  );
}

function Heatmap({ start, end, habits, completions, weekStartsOn }: { start: string; end: string; habits: Habit[]; completions: Completions; weekStartsOn: 0 | 1 }) {
  const t = today();
  const labels = getShortDayLabels(weekStartsOn).map((l) => l.slice(0, 1).toUpperCase());
  const lead = getDayOfWeekColumnIndex(start, weekStartsOn);
  const days = datesInRange(start, end).map((date) => summarizeDay(habits, completions, date));
  const cells: (typeof days[number] | null)[] = [...Array<null>(lead).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const level = (pct: number, full: boolean) => (full ? 4 : pct >= 0.66 ? 3 : pct >= 0.33 ? 2 : pct > 0 ? 1 : 0);
  const COLORS = ['rgba(38,32,25,0.06)', 'rgba(107,178,144,0.28)', 'rgba(107,178,144,0.5)', 'rgba(107,178,144,0.75)', S.accentDeep];
  return (
    <View style={styles.heat}>
      <View style={styles.heatRow}>
        {labels.map((l, i) => <Text key={i} style={styles.heatLabel}>{l}</Text>)}
      </View>
      <View style={styles.heatGrid}>
        {cells.map((c, i) => (
          <View key={c ? c.date : `b${i}`} style={styles.heatCellWrap}>
            {c && (
              <View
                style={[
                  styles.heatCell,
                  { backgroundColor: c.date > t ? 'transparent' : COLORS[level(c.pct, c.full)] },
                  c.date > t && styles.heatCellFuture,
                  c.date === t && styles.heatCellToday,
                ]}
              />
            )}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {COLORS.map((c, i) => <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />)}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.bg },
  scroll: { paddingHorizontal: SCREEN_PADDING },
  title: { fontFamily: fonts.bold, fontSize: 30, color: S.ink900, marginTop: 14, marginBottom: 6 },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: S.tertiary, marginTop: 22, marginBottom: 10,
  },
  card: { backgroundColor: S.card, borderRadius: 20, padding: 16, marginTop: 10, ...cardShadow },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: S.bg, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontFamily: fonts.bold, fontSize: 17, color: S.ink900, textTransform: 'capitalize' },
  compareRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  compareMiddle: { paddingHorizontal: 8 },
  personRate: { flex: 1 },
  personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personName: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  personPct: { fontFamily: fonts.bold, fontSize: 30, color: S.ink900, marginTop: 4 },
  personSub: { fontSize: 11, fontWeight: '600', color: S.tertiary },
  leaderText: { marginTop: 10, fontSize: 13, fontWeight: '600', color: S.ink600, textAlign: 'center' },
  heat: { marginTop: 16 },
  heatRow: { flexDirection: 'row' },
  heatLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800', color: S.muted },
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  heatCellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2.5 },
  heatCell: { flex: 1, borderRadius: 6 },
  heatCellFuture: { borderWidth: 1, borderColor: S.lineSoft, borderStyle: 'dashed' },
  heatCellToday: { borderWidth: 2, borderColor: S.ink900 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 8 },
  legendCell: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 10, fontWeight: '700', color: S.muted, marginHorizontal: 3 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  streakLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: S.ink900 },
  streakNums: { alignItems: 'flex-end' },
  streakCurrent: { fontFamily: fonts.bold, fontSize: 18, color: S.ink900 },
  streakUnit: { fontSize: 12, color: S.ink500 },
  streakBest: { fontSize: 11, fontWeight: '600', color: S.tertiary },
  divider: { height: 1, backgroundColor: S.lineSoft },
  habitRow: { paddingVertical: 12 },
  habitTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  habitIcon: { fontSize: 16 },
  habitName: { flex: 1, fontSize: 14, fontWeight: '700', color: S.ink900 },
  habitPaused: { fontSize: 10, fontWeight: '800', color: S.amber, backgroundColor: S.amberSoft, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  habitStreak: { fontFamily: fonts.bold, fontSize: 15, color: S.ink900 },
  habitBest: { fontSize: 11, color: S.tertiary, fontFamily: 'Nunito_600SemiBold' },
  sparkRow: { flexDirection: 'row', gap: 3, marginTop: 8 },
  spark: { flex: 1, height: 14, borderRadius: 3, backgroundColor: 'rgba(38,32,25,0.06)' },
  sparkInactive: { opacity: 0.25 },
  habitSub: { marginTop: 6, fontSize: 11.5, fontWeight: '600', color: S.tertiary },
  momentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  momentIcon: { fontSize: 24 },
  momentTitle: { fontSize: 14, fontWeight: '700', color: S.ink900 },
  momentBody: { fontSize: 12, color: S.tertiary, marginTop: 1 },
});
