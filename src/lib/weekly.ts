import { addDays, getWeekDates, today, type WeekStartDay } from './dates';
import { isDoneBy } from './streaks';
import type { Person } from './people';
import type { Completions, Habit } from '@/store/tasksStore';

// "N times per week, any day" habits. Each person has their own quota, and every check-in
// (one per day at most) counts toward the week that contains its date.

export const MAX_WEEKLY_TARGET = 7;

/** Anything that isn't a 1..7 integer means "not a weekly habit". */
export const normalizeWeeklyTarget = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_WEEKLY_TARGET ? value : null;

/** Check-ins by `person` in the week containing `date`. */
export function weekCount(habit: Habit, completions: Completions, date: string, person: Person, weekStartsOn: WeekStartDay): number {
  return getWeekDates(date, weekStartsOn).filter((d) => isDoneBy(completions, habit.id, d, person)).length;
}

export const weekMet = (habit: Habit, completions: Completions, date: string, person: Person, weekStartsOn: WeekStartDay) =>
  habit.weeklyTarget != null && weekCount(habit, completions, date, person, weekStartsOn) >= habit.weeklyTarget;

export interface WeeklyRun {
  /** Weeks in a row (ending this week, or last week if this one isn't met yet) that reached the target. */
  current: number;
  best: number;
  /** Weeks that reached the target, and weeks that could have (this one only counts once it's met). */
  metWeeks: number;
  countedWeeks: number;
}

/** Walks the habit's weeks from its first one up to this one; everyone it belongs to must reach the target. */
export function weeklyRun(habit: Habit, completions: Completions, weekStartsOn: WeekStartDay): WeeklyRun {
  const target = habit.weeklyTarget ?? 0;
  const people: Person[] = habit.owner === 'both' ? ['A', 'S'] : [habit.owner];
  const thisWeek = getWeekDates(today(), weekStartsOn)[0];
  let start = getWeekDates(habit.createdAt, weekStartsOn)[0];
  const oldest = addDays(thisWeek, -7 * 52);
  if (start < oldest) start = oldest;

  let run = 0;
  let best = 0;
  let metWeeks = 0;
  let countedWeeks = 0;
  let current = 0;
  for (let w = start; w <= thisWeek; w = addDays(w, 7)) {
    const met = people.every((p) => weekCount(habit, completions, w, p, weekStartsOn) >= target);
    const isCurrent = w === thisWeek;
    if (met) {
      run += 1;
      metWeeks += 1;
      countedWeeks += 1;
    } else if (!isCurrent) {
      run = 0;
      countedWeeks += 1;
    }
    best = Math.max(best, run);
    if (isCurrent) current = run; // an unmet current week neither adds to nor breaks the run
  }
  return { current, best, metWeeks, countedWeeks };
}
