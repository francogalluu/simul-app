/**
 * Day summary — single place for derived values for a given date.
 * All values are computed from habits + entries (entries are source of truth).
 * Use this so calendar, score, and analytics stay consistent.
 */

import type { Habit, HabitEntry } from '@/types/habit';
import type { WeekStartDay } from './dates';
import { calculateDailyScore } from './dailyScore';
import { dailyOnlyCompletion, dailyCompletion } from './aggregates';

export interface DaySummary {
  /** Model B daily score 0–100 */
  dailyScore: number;
  /** Daily-habits-only completion % (0–100), used for home ring and week strip */
  dailyOnlyCompletionPct: number;
  /** All-habits completion % (0–100), used for calendar and analytics */
  completionPct: number;
}

/**
 * Compute the full day summary for a date from habits and entries.
 * Pure function; memoize in components keyed by (habits, entries, date, weekStartsOn).
 */
export function getDaySummary(
  habits: Habit[],
  entries: HabitEntry[],
  date: string,
  weekStartsOn: WeekStartDay,
): DaySummary {
  return {
    dailyScore: calculateDailyScore(habits, entries, date, weekStartsOn),
    dailyOnlyCompletionPct: dailyOnlyCompletion(habits, entries, date, weekStartsOn),
    completionPct: dailyCompletion(habits, entries, date, weekStartsOn),
  };
}
