import { addDays, today } from './dates';
import { involves, type Person } from './people';
import type { Completions, Habit } from '@/store/tasksStore';

import { isPausedOn, isScheduledOn } from './weekdays';

/** A habit is due on a day once it has started, is accepted, repeats on that weekday and isn't paused. */
export const isHabitActiveOn = (h: Habit, date: string) =>
  h.status === 'active' && h.createdAt <= date && isScheduledOn(h.days, date) && !isPausedOn(h.pauses, date);

/** 'rest' = nothing was due that day, so it neither counts toward a streak nor breaks it. */
export type DayState = 'rest' | 'done' | 'open';

export const isDoneBy = (completions: Completions, habitId: string, date: string, person: Person) =>
  Boolean(completions[date]?.[habitId]?.[person]);

export function personDayState(habits: Habit[], completions: Completions, date: string, person: Person): DayState {
  const mine = habits.filter((h) => isHabitActiveOn(h, date) && involves(h.owner, person));
  if (mine.length === 0) return 'rest';
  return mine.every((h) => isDoneBy(completions, h.id, date, person)) ? 'done' : 'open';
}

export function togetherDayState(habits: Habit[], completions: Completions, date: string): DayState {
  const shared = habits.filter((h) => isHabitActiveOn(h, date) && h.owner === 'both');
  if (shared.length === 0) return 'rest';
  return shared.every((h) => isDoneBy(completions, h.id, date, 'A') && isDoneBy(completions, h.id, date, 'S'))
    ? 'done'
    : 'open';
}

/** Every habit this person is part of on `date` is completed by them (and there's at least one). */
export const personDayComplete = (habits: Habit[], completions: Completions, date: string, person: Person) =>
  personDayState(habits, completions, date, person) === 'done';

/** Every shared habit on `date` is completed by both people (and there's at least one). */
export const togetherDayComplete = (habits: Habit[], completions: Completions, date: string) =>
  togetherDayState(habits, completions, date) === 'done';

/** Earliest day any habit could have been due; nothing before it can count. */
const firstHabitDay = (habits: Habit[]) =>
  habits.reduce<string | null>((min, h) => (min == null || h.createdAt < min ? h.createdAt : min), null);

/**
 * Consecutive due days completed, ending today. Rest days are skipped, and today not
 * being done yet doesn't break the streak (the day isn't over).
 */
function streakEndingToday(state: (date: string) => DayState, since: string | null): number {
  if (since == null) return 0;
  const t = today();
  let n = 0;
  let d = t;
  for (let i = 0; i < 3650 && d >= since; i += 1, d = addDays(d, -1)) {
    const s = state(d);
    if (s === 'rest') continue;
    if (s === 'done') n += 1;
    else if (d !== t) break;
  }
  return n;
}

export const personStreak = (habits: Habit[], completions: Completions, person: Person) =>
  streakEndingToday((d) => personDayState(habits, completions, d, person), firstHabitDay(habits));

export const togetherStreak = (habits: Habit[], completions: Completions) =>
  streakEndingToday((d) => togetherDayState(habits, completions, d), firstHabitDay(habits));

/** Longest run of due days completed anywhere in history (for achievements); rest days don't break it. */
export function longestStreak(dates: string[], state: (date: string) => DayState): number {
  if (dates.length === 0) return 0;
  const t = today();
  const oldest = addDays(t, -3650);
  const first = [...dates].sort()[0];
  let best = 0;
  let run = 0;
  for (let d = first > oldest ? first : oldest; d <= t; d = addDays(d, 1)) {
    const s = state(d);
    if (s === 'done') {
      run += 1;
      if (run > best) best = run;
    } else if (s === 'open') {
      run = 0;
    }
  }
  return best;
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
  return { date, pct: pairs ? done / pairs : 0, aDone, bDone, full: pairs > 0 && done === pairs };
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

/** Streak lengths worth celebrating, in days. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];

/** Progress (0..1) from the previous milestone to the next one, and that next milestone. */
export function streakProgress(streak: number): { next: number; progress: number } {
  const next = STREAK_MILESTONES.find((m) => streak < m) ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  const prev = [...STREAK_MILESTONES].reverse().find((m) => m <= streak) ?? 0;
  return { next, progress: streak >= next ? 1 : (streak - prev) / (next - prev) };
}
