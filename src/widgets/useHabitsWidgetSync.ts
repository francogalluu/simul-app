import { useEffect } from 'react';
import { isDoneBy, isHabitActiveOn } from '@/lib/streaks';
import { today } from '@/lib/dates';
import type { Person } from '@/lib/people';
import type { Completions, Habit } from '@/store/tasksStore';
import HabitsWidget from './HabitsWidget';

// Pushes today's numbers to the home-screen widget whenever they change.
export function useHabitsWidgetSync(me: Person, habits: Habit[], completions: Completions) {
  useEffect(() => {
    const date = today();
    const mine = habits.filter(
      (h) => h.status === 'active' && (h.owner === me || h.owner === 'both') && isHabitActiveOn(h, date),
    );
    const pending = mine.filter((h) => !isDoneBy(completions, h.id, date, me));
    try {
      HabitsWidget.updateSnapshot({
        done: mine.length - pending.length,
        total: mine.length,
        pending: pending.map((h) => `${h.icon} ${h.name}`),
      });
    } catch {
      // The widget extension isn't available (Android, web, or a build without it).
    }
  }, [me, habits, completions]);
}
