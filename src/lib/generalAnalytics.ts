import type { Habit, HabitEntry } from '@/types/habit';
import { addDays, datesInRange, getDayOfWeekColumnIndex, getMonthRange, getWeekDates, type WeekStartDay } from '@/lib/dates';
import { dailyCompletion, getHabitCurrentValue, isHabitActiveOnDate, isHabitCompleted } from '@/lib/aggregates';

export type CompletionSnapshot = {
  pct: number;
  completed: number;
  total: number;
};

export type TrendPoint = CompletionSnapshot & {
  date: string;
  rollingPct: number;
};

export type PeriodComparison = {
  currentPct: number;
  previousPct: number;
  delta: number;
  currentCompleted: number;
  currentTotal: number;
  previousCompleted: number;
  previousTotal: number;
};

export type WeekdayPattern = {
  values: number[];
  bestIndex: number;
  worstIndex: number;
  weekdayAvg: number;
  weekendAvg: number;
  weekdayVsWeekendDelta: number;
};

export type HabitMover = {
  habit: Habit;
  currentPct: number;
  previousPct: number;
  delta: number;
  streak: number;
};

export type ActiveHabitRankItem = {
  habit: Habit;
  completedDays: number;
  activeDays: number;
  streak: number;
  completionPct: number;
};

const ZERO_SNAPSHOT: CompletionSnapshot = { pct: 0, completed: 0, total: 0 };

function averageSnapshots(snaps: CompletionSnapshot[]): { pct: number; completed: number; total: number } {
  const valid = snaps.filter(s => s.total > 0);
  if (valid.length === 0) return { pct: 0, completed: 0, total: 0 };
  const pct = Math.round(valid.reduce((sum, item) => sum + item.pct, 0) / valid.length);
  const completed = valid.reduce((sum, item) => sum + item.completed, 0);
  const total = valid.reduce((sum, item) => sum + item.total, 0);
  return { pct, completed, total };
}

function isHabitDueForStreak(habit: Habit, date: string, weekStartsOn: WeekStartDay): boolean {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekly') return getWeekDates(date, weekStartsOn)[6] === date;
  return getMonthRange(date).end === date;
}

function isHabitCompletedForStreak(
  habit: Habit,
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
  todayStr: string,
): boolean {
  // Weekly/monthly habits are neutral on non-due days.
  if (!isHabitDueForStreak(habit, date, weekStartsOn)) return true;
  return isHabitCompleted(habit, entries, date, weekStartsOn, { maxDate: todayStr });
}

function getHabitSnapshot(
  habit: Habit,
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
  todayStr: string,
): CompletionSnapshot {
  if (habit.createdAt > date || !isHabitActiveOnDate(habit, date)) return ZERO_SNAPSHOT;
  const opts = { maxDate: todayStr };
  const completed = isHabitCompleted(habit, entries, date, weekStartsOn, opts);
  if (habit.goalType === 'break') {
    return { pct: completed ? 100 : 0, completed: completed ? 1 : 0, total: 1 };
  }
  const value = getHabitCurrentValue(habit, entries, date, weekStartsOn, opts);
  const target = habit.target || 1;
  const pct = Math.min(100, Math.round((value / target) * 100));
  return { pct, completed: completed ? 1 : 0, total: 1 };
}

export function getCompletionSnapshot(
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
  todayStr: string,
  habitFilter: Habit | null = null,
): CompletionSnapshot {
  if (habitFilter) return getHabitSnapshot(habitFilter, entries, date, weekStartsOn, todayStr);
  const active = habits.filter(h => isHabitActiveOnDate(h, date) && h.createdAt <= date);
  if (active.length === 0) return ZERO_SNAPSHOT;
  const opts = { maxDate: todayStr };
  const completed = active.filter(h => isHabitCompleted(h, entries, date, weekStartsOn, opts)).length;
  return {
    pct: dailyCompletion(habits, entries, date, weekStartsOn, opts),
    completed,
    total: active.length,
  };
}

export function buildTrendSeries(
  habits: Habit[],
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: WeekStartDay,
  habitFilter: Habit | null = null,
  days = 30,
): TrendPoint[] {
  const start = addDays(todayStr, -(days - 1));
  const dates = datesInRange(start, todayStr);
  const points = dates.map(date => ({
    date,
    ...getCompletionSnapshot(habits, entries, date, weekStartsOn, todayStr, habitFilter),
  }));
  return points.map((point, index) => {
    const rollingSlice = points.slice(Math.max(0, index - 6), index + 1).filter(item => item.total > 0);
    const rollingPct = rollingSlice.length
      ? Math.round(rollingSlice.reduce((sum, item) => sum + item.pct, 0) / rollingSlice.length)
      : 0;
    return {
      ...point,
      rollingPct,
    };
  });
}

export function buildPeriodComparison(
  habits: Habit[],
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: WeekStartDay,
  habitFilter: Habit | null = null,
  days = 30,
): PeriodComparison {
  const currentDates = datesInRange(addDays(todayStr, -(days - 1)), todayStr);
  const previousEnd = addDays(todayStr, -days);
  const previousDates = datesInRange(addDays(previousEnd, -(days - 1)), previousEnd);
  const current = averageSnapshots(
    currentDates.map(date => getCompletionSnapshot(habits, entries, date, weekStartsOn, todayStr, habitFilter)),
  );
  const previous = averageSnapshots(
    previousDates.map(date => getCompletionSnapshot(habits, entries, date, weekStartsOn, todayStr, habitFilter)),
  );
  return {
    currentPct: current.pct,
    previousPct: previous.pct,
    delta: current.pct - previous.pct,
    currentCompleted: current.completed,
    currentTotal: current.total,
    previousCompleted: previous.completed,
    previousTotal: previous.total,
  };
}

export function buildWeekdayPattern(
  habits: Habit[],
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: WeekStartDay,
  habitFilter: Habit | null = null,
  days = 84,
): WeekdayPattern {
  const start = addDays(todayStr, -(days - 1));
  const dates = datesInRange(start, todayStr);
  const buckets: number[][] = [[], [], [], [], [], [], []];

  for (const date of dates) {
    const snap = getCompletionSnapshot(habits, entries, date, weekStartsOn, todayStr, habitFilter);
    if (snap.total === 0) continue;
    const index = getDayOfWeekColumnIndex(date, weekStartsOn);
    buckets[index].push(snap.pct);
  }

  const values = buckets.map(bucket =>
    bucket.length ? Math.round(bucket.reduce((sum, value) => sum + value, 0) / bucket.length) : 0,
  );
  const ranked = values.map((value, index) => ({ value, index })).filter(item => item.value > 0);
  const bestIndex = ranked.length ? ranked.reduce((best, item) => (item.value > best.value ? item : best)).index : 0;
  const worstIndex = ranked.length ? ranked.reduce((worst, item) => (item.value < worst.value ? item : worst)).index : 0;

  const weekdayIndices = weekStartsOn === 1 ? [0, 1, 2, 3, 4] : [1, 2, 3, 4, 5];
  const weekendIndices = weekStartsOn === 1 ? [5, 6] : [0, 6];
  const weekdayValues = weekdayIndices.map(index => values[index]).filter(value => value > 0);
  const weekendValues = weekendIndices.map(index => values[index]).filter(value => value > 0);
  const weekdayAvg = weekdayValues.length
    ? Math.round(weekdayValues.reduce((sum, value) => sum + value, 0) / weekdayValues.length)
    : 0;
  const weekendAvg = weekendValues.length
    ? Math.round(weekendValues.reduce((sum, value) => sum + value, 0) / weekendValues.length)
    : 0;

  return {
    values,
    bestIndex,
    worstIndex,
    weekdayAvg,
    weekendAvg,
    weekdayVsWeekendDelta: weekdayAvg - weekendAvg,
  };
}

function computeHabitCurrentStreak(
  habit: Habit,
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: WeekStartDay,
): number {
  if (!isHabitCompletedForStreak(habit, entries, todayStr, weekStartsOn, todayStr)) return 0;
  let streak = 0;
  let cursor = todayStr;
  while (cursor >= habit.createdAt) {
    if (!isHabitActiveOnDate(habit, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (isHabitCompletedForStreak(habit, entries, cursor, weekStartsOn, todayStr)) {
      streak++;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

export function buildActiveHabitsLeaderboard(
  habits: Habit[],
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: WeekStartDay,
): ActiveHabitRankItem[] {
  const opts = { maxDate: todayStr };
  return habits
    .filter(habit => isHabitActiveOnDate(habit, todayStr) && habit.createdAt <= todayStr)
    .map(habit => {
      let completedDays = 0;
      let activeDays = 0;
      let cursor = habit.createdAt;
      while (cursor <= todayStr) {
        if (!isHabitActiveOnDate(habit, cursor)) {
          cursor = addDays(cursor, 1);
          continue;
        }
        activeDays++;
        if (isHabitCompleted(habit, entries, cursor, weekStartsOn, opts)) {
          completedDays++;
        }
        cursor = addDays(cursor, 1);
      }
      const completionPct = activeDays > 0 ? Math.round((completedDays / activeDays) * 100) : 0;
      return {
        habit,
        completedDays,
        activeDays,
        streak: computeHabitCurrentStreak(habit, entries, todayStr, weekStartsOn),
        completionPct,
      };
    })
    .sort((a, b) =>
      b.completedDays - a.completedDays ||
      b.completionPct - a.completionPct ||
      b.streak - a.streak ||
      a.habit.sortOrder - b.habit.sortOrder)
    ;
}

function getHabitWindowPct(
  habit: Habit,
  entries: HabitEntry[],
  from: string,
  to: string,
  weekStartsOn: WeekStartDay,
  todayStr: string,
): number {
  const dates = datesInRange(from, to);
  return averageSnapshots(dates.map(date => getHabitSnapshot(habit, entries, date, weekStartsOn, todayStr))).pct;
}

export function buildHabitMovers(
  habits: Habit[],
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: WeekStartDay,
  days = 14,
): {
  improving: HabitMover[];
  slipping: HabitMover[];
  consistent: HabitMover[];
} {
  const currentStart = addDays(todayStr, -(days - 1));
  const previousEnd = addDays(todayStr, -days);
  const previousStart = addDays(previousEnd, -(days - 1));
  const activeToday = habits.filter(h => isHabitActiveOnDate(h, todayStr) && h.createdAt <= todayStr);

  const movers = activeToday.map(habit => {
    const currentPct = getHabitWindowPct(habit, entries, currentStart, todayStr, weekStartsOn, todayStr);
    const previousPct = getHabitWindowPct(habit, entries, previousStart, previousEnd, weekStartsOn, todayStr);
    return {
      habit,
      currentPct,
      previousPct,
      delta: currentPct - previousPct,
      streak: computeHabitCurrentStreak(habit, entries, todayStr, weekStartsOn),
    };
  });

  return {
    improving: movers
      .filter(item => item.delta > 0)
      .sort((a, b) => b.delta - a.delta || b.currentPct - a.currentPct)
      .slice(0, 3),
    slipping: movers
      .filter(item => item.delta < 0)
      .sort((a, b) => a.delta - b.delta || a.currentPct - b.currentPct)
      .slice(0, 3),
    consistent: movers
      .sort((a, b) => b.currentPct - a.currentPct || b.streak - a.streak)
      .slice(0, 3),
  };
}

export function buildMonthPaceComparison(
  habits: Habit[],
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: WeekStartDay,
  habitFilter: Habit | null = null,
): PeriodComparison {
  const currentMonth = getMonthRange(todayStr);
  const currentDates = datesInRange(currentMonth.start, todayStr);
  const previousMonthAnchor = addDays(currentMonth.start, -1);
  const previousMonth = getMonthRange(previousMonthAnchor);
  const current = averageSnapshots(
    currentDates.map(date => getCompletionSnapshot(habits, entries, date, weekStartsOn, todayStr, habitFilter)),
  );
  const previous = averageSnapshots(
    datesInRange(previousMonth.start, previousMonth.end)
      .map(date => getCompletionSnapshot(habits, entries, date, weekStartsOn, previousMonth.end, habitFilter)),
  );
  return {
    currentPct: current.pct,
    previousPct: previous.pct,
    delta: current.pct - previous.pct,
    currentCompleted: current.completed,
    currentTotal: current.total,
    previousCompleted: previous.completed,
    previousTotal: previous.total,
  };
}

export function buildCurrentWeekSnapshot(
  habits: Habit[],
  entries: HabitEntry[],
  todayStr: string,
  weekStartsOn: WeekStartDay,
  habitFilter: Habit | null = null,
): CompletionSnapshot {
  const weekDates = getWeekDates(todayStr, weekStartsOn).filter(date => date <= todayStr);
  const snaps = weekDates.map(date => getCompletionSnapshot(habits, entries, date, weekStartsOn, todayStr, habitFilter));
  const avg = averageSnapshots(snaps);
  return {
    pct: avg.pct,
    completed: avg.completed,
    total: avg.total,
  };
}
