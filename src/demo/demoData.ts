// Store-screenshot demo mode (branch `store-screenshots`). With EXPO_PUBLIC_DEMO=1 the app skips Supabase
// entirely and shows two made-up people with made-up habits, so nothing real can appear in a screenshot
// and nothing real can be changed.
import { addDays, today, getDayOfWeekIndex } from '@/lib/dates';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore, type Member } from '@/store/householdStore';
import { useTasksStore, type Completions, type Habit, type Proofs } from '@/store/tasksStore';
import { useSettingsStore } from '@/store/settingsStore';
import { EVERY_DAY } from '@/lib/weekdays';

export const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
/** EXPO_PUBLIC_DEMO_LANG=es shows the Spanish demo (UI and habit names). */
const LANG = process.env.EXPO_PUBLIC_DEMO_LANG === 'es' ? 'es' : 'en';
const NAMES = LANG === 'es'
  ? { dinner: 'Cocinar juntos', run: 'Correr por la mañana', read: 'Leer 20 páginas', yoga: 'Yoga' }
  : { dinner: 'Cook dinner together', run: 'Morning run', read: 'Read 20 pages', yoga: 'Yoga' };

const HISTORY_DAYS = 60;
/** Days (counted back from today) that Thomas skipped reading, so the stats chart isn't a flat line. */
const READ_MISSES = new Set([12, 19, 20, 27, 33, 40, 41, 49]);

export function seedDemo() {
  const t = today();
  const start = addDays(t, -HISTORY_DAYS);

  const members: Member[] = [
    { id: 'm1', userId: 'demo-thomas', displayName: 'Thomas', color: '#6F9BC7', avatarPath: null, joinedAt: '2026-01-01T00:00:00Z' },
    { id: 'm2', userId: 'demo-emily', displayName: 'Emily', color: '#D9739E', avatarPath: null, joinedAt: '2026-01-02T00:00:00Z' },
  ];

  const base = { status: 'active' as const, createdAt: start, days: EVERY_DAY, weeklyTarget: null, pauses: [], requireProof: false };
  const habits: Habit[] = [
    { ...base, id: 'h-dinner', name: NAMES.dinner, icon: '🍳', time: 'Evening', owner: 'both', requireProof: true },
    { ...base, id: 'h-run', name: NAMES.run, icon: '🏃', time: 'Morning', owner: 'A', weeklyTarget: 3 },
    { ...base, id: 'h-read', name: NAMES.read, icon: '📖', time: 'Evening', owner: 'A' },
    { ...base, id: 'h-yoga', name: NAMES.yoga, icon: '🧘', time: 'Morning', owner: 'S' },
  ];

  const completions: Completions = {};
  const mark = (date: string, id: string, who: 'A' | 'S') => {
    ((completions[date] ??= {})[id] ??= {})[who] = true;
  };
  for (let d = start; d < t; d = addDays(d, 1)) {
    mark(d, 'h-dinner', 'A');
    mark(d, 'h-dinner', 'S');
    if (!READ_MISSES.has(Math.round((Date.parse(t) - Date.parse(d)) / 86_400_000))) mark(d, 'h-read', 'A');
    mark(d, 'h-yoga', 'S');
    const dow = getDayOfWeekIndex(d);
    if (dow === 1 || dow === 3 || dow === 5) mark(d, 'h-run', 'A'); // Mon / Wed / Fri
  }
  // Today: Thomas has run, Emily did yoga and sent a photo of dinner that is waiting for his review.
  mark(t, 'h-run', 'A');
  mark(t, 'h-yoga', 'S');
  const proofs: Proofs = { [t]: { 'h-dinner': { S: { id: 'p1', path: 'demo/dinner.jpg', status: 'pending' } } } };

  useSettingsStore.setState({ language: LANG, notificationsPrompted: true, weekStartsOn: 1 });
  useAuthStore.setState({
    status: 'signedIn',
    // Only the id is ever read; this never reaches a network call.
    session: { user: { id: 'demo-thomas' } } as never,
  });
  useHouseholdStore.setState({
    status: 'ready',
    userId: 'demo-thomas',
    household: { id: 'demo-household', inviteCode: null, kind: 'couple' },
    members,
  });
  useTasksStore.setState({ status: 'ready', habits, completions, proofs });
}
