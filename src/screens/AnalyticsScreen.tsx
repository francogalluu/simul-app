import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Svg, { Line } from 'react-native-svg';
import { Flame, CalendarCheck, Trophy } from 'lucide-react-native';
import {
  today,
  datesInRange,
  addDays,
  addMonths,
  getWeekDates,
  getWeeksRange,
  getMonthKey,
  getLastNMonthRanges,
  getShortDayLabels,
  getDayOfWeekColumnIndex,
  getDateLocale,
  getLast7Days,
  getMonthRange,
} from '@/lib/dates';
import { format } from 'date-fns';
import {
  dailyCompletion,
  entryValue,
  getHabitCurrentValue,
  isHabitActiveOnDate,
  isHabitCompleted,
} from '@/lib/aggregates';
import type { Palette } from '@/lib/theme';
import type { Habit, HabitEntry } from '@/types/habit';
import { BarChartWithTooltip, type ChartBar } from '@/components/charts/BarChartWithTooltip';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { ScoreRing } from '@/components/ScoreRing';
import { useHabitStore } from '@/store';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/context/ThemeContext';
import { useHabitLogs } from '@/hooks/useHabitLogs';
import {
  buildActiveHabitsLeaderboard,
  buildCurrentWeekSnapshot,
  buildHabitMovers,
  buildMonthPaceComparison,
  buildPeriodComparison,
  buildTrendSeries,
  buildWeekdayPattern,
  getCompletionSnapshot,
} from '@/lib/generalAnalytics';
import type { RootStackParamList } from '@/navigation/types';
import { getHabitUnitLabel } from '@/lib/habitUnitLabel';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeRange = 'day' | 'week' | 'month' | '6month' | 'year';
type DateFilter = 'general' | Exclude<TimeRange, 'day'>;
export type ChartBucket = { key: string; label: string; start: string; end: string; dates?: string[] };
export type { ChartBar };
type InsightCardItem = { tone: 'positive' | 'neutral' | 'warning'; title: string; body: string };
type MetricGridItem = { label: string; value: string; detail: string };

const PERIOD_DELTA_DAYS: Record<string, number> = {
  week: 7,
  month: 30,
  '6month': 180,
  year: 365,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TFunction = (key: string, opts?: { [k: string]: string | number }) => string;

/** Build buckets for chart. For 'week', use only YYYY-MM-DD (key/start/end); labels are for display only and must not be used for aggregation. */
function getBuckets(range: TimeRange, endDate: string, weekStartsOn: 0 | 1, t: TFunction, useWeekBuckets = false): ChartBucket[] {
  if (useWeekBuckets) {
    const locale = getDateLocale();
    const weekLabelFormat = 'd/M';
    switch (range) {
      case 'day':
        return [{ key: endDate, label: t('common.today'), start: endDate, end: endDate }];
      case 'week': {
        const weeks = getWeeksRange(6, 0, weekStartsOn);
        return weeks.map((weekDays) => {
          const start = weekDays[0];
          const end = weekDays[6];
          const label = format(new Date(start + 'T00:00:00'), weekLabelFormat, { locale });
          return { key: start, label, start, end, dates: weekDays };
        });
      }
      case 'month': {
        const weeks = getWeeksRange(3, 0, weekStartsOn);
        return weeks.map((weekDays) => {
          const start = weekDays[0];
          const end = weekDays[6];
          const label = format(new Date(start + 'T00:00:00'), weekLabelFormat, { locale });
          return { key: start, label, start, end, dates: weekDays };
        });
      }
      case '6month': {
        const weeks = getWeeksRange(25, 0, weekStartsOn);
        return weeks.map((weekDays) => {
          const start = weekDays[0];
          const end = weekDays[6];
          const label = format(new Date(start + 'T00:00:00'), weekLabelFormat, { locale });
          return { key: start, label, start, end, dates: weekDays };
        });
      }
      case 'year': {
        const weeks = getWeeksRange(51, 0, weekStartsOn);
        return weeks.map((weekDays) => {
          const start = weekDays[0];
          const end = weekDays[6];
          const label = format(new Date(start + 'T00:00:00'), weekLabelFormat, { locale });
          return { key: start, label, start, end, dates: weekDays };
        });
      }
    }
  }
  switch (range) {
    case 'day':
      return [{ key: endDate, label: t('common.today'), start: endDate, end: endDate }];
    case 'week': {
      const weekDates = getLast7Days(endDate);
      const dayLabels = getShortDayLabels(weekStartsOn);
      return weekDates.map(d => ({
        key: d,
        label: dayLabels[getDayOfWeekColumnIndex(d, weekStartsOn)],
        start: d,
        end: d,
      }));
    }
    case 'month': {
      const start = addDays(endDate, -29);
      const days = datesInRange(start, endDate);
      return days.map(d => ({
        key: d,
        label: d,
        start: d,
        end: d,
      }));
    }
    case '6month':
      return getLastNMonthRanges(endDate, 6).map(({ start, end, label, monthKey }) => ({ key: monthKey, label, start, end }));
    case 'year':
      return getLastNMonthRanges(endDate, 12).map(({ start, end, label, monthKey }) => ({ key: monthKey, label, start, end }));
  }
}

/** Uses all habits; for each date d, counts only habits active on that date (isHabitActiveOnDate). Only counts dates <= todayStr (no future). */
function aggregateCompletions(
  habits: Habit[],
  entries: HabitEntry[],
  buckets: ChartBucket[],
  habitFilter: Habit | null,
  weekStartsOn: 0 | 1,
  todayStr: string,
): { completed: number; target: number; averagePercent?: number }[] {
  const analyticsOptions = { maxDate: todayStr };
  return buckets.map(bucket => {
    // Weekly habit + month bucket (e.g. yearly view): count completed weeks in that month
    if (habitFilter?.frequency === 'weekly' && !bucket.dates) {
      const monthDays = datesInRange(bucket.start, bucket.end).filter(d => d <= todayStr);
      const weekStartsInMonth = new Set<string>();
      for (const d of monthDays) {
        weekStartsInMonth.add(getWeekDates(d, weekStartsOn)[0]);
      }
      let completed = 0;
      let target = 0;
      for (const weekStart of weekStartsInMonth) {
        if (habitFilter.createdAt > addDays(weekStart, 6)) continue;
        target += 1;
        if (isHabitCompleted(habitFilter, entries, weekStart, weekStartsOn, analyticsOptions)) completed += 1;
      }
      const avgPct = target > 0 ? (completed / target) * 100 : undefined;
      return { completed, target, averagePercent: avgPct };
    }

    const rawDays = bucket.dates ?? datesInRange(bucket.start, bucket.end);
    const days = rawDays.filter(d => d <= todayStr);
    let completed = 0;
    let target = 0;
    const dailyPcts: number[] = [];

    for (const d of days) {
      if (habitFilter) {
        if (habitFilter.createdAt > d) continue;
        target += 1;
        const completedThisDay = isHabitCompleted(habitFilter, entries, d, weekStartsOn, analyticsOptions);
        if (completedThisDay) completed += 1;
        const value = getHabitCurrentValue(habitFilter, entries, d, weekStartsOn, analyticsOptions);
        const t = habitFilter.target || 1;
        if (habitFilter.goalType === 'break') {
          dailyPcts.push(completedThisDay ? 100 : 0);
        } else {
          dailyPcts.push(Math.min(100, Math.round((value / t) * 100)));
        }
      } else {
        const active = habits.filter(h => isHabitActiveOnDate(h, d) && h.createdAt <= d);
        const n = active.length;
        const c = active.filter(h => isHabitCompleted(h, entries, d, weekStartsOn, analyticsOptions)).length;
        target += n;
        completed += c;
        dailyPcts.push(n > 0 ? (c / n) * 100 : 0);
      }
    }

    const avgPct =
      dailyPcts.length > 0
        ? dailyPcts.reduce((a, b) => a + b, 0) / dailyPcts.length
        : undefined;

    return { completed, target, averagePercent: avgPct };
  });
}

function computePercent(completed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((completed / target) * 100));
}

/** Clamp percent to [0, 100] for rendering. Bars must never extend below baseline. */
function safePercent(percent: number | null | undefined): number {
  const n = Number(percent);
  if (n !== n) return 0;
  return Math.max(0, Math.min(100, n));
}

function buildChartBars(habits: Habit[], entries: HabitEntry[], range: TimeRange, endDate: string, habitFilter: Habit | null, weekStartsOn: 0 | 1, t: TFunction): ChartBar[] {
  /** Weekly habits use week buckets for day/week/month/6month; year uses monthly buckets like other habits. */
  const useWeekBuckets = habitFilter?.frequency === 'weekly' && range !== 'year';
  const buckets = getBuckets(range, endDate, weekStartsOn, t, useWeekBuckets);
  const agg = aggregateCompletions(habits, entries, buckets, habitFilter, weekStartsOn, endDate);
  const bars = buckets.map((b, i) => {
    // For "all habits", use overall completed/target so bar % matches tooltip "X of Y". For single habit, use average daily %.
    const raw =
      habitFilter != null && agg[i].averagePercent != null
        ? agg[i].averagePercent
        : computePercent(agg[i].completed, agg[i].target);
    return {
      key: b.key,
      label: b.label,
      percent: safePercent(raw),
      completed: agg[i].completed,
      target: agg[i].target,
    };
  });
  if (__DEV__ && range === 'week' && bars.length > 0) {
    const lines = bars.map(b => `${b.key} completed=${b.completed} target=${b.target} → ${b.percent}%`).join('\n');
    // eslint-disable-next-line no-console
    console.log('[Analytics weekly chart] per-day:\n' + lines);
  }
  return bars;
}

function getPeriodDates(range: TimeRange, todayStr: string, weekStartsOn: 0 | 1): string[] {
  switch (range) {
    case 'day': return [todayStr];
    case 'week': return getLast7Days(todayStr);
    case 'month': return datesInRange(addDays(todayStr, -29), todayStr);
    case '6month': {
      const start = addMonths(todayStr, -5);
      const [y, m] = start.split('-').map(Number);
      return datesInRange(`${y}-${String(m).padStart(2, '0')}-01`, todayStr);
    }
    case 'year': {
      const start = addMonths(todayStr, -11);
      const [y, m] = start.split('-').map(Number);
      return datesInRange(`${y}-${String(m).padStart(2, '0')}-01`, todayStr);
    }
  }
}

function getPeriodLabel(range: TimeRange, t: TFunction, isWeeklyHabit = false): string {
  if (isWeeklyHabit) {
    return {
      day: t('analytics.periodLabelDay'),
      week: t('analytics.periodLabel7Weeks'),
      month: t('analytics.periodLabel4Weeks'),
      '6month': t('analytics.periodLabel26Weeks'),
      year: t('analytics.periodLabel52Weeks'),
    }[range];
  }
  return {
    day: t('analytics.periodLabelDay'),
    week: t('analytics.periodLabelWeek'),
    month: t('analytics.periodLabelMonth'),
    '6month': t('analytics.periodLabel6Month'),
    year: t('analytics.periodLabelYear'),
  }[range];
}

/** Per-weekday average completion (0–6 = first day of week .. last). For month/6M/year only. Only counts dates <= todayStr. */
function getCompletionByWeekday(
  periodDates: string[],
  habits: Habit[],
  entries: HabitEntry[],
  weekStartsOn: 0 | 1,
  habitFilter: Habit | null,
  todayStr: string,
): number[] {
  const opts = { maxDate: todayStr };
  const byDow: number[][] = [[], [], [], [], [], [], []];
  if (habitFilter) {
    for (const d of periodDates) {
      if (habitFilter.createdAt > d) continue;
      const col = getDayOfWeekColumnIndex(d, weekStartsOn);
      let pct: number;
      if (habitFilter.goalType === 'break') {
        pct = isHabitCompleted(habitFilter, entries, d, weekStartsOn, opts) ? 100 : 0;
      } else {
        const t = habitFilter.target || 1;
        const value = getHabitCurrentValue(habitFilter, entries, d, weekStartsOn, opts);
        pct = Math.min(100, Math.round((value / t) * 100));
      }
      byDow[col].push(pct);
    }
  } else {
    for (const d of periodDates) {
      const activeOnDay = habits.filter(h => isHabitActiveOnDate(h, d) && h.createdAt <= d);
      if (activeOnDay.length === 0) continue;
      const col = getDayOfWeekColumnIndex(d, weekStartsOn);
      const pct = dailyCompletion(habits, entries, d, weekStartsOn, opts);
      byDow[col].push(pct);
    }
  }
  return byDow.map(arr =>
    arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
  );
}

// ─── X-axis ticks and labels (Apple Health–style: sparse for month, single-letter for year) ───

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

/** Indices of buckets that should show an x-axis label. Month / 26W / 1Y (week buckets): none (only range caption). */
function getXAxisTicks(range: TimeRange, bars: ChartBar[], useWeekBuckets = false): number[] {
  if (range === 'month') return [];
  if (range === 'week' || range === '6month' || range === 'year') {
    if (useWeekBuckets && (range === '6month' || range === 'year')) return [];
    return bars.map((_, i) => i);
  }
  return [];
}

/** Label text for the x-axis at this bucket. Single line, no wrap. */
function formatXAxisLabel(range: TimeRange, bar: ChartBar, index: number): string {
  if (range === 'week') return bar.label;
  if (range === 'month') return bar.label;
  if (range === '6month') return bar.label;
  if (range === 'year') {
    const [, mm] = bar.key.split('-');
    const m = parseInt(mm, 10);
    return MONTH_INITIALS[m - 1] ?? bar.label;
  }
  return bar.label;
}

/** Indices where a vertical gridline should be drawn. Month only; year has no gridlines. */
function getVerticalGridlineIndices(range: TimeRange, bars: ChartBar[]): number[] {
  if (range === 'month') return getXAxisTicks(range, bars);
  return [];
}

/** Compute streak: consecutive days ending today/yesterday with 100% completion */
function computeStreak(habits: Habit[], entries: HabitEntry[], todayStr: string, weekStartsOn: 0 | 1): number {
  if (habits.length === 0) return 0;
  let streak = 0;
  let cursor = todayStr;
  if (dailyCompletion(habits, entries, cursor, weekStartsOn) < 100) cursor = addDays(cursor, -1);
  while (cursor >= '2020-01-01') {
    if (dailyCompletion(habits, entries, cursor, weekStartsOn) === 100) {
      streak++;
      cursor = addDays(cursor, -1);
    } else break;
  }
  return streak;
}

/** Streak for a single habit. "Current streak" = consecutive completed days ending today; if today is not completed, returns 0. */
function computeHabitStreak(habit: Habit, entries: HabitEntry[], todayStr: string, weekStartsOn: 0 | 1): number {
  const dates = datesInRange(habit.createdAt, todayStr);
  const opts = { maxDate: todayStr };
  const lastIdx = dates.length - 1;
  if (lastIdx < 0) return 0;
  if (!isHabitCompleted(habit, entries, dates[lastIdx], weekStartsOn, opts)) return 0;
  let streak = 0;
  for (let i = lastIdx; i >= 0; i--) {
    if (isHabitCompleted(habit, entries, dates[i], weekStartsOn, opts)) streak++;
    else break;
  }
  return streak;
}

/** Daily completion for all habits, but clamped to maxDate (used for analytics-at-today). */
function dailyCompletionAllHabits(
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weekStartsOn: 0 | 1,
  todayStr: string,
): { pct: number; activeCount: number } {
  const opts = { maxDate: todayStr };
  const active = habits.filter(h => isHabitActiveOnDate(h, date) && h.createdAt <= date);
  if (active.length === 0) return { pct: 0, activeCount: 0 };
  const completed = active.filter(h => isHabitCompleted(h, entries, date, weekStartsOn, opts)).length;
  return { pct: Math.round((completed / active.length) * 100), activeCount: active.length };
}

function isHabitDueForStreak(habit: Habit, date: string, weekStartsOn: 0 | 1): boolean {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekly') return getWeekDates(date, weekStartsOn)[6] === date;
  return getMonthRange(date).end === date;
}

function isHabitCompletedForStreak(
  habit: Habit,
  entries: HabitEntry[],
  date: string,
  weekStartsOn: 0 | 1,
  todayStr: string,
): boolean {
  // Weekly/monthly habits are neutral on non-due days.
  if (!isHabitDueForStreak(habit, date, weekStartsOn)) return true;
  return isHabitCompleted(habit, entries, date, weekStartsOn, { maxDate: todayStr });
}

function allHabitsDoneForStreak(
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weekStartsOn: 0 | 1,
  todayStr: string,
): boolean {
  const active = habits.filter(h => isHabitActiveOnDate(h, date) && h.createdAt <= date);
  if (active.length === 0) return false;
  return active.every(h => isHabitCompletedForStreak(h, entries, date, weekStartsOn, todayStr));
}

/** Current “all habits done” streak: consecutive days ending today with 100% completion. */
function computeAllHabitsCurrentStreak(
  habits: Habit[],
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: 0 | 1,
): number {
  if (habits.length === 0) return 0;
  const startDate = habits.reduce((min, h) => (h.createdAt < min ? h.createdAt : min), todayStr);
  let cursor = todayStr;
  if (!allHabitsDoneForStreak(habits, entries, cursor, weekStartsOn, todayStr)) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  while (cursor >= startDate) {
    if (allHabitsDoneForStreak(habits, entries, cursor, weekStartsOn, todayStr)) {
      streak++;
      cursor = addDays(cursor, -1);
    } else break;
  }
  return streak;
}

/** Best “all habits done” streak across all history (longest run of 100% completion days). */
function computeAllHabitsBestStreak(
  habits: Habit[],
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: 0 | 1,
): number {
  if (habits.length === 0) return 0;
  const startDate = habits.reduce((min, h) => (h.createdAt < min ? h.createdAt : min), todayStr);
  let best = 0;
  let current = 0;
  let cursor = todayStr;
  while (cursor >= startDate) {
    if (allHabitsDoneForStreak(habits, entries, cursor, weekStartsOn, todayStr)) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
    cursor = addDays(cursor, -1);
  }
  return best;
}

/** Average daily completion % for all habits since earliest createdAt (ignores days with 0 active habits). */
function computeAllHabitsAvgCompletion(
  habits: Habit[],
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: 0 | 1,
): number {
  if (habits.length === 0) return 0;
  const startDate = habits.reduce((min, h) => (h.createdAt < min ? h.createdAt : min), todayStr);
  let sum = 0;
  let days = 0;
  let cursor = startDate;
  while (cursor <= todayStr) {
    const { pct, activeCount } = dailyCompletionAllHabits(habits, entries, cursor, weekStartsOn, todayStr);
    if (activeCount > 0) {
      sum += pct;
      days++;
    }
    cursor = addDays(cursor, 1);
  }
  return days > 0 ? Math.round(sum / days) : 0;
}

/** Current streak for one habit (ending today), optimized to avoid building a full dates array. */
function computeHabitCurrentStreakFast(
  habit: Habit,
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: 0 | 1,
): number {
  if (!isHabitCompletedForStreak(habit, entries, todayStr, weekStartsOn, todayStr)) return 0;
  let streak = 0;
  let cursor = todayStr;
  while (cursor >= habit.createdAt) {
    if (isHabitCompletedForStreak(habit, entries, cursor, weekStartsOn, todayStr)) {
      streak++;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

function computeHabitBestStreak(
  habit: Habit,
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: 0 | 1,
): number {
  let best = 0;
  let current = 0;
  let cursor = todayStr;
  while (cursor >= habit.createdAt) {
    if (isHabitCompletedForStreak(habit, entries, cursor, weekStartsOn, todayStr)) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
    cursor = addDays(cursor, -1);
  }
  return best;
}

function computeHabitGeneralAnalytics(
  habit: Habit,
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: 0 | 1,
): {
  avgCompletionPct: number;
  completionByWeekday: number[];
  activeDays: number;
  completedDays: number;
} {
  const opts = { maxDate: todayStr };
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];

  let sum = 0;
  let activeDays = 0;
  let completedDays = 0;

  let cursor = habit.createdAt;
  while (cursor <= todayStr) {
    if (!isHabitActiveOnDate(habit, cursor)) {
      cursor = addDays(cursor, 1);
      continue;
    }

    activeDays++;
    const completed = isHabitCompleted(habit, entries, cursor, weekStartsOn, opts);
    if (completed) completedDays++;

    let pct: number;
    if (habit.goalType === 'break') {
      pct = completed ? 100 : 0;
    } else {
      const value = getHabitCurrentValue(habit, entries, cursor, weekStartsOn, opts);
      const target = habit.target || 1;
      pct = Math.min(100, Math.round((value / target) * 100));
    }

    sum += pct;
    const col = getDayOfWeekColumnIndex(cursor, weekStartsOn);
    sums[col] += pct;
    counts[col] += 1;

    cursor = addDays(cursor, 1);
  }

  const avgCompletionPct = activeDays > 0 ? Math.round(sum / activeDays) : 0;
  const completionByWeekday = sums.map((s, i) => (counts[i] > 0 ? Math.round(s / counts[i]) : 0));

  return { avgCompletionPct, completionByWeekday, activeDays, completedDays };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { habits, entries, focusKey } = useHabitLogs();
  const allHabits = useHabitStore(s => s.habits);
  const weekStartsOn = useSettingsStore(s => s.weekStartsOn);
  const todayStr = today();

  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('general');
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const isGeneral = dateFilter === 'general';
  const timeRange: TimeRange = dateFilter === 'general' ? 'week' : dateFilter;

  React.useEffect(() => {
    setInsightsExpanded(false);
  }, [selectedHabitId, dateFilter]);

  const selectedHabit = useMemo(
    () => habits.find(h => h.id === selectedHabitId) ?? null,
    [habits, selectedHabitId],
  );

  const periodDates = useMemo(
    () => (isGeneral ? [] : getPeriodDates(timeRange, todayStr, weekStartsOn)),
    [isGeneral, timeRange, todayStr, weekStartsOn],
  );

  /** When a weekly habit is selected, period as week-start dates for the ring and counts */
  const periodWeekStarts = useMemo(() => {
    if (isGeneral || !selectedHabit || selectedHabit.frequency !== 'weekly') return null;
    const [nWeeks] =
      timeRange === 'week' ? [7] : timeRange === 'month' ? [4] : timeRange === '6month' ? [26] : timeRange === 'year' ? [52] : [0];
    if (nWeeks === 0) return null;
    const weeks = getWeeksRange(nWeeks - 1, 0, weekStartsOn);
    return weeks.map(w => w[0]);
  }, [timeRange, weekStartsOn, selectedHabit, isGeneral]);

  React.useEffect(() => {
    if (__DEV__ && timeRange === 'week' && periodDates.length > 0) {
      const start = periodDates[0];
      const end = periodDates[periodDates.length - 1];
      // eslint-disable-next-line no-console
      console.log('[Analytics last 7 days]', { today: todayStr, start, end, days: periodDates, weekStartsOn });
    }
  }, [timeRange, periodDates, todayStr, weekStartsOn]);

  // ── Completion ring ───────────────────────────────────────────────────────

  const analyticsOptions = useMemo(() => ({ maxDate: todayStr }), [todayStr]);
  const { completionPct, completionText, completionTitle } = useMemo(() => {
    if (isGeneral) return { completionPct: 0, completionText: '', completionTitle: '' };
    if (selectedHabit) {
      const useWeeks = selectedHabit.frequency === 'weekly' && periodWeekStarts != null;
      const rawDates = useWeeks ? periodWeekStarts : periodDates;
      const dates = useWeeks
        ? rawDates.filter(ws => selectedHabit.createdAt <= addDays(ws, 6))
        : rawDates.filter(d => selectedHabit.createdAt <= d);
      const completed = dates.filter(d => isHabitCompleted(selectedHabit, entries, d, weekStartsOn, analyticsOptions)).length;
      const total = dates.length;
      return {
        completionPct:   total > 0 ? Math.round((completed / total) * 100) : 0,
        completionText:  useWeeks
          ? t('analytics.weeksCompletion', { completed: String(completed), total: String(total) })
          : t('analytics.sessionsCompletion', { completed: String(completed), total: String(total) }),
        completionTitle: t('analytics.habitCompletion', { name: selectedHabit.name }),
      };
    }
    if (allHabits.length === 0) return { completionPct: 0, completionText: t('analytics.zeroHabits'), completionTitle: getPeriodLabel(timeRange, t) };
    let totalPossible = 0;
    for (const d of periodDates) {
      totalPossible += allHabits.filter(h => isHabitActiveOnDate(h, d) && h.createdAt <= d).length;
    }
    let totalCompleted = 0;
    for (const d of periodDates) {
      const active = allHabits.filter(h => isHabitActiveOnDate(h, d) && h.createdAt <= d);
      totalCompleted += active.filter(h => isHabitCompleted(h, entries, d, weekStartsOn, analyticsOptions)).length;
    }
    const pct = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    return {
      completionPct:   pct,
      completionText:  t('analytics.habitsCompletion', { completed: String(totalCompleted), total: String(totalPossible) }),
      completionTitle: getPeriodLabel(timeRange, t) + ' ' + t('analytics.completionSuffix'),
    };
  }, [isGeneral, selectedHabit, allHabits, entries, periodDates, periodWeekStarts, timeRange, weekStartsOn, analyticsOptions, focusKey, t]);

  const chartBars = useMemo(
    () => (isGeneral ? [] : buildChartBars(allHabits, entries, timeRange, todayStr, selectedHabit ?? null, weekStartsOn, t)),
    [isGeneral, allHabits, entries, timeRange, todayStr, selectedHabit, weekStartsOn, focusKey, t],
  );

  const totalCompleted = useMemo(
    () => chartBars.reduce((s, b) => s + b.completed, 0),
    [chartBars],
  );
  const barSectionTitle = selectedHabit ? t('analytics.habitCompletion', { name: selectedHabit.name }) : t('analytics.habitsCompleted');
  const hasChartData = chartBars.some(b => b.target > 0);

  const useWeekBuckets = selectedHabit?.frequency === 'weekly';
  const xAxisTickIndices = useMemo(
    () => new Set(getXAxisTicks(timeRange, chartBars, useWeekBuckets)),
    [timeRange, chartBars, useWeekBuckets],
  );
  const verticalGridlineIndices = useMemo(() => new Set(getVerticalGridlineIndices(timeRange, chartBars)), [timeRange, chartBars]);

  // ── Single-habit streak ───────────────────────────────────────────────────

  const habitStreak = useMemo(
    () => selectedHabit ? computeHabitStreak(selectedHabit, entries, todayStr, weekStartsOn) : null,
    [selectedHabit, entries, todayStr, weekStartsOn, focusKey],
  );

  const habitDaysCompleted = useMemo(() => {
    if (!selectedHabit) return null;
    if (selectedHabit.frequency === 'weekly' && periodWeekStarts != null) {
      return periodWeekStarts.filter(d => isHabitCompleted(selectedHabit, entries, d, weekStartsOn, analyticsOptions)).length;
    }
    return periodDates.filter(
      d => selectedHabit.createdAt <= d && isHabitCompleted(selectedHabit, entries, d, weekStartsOn, analyticsOptions),
    ).length;
  }, [selectedHabit, entries, periodDates, periodWeekStarts, weekStartsOn, analyticsOptions, focusKey]);

  // ── General mode: comparison, trend, rhythm, movers ───────────────────────
  const habitBestStreak = useMemo(() => {
    if (!isGeneral || !selectedHabit) return null;
    return computeHabitBestStreak(selectedHabit, entries, todayStr, weekStartsOn);
  }, [isGeneral, selectedHabit, entries, todayStr, weekStartsOn, focusKey]);

  const habitTotalValue = useMemo(() => {
    if (!isGeneral || !selectedHabit) return null;
    const habitEntries = entries.filter(e => e.habitId === selectedHabit.id);
    if (selectedHabit.kind === 'numeric') {
      const total = habitEntries.reduce((sum, e) => sum + e.value, 0);
      const unit = getHabitUnitLabel(selectedHabit, t);
      return `${Math.round(total).toLocaleString()}${unit ? ' ' + unit : ''}`.trim();
    }
    const completed = habitEntries.filter(e => e.value >= 1).length;
    const unit = getHabitUnitLabel(selectedHabit, t) || t('units.sessions');
    return `${completed} ${unit}`;
  }, [isGeneral, selectedHabit, entries, focusKey, t]);

  const habitGeneralAnalytics = useMemo(() => {
    if (!isGeneral || !selectedHabit) return null;
    return computeHabitGeneralAnalytics(selectedHabit, entries, todayStr, weekStartsOn);
  }, [isGeneral, selectedHabit, entries, todayStr, weekStartsOn, focusKey]);

  const generalTrend = useMemo(
    () => (isGeneral ? buildTrendSeries(allHabits, entries, todayStr, weekStartsOn, selectedHabit ?? null, 30) : []),
    [isGeneral, allHabits, entries, todayStr, weekStartsOn, selectedHabit, focusKey],
  );

  const generalComparison = useMemo(
    () => (isGeneral ? buildPeriodComparison(allHabits, entries, todayStr, weekStartsOn, selectedHabit ?? null, 30) : null),
    [isGeneral, allHabits, entries, todayStr, weekStartsOn, selectedHabit, focusKey],
  );

  const periodComparison = useMemo(() => {
    if (isGeneral) return null;
    const days = PERIOD_DELTA_DAYS[timeRange] ?? 30;
    return buildPeriodComparison(allHabits, entries, todayStr, weekStartsOn, selectedHabit ?? null, days);
  }, [isGeneral, timeRange, allHabits, entries, todayStr, weekStartsOn, selectedHabit, focusKey]);

  const generalWeekSnapshot = useMemo(
    () => (isGeneral ? buildCurrentWeekSnapshot(allHabits, entries, todayStr, weekStartsOn, selectedHabit ?? null) : null),
    [isGeneral, allHabits, entries, todayStr, weekStartsOn, selectedHabit, focusKey],
  );

  const generalTodaySnapshot = useMemo(
    () => (isGeneral ? getCompletionSnapshot(allHabits, entries, todayStr, weekStartsOn, todayStr, selectedHabit ?? null) : null),
    [isGeneral, allHabits, entries, todayStr, weekStartsOn, selectedHabit, focusKey],
  );

  const generalWeekdayPattern = useMemo(
    () => (isGeneral ? buildWeekdayPattern(allHabits, entries, todayStr, weekStartsOn, selectedHabit ?? null, 90) : null),
    [isGeneral, allHabits, entries, todayStr, weekStartsOn, selectedHabit, focusKey],
  );

  const generalMonthPace = useMemo(
    () => (isGeneral ? buildMonthPaceComparison(allHabits, entries, todayStr, weekStartsOn, selectedHabit ?? null) : null),
    [isGeneral, allHabits, entries, todayStr, weekStartsOn, selectedHabit, focusKey],
  );

  const generalHabitMovers = useMemo(
    () => (isGeneral && !selectedHabit ? buildHabitMovers(allHabits, entries, todayStr, weekStartsOn, 14) : { improving: [], slipping: [], consistent: [] }),
    [isGeneral, selectedHabit, allHabits, entries, todayStr, weekStartsOn, focusKey],
  );

  const activeHabitsLeaderboard = useMemo(
    () => (isGeneral && !selectedHabit ? buildActiveHabitsLeaderboard(allHabits, entries, todayStr, weekStartsOn) : []),
    [isGeneral, selectedHabit, allHabits, entries, todayStr, weekStartsOn, focusKey],
  );

  // ── By-habit completion (when "All habits" selected) ──────────────────────
  // Uses each habit's measure: period sum of value vs expected (target × periods). Only counts up to today (no future).
  const byHabitStats = useMemo(() => {
    if (isGeneral || selectedHabit || habits.length === 0) return { build: [], break: [] };
    const opts = { maxDate: todayStr };
    const list = habits
      .filter(h => periodDates.some(d => isHabitActiveOnDate(h, d) && h.createdAt <= d))
      .map(habit => {
        const isBreak = habit.goalType === 'break';
        const targetPerPeriod = habit.target || 1;
        const unit = getHabitUnitLabel(habit, t) || t('units.sessions');

        if (habit.frequency === 'daily') {
          const eligible = periodDates.filter(d => isHabitActiveOnDate(habit, d) && habit.createdAt <= d);
          const value = eligible.reduce((sum, d) => sum + entryValue(entries, habit.id, d), 0);
          const expected = targetPerPeriod * eligible.length;
          const pct = expected > 0 ? Math.min(100, Math.round((value / expected) * 100)) : 0;
          const displayPct = isBreak ? (value <= expected ? 100 : 0) : pct;
          return { habit, value, expected, pct: displayPct, label: `${value}/${expected} ${unit}` };
        }

        if (habit.frequency === 'weekly') {
          const weekKeys = new Set<string>();
          for (const d of periodDates) {
            if (!isHabitActiveOnDate(habit, d) || habit.createdAt > d) continue;
            weekKeys.add(getWeekDates(d, weekStartsOn)[0]);
          }
          let value = 0;
          for (const weekStart of weekKeys) {
            const anyDay = getWeekDates(weekStart, weekStartsOn).find(d => periodDates.includes(d) && isHabitActiveOnDate(habit, d) && habit.createdAt <= d);
            if (anyDay) value += getHabitCurrentValue(habit, entries, anyDay, weekStartsOn, opts);
          }
          const expected = targetPerPeriod * weekKeys.size;
          const pct = expected > 0 ? Math.min(100, Math.round((value / expected) * 100)) : 0;
          const displayPct = isBreak ? (value <= expected ? 100 : 0) : pct;
          return { habit, value, expected, pct: displayPct, label: `${value}/${expected} ${unit}` };
        }

        // monthly: sum value per month in period, expected = target × months
        const monthKeys = new Set<string>();
        for (const d of periodDates) {
          if (!isHabitActiveOnDate(habit, d) || habit.createdAt > d) continue;
          monthKeys.add(getMonthKey(d));
        }
        let value = 0;
        for (const monthKey of monthKeys) {
          const [y, m] = monthKey.split('-').map(Number);
          const lastDay = new Date(y, m, 0).getDate();
          const anchor = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          value += getHabitCurrentValue(habit, entries, anchor, weekStartsOn, opts);
        }
        const expected = targetPerPeriod * monthKeys.size;
        const pct = expected > 0 ? Math.min(100, Math.round((value / expected) * 100)) : 0;
        const displayPct = isBreak ? (value <= expected ? 100 : 0) : pct;
        return { habit, value, expected, pct: displayPct, label: `${value}/${expected} ${unit}` };
      });
    const build = list.filter(x => x.habit.goalType !== 'break').sort((a, b) => b.pct - a.pct);
    const breakList = list.filter(x => x.habit.goalType === 'break').sort((a, b) => b.pct - a.pct);
    return { build, break: breakList };
  }, [habits, periodDates, entries, selectedHabit, weekStartsOn, todayStr, focusKey, t]);

  // ── Completion by weekday (month / 6M / year only) ─────────────────────────
  const completionByWeekday = useMemo(() => {
    if (timeRange !== 'month' && timeRange !== '6month' && timeRange !== 'year') return null;
    return getCompletionByWeekday(periodDates, allHabits, entries, weekStartsOn, selectedHabit, todayStr);
  }, [timeRange, periodDates, allHabits, entries, weekStartsOn, selectedHabit, todayStr, focusKey]);

  // ── Break habits summary ───────────────────────────────────────────────────
  const breakHabitsSummary = useMemo(() => {
    if (isGeneral || selectedHabit || !habits.some(h => h.goalType === 'break')) return null;
    const breakHabits = habits.filter(h => h.goalType === 'break');
    const opts = { maxDate: todayStr };
    let daysWithBreak = 0;
    let daysUnderLimit = 0;
    for (const d of periodDates) {
      const active = breakHabits.filter(h => isHabitActiveOnDate(h, d) && h.createdAt <= d);
      if (active.length === 0) continue;
      daysWithBreak++;
      const over = active.some(h => {
        const val = getHabitCurrentValue(h, entries, d, weekStartsOn, opts);
        return val > h.target;
      });
      if (!over) daysUnderLimit++;
    }
    return daysWithBreak > 0 ? { daysUnderLimit, daysWithBreak } : null;
  }, [isGeneral, habits, periodDates, entries, selectedHabit, weekStartsOn, todayStr, focusKey]);

  const generalAllData = useMemo(() => {
    if (!isGeneral || selectedHabitId !== 'all' || !generalComparison || !generalWeekSnapshot || !generalTodaySnapshot || !generalWeekdayPattern || !generalMonthPace) {
      return null;
    }
    const activeTodayHabits = allHabits.filter(h => isHabitActiveOnDate(h, todayStr) && h.createdAt <= todayStr);

    return {
      activeHabitsCount: activeTodayHabits.length,
      currentStreak: computeAllHabitsCurrentStreak(allHabits, entries, todayStr, weekStartsOn),
      bestStreak: computeAllHabitsBestStreak(allHabits, entries, todayStr, weekStartsOn),
      todaySnapshot: generalTodaySnapshot,
      recentComparison: generalComparison,
      weekSnapshot: generalWeekSnapshot,
      weekdayPattern: generalWeekdayPattern,
      monthPace: generalMonthPace,
      movers: generalHabitMovers,
      trend: generalTrend,
      activeLeaderboard: activeHabitsLeaderboard,
    };
  }, [
    isGeneral,
    selectedHabitId,
    allHabits,
    entries,
    todayStr,
    weekStartsOn,
    generalComparison,
    generalWeekSnapshot,
    generalTodaySnapshot,
    generalWeekdayPattern,
    generalMonthPace,
    generalHabitMovers,
    generalTrend,
    activeHabitsLeaderboard,
    focusKey,
  ]);

  const selectedHabitGeneralData = useMemo(() => {
    if (!isGeneral || !selectedHabit || !habitGeneralAnalytics || !generalComparison || !generalWeekSnapshot || !generalWeekdayPattern || !generalMonthPace) {
      return null;
    }
    return {
      analytics: habitGeneralAnalytics,
      bestStreak: habitBestStreak ?? 0,
      currentStreak: habitStreak ?? 0,
      recentComparison: generalComparison,
      weekSnapshot: generalWeekSnapshot,
      weekdayPattern: generalWeekdayPattern,
      monthPace: generalMonthPace,
      trend: generalTrend,
    };
  }, [
    isGeneral,
    selectedHabit,
    habitGeneralAnalytics,
    generalComparison,
    generalWeekSnapshot,
    generalWeekdayPattern,
    generalMonthPace,
    habitBestStreak,
    habitStreak,
    generalTrend,
  ]);

  const generalInsightCards = useMemo(() => {
    if (!generalAllData) return [];
    const cards: InsightCardItem[] = [];
    const recentDelta = generalAllData.recentComparison.delta;
    if (Math.abs(recentDelta) >= 3) {
      cards.push({
        tone: recentDelta > 0 ? 'positive' : 'warning',
        title: recentDelta > 0 ? t('analytics.insightMomentumUpTitle') : t('analytics.insightMomentumDownTitle'),
        body: t('analytics.insightMomentumBody', { delta: Math.abs(recentDelta) }),
      });
    }
    const bestDayLabel = getShortDayLabels(weekStartsOn)[generalAllData.weekdayPattern.bestIndex] ?? '';
    const worstDayLabel = getShortDayLabels(weekStartsOn)[generalAllData.weekdayPattern.worstIndex] ?? '';
    cards.push({
      tone: 'neutral',
      title: t('analytics.insightBestDayTitle', { day: bestDayLabel }),
      body: t('analytics.insightBestDayBody', {
        day: bestDayLabel,
        pct: generalAllData.weekdayPattern.values[generalAllData.weekdayPattern.bestIndex] ?? 0,
        worstDay: worstDayLabel,
        worstPct: generalAllData.weekdayPattern.values[generalAllData.weekdayPattern.worstIndex] ?? 0,
      }),
    });
    const weekdayDelta = generalAllData.weekdayPattern.weekdayVsWeekendDelta;
    if (Math.abs(weekdayDelta) >= 4) {
      cards.push({
        tone: weekdayDelta > 0 ? 'positive' : 'neutral',
        title: weekdayDelta >= 0 ? t('analytics.insightWeekdayTitle') : t('analytics.insightWeekendTitle'),
        body: t(weekdayDelta >= 0 ? 'analytics.insightWeekdayBody' : 'analytics.insightWeekendBody', {
          delta: Math.abs(weekdayDelta),
        }),
      });
    }
    const slippingHabit = generalAllData.movers.slipping[0];
    if (slippingHabit) {
      cards.push({
        tone: 'warning',
        title: t('analytics.insightSlippingTitle'),
        body: t('analytics.insightSlippingBody', {
          name: slippingHabit.habit.name,
          delta: Math.abs(slippingHabit.delta),
        }),
      });
    } else if (Math.abs(generalAllData.monthPace.delta) >= 3) {
      cards.push({
        tone: generalAllData.monthPace.delta > 0 ? 'positive' : 'warning',
        title: generalAllData.monthPace.delta > 0 ? t('analytics.insightPaceUpTitle') : t('analytics.insightPaceDownTitle'),
        body: t(
          generalAllData.monthPace.delta > 0 ? 'analytics.insightPaceUpBody' : 'analytics.insightPaceDownBody',
          { delta: Math.abs(generalAllData.monthPace.delta) },
        ),
      });
    }
    return cards.slice(0, 4);
  }, [generalAllData, t, weekStartsOn]);

  const selectedHabitInsightCards = useMemo(() => {
    if (!selectedHabit || !selectedHabitGeneralData) return [];
    const cards: InsightCardItem[] = [];
    const recentDelta = selectedHabitGeneralData.recentComparison.delta;
    if (Math.abs(recentDelta) >= 3) {
      cards.push({
        tone: recentDelta > 0 ? 'positive' : 'warning',
        title: recentDelta > 0 ? t('analytics.insightMomentumUpTitle') : t('analytics.insightMomentumDownTitle'),
        body: t('analytics.insightHabitMomentumBody', {
          name: selectedHabit.name,
          delta: Math.abs(recentDelta),
        }),
      });
    }
    const bestDayLabel = getShortDayLabels(weekStartsOn)[selectedHabitGeneralData.weekdayPattern.bestIndex] ?? '';
    cards.push({
      tone: 'neutral',
      title: t('analytics.insightBestDayTitle', { day: bestDayLabel }),
      body: t('analytics.insightHabitBestDayBody', {
        day: bestDayLabel,
        pct: selectedHabitGeneralData.weekdayPattern.values[selectedHabitGeneralData.weekdayPattern.bestIndex] ?? 0,
        name: selectedHabit.name,
      }),
    });
    if (selectedHabitGeneralData.currentStreak > 0) {
      cards.push({
        tone: 'positive',
        title: t('analytics.insightStreakTitle'),
        body: t('analytics.insightHabitStreakBody', {
          streak: selectedHabitGeneralData.currentStreak,
          name: selectedHabit.name,
        }),
      });
    }
    if (Math.abs(selectedHabitGeneralData.monthPace.delta) >= 3) {
      cards.push({
        tone: selectedHabitGeneralData.monthPace.delta > 0 ? 'positive' : 'warning',
        title: selectedHabitGeneralData.monthPace.delta > 0 ? t('analytics.insightPaceUpTitle') : t('analytics.insightPaceDownTitle'),
        body: t(
          selectedHabitGeneralData.monthPace.delta > 0 ? 'analytics.insightHabitPaceUpBody' : 'analytics.insightHabitPaceDownBody',
          { name: selectedHabit.name, delta: Math.abs(selectedHabitGeneralData.monthPace.delta) },
        ),
      });
    }
    return cards.slice(0, 4);
  }, [selectedHabit, selectedHabitGeneralData, t, weekStartsOn]);

  // ── Heatmap (current month) ───────────────────────────────────────────────

  const { colors } = useTheme();
  const heatmapData = useMemo(() => {
    const [y, m] = todayStr.split('-').map(Number);
    const firstDow = new Date(y, m - 1, 1).getDay();
    const lastDay  = new Date(y, m, 0).getDate();
    const cells: { dateStr: string | null; color: string }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ dateStr: null, color: 'transparent' });
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const future  = dateStr > todayStr;
      let pct = 0;
      if (!future) {
        if (selectedHabit) {
          if (selectedHabit.goalType === 'break') {
            pct = isHabitCompleted(selectedHabit, entries, dateStr, weekStartsOn) ? 100 : 0;
          } else {
            const val = getHabitCurrentValue(selectedHabit, entries, dateStr, weekStartsOn);
            pct = Math.round((val / (selectedHabit.target || 1)) * 100);
          }
        } else {
          pct = dailyCompletion(habits, entries, dateStr, weekStartsOn);
        }
      }
      let color = colors.heatmapEmpty;
      if (future) color = colors.heatmapFuture;
      else if (pct >= 70) color = colors.heatmapSuccess;
      else if (pct >= 50) color = colors.heatmapWarning;
      else if (pct >= 30) color = colors.heatmapWarningLight;
      cells.push({ dateStr, color });
    }
    while (cells.length % 7 !== 0) cells.push({ dateStr: null, color: 'transparent' });
    const rows: { dateStr: string | null; color: string }[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [todayStr, selectedHabit, habits, entries, weekStartsOn, focusKey, colors]);

  const heatmapMonthLabel = format(new Date(todayStr + 'T00:00:00'), 'MMM', { locale: getDateLocale() });

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgAnalytics }]} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.text1 }]}>{t('analytics.title')}</Text>

        {/* Habit pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillsRow}
        >
          <Pill
            label={t('analytics.allHabits')}
            active={selectedHabitId === 'all'}
            onPress={() => setSelectedHabitId('all')}
            colors={colors}
          />
          {habits.map(h => (
            <Pill
              key={h.id}
              label={h.name}
              icon={h.icon}
              active={selectedHabitId === h.id}
              onPress={() => setSelectedHabitId(h.id)}
              colors={colors}
            />
          ))}
        </ScrollView>

        {/* Date filter: General + history ranges (no future days) */}
        <View style={[s.timeRangeRow, { backgroundColor: colors.separatorLight }]}>
          {(['general', 'week', 'month', '6month', 'year'] as DateFilter[]).map(r => (
            <Pressable
              key={r}
              onPress={() => setDateFilter(r)}
              style={[
                s.timeRangeSeg,
                dateFilter === r && [s.timeRangeSegActive, { backgroundColor: colors.bgCard }],
              ]}
            >
              <Text style={[s.timeRangeSegText, { color: colors.text2 }, dateFilter === r && { color: colors.text1 }]}>
                {r === 'general'
                  ? t('analytics.general')
                  : selectedHabit?.frequency === 'weekly' && r !== 'year'
                    ? (r === 'week'
                        ? t('analytics.timeRange7W')
                        : r === 'month'
                          ? t('analytics.timeRange4W')
                          : t('analytics.timeRange26W'))
                    : (r === 'week'
                        ? t('analytics.timeRange7D')
                        : r === 'month'
                          ? t('analytics.timeRange30D')
                          : r === '6month'
                            ? t('analytics.timeRange6M')
                            : t('analytics.timeRangeY'))}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {isGeneral ? (
          selectedHabitId === 'all' ? (
            allHabits.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={[s.emptyText, { color: colors.text2 }]}>{t('analytics.noData')}</Text>
              </View>
            ) : (
              <>
                <Text style={[s.sectionTitle, { color: colors.text1 }]}>{t('analytics.general')}</Text>

                <View style={[s.generalStreakCard, { backgroundColor: colors.bgCard }]}>
                  <GeneralStreakMetrics
                    currentStreak={generalAllData?.currentStreak ?? 0}
                    bestStreak={generalAllData?.bestStreak ?? 0}
                    colors={colors}
                  />
                </View>

                <InsightCardsGrid
                  items={generalInsightCards}
                  colors={colors}
                  expanded={insightsExpanded}
                  onToggle={() => setInsightsExpanded(prev => !prev)}
                />
                <ActiveHabitsSummaryCard
                  items={generalAllData?.activeLeaderboard ?? []}
                  colors={colors}
                  onPress={() => navigation.navigate('ActiveHabitsAnalytics')}
                />

                <GeneralMetricGrid
                  colors={colors}
                  items={[
                    {
                      label: t('analytics.today'),
                      value: `${generalAllData?.todaySnapshot.completed ?? 0}/${generalAllData?.todaySnapshot.total ?? 0}`,
                      detail: t('analytics.completedTodayShort'),
                    },
                    {
                      label: t('analytics.last7Days'),
                      value: `${generalAllData?.weekSnapshot.pct ?? 0}%`,
                      detail: t('analytics.averageLabel'),
                    },
                  ]}
                />

                <View style={[s.generalTrendCard, { backgroundColor: colors.bgCard }]}>
                  <Text style={[s.sectionTitleSmall, { color: colors.text1 }]}>{t('analytics.trendLast30Days')}</Text>
                  {generalAllData && generalAllData.trend.some(point => point.total > 0) ? (
                    <TrendLineChart
                      data={generalAllData.trend.map(point => ({
                        key: point.date,
                        value: point.pct,
                      }))}
                      startLabel={formatShortDate(generalAllData.trend[0]?.date)}
                      middleLabel={formatShortDate(generalAllData.trend[Math.floor(generalAllData.trend.length / 2)]?.date)}
                      endLabel={formatShortDate(generalAllData.trend[generalAllData.trend.length - 1]?.date)}
                    />
                  ) : (
                    <View style={s.barEmpty}>
                      <Text style={[s.barEmptyText, { color: colors.text2 }]}>{t('analytics.noTrendData')}</Text>
                    </View>
                  )}
                </View>

                <WeekdayPatternCard
                  title={t('analytics.weeklyRhythm')}
                  pattern={generalAllData?.weekdayPattern ?? null}
                  weekStartsOn={weekStartsOn}
                  colors={colors}
                />

                <HeatmapSection
                  rows={heatmapData}
                  monthLabel={heatmapMonthLabel}
                  colors={colors}
                  title={t('analytics.habitHeatmap')}
                />

              </>
            )
          ) : selectedHabit ? (
            <>
              <Text style={[s.sectionTitle, { color: colors.text1 }]}>{t('analytics.habitDetail')}</Text>

              <View style={[s.habitGeneralHeaderCard, { backgroundColor: colors.bgCard }]}>
                <View style={s.habitGeneralIconWrap}>
                  <Text style={s.habitGeneralIconText}>{selectedHabit.icon}</Text>
                </View>
                <View style={s.habitGeneralHeaderText}>
                  <Text style={[s.habitGeneralName, { color: colors.text1 }]} numberOfLines={2}>{selectedHabit.name}</Text>
                  <Text style={[s.habitGeneralCreated, { color: colors.text2 }]}>
                    {t('analytics.createdAt')} · {format(new Date(selectedHabit.createdAt + 'T00:00:00'), 'MMM d, yyyy', { locale: getDateLocale() })}
                  </Text>
                  {habitTotalValue !== null && (
                    <View style={[s.habitTotalBadge, { backgroundColor: colors.tealSoft }]}>
                      <Text style={[s.habitTotalLabel, { color: colors.text2 }]}>{t('analytics.allTimeTotal')}</Text>
                      <Text style={[s.habitTotalValue, { color: colors.teal }]}>{habitTotalValue}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[s.generalStreakCard, { backgroundColor: colors.bgCard }]}>
                <GeneralStreakMetrics
                  currentStreak={habitStreak ?? 0}
                  bestStreak={habitBestStreak ?? 0}
                  colors={colors}
                />
              </View>

              <InsightCardsGrid
                items={selectedHabitInsightCards}
                colors={colors}
                expanded={insightsExpanded}
                onToggle={() => setInsightsExpanded(prev => !prev)}
              />

              <View style={[s.generalTrendCard, { backgroundColor: colors.bgCard }]}>
                <Text style={[s.sectionTitleSmall, { color: colors.text1 }]}>{t('analytics.trendLast30Days')}</Text>
                {selectedHabitGeneralData && selectedHabitGeneralData.trend.some(point => point.total > 0) ? (
                  <TrendLineChart
                    data={selectedHabitGeneralData.trend.map(point => ({
                      key: point.date,
                      value: point.pct,
                    }))}
                    startLabel={formatShortDate(selectedHabitGeneralData.trend[0]?.date)}
                    middleLabel={formatShortDate(selectedHabitGeneralData.trend[Math.floor(selectedHabitGeneralData.trend.length / 2)]?.date)}
                    endLabel={formatShortDate(selectedHabitGeneralData.trend[selectedHabitGeneralData.trend.length - 1]?.date)}
                  />
                ) : (
                  <View style={s.barEmpty}>
                    <Text style={[s.barEmptyText, { color: colors.text2 }]}>{t('analytics.noTrendData')}</Text>
                  </View>
                )}
              </View>

              <HeatmapSection
                rows={heatmapData}
                monthLabel={heatmapMonthLabel}
                colors={colors}
                title={t('analytics.habitHeatmap')}
              />

              <WeekdayPatternCard
                title={t('analytics.completionByWeekday')}
                pattern={selectedHabitGeneralData?.weekdayPattern ?? null}
                weekStartsOn={weekStartsOn}
                colors={colors}
              />
            </>
          ) : (
            <View style={s.emptyState}>
              <Text style={[s.emptyText, { color: colors.text2 }]}>{t('analytics.noData')}</Text>
            </View>
          )
        ) : (
          <>
            {/* ── Completion ring card ───────────────────────────────────── */}
            <View style={[s.completionCard, { backgroundColor: colors.bgCard }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.completionTitle, { color: colors.text1 }]}>{completionTitle}</Text>
                <Text style={[s.completionSub, { color: colors.text2 }]}>{completionText}{'\n'}{t('analytics.completedWord')}</Text>
              </View>
              <View style={s.completionRingWrap}>
                <ScoreRing
                  value={completionPct}
                  size={130}
                  strokeWidth={14}
                  radius={50}
                  animationSlot="analytics"
                  labelStyle={s.ringPct}
                  labelStyleWhenFull={s.ringPctFull}
                />
              </View>
              {periodComparison && periodComparison.previousTotal > 0 && (() => {
                const delta = periodComparison.delta;
                const up = delta >= 0;
                const color = up ? colors.success : colors.danger;
                const bg = up ? colors.successSoft : colors.dangerSoft;
                return (
                  <View style={[s.periodDeltaBadge, { backgroundColor: bg }]}>
                    <Text style={[s.periodDeltaText, { color }]}>
                      {up ? '↑' : '↓'} {Math.abs(delta)}%
                    </Text>
                  </View>
                );
              })()}
            </View>

        {/* ── Bar chart ─────────────────────────────────────────────── */}
        <View style={[s.barCard, { backgroundColor: colors.bgCard }]}>
          <Text style={[s.sectionTitleSmall, { color: colors.text1, marginBottom: 4 }]}>{barSectionTitle}</Text>
          <Text style={[s.barTotal, { color: colors.text1 }]}>{totalCompleted}</Text>
          <Text style={[s.barTotalLabel, { color: colors.text2 }]}>{t('analytics.totalCompletedHabits')}</Text>
          {!hasChartData ? (
            <View style={s.barEmpty}>
              <Text style={[s.barEmptyText, { color: colors.text2 }]}>{t('analytics.noDataForPeriod')}</Text>
            </View>
          ) : (
            <>
              <BarChartWithTooltip
                bars={chartBars}
                chartAreaHeight={timeRange === 'month' ? 240 : 220}
                getTooltipDateLabel={(bar) =>
                  timeRange === 'month' || timeRange === 'week'
                    ? format(new Date(bar.key + 'T00:00:00'), 'EEE, MMM d', { locale: getDateLocale() })
                    : bar.label
                }
                todayIndex={timeRange === 'week' ? chartBars.length - 1 : null}
                emptyMessage={t('analytics.noDataForPeriod')}
                renderTopContent={
                  timeRange === 'month'
                    ? layout => (
                        <ChartGridlines
                          range={timeRange}
                          barCount={chartBars.length}
                          chartWidth={layout.width}
                          chartHeight={240}
                          gridlineIndices={verticalGridlineIndices}
                        />
                      )
                    : undefined
                }
                barChartRowMonth={timeRange === 'month'}
                xAxisTickIndices={xAxisTickIndices}
                getAxisLabel={timeRange === 'year' ? (bar) => {
                  const [, mm] = bar.key.split('-');
                  const m = parseInt(mm, 10);
                  return MONTH_INITIALS[m - 1] ?? bar.label;
                } : undefined}
              />
              {(timeRange === 'month' || (useWeekBuckets && (timeRange === '6month' || timeRange === 'year'))) && chartBars.length >= 2 && (() => {
                const start = chartBars[0].key;
                const lastWeekStart = chartBars[chartBars.length - 1].key;
                const end = useWeekBuckets ? addDays(lastWeekStart, 6) : lastWeekStart;
                const fmt = (d: string) => format(new Date(d + 'T00:00:00'), 'MMM d', { locale: getDateLocale() });
                return (
                  <Text style={[s.barChartRangeCaption, { color: colors.text2 }]}>{fmt(start)} – {fmt(end)}</Text>
                );
              })()}
            </>
          )}
        </View>

        {/* ── By habit (when "All habits" selected) ───────────────────────────── */}
        {!selectedHabit && (byHabitStats.build.length > 0 || byHabitStats.break.length > 0) && (
          <ByHabitSummaryCard
            build={byHabitStats.build}
            breakItems={byHabitStats.break}
            colors={colors}
            onPress={() => {
              const allItems = [
                ...byHabitStats.build,
                ...byHabitStats.break,
              ]
                .sort((a, b) => b.pct - a.pct)
                .map(({ habit, pct, label }) => ({
                  id: habit.id,
                  name: habit.name,
                  icon: habit.icon,
                  label,
                  pct,
                  goalType: habit.goalType === 'break' ? 'break' as const : 'build' as const,
                }));
              navigation.navigate('ByHabitAnalytics', {
                items: allItems,
                title: getPeriodLabel(timeRange, t),
              });
            }}
          />
        )}

        {/* ── Completion by weekday (Month / 6M / Year) ──────────────────────── */}
        {completionByWeekday !== null && (
          <View style={[s.generalTrendCard, { backgroundColor: colors.bgCard }]}>
            <Text style={[s.sectionTitleSmall, { color: colors.text1, marginBottom: 14 }]}>{t('analytics.completionByWeekday')}</Text>
            {getShortDayLabels(weekStartsOn).map((label, i) => {
              const pct = completionByWeekday[i] ?? 0;
              return (
                <View key={i} style={s.weekdayRow}>
                  <Text style={[s.weekdayLabel, { color: colors.text2 }]} numberOfLines={1}>{label}</Text>
                  <View style={[s.weekdayBarBg, { backgroundColor: colors.ring }]}>
                    <View style={[s.weekdayBarFill, { width: `${pct}%`, backgroundColor: colors.success }]} />
                  </View>
                  <Text style={[s.weekdayPct, { color: colors.text1 }]} numberOfLines={1}>{`${pct}%`}</Text>
                </View>
              );
            })}
          </View>
        )}


        {/* ── Days completed card (single habit only) ───────────────────────── */}
        {selectedHabit && habitDaysCompleted !== null && (
          <View style={[s.streakCard, { backgroundColor: colors.bgCard }]}>
            <View style={s.streakItem}>
              <View style={[s.streakIconGreen, { backgroundColor: colors.successSoft }]}>
                <CalendarCheck size={24} color={colors.success} strokeWidth={2} />
              </View>
              <Text style={[s.streakNum, { color: colors.text1 }]}>{habitDaysCompleted}</Text>
              <Text style={[s.streakLabel, { color: colors.text2 }]}>{selectedHabit.frequency === 'weekly' ? t('analytics.weeksCompleted') : t('analytics.daysCompleted')}</Text>
            </View>
          </View>
        )}

        {/* ── Heatmap (30D / same calendar as General) ─────────────────────────── */}
        {timeRange === 'month' && (
          <HeatmapSection
            rows={heatmapData}
            monthLabel={heatmapMonthLabel}
            colors={colors}
            title={t('analytics.habitHeatmap')}
          />
        )}

          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChartGridlines({
  range,
  barCount,
  chartWidth,
  chartHeight,
  gridlineIndices,
}: {
  range: TimeRange;
  barCount: number;
  chartWidth: number;
  chartHeight: number;
  gridlineIndices: Set<number>;
}) {
  if (chartWidth <= 0 || barCount <= 0) return null;
  const step = chartWidth / barCount;
  const stroke = 'rgba(0,0,0,0.06)';
  return (
    <View style={[StyleSheet.absoluteFill, s.chartGridlinesWrap, { height: chartHeight }]} pointerEvents="none">
      <Svg width={chartWidth} height={chartHeight} style={s.chartGridlinesSvg}>
        {Array.from(gridlineIndices).map(i => {
          const x = i * step;
          return (
            <Line
              key={i}
              x1={x}
              y1={0}
              x2={x}
              y2={chartHeight}
              stroke={stroke}
              strokeWidth={1}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function Pill({
  label, icon, active, onPress, colors,
}: {
  label: string; icon?: string; active: boolean; onPress: () => void; colors: Palette;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.pill, { backgroundColor: colors.separatorLight }, active && [s.pillActive, { backgroundColor: colors.tealSoft }]]}
    >
      {icon && <Text style={s.pillIcon}>{icon}</Text>}
      <Text style={[s.pillText, { color: colors.text2 }, active && { color: colors.teal, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

function HeatmapSection({
  rows,
  monthLabel,
  colors,
  title,
}: {
  rows: { dateStr: string | null; color: string }[][];
  monthLabel: string;
  colors: Palette;
  title: string;
}) {
  if (rows.length === 0) return null;
  // Phase 1 keeps this monthly so it can later expand into a full year-in-pixels board.
  return (
    <View style={[s.generalTrendCard, { backgroundColor: colors.bgCard }]}>
      <View style={s.heatmapInnerHeader}>
        <Text style={[s.sectionTitleSmall, { color: colors.text1 }]}>{title}</Text>
        <View style={[s.heatmapMonthPill, { backgroundColor: colors.separatorLight }]}>
          <Text style={[s.heatmapMonthText, { color: colors.text2 }]}>{monthLabel}</Text>
        </View>
      </View>
      <View style={s.heatDayRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((l, i) => (
          <Text key={i} style={[s.heatDayLabel, { color: colors.text2 }]}>{l}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={s.heatRow}>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={[s.heatCell, { backgroundColor: cell.color }]}
            />
          ))}
        </View>
      ))}
      <View style={s.legend}>
        <Text style={[s.legendLabel, { color: colors.text2 }]}>Less</Text>
        {[colors.heatmapLow, colors.heatmapWarningLight, colors.heatmapWarning, colors.heatmapSuccess].map((c, i) => (
          <View key={i} style={[s.legendCell, { backgroundColor: c }]} />
        ))}
        <Text style={[s.legendLabel, { color: colors.text2 }]}>More</Text>
      </View>
    </View>
  );
}

function GeneralStreakMetrics({
  currentStreak,
  bestStreak,
  colors,
}: {
  currentStreak: number;
  bestStreak: number;
  colors: Palette;
}) {
  const { t } = useTranslation();
  return (
    <View style={s.generalTwoCol}>
      <View style={s.generalMetric}>
        <View style={[s.generalStreakIconWrap, { backgroundColor: colors.warningSoft }]}>
          <Flame size={22} color={colors.warning} strokeWidth={2} />
        </View>
        <Text style={[s.generalMetricLabel, { color: colors.text2 }]}>{t('analytics.currentStreak')}</Text>
        <Text style={[s.generalMetricValue, { color: colors.text1 }]}>{currentStreak}</Text>
      </View>
      <View style={s.generalMetric}>
        <View style={[s.generalStreakIconWrap, { backgroundColor: colors.tealSoft }]}>
          <Trophy size={22} color={colors.teal} strokeWidth={2} />
        </View>
        <Text style={[s.generalMetricLabel, { color: colors.text2 }]}>{t('analytics.bestStreak')}</Text>
        <Text style={[s.generalMetricValue, { color: colors.text1 }]}>{bestStreak}</Text>
      </View>
    </View>
  );
}

function formatSignedDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '';
  return format(new Date(dateStr + 'T00:00:00'), 'MMM d', { locale: getDateLocale() });
}

function getInsightAccentColor(tone: InsightCardItem['tone'], colors: Palette): string {
  if (tone === 'positive') return colors.success;
  if (tone === 'warning') return colors.warning;
  return colors.teal;
}

function getInsightAccentBg(tone: InsightCardItem['tone'], colors: Palette): string {
  if (tone === 'positive') return colors.successSoft;
  if (tone === 'warning') return colors.warningSoft;
  return colors.tealSoft;
}

function TrendLegend({ colors }: { colors: Palette }) {
  const { t } = useTranslation();
  return (
    <View style={s.trendLegendRow}>
      <View style={s.trendLegendItem}>
        <View style={[s.trendLegendDot, { backgroundColor: colors.success }]} />
        <Text style={[s.trendLegendText, { color: colors.text2 }]}>{t('analytics.dailyScore')}</Text>
      </View>
      <View style={s.trendLegendItem}>
        <View style={[s.trendLegendDot, { backgroundColor: colors.teal, opacity: 0.55 }]} />
        <Text style={[s.trendLegendText, { color: colors.text2 }]}>{t('analytics.rolling7Day')}</Text>
      </View>
    </View>
  );
}

function PulseDot({ color, size = 8, delay = 0 }: { color: string; size?: number; delay?: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scale, { toValue: 1.55, duration: 550, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.delay(1200),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, delay]);
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ scale }],
      }}
    />
  );
}

function InsightCardsGrid({
  items,
  colors,
  expanded,
  onToggle,
}: {
  items: InsightCardItem[];
  colors: Palette;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <Pressable onPress={onToggle} style={[s.insightPanel, { backgroundColor: colors.bgCard }]}>
      <View style={s.insightPanelHeader}>
        <View style={s.insightPanelTitleWrap}>
          <Text style={[s.insightPanelTitle, { color: colors.text1 }]}>{t('analytics.insights')}</Text>
          <Text style={[s.insightPanelMeta, { color: colors.text2 }]}>
            {t('analytics.insightsCount', { count: items.length })}
          </Text>
        </View>
        <View style={[s.insightTogglePill, { backgroundColor: colors.tealSoft }]}>
          <Text style={[s.insightToggleText, { color: colors.teal }]}>
            {expanded ? t('analytics.hideInsights') : t('analytics.showInsights')}
          </Text>
        </View>
      </View>

      {!expanded ? (
        <View style={s.insightCollapsedBody}>
          <View style={s.insightPreviewRow}>
            <PulseDot color={getInsightAccentColor(items[0]?.tone, colors)} size={8} />
            <Text style={[s.insightPreviewTitle, { color: colors.text1 }]} numberOfLines={1}>
              {items[0]?.title}
            </Text>
          </View>
          <Text style={[s.insightPreviewBody, { color: colors.text2 }]} numberOfLines={2}>
            {items[0]?.body}
          </Text>
        </View>
      ) : (
        <View style={s.insightExpandedList}>
          {items.map((item, index) => {
            const accentColor = getInsightAccentColor(item.tone, colors);
            const accentBg = getInsightAccentBg(item.tone, colors);
            return (
              <View
                key={`${item.title}-${index}`}
                style={[
                  s.insightListItem,
                  index < items.length - 1 && [s.insightListItemBorder, { borderBottomColor: colors.separator }],
                ]}
              >
                <View style={[s.insightAccentCompact, { backgroundColor: accentBg }]}>
                  <PulseDot color={accentColor} size={8} delay={index * 180} />
                </View>
                <View style={s.insightTextWrap}>
                  <Text style={[s.insightTitleCompact, { color: colors.text1 }]}>{item.title}</Text>
                  <Text style={[s.insightBodyCompact, { color: colors.text2 }]}>{item.body}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Pressable>
  );
}

function ByHabitSummaryCard({
  build,
  breakItems,
  colors,
  onPress,
}: {
  build: Array<{ habit: Habit; pct: number; label: string }>;
  breakItems: Array<{ habit: Habit; pct: number; label: string }>;
  colors: Palette;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const allItems = [...build, ...breakItems].sort((a, b) => b.pct - a.pct);
  const count = allItems.length;
  const preview = allItems.slice(0, 3);
  return (
    <Pressable onPress={onPress} style={[s.activeHabitsPanel, { backgroundColor: colors.bgCard }]}>
      <View style={s.activeHabitsHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.activeHabitsTitle, { color: colors.text1 }]}>
            {t('analytics.byHabitCardSubtitle', { count })}
          </Text>
        </View>
        <View style={[s.activeHabitsPill, { backgroundColor: colors.tealSoft }]}>
          <Text style={[s.activeHabitsPillText, { color: colors.teal }]}>{t('analytics.viewAll')}</Text>
        </View>
      </View>

      <View style={s.activeHabitsPreviewList}>
        {preview.map((item, index) => (
          <View
            key={item.habit.id}
            style={[
              s.activeHabitsPreviewRow,
              index < preview.length - 1 && [s.activeHabitsPreviewBorder, { borderBottomColor: colors.separator }],
            ]}
          >
            <View style={s.activeHabitsPreviewLeft}>
              <Text style={s.activeHabitsPreviewIcon}>{item.habit.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.activeHabitsPreviewName, { color: colors.text1 }]} numberOfLines={1}>
                  {item.habit.name}
                </Text>
                <Text style={[s.activeHabitsPreviewMeta, { color: colors.text2 }]}>{item.label}</Text>
              </View>
            </View>
            <Text style={[s.activeHabitsPreviewValue, { color: colors.text1 }]}>{item.pct}%</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function ActiveHabitsSummaryCard({
  items,
  colors,
  onPress,
}: {
  items: {
    habit: Habit;
    completedDays: number;
    activeDays: number;
    streak: number;
    completionPct: number;
  }[];
  colors: Palette;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  const preview = items.slice(0, 3);
  return (
    <Pressable onPress={onPress} style={[s.activeHabitsPanel, { backgroundColor: colors.bgCard }]}>
        <View style={s.activeHabitsHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.activeHabitsTitle, { color: colors.text1 }]}>
            {t('analytics.activeHabitsCardSubtitle', { count: items.length })}
          </Text>
        </View>
        <View style={[s.activeHabitsPill, { backgroundColor: colors.tealSoft }]}>
          <Text style={[s.activeHabitsPillText, { color: colors.teal }]}>{t('analytics.viewAll')}</Text>
        </View>
      </View>

      <View style={s.activeHabitsPreviewList}>
        {preview.map((item, index) => (
          <View
            key={item.habit.id}
            style={[
              s.activeHabitsPreviewRow,
              index < preview.length - 1 && [s.activeHabitsPreviewBorder, { borderBottomColor: colors.separator }],
            ]}
          >
            <View style={s.activeHabitsPreviewLeft}>
              <Text style={s.activeHabitsPreviewIcon}>{item.habit.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.activeHabitsPreviewName, { color: colors.text1 }]} numberOfLines={1}>{item.habit.name}</Text>
                <Text style={[s.activeHabitsPreviewMeta, { color: colors.text2 }]}>
                  {t('analytics.activeHabitsPreviewMeta', { streak: item.streak, pct: item.completionPct })}
                </Text>
              </View>
            </View>
            <Text style={[s.activeHabitsPreviewValue, { color: colors.text1 }]}>{item.completedDays}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function GeneralMetricGrid({
  items,
  colors,
}: {
  items: MetricGridItem[];
  colors: Palette;
}) {
  return (
    <View style={s.metricGrid}>
      {items.map(item => (
        <View key={item.label} style={[s.metricCard, { backgroundColor: colors.bgCard }]}>
          <Text style={[s.metricCardLabel, { color: colors.text2 }]}>{item.label}</Text>
          <Text style={[s.metricCardValue, { color: colors.text1 }]}>{item.value}</Text>
          <Text style={[s.metricCardDetail, { color: colors.text2 }]}>{item.detail}</Text>
        </View>
      ))}
    </View>
  );
}

function WeekdayPatternCard({
  title,
  pattern,
  weekStartsOn,
  colors,
}: {
  title: string;
  pattern: {
    values: number[];
    bestIndex: number;
    worstIndex: number;
    weekdayAvg: number;
    weekendAvg: number;
    weekdayVsWeekendDelta: number;
  } | null;
  weekStartsOn: 0 | 1;
  colors: Palette;
}) {
  const { t } = useTranslation();
  if (!pattern) return null;
  const labels = getShortDayLabels(weekStartsOn);

  return (
    <View style={[s.generalTrendCard, { backgroundColor: colors.bgCard }]}>
      <Text style={[s.sectionTitleSmall, { color: colors.text1 }]}>
        {title}
      </Text>
      <Text style={[s.patternPeriodLabel, { color: colors.text2 }]}>
        {t('analytics.last90Days')}
      </Text>
      {labels.map((label, i) => {
        const pct = pattern.values[i] ?? 0;
        return (
          <View key={i} style={s.weekdayRow}>
            <Text style={[s.weekdayLabel, { color: colors.text2 }]} numberOfLines={1}>{label}</Text>
            <View style={[s.weekdayBarBg, { backgroundColor: colors.ring }]}>
              <View
                style={[
                  s.weekdayBarFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: i === pattern.bestIndex ? colors.teal : colors.success,
                  },
                ]}
              />
            </View>
            <Text style={[s.weekdayPct, { color: colors.text1 }]} numberOfLines={1}>{`${pct}%`}</Text>
          </View>
        );
      })}
    </View>
  );
}


// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F9F9F9' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },

  // Header
  header:      { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  headerTitle: {
    fontSize: 34, fontWeight: '700', color: '#1A1A1A',
    letterSpacing: -0.68, marginBottom: 20,
  },
  pillsRow:    { gap: 8, paddingBottom: 4 },
  timeRangeRow: {
    flexDirection: 'row',
    marginTop: 8,
    backgroundColor: '#EFEFEF',
    borderRadius: 12,
    padding: 4,
    alignSelf: 'flex-start',
  },
  timeRangeSeg: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  timeRangeSegActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  timeRangeSegText: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
  timeRangeSegTextActive: { color: '#1A1A1A' },
  pill:        {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 50, backgroundColor: '#EFEFEF',
  },
  pillActive:  { backgroundColor: 'rgba(0, 128, 128, 0.12)' },
  pillIcon:    { fontSize: 14 },
  pillText:    { fontSize: 15, fontWeight: '500', color: '#8E8E93' },
  pillTextActive: { color: '#008080', fontWeight: '600' },

  // Completion ring card
  completionCard: {
    backgroundColor: '#fff', borderRadius: 24,
    paddingVertical: 24, paddingHorizontal: 24, marginBottom: 32,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08, shadowRadius: 40, elevation: 6,
  },
  periodDeltaBadge: {
    position: 'absolute', top: 10, right: 10,
    borderRadius: 999, paddingHorizontal: 6, paddingVertical: 3,
  },
  periodDeltaText: { fontSize: 10, fontWeight: '700' },
  completionTitle: {
    fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 6, letterSpacing: -0.4,
  },
  completionSub: { fontSize: 17, color: '#8E8E93', lineHeight: 22 },
  completionRingWrap: {
    width: 130,
    height: 130,
    flexShrink: 0,
  },
  ringPct: { fontSize: 28, fontWeight: '700', color: '#000', letterSpacing: -0.8 },
  ringPctFull: { fontSize: 22, letterSpacing: -0.5 },

  // General mode (all habits / habit analytical detail)
  emptyState: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '600' },
  sectionTitleSmall: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  generalCardSubtext: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  insightGrid: { marginBottom: 8 },
  insightPanel: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  insightPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  insightPanelTitleWrap: { flex: 1, minWidth: 0 },
  insightPanelTitle: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  insightPanelMeta: { fontSize: 12, fontWeight: '600' },
  insightTogglePill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  insightToggleText: { fontSize: 12, fontWeight: '700' },
  insightCollapsedBody: { marginTop: 14 },
  insightPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  insightPreviewDot: { width: 10, height: 10, borderRadius: 5 },
  insightPreviewTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  insightPreviewBody: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  insightExpandedList: { marginTop: 10 },
  insightListItem: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  insightListItemBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  insightAccentCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  insightAccentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  insightTextWrap: { flex: 1, minWidth: 0 },
  insightTitleCompact: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  insightBodyCompact: { fontSize: 13, lineHeight: 18, fontWeight: '500' },

  activeHabitsPanel: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activeHabitsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  activeHabitsTitle: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  activeHabitsSubtitle: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  activeHabitsPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  activeHabitsPillText: { fontSize: 12, fontWeight: '700' },
  activeHabitsPreviewList: { marginTop: 2 },
  activeHabitsPreviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  activeHabitsPreviewBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  activeHabitsPreviewLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 12 },
  activeHabitsPreviewIcon: { fontSize: 18 },
  activeHabitsPreviewName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  activeHabitsPreviewMeta: { fontSize: 12, fontWeight: '600' },
  activeHabitsPreviewValue: { fontSize: 22, fontWeight: '800', minWidth: 28, textAlign: 'right' },

  generalStreakCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  generalTwoCol: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  generalMetric: { flex: 1, alignItems: 'center' },
  generalStreakIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  generalMetricLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  generalMetricValue: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8 },

  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  metricCardLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  metricCardValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7, marginBottom: 6 },
  metricCardDetail: { fontSize: 12, fontWeight: '600', lineHeight: 16 },

  generalTrendCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  generalCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trendLegendRow: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  trendLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendLegendDot: { width: 10, height: 10, borderRadius: 5 },
  trendLegendText: { fontSize: 12, fontWeight: '600' },

  generalRankCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  generalRankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  generalRankIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 128, 128, 0.12)',
  },
  generalRankIconText: { fontSize: 18 },
  generalRankName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  generalRankMeta: { fontSize: 12, fontWeight: '600' },
  generalRankOrder: { fontSize: 12, fontWeight: '700' },
  generalEmptyText: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  moversSection: { marginTop: 6 },
  moversSectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 12 },
  moverDelta: { fontSize: 14, fontWeight: '800', minWidth: 34, textAlign: 'right' },

  habitGeneralHeaderCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  habitGeneralIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 128, 128, 0.12)',
    marginRight: 16,
  },
  habitGeneralIconText: { fontSize: 24 },
  habitGeneralHeaderText: { flex: 1, minWidth: 0 },
  habitGeneralName: { fontSize: 18, fontWeight: '700' },
  habitGeneralCreated: { fontSize: 13, fontWeight: '600', marginTop: 6, lineHeight: 18 },
  habitTotalBadge: {
    marginTop: 10,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  habitTotalLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  habitTotalValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },

  // Bar chart
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#1A1A1A', marginBottom: 16 },
  barCard: {
    backgroundColor: '#fff', borderRadius: 24,
    padding: 24, marginBottom: 32, overflow: 'visible',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  barTotal: { fontSize: 40, fontWeight: '700', color: '#1A1A1A', letterSpacing: -0.8, lineHeight: 44, marginBottom: 4 },
  barTotalLabel: { fontSize: 13, color: '#8E8E93', marginBottom: 12 },
  barEmpty: { minHeight: 200, justifyContent: 'center', alignItems: 'center' },
  barEmptyText: { fontSize: 15, color: '#8E8E93' },
  chartGridlinesWrap: { top: 0, left: 0, right: 0, height: 220 },
  chartGridlinesSvg: { position: 'absolute', top: 0, left: 0 },
  barChartRangeCaption: { fontSize: 11, color: '#8E8E93', marginTop: 8, textAlign: 'center' },

  // By habit
  byHabitCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  byHabitSubtitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 8 },
  byHabitSubtitleSpaced: { marginTop: 16 },
  byHabitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  byHabitIcon: { fontSize: 20, marginRight: 12, width: 28, textAlign: 'center' },
  byHabitCenter: { flex: 1, marginRight: 12 },
  byHabitNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  byHabitName: { fontSize: 15, fontWeight: '500', color: '#1A1A1A', flex: 1 },
  byHabitDays: { fontSize: 12, color: '#8E8E93', marginLeft: 8 },
  byHabitBarBg: { height: 6, backgroundColor: '#E5E5E7', borderRadius: 3, overflow: 'hidden' },
  byHabitBarFill: { height: '100%', backgroundColor: '#34C759', borderRadius: 3 },
  byHabitBarFillBreak: { height: '100%', backgroundColor: '#34C759', borderRadius: 3 },
  byHabitPct: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', minWidth: 36, textAlign: 'right' },

  // Completion by weekday
  weekdayCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24, marginBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  patternSummaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  patternPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  patternPillText: { fontSize: 12, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  weekdayLabel: { fontSize: 13, color: '#8E8E93', width: 36 },
  weekdayBarBg: { flex: 1, height: 8, backgroundColor: '#E5E5E7', borderRadius: 4, overflow: 'hidden', marginHorizontal: 12 },
  weekdayBarFill: { height: '100%', backgroundColor: '#34C759', borderRadius: 4 },
  weekdayPct: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', minWidth: 40, textAlign: 'right' },
  patternFooterText: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  patternPeriodLabel: { fontSize: 12, fontWeight: '500', marginTop: 2, marginBottom: 14 },

  // Break habits summary
  breakSummaryCard: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)', borderRadius: 16, padding: 16, marginBottom: 32,
  },
  breakSummaryText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },

  // Streak card
  streakCard: {
    backgroundColor: '#fff', borderRadius: 20,
    paddingVertical: 24, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  streakItem:      { alignItems: 'center' },
  streakIconOrange: {
    width: 48, height: 48, borderRadius: 24, marginBottom: 12,
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  streakIconGreen: {
    width: 48, height: 48, borderRadius: 24, marginBottom: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  streakNum:   { fontSize: 48, fontWeight: '700', color: '#1A1A1A', lineHeight: 52, marginBottom: 8 },
  streakLabel: { fontSize: 15, color: '#8E8E93' },

  // Heatmap
  heatmapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heatmapInnerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heatmapMonthPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50,
    backgroundColor: '#EFEFEF',
  },
  heatmapMonthText: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  heatmapCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24, marginBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  heatDayRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 },
  heatDayLabel:{ width: 32, textAlign: 'center', fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  heatRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  heatCell:    { width: 32, height: 32, borderRadius: 8, backgroundColor: '#E5E5E7' },
  legend:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 6, marginTop: 24,
  },
  legendLabel: { fontSize: 11, color: '#8E8E93' },
  legendCell:  { width: 14, height: 14, borderRadius: 3 },
});
