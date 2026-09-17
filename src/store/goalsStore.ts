import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';
import { today } from '@/lib/dates';

// Long-term objectives, separate from daily habits. Local-only for now.

export interface Goal {
  id: string;
  title: string;
  icon: string;
  target: number;
  current: number;
  unit: string;
  shared: boolean;
  /** Optional YYYY-MM-DD. */
  deadline?: string;
  createdAt: string;
  completedAt?: string;
}

export interface GoalDraft {
  title: string;
  icon: string;
  target: number;
  unit: string;
  shared: boolean;
  deadline?: string;
}

interface GoalsState {
  goals: Goal[];
  addGoal: (draft: GoalDraft) => string;
  updateGoal: (id: string, patch: Partial<GoalDraft>) => void;
  removeGoal: (id: string) => void;
  /** Add (or subtract) progress, clamped to [0, target]. Returns true if this call completed the goal. */
  addProgress: (id: string, delta: number) => boolean;
  clearAll: () => void;
}

const newId = () => `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      goals: [],

      addGoal: (draft) => {
        const id = newId();
        set((s) => ({
          goals: [...s.goals, { id, current: 0, createdAt: today(), ...draft }],
        }));
        return id;
      },

      updateGoal: (id, patch) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      addProgress: (id, delta) => {
        const goal = get().goals.find((g) => g.id === id);
        if (!goal) return false;
        const next = Math.max(0, Math.min(goal.target, goal.current + delta));
        const justCompleted = next >= goal.target && goal.current < goal.target;
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id
              ? { ...g, current: next, completedAt: next >= g.target ? (g.completedAt ?? today()) : undefined }
              : g,
          ),
        }));
        return justCompleted;
      },

      clearAll: () => set({ goals: [] }),
    }),
    {
      name: 'simul-goals',
      version: 1,
      storage: createJSONStorage(() => appStorage),
      partialize: (s) => ({ goals: s.goals }),
    },
  ),
);
