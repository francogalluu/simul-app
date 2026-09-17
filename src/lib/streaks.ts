import { addDays, datesInRange, today } from './dates';
import { involves, type Person } from './people';
import type { Completions, Habit } from '@/store/tasksStore';

/** Inside a paused stretch (inclusive on both ends; open-ended while `to` is null). */
export const isPausedOn = (h: Habit, date: string) =>
  h.pauses.some((p) => p.from <= date && (p.to === null || date <= p.to));

export const isPausedNow = (h: Habit) => h.pauses.some((p) => p.to === null);

/** Active means: exists, has started, and isn't paused that day. */
export const isHabitActiveOn = (h: Habit, date: string) => h.status === 'active' && h.createdAt <= date && !isPausedOn(h, date);

export const isDoneBy = (completions: Completions, habitId: string, date: string, person: Person) =>
  Boolean(completions[date]?.[habitId]?.[person]);

/** Every habit this person is part of on `date` is completed by them (and there's at least one). */
export function personDayComplete(habits: Habit[], completions: Completions, date: string, person: Person): boolean {
  const mine = habits.filter((h) => isHabitActiveOn(h, date) && involves(h.owner, person));
  return mine.length > 0 && mine.every((h) => isDoneBy(completions, h.id, date, person));
}

/** Every shared habit on `date` is completed by both people (and there's at least one). */
export function togetherDayComplete(habits: Habit[], completions: Completions, date: string): boolean {
  const shared = habits.filter((h) => isHabitActiveOn(h, date) && h.owner === 'both');
  return (
    shared.length > 0 &&
    shared.every((h) => isDoneBy(completions, h.id, date, 'A') && isDoneBy(completions, h.id, date, 'S'))
  );
}

/** A day where everything relevant was paused: transparent to streaks (neither counts nor breaks). */
function personDayPaused(habits: Habit[], date: string, person: Person): boolean {
  const relevant = habits.filter((h) => h.status === 'active' && h.createdAt <= date && involves(h.owner, person));
  return relevant.length > 0 && relevant.every((h) => isPausedOn(h, date));
}

function togetherDayPaused(habits: Habit[], date: string): boolean {
  const shared = habits.filter((h) => h.status === 'active' && h.createdAt <= date && h.owner === 'both');
  return shared.length > 0 && shared.every((h) => isPausedOn(h, date));
}

/**
 * Consecutive complete days ending today. Today not being done yet doesn't
 * break the streak (the day isn't over) — in that case count from yesterday.
 * Paused days are skipped over without counting.
 */
function streakEndingToday(isComplete: (date: string) => boolean, isPaused: (date: string) => boolean = () => false): number {
  const t = today();
  let cursor = isComplete(t) ? t : addDays(t, -1);
  let n = 0;
  let guard = 0;
  while (guard++ < 3650) {
    if (isPaused(cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!isComplete(cursor)) break;
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export const personStreak = (habits: Habit[], completions: Completions, person: Person) =>
  streakEndingToday(
    (d) => personDayComplete(habits, completions, d, person),
    (d) => personDayPaused(habits, d, person),
  );

export const togetherStreak = (habits: Habit[], completions: Completions) =>
  streakEndingToday(
    (d) => togetherDayComplete(habits, completions, d),
    (d) => togetherDayPaused(habits, d),
  );

/** Longest run of complete days anywhere in history (for achievements). */
export function longestStreak(dates: string[], isComplete: (date: string) => boolean): number {
  const set = new Set(dates.filter(isComplete));
  let best = 0;
  for (const d of set) {
    if (set.has(addDays(d, -1))) continue; // not a run start
    let len = 0;
    let cursor = d;
    while (set.has(cursor)) {
      len += 1;
      cursor = addDays(cursor, 1);
    }
    best = Math.max(best, len);
  }
  return best;
}

// ─── Per-habit stats (habit sheet, Stats page) ───────────────────────────────

/** Whether `person` completed this habit on `date`; for shared habits, both did. */
export function habitDayComplete(habit: Habit, completions: Completions, date: string, person?: Person): boolean {
  if (!isHabitActiveOn(habit, date)) return false;
  if (person) return isDoneBy(completions, habit.id, date, person);
  if (habit.owner === 'both') return isDoneBy(completions, habit.id, date, 'A') && isDoneBy(completions, habit.id, date, 'S');
  return isDoneBy(completions, habit.id, date, habit.owner);
}

/** Current streak for one habit (per person, or "together" when person is omitted on a shared habit). */
export const habitStreak = (habit: Habit, completions: Completions, person?: Person) =>
  streakEndingToday(
    (d) => habitDayComplete(habit, completions, d, person),
    (d) => isPausedOn(habit, d),
  );

export function habitLongestStreak(habit: Habit, completions: Completions, person?: Person): number {
  if (habit.status !== 'active') return 0;
  const days = datesInRange(habit.createdAt, today()).filter((d) => !isPausedOn(habit, d));
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = habitDayComplete(habit, completions, d, person) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Number of days `person` (or both, for shared) completed the habit, ever. */
export function habitCompletionCount(habit: Habit, completions: Completions, person?: Person): number {
  let n = 0;
  for (const [date, byHabit] of Object.entries(completions)) {
    if (!byHabit[habit.id]) continue;
    if (habitDayComplete(habit, completions, date, person)) n += 1;
  }
  return n;
}

// ─── Ranges (Stats page, weekly recap, heatmap) ──────────────────────────────

export interface RateSummary {
  /** (person, habit, day) pairs that could have been completed. */
  possible: number;
  done: number;
  /** 0..1, or null when nothing was possible in the range. */
  rate: number | null;
}

/** Completion rate for one person over an inclusive date range (future days excluded). */
export function completionRate(habits: Habit[], completions: Completions, person: Person, from: string, to: string): RateSummary {
  const end = to > today() ? today() : to;
  let possible = 0;
  let done = 0;
  if (from <= end) {
    for (const d of datesInRange(from, end)) {
      for (const h of habits) {
        if (!isHabitActiveOn(h, d) || !involves(h.owner, person)) continue;
        possible += 1;
        if (isDoneBy(completions, h.id, d, person)) done += 1;
      }
    }
  }
  return { possible, done, rate: possible ? done / possible : null };
}

export interface WeekRecap {
  dates: string[];
  /** Days (so far) where every shared habit was done by both. */
  inSyncDays: number;
  /** Days in the range that have happened and had at least one shared habit. */
  syncPossibleDays: number;
  a: RateSummary;
  s: RateSummary;
  /** Best habit of the week for the couple: most (person, day) completions. */
  topHabit: { habit: Habit; done: number } | null;
}

export function weekRecap(habits: Habit[], completions: Completions, dates: string[]): WeekRecap {
  const past = dates.filter((d) => d <= today());
  let inSyncDays = 0;
  let syncPossibleDays = 0;
  for (const d of past) {
    if (habits.some((h) => isHabitActiveOn(h, d) && h.owner === 'both')) {
      syncPossibleDays += 1;
      if (togetherDayComplete(habits, completions, d)) inSyncDays += 1;
    }
  }
  let topHabit: WeekRecap['topHabit'] = null;
  for (const h of habits) {
    let done = 0;
    for (const d of past) {
      if (!isHabitActiveOn(h, d)) continue;
      for (const p of ['A', 'S'] as Person[]) if (involves(h.owner, p) && isDoneBy(completions, h.id, d, p)) done += 1;
    }
    if (done > 0 && (!topHabit || done > topHabit.done)) topHabit = { habit: h, done };
  }
  return {
    dates,
    inSyncDays,
    syncPossibleDays,
    a: completionRate(habits, completions, 'A', dates[0], dates[dates.length - 1]),
    s: completionRate(habits, completions, 'S', dates[0], dates[dates.length - 1]),
    topHabit,
  };
}

/** Per-day summary used by the calendar strip. */
export interface DaySummary {
  date: string;
  /** 0..1 — completed (person, habit) pairs over all pairs active that day. */
  pct: number;
  aDone: boolean;
  bDone: boolean;
  /** Both people finished everything they had that day. */
  full: boolean;
  /** Nothing was active that day (nothing existed yet, or everything was paused). */
  empty: boolean;
}

export function summarizeDay(habits: Habit[], completions: Completions, date: string): DaySummary {
  const active = habits.filter((h) => isHabitActiveOn(h, date));
  let pairs = 0;
  let done = 0;
  for (const h of active) {
    for (const p of ['A', 'S'] as Person[]) {
      if (!involves(h.owner, p)) continue;
      pairs += 1;
      if (isDoneBy(completions, h.id, date, p)) done += 1;
    }
  }
  const aDone = personDayComplete(habits, completions, date, 'A');
  const bDone = personDayComplete(habits, completions, date, 'S');
  return { date, pct: pairs ? done / pairs : 0, aDone, bDone, full: pairs > 0 && done === pairs, empty: pairs === 0 };
}

/** Total number of (person, habit, day) completions ever, optionally for one person. */
export function countCompletions(completions: Completions, person?: Person): number {
  let n = 0;
  for (const byHabit of Object.values(completions)) {
    for (const who of Object.values(byHabit)) {
      if (person) n += who[person] ? 1 : 0;
      else n += (who.A ? 1 : 0) + (who.S ? 1 : 0);
    }
  }
  return n;
}
