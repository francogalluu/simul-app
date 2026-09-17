import { addDays, today } from './dates';
import { habitCompletionCount } from './streaks';
import type { Completions, Habit } from '@/store/tasksStore';

/**
 * Round-number moments that are more personal than a standard badge: days
 * since the couple's own start date (set in Settings), and habits crossing a
 * big day-count. Computed, never stored — so they're always right.
 */

export interface Milestone {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  /** YYYY-MM-DD it happens / happened. */
  date: string;
  kind: 'anniversary' | 'habit';
}

const DAY_MARKS = [100, 200, 300, 365, 500, 730, 1000, 1095, 1460, 1825, 2000, 2555, 3000, 3650];
const HABIT_MARKS = [30, 50, 100, 200, 365, 500, 1000];

const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000);

function describeDays(n: number): string {
  if (n % 365 === 0) {
    const years = n / 365;
    return years === 1 ? 'One year' : `${years} years`;
  }
  return `${n.toLocaleString()} days`;
}

export function computeMilestones(anniversary: string | null, habits: Habit[], completions: Completions): {
  today: Milestone[];
  upcoming: Milestone[];
  past: Milestone[];
} {
  const t = today();
  const all: Milestone[] = [];

  if (anniversary && anniversary <= t) {
    for (const n of DAY_MARKS) {
      const date = addDays(anniversary, n);
      all.push({
        id: `anniv-${n}`,
        icon: n % 365 === 0 ? '💍' : '💞',
        title: `${describeDays(n)} together`,
        subtitle: n % 365 === 0 ? 'Happy anniversary.' : 'Since the day you two started.',
        date,
        kind: 'anniversary',
      });
    }
  }

  for (const h of habits) {
    if (h.status !== 'active') continue;
    const done = habitCompletionCount(h, completions);
    for (const n of HABIT_MARKS) {
      if (done < n) {
        // Best-effort projection assuming a completion a day from here.
        const date = addDays(t, n - done);
        if (n - done <= 14) {
          all.push({ id: `habit-${h.id}-${n}`, icon: h.icon, title: `${n} days of ${h.name}`, subtitle: `${n - done} to go`, date, kind: 'habit' });
        }
        break;
      }
      // The day the count hit n is the n-th completed date in order.
      const dates = Object.keys(completions).sort().filter((d) => completions[d]?.[h.id] && (h.owner === 'both' ? completions[d][h.id].A && completions[d][h.id].S : completions[d][h.id][h.owner as 'A' | 'S']));
      const date = dates[n - 1] ?? t;
      all.push({ id: `habit-${h.id}-${n}`, icon: h.icon, title: `${n} days of ${h.name}`, subtitle: h.owner === 'both' ? 'Both of you, every time.' : 'Showed up, again and again.', date, kind: 'habit' });
    }
  }

  const todayList = all.filter((m) => m.date === t);
  const upcoming = all
    .filter((m) => m.date > t && daysBetween(t, m.date) <= 30)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const past = all.filter((m) => m.date < t).sort((a, b) => b.date.localeCompare(a.date));
  return { today: todayList, upcoming, past };
}

export const daysTogether = (anniversary: string | null): number | null =>
  anniversary && anniversary <= today() ? daysBetween(anniversary, today()) : null;
