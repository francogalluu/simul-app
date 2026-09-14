/**
 * Wizard draft store — holds in-progress new/edit habit state across all wizard steps.
 * NOT persisted: resets when the app is killed.
 */
import { create } from 'zustand';
import type { Habit } from '@/types/habit';
import { capitalizeLabel } from '@/lib/habitUnitLabel';

interface WizardState {
  /** null = creating a new habit; set = editing an existing one */
  habitId: string | null;

  goalType: 'build' | 'break';
  name: string;
  icon: string;
  description: string;
  kind: 'boolean' | 'numeric';
  frequency: 'daily' | 'weekly' | 'monthly';
  target: number;
  unit: string;
  /** Preset unit i18n key; null = custom/free-text unit */
  unitKey: string | null;
  reminderEnabled: boolean;
  reminderTime: string; // "HH:MM" 24-hour
  /** For weekly: weekdays to remind (1=Sun … 7=Sat). Default [1]. */
  reminderWeekdays: number[];
  /** For monthly: day of month 1–31. Default 1. */
  reminderDayOfMonth: number;

  /** True when NewHabit was opened from onboarding (Onboarding5); used to navigate to Home on save */
  fromOnboarding: boolean;

  // ── Setters ────────────────────────────────────────────────────────────────
  reset: () => void;
  setFromOnboarding: (v: boolean) => void;
  loadHabit: (habit: Habit) => void;
  /** Pre-fill wizard from a predetermined habit (no habitId). */
  loadPredetermined: (draft: {
    name: string;
    icon: string;
    goalType: 'build' | 'break';
    kind: 'boolean' | 'numeric';
    frequency: 'daily' | 'weekly' | 'monthly';
    target: number;
    unit?: string;
    unitKey?: string | null;
  }) => void;
  setGoalType: (v: 'build' | 'break') => void;
  setName: (v: string) => void;
  setIcon: (v: string) => void;
  setDescription: (v: string) => void;
  setKind: (v: 'boolean' | 'numeric') => void;
  setFrequency: (v: 'daily' | 'weekly' | 'monthly') => void;
  setTarget: (v: number) => void;
  /** Pass `fromUser: true` when the unit field is edited (clears preset unitKey). */
  setUnit: (v: string, fromUser?: boolean) => void;
  setUnitKey: (v: string | null) => void;
  setReminderEnabled: (v: boolean) => void;
  setReminderTime: (v: string) => void;
  setReminderWeekdays: (v: number[]) => void;
  setReminderDayOfMonth: (v: number) => void;
}

const DEFAULTS: Omit<WizardState, keyof Pick<WizardState,
  'reset' | 'setFromOnboarding' | 'loadHabit' | 'loadPredetermined' | 'setGoalType' | 'setName' | 'setIcon' | 'setDescription' |
  'setKind' | 'setFrequency' | 'setTarget' | 'setUnit' | 'setUnitKey' |
  'setReminderEnabled' | 'setReminderTime' | 'setReminderWeekdays' | 'setReminderDayOfMonth'
>> = {
  habitId:            null,
  goalType:           'build',
  name:               '',
  icon:               '⭐',
  description:        '',
  kind:               'boolean',
  frequency:          'daily',
  target:             1,
  unit:               '',
  unitKey:            null,
  reminderEnabled:    false,
  reminderTime:       '08:00',
  reminderWeekdays:   [1],
  reminderDayOfMonth: 1,
  fromOnboarding:     false,
};

export const useWizardStore = create<WizardState>()((set) => ({
  ...DEFAULTS,

  reset: () => set({ ...DEFAULTS, fromOnboarding: false }),

  setFromOnboarding: (fromOnboarding) => set({ fromOnboarding }),

  loadHabit: (habit) => set({
    habitId:            habit.id,
    goalType:           habit.goalType ?? 'build',
    name:               habit.name,
    icon:               habit.icon,
    description:        habit.description ?? '',
    kind:               habit.kind,
    frequency:          habit.frequency,
    target:             habit.target,
    unit:               habit.unitKey ? '' : (habit.unit ?? ''),
    unitKey:            habit.unitKey ?? null,
    reminderEnabled:    !!habit.reminderTime,
    reminderTime:       habit.reminderTime ?? '08:00',
    reminderWeekdays:   habit.reminderWeekdays?.length ? habit.reminderWeekdays : [1],
    reminderDayOfMonth: habit.reminderDayOfMonth ?? 1,
  }),

  loadPredetermined: (draft) => set({
    habitId:            null,
    goalType:           draft.goalType,
    name:               draft.name,
    icon:               draft.icon,
    description:        '',
    kind:               draft.kind,
    frequency:          draft.frequency,
    target:             draft.target,
    unit:               capitalizeLabel(draft.unit),
    unitKey:            draft.unitKey ?? null,
    reminderEnabled:    false,
    reminderTime:       DEFAULTS.reminderTime,
    reminderWeekdays:   DEFAULTS.reminderWeekdays,
    reminderDayOfMonth: DEFAULTS.reminderDayOfMonth,
  }),

  setGoalType:        (goalType)        => set({ goalType }),
  setName:            (name)            => set({ name }),
  setIcon:            (icon)            => set({ icon }),
  setDescription:     (description)    => set({ description }),
  setKind:            (kind)            => set({ kind }),
  setFrequency:       (frequency)       => set({ frequency }),
  setTarget:          (target)          => set({ target }),
  setUnit:            (unit, fromUser) =>
    set((s) => ({
      unit,
      ...(fromUser ? { unitKey: null } : {}),
    })),
  setUnitKey:         (unitKey)         => set({ unitKey }),
  setReminderEnabled:    (reminderEnabled)    => set({ reminderEnabled }),
  setReminderTime:       (reminderTime)       => set({ reminderTime }),
  setReminderWeekdays:   (reminderWeekdays)   => set({ reminderWeekdays }),
  setReminderDayOfMonth: (reminderDayOfMonth) => set({ reminderDayOfMonth }),
}));
