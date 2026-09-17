import { addDays, today } from './dates';
import { involves, type Person } from './people';
import type { Completions, Habit } from '@/store/tasksStore';

export const isHabitActiveOn = (h: Habit, date: string) => h.status === 'active' && h.createdAt <= date;

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

/**
 * Consecutive complete days ending today. Today not being done yet doesn't
 * break the streak (the day isn't over) — in that case count from yesterday.
 */
function streakEndingToday(isComplete: (date: string) => boolean): number {
  const t = today();
  let cursor = isComplete(t) ? t : addDays(t, -1);
  let n = 0;
  while (isComplete(cursor) && n < 3650) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export const personStreak = (habits: Habit[], completions: Completions, person: Person) =>
  streakEndingToday((d) => personDayComplete(habits, completions, d, person));

export const togetherStreak = (habits: Habit[], completions: Completions) =>
  streakEndingToday((d) => togetherDayComplete(habits, completions, d));

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
