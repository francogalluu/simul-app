import { addDays, today } from './dates';
import { isDoneBy } from './streaks';
import { isScheduledOn } from './weekdays';
import type { Completions, Habit } from '@/store/tasksStore';

/** Longest history we walk back through, in days. */
const MAX_HISTORY = 365;

/** A habit counts as done on a day when everyone it belongs to did it (both people for shared habits). */
export function habitDoneOn(habit: Habit, completions: Completions, date: string): boolean {
  if (habit.owner === 'both') {
    return isDoneBy(completions, habit.id, date, 'A') && isDoneBy(completions, habit.id, date, 'S');
  }
  return isDoneBy(completions, habit.id, date, habit.owner);
}

export interface HabitDay {
  date: string;
  /** Before the habit was created, so it can be neither done nor missed. */
  beforeStart: boolean;
  /** The habit doesn't repeat on this weekday, so it can be neither done nor missed. */
  rest: boolean;
  done: boolean;
  /** Consecutive done days up to and including this day. */
  streak: number;
}

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  totalDone: number;
  /** Done days in the window over days the habit was due in it (0..1), or null with no days yet. */
  rate: number | null;
  /** The last `days` days, oldest first. */
  days: HabitDay[];
  /** Completion rate over the trailing 7 days for each of `days` (0..1): a smooth line to plot. */
  trend: number[];
}

export function computeHabitStats(habit: Habit, completions: Completions, days = 30): HabitStats {
  const t = today();
  const windowStart = addDays(t, -(days - 1));
  // Walk from the habit's first day (or a year back) so the running streak is right at the window start.
  let start = habit.createdAt > addDays(t, -MAX_HISTORY) ? habit.createdAt : addDays(t, -MAX_HISTORY);
  if (start > windowStart) start = windowStart;

  const all: HabitDay[] = [];
  let run = 0;
  let best = 0;
  let total = 0;
  for (let d = start, i = 0; d <= t && i <= MAX_HISTORY + days; d = addDays(d, 1), i += 1) {
    const beforeStart = d < habit.createdAt;
    const rest = !beforeStart && !isScheduledOn(habit.days, d);
    const done = !beforeStart && !rest && habitDoneOn(habit, completions, d);
    // A day the habit isn't due keeps the run going instead of ending it.
    run = done ? run + 1 : rest ? run : 0;
    if (done) total += 1;
    best = Math.max(best, run);
    all.push({ date: d, beforeStart, rest, done, streak: run });
  }

  const window = all.filter((d) => d.date >= windowStart);
  // Today not being done yet doesn't break the streak (the day isn't over).
  const last = all[all.length - 1];
  const previous = all[all.length - 2];
  const currentStreak = last?.done || last?.rest ? (last?.streak ?? 0) : (previous?.streak ?? 0);

  const existed = window.filter((d) => !d.beforeStart && !d.rest);
  const rate = existed.length ? existed.filter((d) => d.done).length / existed.length : null;

  // Trailing 7-day completion rate for each day in the window (only counting days the habit was due).
  const offset = all.length - window.length;
  const trend = window.map((_, i) => {
    const slice = all.slice(Math.max(0, offset + i - 6), offset + i + 1).filter((d) => !d.beforeStart && !d.rest);
    return slice.length ? slice.filter((d) => d.done).length / slice.length : 0;
  });

  return { currentStreak, bestStreak: best, totalDone: total, rate, days: window, trend };
}
