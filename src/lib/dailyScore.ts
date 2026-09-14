/**
 * Daily Score (Model B) — 100-point scale distributed equally across all active habits.
 *
 * - Good habits (build): +habitWeight when completed, else 0.
 * - Bad habits (break): earn their weight by default; overflow on the scored day
 *   removes that credit (habitWeight - overflowPenalty). Each bad habit’s
 *   contribution is clamped to a minimum of 0 unless allowNegativeBad is set.
 *   Only overflow events caused on the scored date are penalized (no double-penalty
 *   for past days).
 */

import type { Habit, HabitEntry } from '@/types/habit';
import type { WeekStartDay } from './dates';
import { getHabitCurrentValue, isHabitCompleted, entryValue, isHabitActiveOnDate } from './aggregates';

const DEFAULT_PENALTY_FACTOR = 1;

export interface DailyScoreOptions {
  /** Multiplier for overflow penalty (default 1 = full loss per overflow unit). */
  penaltyFactor?: number;
  /** If true, bad-habit contribution can go below 0; otherwise clamped to 0. */
  allowNegativeBad?: boolean;
}

/**
 * Returns the number of overflow "units" attributable to the selected date.
 *
 * - Daily break: overflow = max(0, value_logged_today - daily_limit).
 *   Example: limit 1, logged 5 today → 4 overflow units today.
 *
 * - Weekly break: we only penalize the part of the week's overage that was
 *   logged on the selected date. overflow = min(value_logged_on_date, period_total - limit).
 *   Example: limit 3, had 2 before today, logged 2 today → period 4, overflow 1;
 *   overflowFromToday = min(2, 1) = 1 (only 1 unit of today's log pushed us over).
 *
 * This ensures we do NOT repeatedly penalize past days: only today's contribution
 * to any overage is counted. Multiple overflow events in one day (e.g. 5 logs, limit 1)
 * are fully counted as 4 overflow units for that day.
 */
function getOverflowCountToday(
  habit: Habit,
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
): number {
  const periodValue = getHabitCurrentValue(habit, entries, date, weekStartsOn);
  if (periodValue <= habit.target) return 0;

  const valueOnDate = entryValue(entries, habit.id, date);
  if (valueOnDate <= 0) return 0;

  const overage = periodValue - habit.target;

  if (habit.frequency === 'daily') {
    // All overage for a daily habit is from "today" (the day we're scoring).
    return Math.min(valueOnDate, overage);
  }

  if (habit.frequency === 'weekly' || habit.frequency === 'monthly') {
    // Only the portion of overage that we can attribute to this date.
    // We can't attribute more than what was logged on this date.
    return Math.min(valueOnDate, overage);
  }

  return 0;
}

/**
 * Computes the daily score for the given date (0–100).
 *
 * @param habits - All habits (will use only active on date: isHabitActiveOnDate, createdAt <= date)
 * @param entries - All log entries
 * @param date - The day to score (YYYY-MM-DD)
 * @param options - Optional: penaltyFactor (default 1), allowNegativeBad (default false)
 * @returns Score from 0 to 100
 */
export function calculateDailyScore(
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
  options: DailyScoreOptions = {},
): number {
  const penaltyFactor = options.penaltyFactor ?? DEFAULT_PENALTY_FACTOR;
  const allowNegativeBad = options.allowNegativeBad ?? false;

  const active = habits.filter(
    h => isHabitActiveOnDate(h, date) && h.createdAt <= date,
  );
  const totalActive = active.length;
  if (totalActive === 0) return 0;

  const habitWeight = 100 / totalActive;

  let goodPoints = 0;
  let badPoints = 0;

  for (const habit of active) {
    const isBuild = habit.goalType !== 'break';

    if (isBuild) {
      if (isHabitCompleted(habit, entries, date, weekStartsOn)) {
        goodPoints += habitWeight;
      }
      continue;
    }

    // Bad habit: always grant base weight; overflow removes credit (no double punishment).
    const overflowToday = getOverflowCountToday(habit, entries, date, weekStartsOn);
    const overflowPenalty = habitWeight * penaltyFactor * overflowToday;
    let badContribution = habitWeight - overflowPenalty;
    if (!allowNegativeBad) {
      badContribution = Math.max(0, badContribution);
    }
    badPoints += badContribution;
  }

  const raw = goodPoints + badPoints;
  return Math.max(0, Math.min(100, Math.round(raw * 100) / 100));
}
