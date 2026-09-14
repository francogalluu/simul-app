/**
 * Single source of truth for habit + entry data used by HomeScreen and AnalyticsScreen.
 * Reads from the persisted store (AsyncStorage). Bumps a key when the screen gains focus
 * so charts/rings recalculate with latest data (avoids stale state when returning from another tab).
 */

import { useMemo, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useHabitStore } from '@/store';
import type { Habit, HabitEntry } from '@/types/habit';

export interface UseHabitLogsResult {
  habits: Habit[];
  entries: HabitEntry[];
  /** Bump when screen gains focus; include in derived useMemo deps so data recalculates. */
  focusKey: number;
}

export function useHabitLogs(): UseHabitLogsResult {
  const rawHabits = useHabitStore(s => s.habits);
  const entries = useHabitStore(s => s.entries);

  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusKey(k => k + 1);
    }, []),
  );

  const habits = useMemo(() => {
    const seen = new Set<string>();
    return rawHabits.filter(h => {
      if (h.archivedAt !== null || seen.has(h.id)) return false;
      seen.add(h.id);
      return true;
    });
  }, [rawHabits, focusKey]);

  return { habits, entries, focusKey };
}
