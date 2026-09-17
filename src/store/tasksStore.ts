import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';
import { addDays, today } from '@/lib/dates';
import type { Owner, Person } from '@/lib/people';

// Habits + completions for the household, persisted locally. There is still no
// backend or real second account (see BACKLOG.md): "Mora's side" is simulated
// by switching `settingsStore.perspective`, and invites are just habits with
// status 'pending' plus who requested them.

export type HabitStatus = 'active' | 'pending';

export interface Habit {
  id: string;
  name: string;
  time: string;
  owner: Owner;
  icon: string;
  status: HabitStatus;
  /** YYYY-MM-DD the habit was created; it is not "active" on days before this. */
  createdAt: string;
  /** For shared habits: who sent the invite. The other person sees it in their mailbox. */
  requestedBy?: Person;
}

/** completions[date][habitId] = which people completed it that day. */
export type Completions = Record<string, Record<string, Partial<Record<Person, boolean>>>>;

export interface HabitDraft {
  name: string;
  time: string;
  owner: Owner;
  icon: string;
  status?: HabitStatus;
  requestedBy?: Person;
}

interface TasksState {
  habits: Habit[];
  completions: Completions;

  addHabit: (draft: HabitDraft) => string;
  updateHabit: (id: string, patch: Partial<Pick<Habit, 'name' | 'time' | 'icon'>>) => void;
  removeHabit: (id: string) => void;
  acceptInvite: (id: string) => void;
  declineInvite: (id: string) => void;

  /** Flip one person's completion of a habit on a date. Returns the new completion state for that habit/date. */
  toggleCompletion: (habitId: string, date: string, person: Person) => Partial<Record<Person, boolean>>;

  resetToSample: () => void;
  clearAll: () => void;
}

const newId = () => `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Sample data ──────────────────────────────────────────────────────────────

function buildSample(): { habits: Habit[]; completions: Completions } {
  const t = today();
  const start = addDays(t, -14);
  const habits: Habit[] = [
    { id: 'h_stretch', name: 'Morning stretch', time: 'Morning', owner: 'A', icon: '🧘', status: 'active', createdAt: start },
    { id: 'h_water', name: 'Drink 2L water', time: 'All day', owner: 'both', icon: '💧', status: 'active', createdAt: start },
    { id: 'h_sugar', name: 'No sugar today', time: 'All day', owner: 'S', icon: '🚫', status: 'active', createdAt: start },
    { id: 'h_walk', name: 'Evening walk together', time: 'Evening', owner: 'both', icon: '🚶', status: 'active', createdAt: start },
    { id: 'h_read', name: 'Read 10 pages', time: 'Evening', owner: 'S', icon: '📖', status: 'active', createdAt: start },
    // An incoming request from Mora, so the mailbox has something to act on.
    { id: 'h_cook', name: 'Cook dinner together', time: 'Evening', owner: 'both', icon: '🍳', status: 'pending', createdAt: t, requestedBy: 'S' },
  ];

  // Seed a believable history: both people fully done for the last 5 days,
  // Franco alone for 2 more before that, then a gap. Today is partially done.
  const completions: Completions = {};
  const mark = (date: string, habitId: string, person: Person) => {
    completions[date] ??= {};
    completions[date][habitId] ??= {};
    completions[date][habitId][person] = true;
  };
  for (let i = 1; i <= 5; i++) {
    const d = addDays(t, -i);
    mark(d, 'h_stretch', 'A');
    mark(d, 'h_water', 'A'); mark(d, 'h_water', 'S');
    mark(d, 'h_sugar', 'S');
    mark(d, 'h_walk', 'A'); mark(d, 'h_walk', 'S');
    mark(d, 'h_read', 'S');
  }
  for (let i = 6; i <= 7; i++) {
    const d = addDays(t, -i);
    mark(d, 'h_stretch', 'A');
    mark(d, 'h_water', 'A');
    mark(d, 'h_walk', 'A');
  }
  mark(t, 'h_stretch', 'A');
  mark(t, 'h_sugar', 'S');
  mark(t, 'h_water', 'S'); // Mora already did this one — Franco's turn.

  return { habits, completions };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      ...buildSample(),

      addHabit: (draft) => {
        const id = newId();
        set((s) => ({
          habits: [
            ...s.habits,
            {
              id,
              name: draft.name,
              time: draft.time || 'All day',
              owner: draft.owner,
              icon: draft.icon,
              status: draft.status ?? 'active',
              createdAt: today(),
              requestedBy: draft.requestedBy,
            },
          ],
        }));
        return id;
      },

      updateHabit: (id, patch) =>
        set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),

      removeHabit: (id) =>
        set((s) => {
          const completions: Completions = {};
          for (const [date, byHabit] of Object.entries(s.completions)) {
            const { [id]: _dropped, ...rest } = byHabit;
            if (Object.keys(rest).length) completions[date] = rest;
          }
          return { habits: s.habits.filter((h) => h.id !== id), completions };
        }),

      acceptInvite: (id) =>
        set((s) => ({
          habits: s.habits.map((h) =>
            h.id === id ? { ...h, status: 'active', createdAt: today(), requestedBy: undefined } : h,
          ),
        })),

      declineInvite: (id) => get().removeHabit(id),

      toggleCompletion: (habitId, date, person) => {
        const current = get().completions[date]?.[habitId] ?? {};
        const next = { ...current, [person]: !current[person] };
        set((s) => ({
          completions: {
            ...s.completions,
            [date]: { ...(s.completions[date] ?? {}), [habitId]: next },
          },
        }));
        return next;
      },

      resetToSample: () => set(buildSample()),
      clearAll: () => set({ habits: [], completions: {} }),
    }),
    {
      name: 'simul-tasks',
      version: 2,
      storage: createJSONStorage(() => appStorage),
      partialize: (s) => ({ habits: s.habits, completions: s.completions }),
      // v1 (pre-persistence) never hit storage; anything older than v2 is just replaced.
      migrate: (persisted, version) => (version < 2 ? buildSample() : (persisted as TasksState)),
    },
  ),
);
