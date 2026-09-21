import { addDays, getWeekDates, today } from './dates';
import type { Person } from './people';
import {
  countCompletions,
  longestStreak,
  personDayState,
  personStreak,
  togetherDayState,
  togetherStreak,
} from './streaks';
import type { Completions, Habit } from '@/store/tasksStore';
import type { Goal } from '@/store/goalsStore';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Hidden until unlocked — shown as a black mystery card. */
  secret?: boolean;
  unlocked: boolean;
  /** Optional progress toward unlocking, for the detail view. */
  progress?: { current: number; target: number };
}

export function computeAchievements(
  habits: Habit[],
  completions: Completions,
  goals: Goal[],
  me: Person,
): Achievement[] {
  const dates = Object.keys(completions);
  const myStreak = personStreak(habits, completions, me);
  const ourStreak = togetherStreak(habits, completions);
  const myLongest = longestStreak(dates, (d) => personDayState(habits, completions, d, me));
  const ourLongest = longestStreak(dates, (d) => togetherDayState(habits, completions, d));
  const myCompletions = countCompletions(completions, me);
  const sharedDone = dates.some((d) =>
    habits.some((h) => h.owner === 'both' && completions[d]?.[h.id]?.A && completions[d]?.[h.id]?.S),
  );
  const activeHabits = habits.filter((h) => h.status === 'active').length;
  const sentInvite = habits.some((h) => h.requestedBy === me);
  const goalsDone = goals.filter((g) => g.completedAt).length;

  // "Perfect week": a calendar week (Mon–Sun) where every day was complete together.
  const perfectWeek = (() => {
    for (let i = 0; i < 12; i++) {
      const anchor = addDays(today(), -7 * i);
      const week = getWeekDates(anchor, 1);
      const states = week.map((d) => (d <= today() ? togetherDayState(habits, completions, d) : 'open'));
      if (states.every((st) => st !== 'open') && states.includes('done')) return true;
    }
    return false;
  })();

  // "Comeback": completed something after a gap of 3+ days with nothing at all.
  const comeback = (() => {
    const sorted = [...dates].sort();
    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(sorted[i] + 'T00:00:00').getTime() - new Date(sorted[i - 1] + 'T00:00:00').getTime()) / 86400000;
      if (gap >= 4) return true;
    }
    return false;
  })();

  const streakBadge = (n: number) => Math.max(myStreak, myLongest) >= n;
  const togetherBadge = (n: number) => Math.max(ourStreak, ourLongest) >= n;
  const prog = (current: number, target: number) => ({ current: Math.min(current, target), target });

  return [
    { id: 'first-step', title: 'First step', description: 'Complete your first habit.', icon: '🌱', unlocked: myCompletions >= 1, progress: prog(myCompletions, 1) },
    { id: 'together-first', title: 'Better together', description: 'Finish a shared habit with your partner.', icon: '🤝', unlocked: sharedDone },
    { id: 'inviter', title: 'Team player', description: 'Invite your partner to a shared habit.', icon: '💌', unlocked: sentInvite },
    { id: 'streak-3', title: 'On a roll', description: 'Keep a 3-day streak.', icon: '🔥', unlocked: streakBadge(3), progress: prog(Math.max(myStreak, myLongest), 3) },
    { id: 'streak-7', title: 'One week strong', description: 'Keep a 7-day streak.', icon: '⚡', unlocked: streakBadge(7), progress: prog(Math.max(myStreak, myLongest), 7) },
    { id: 'together-7', title: 'In sync', description: 'A 7-day streak, together.', icon: '💞', unlocked: togetherBadge(7), progress: prog(Math.max(ourStreak, ourLongest), 7) },
    { id: 'habits-5', title: 'Full plate', description: 'Have 5 active habits at once.', icon: '📚', unlocked: activeHabits >= 5, progress: prog(activeHabits, 5) },
    { id: 'completions-50', title: 'Half century', description: 'Complete 50 habits in total.', icon: '🎖️', unlocked: myCompletions >= 50, progress: prog(myCompletions, 50) },
    { id: 'goal-first', title: 'Goal getter', description: 'Reach a long-term goal.', icon: '🎯', unlocked: goalsDone >= 1, progress: prog(goalsDone, 1) },
    { id: 'streak-30', title: 'Habit master', description: 'Keep a 30-day streak.', icon: '🏆', unlocked: streakBadge(30), progress: prog(Math.max(myStreak, myLongest), 30) },
    { id: 'together-30', title: 'Inseparable', description: 'A 30-day streak, together.', icon: '💍', unlocked: togetherBadge(30), progress: prog(Math.max(ourStreak, ourLongest), 30) },
    { id: 'perfect-week', title: 'Perfect week', description: 'Every single day of a week, done together.', icon: '🌈', secret: true, unlocked: perfectWeek },
    { id: 'comeback', title: 'The comeback', description: 'Came back after a few days away. Welcome back.', icon: '🦋', secret: true, unlocked: comeback },
    { id: 'together-14', title: 'Two weeks deep', description: 'A 14-day streak, together.', icon: '✨', secret: true, unlocked: togetherBadge(14) },
  ];
}
