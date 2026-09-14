import type { Habit, HabitEntry } from '@/types/habit';
import { getWeekDates, datesInRange, type WeekStartDay } from './dates';

// ─── Active-on-date (pause/delete are forward-looking) ────────────────────────

/**
 * True if the habit was active on the given date.
 * A habit is active on `date` when:
 * - it was already created (`createdAt <= date`), and
 * - it has not yet been paused or archived on/before that date.
 *
 * Callers usually also check `createdAt <= date` separately when needed; this
 * helper focuses on the pause/delete window.
 */
export const isHabitActiveOnDate = (habit: Habit, date: string): boolean => {
  const notPaused   = !habit.pausedAt || habit.pausedAt > date;
  const notDeleted  = habit.archivedAt === null || habit.archivedAt > date;
  return notPaused && notDeleted;
};

// ─── Entry lookup ─────────────────────────────────────────────────────────────

/** Value logged for a single habit on a single date (0 if no entry). */
export const entryValue = (entries: HabitEntry[], habitId: string, date: string): number =>
  entries.find(e => e.id === `${habitId}_${date}`)?.value ?? 0;

// ─── Habit-level value for a given date/period ────────────────────────────────

/** Optional clamp so analytics only count up to this date (no future). */
export interface HabitValueOptions {
  /** When set, weekly/monthly only sum entries for days d <= maxDate. */
  maxDate?: string;
}

/**
 * Returns the progress value for a habit on a given anchor date,
 * taking frequency into account:
 *
 * - daily:   entry for that exact date
 * - weekly:  sum of entries across the week containing the date
 * - monthly: sum of entries across the full calendar month of the date
 *
 * When options.maxDate is set (e.g. for analytics), weekly/monthly only
 * include days d <= maxDate so future days are not counted.
 *
 * This is the "current" value shown in HabitCard and HabitDetail.
 */
export const getHabitCurrentValue = (
  habit: Habit,
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
  options?: HabitValueOptions,
): number => {
  const maxDate = options?.maxDate;
  if (habit.frequency === 'weekly') {
    const weekDates = getWeekDates(date, weekStartsOn);
    const days = maxDate ? weekDates.filter(d => d <= maxDate) : weekDates;
    return days.reduce((sum, d) => sum + entryValue(entries, habit.id, d), 0);
  }
  if (habit.frequency === 'monthly') {
    const [year, month] = date.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const range = datesInRange(from, to);
    const days = maxDate ? range.filter(d => d <= maxDate) : range;
    return days.reduce((sum, d) => sum + entryValue(entries, habit.id, d), 0);
  }
  // daily (and boolean): ignore maxDate for single-day value
  return entryValue(entries, habit.id, date);
};

/**
 * True if the habit is "done" (goal met) for the given anchor date/period.
 *
 * Build habits: current value has reached or exceeded the target.
 * Break habits:
 *   - Boolean (Yes/No): "completed" = user did not do the bad thing (value === 0).
 *     Value 1 = failed (did the bad thing). No entry or 0 = okay/success.
 *   - Numeric: current value is within the limit (≤ target).
 *
 * When options.maxDate is set (e.g. for analytics), weekly/monthly completion
 * is evaluated only over days <= maxDate so future days are not counted.
 */
export const isHabitCompleted = (
  habit: Habit,
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
  options?: HabitValueOptions,
): boolean => {
  const value = getHabitCurrentValue(habit, entries, date, weekStartsOn, options);
  if (habit.goalType === 'break') {
    if (habit.kind === 'boolean') return value === 0; // only "okay" (no slip) counts as completed
    return value <= habit.target;
  }
  return value >= habit.target;
};

/** True when a break habit has exceeded its daily limit. Always false for build habits. */
export const isOverLimit = (
  habit: Habit,
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
): boolean => {
  if (habit.goalType !== 'break') return false;
  return getHabitCurrentValue(habit, entries, date, weekStartsOn) > habit.target;
};

/** Count of daily break habits that have exceeded their limit on a given date. */
export const dailyOverLimitCount = (
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
): number =>
  habits.filter(
    h => isHabitActiveOnDate(h, date) && h.createdAt <= date &&
         h.frequency === 'daily' && h.goalType === 'break' &&
         isOverLimit(h, entries, date, weekStartsOn),
  ).length;

// ─── Day-level aggregates ─────────────────────────────────────────────────────

/**
 * Overall completion % (0–100) for all active habits on a given date.
 * Only habits that existed on `date` (createdAt <= date) are counted.
 * When options.maxDate is set (e.g. analytics), weekly/monthly habits are evaluated only up to maxDate.
 */
export const dailyCompletion = (
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
  options?: HabitValueOptions,
): number => {
  const active = habits.filter(h => isHabitActiveOnDate(h, date) && h.createdAt <= date);
  if (active.length === 0) return 0;
  const completed = active.filter(h => isHabitCompleted(h, entries, date, weekStartsOn, options)).length;
  return Math.round((completed / active.length) * 100);
};

/** Completed vs. total counts for a given date (used in ProgressHero). */
export const dailyCompletedCount = (
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
  options?: HabitValueOptions,
): { completed: number; total: number } => {
  const active = habits.filter(h => isHabitActiveOnDate(h, date) && h.createdAt <= date);
  const completed = active.filter(h => isHabitCompleted(h, entries, date, weekStartsOn, options)).length;
  return { completed, total: active.length };
};

// ─── Daily-only aggregates (Home screen ring + week-strip dots) ───────────────
// These intentionally exclude weekly/monthly habits so the ring can reach 100%
// the moment all daily habits for the day are done.

/** Completed vs. total counts for daily-frequency habits only on a given date. */
export const dailyOnlyCompletedCount = (
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
): { completed: number; total: number } => {
  const active = habits.filter(
    h => isHabitActiveOnDate(h, date) && h.createdAt <= date && h.frequency === 'daily',
  );
  return {
    completed: active.filter(h => isHabitCompleted(h, entries, date, weekStartsOn)).length,
    total: active.length,
  };
};

/** Completion % (0–100) for daily-frequency habits only on a given date. */
export const dailyOnlyCompletion = (
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
): number => {
  const { completed, total } = dailyOnlyCompletedCount(habits, entries, date, weekStartsOn);
  return total === 0 ? 0 : Math.round((completed / total) * 100);
};

/**
 * Progress toward goal as 0–100 for one habit (for weighted completion).
 * Build boolean: 100 or 0. Build numeric: min(100, (value/target)*100). Break: 100 or 0.
 */
function habitProgressPct(
  habit: Habit,
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
): number {
  const value = getHabitCurrentValue(habit, entries, date, weekStartsOn);
  if (habit.goalType === 'break') {
    if (habit.kind === 'boolean') return value === 0 ? 100 : 0;
    return value <= habit.target ? 100 : 0;
  }
  if (habit.kind === 'boolean') return value >= habit.target ? 100 : 0;
  const target = habit.target;
  if (target <= 0) return value >= target ? 100 : 0;
  return Math.min(100, Math.round((value / target) * 100));
}

/**
 * Weighted completion % (0–100) for daily habits: partial progress counts
 * (e.g. 10/15 reading → ~67% for that habit). Used for main score card when not in strict mode.
 */
export const dailyOnlyCompletionWeighted = (
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
): number => {
  const active = habits.filter(
    h => isHabitActiveOnDate(h, date) && h.createdAt <= date && h.frequency === 'daily',
  );
  if (active.length === 0) return 0;
  const sum = active.reduce(
    (acc, h) => acc + habitProgressPct(h, entries, date, weekStartsOn),
    0,
  );
  return Math.round(sum / active.length);
};

/** Completed vs. total weekly-frequency habits for the week containing `date`. */
export const weeklyHabitProgress = (
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
): { completed: number; total: number } => {
  const active = habits.filter(
    h => isHabitActiveOnDate(h, date) && h.createdAt <= date && h.frequency === 'weekly',
  );
  return {
    completed: active.filter(h => isHabitCompleted(h, entries, date, weekStartsOn)).length,
    total: active.length,
  };
};

// ─── Week / month aggregates (used in Calendar + Analytics) ───────────────────

/** Mean daily completion % across a 7-day week starting from weekStartDate. */
export const weeklyScore = (
  habits: Habit[],
  entries: HabitEntry[],
  weekStartDate: string,
  weekStartsOn: WeekStartDay,
): number => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const scores = days.map(d => dailyCompletion(habits, entries, d, weekStartsOn));
  return Math.round(scores.reduce((a, b) => a + b, 0) / 7);
};
