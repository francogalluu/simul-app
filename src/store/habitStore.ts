import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';
import { getTodayNormalized, normalizeDate, getWeekRange, getMonthRange, datesInRange, addDays } from '@/lib/dates';
import type { Habit, HabitEntry } from '@/types/habit';
import { useSettingsStore } from './settingsStore';

// ─── Schema versioning ────────────────────────────────────────────────────────

// v2 adds Habit.pausedAt (nullable) for pause vs delete semantics.
const CURRENT_SCHEMA_VERSION = 2;

type SchemaVersion = 1 | 2;

// ─── State + actions interface ────────────────────────────────────────────────

interface HabitState {
  /** Bump when the persisted shape changes to trigger a migration */
  _schemaVersion: SchemaVersion;

  /**
   * The date currently viewed on the Home screen (YYYY-MM-DD).
   * Not persisted: always initializes to today on cold start so the app opens
   * on the current day. User can change it during the session via WeekCalendar.
   */
  selectedDate: string;
  setSelectedDate: (date: string) => void;

  habits: Habit[];
  entries: HabitEntry[];

  // ── Habit CRUD ──────────────────────────────────────────────────────────────

  addHabit: (
    draft: Omit<Habit, 'id' | 'createdAt' | 'pausedAt' | 'archivedAt' | 'sortOrder'>,
  ) => string;                              // returns the new habit id

  updateHabit: (id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>) => void;

  /** Temporarily hide a habit from Home from today forward (can be resumed). */
  pauseHabit: (id: string) => void;

  /** Clear paused state so the habit shows again on Home. */
  unpauseHabit: (id: string) => void;

  /**
   * Soft-delete: sets archivedAt to today's date string.
   * Archived habits are excluded from Home and entry flows but
   * kept for analytics history.
   */
  archiveHabit: (id: string) => void;

  unarchiveHabit: (id: string) => void;

  /**
   * Hard-delete: removes the habit AND all of its entries.
   * Only callable from the Archived Habits list in Settings.
   */
  deleteHabit: (id: string) => void;

  /** Reassign sortOrder values to match a reordered id array */
  reorderHabits: (orderedIds: string[]) => void;

  // ── Entry mutations ─────────────────────────────────────────────────────────

  /**
   * Upsert a log entry for a given habit + date (normalizes date to YYYY-MM-DD).
   * Writes or updates the single entry for that habit+date; sets loggedAt to now.
   * After upsert, calls recomputeDaySummaries for the affected date range (edited day,
   * or full week for weekly-limit bad habit, or full month for monthly-limit bad habit).
   */
  upsertEntry: (habitId: string, date: string, value: number) => void;

  /**
   * Called after entry edits to invalidate derived data for the given dates.
   * Derived values (daily score, completion, calendar rings) are computed on read
   * from entries; this hook is for future cache invalidation if needed.
   */
  recomputeDaySummaries: (dates: string[]) => void;

  /**
   * Upsert a log entry for a given habit + date.
   * Uses deterministic id = `${habitId}_${date}` so there can only
   * ever be one entry per habit per day.
   */
  logEntry: (habitId: string, date: string, value: number) => void;

  /**
   * Increment a numeric habit's entry by `step` (default 1).
   * Creates an entry at 0 + step if none exists yet.
   * No-op if the habit is boolean (use logEntry directly).
   */
  incrementEntry: (habitId: string, date: string, step?: number) => void;

  /**
   * Decrement a numeric habit's entry by `step` (default 1).
   * Clamps at 0 and removes the entry when it reaches 0.
   */
  decrementEntry: (habitId: string, date: string, step?: number) => void;

  /** Remove the log entry for a habit on a specific date */
  deleteEntry: (habitId: string, date: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const entryId = (habitId: string, date: string) => `${habitId}_${date}`;

function safeTarget(raw: unknown): number {
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

function safeSortOrder(raw: unknown): number {
  const v = Number(raw);
  return Number.isFinite(v) ? v : 0;
}

function safeEntryValue(raw: unknown): number {
  const v = Number(raw);
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}

/** Dates whose derived day summary is affected by editing this habit on this date. */
function getAffectedDatesForEntryEdit(habit: Habit | undefined, date: string): string[] {
  if (!habit) return [date];
  if (habit.frequency === 'monthly') {
    const { start, end } = getMonthRange(date);
    return datesInRange(start, end);
  }
  if (habit.frequency === 'weekly') {
    const weekStartsOn = useSettingsStore.getState().weekStartsOn;
    const { start, end } = getWeekRange(date, weekStartsOn);
    return datesInRange(start, end);
  }
  return [date];
}

// Monotonically-increasing counter ensures unique IDs even when Date.now()
// returns the same value for multiple calls within the same millisecond
// (e.g. when addHabit is called in a tight forEach loop).
let _idSeq = 0;
const uniqueId = () => `${Date.now()}_${++_idSeq}`;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      _schemaVersion: CURRENT_SCHEMA_VERSION,
      habits: [],
      entries: [],

      selectedDate: getTodayNormalized(),
      setSelectedDate: (date) => set({ selectedDate: date }),

      // ── addHabit ────────────────────────────────────────────────────────────
      addHabit: (draft) => {
        const id = uniqueId();
        const today = getTodayNormalized();
        const activeCount = get().habits.filter(h => h.archivedAt === null).length;

        const newHabit: Habit = {
          ...draft,
          id,
          createdAt: today,
          pausedAt: null,
          archivedAt: null,
          sortOrder: activeCount,
        };

        set(s => ({ habits: [...s.habits, newHabit] }));
        return id;
      },

      // ── updateHabit ─────────────────────────────────────────────────────────
      updateHabit: (id, patch) =>
        set(s => ({
          habits: s.habits.map(h => (h.id === id ? { ...h, ...patch } : h)),
        })),

      // ── pauseHabit / unpauseHabit ───────────────────────────────────────────
      pauseHabit: (id) =>
        set(s => ({
          habits: s.habits.map(h =>
            h.id === id ? { ...h, pausedAt: getTodayNormalized() } : h,
          ),
        })),

      unpauseHabit: (id) =>
        set(s => ({
          habits: s.habits.map(h =>
            h.id === id ? { ...h, pausedAt: null } : h,
          ),
        })),

      // ── archiveHabit ────────────────────────────────────────────────────────
      archiveHabit: (id) =>
        set(s => ({
          habits: s.habits.map(h =>
            h.id === id ? { ...h, archivedAt: getTodayNormalized() } : h,
          ),
        })),

      // ── unarchiveHabit ──────────────────────────────────────────────────────
      unarchiveHabit: (id) => {
        const activeCount = get().habits.filter(h => h.archivedAt === null).length;
        set(s => ({
          habits: s.habits.map(h =>
            h.id === id
              ? { ...h, archivedAt: null, sortOrder: activeCount }
              : h,
          ),
        }));
      },

      // ── deleteHabit (hard) ──────────────────────────────────────────────────
      deleteHabit: (id) =>
        set(s => ({
          habits: s.habits.filter(h => h.id !== id),
          entries: s.entries.filter(e => e.habitId !== id),
        })),

      // ── reorderHabits ───────────────────────────────────────────────────────
      reorderHabits: (orderedIds) =>
        set(s => ({
          habits: s.habits.map(h => {
            const idx = orderedIds.indexOf(h.id);
            return idx === -1 ? h : { ...h, sortOrder: idx };
          }),
        })),

      // ── upsertEntry ─────────────────────────────────────────────────────────
      upsertEntry: (habitId, date, value) => {
        const normalized = normalizeDate(date);
        const id = entryId(habitId, normalized);
        const entry: HabitEntry = {
          id,
          habitId,
          date: normalized,
          value,
          loggedAt: new Date().toISOString(),
        };
        set(s => ({
          entries: [...s.entries.filter(e => e.id !== id), entry],
        }));
        const habit = get().habits.find(h => h.id === habitId);
        const affected = getAffectedDatesForEntryEdit(habit, normalized);
        get().recomputeDaySummaries(affected);
      },

      // ── recomputeDaySummaries ───────────────────────────────────────────────
      recomputeDaySummaries: (_dates) => {
        // Derived values (daily score, completion, rings) are computed on read
        // from entries. State update from upsertEntry already triggers re-renders.
        // Use this hook for future cache invalidation if we add a summary cache.
      },

      // ── logEntry ────────────────────────────────────────────────────────────
      logEntry: (habitId, date, value) => {
        get().upsertEntry(habitId, date, value);
      },

      // ── incrementEntry ──────────────────────────────────────────────────────
      incrementEntry: (habitId, date, step = 1) => {
        const d = normalizeDate(date);
        const id = entryId(habitId, d);
        const existing = get().entries.find(e => e.id === id);
        const newValue = (existing?.value ?? 0) + step;

        const entry: HabitEntry = {
          id,
          habitId,
          date: d,
          value: newValue,
          loggedAt: new Date().toISOString(),
        };
        set(s => ({
          entries: [...s.entries.filter(e => e.id !== id), entry],
        }));
        const habit = get().habits.find(h => h.id === habitId);
        get().recomputeDaySummaries(getAffectedDatesForEntryEdit(habit, d));
      },

      // ── decrementEntry ──────────────────────────────────────────────────────
      decrementEntry: (habitId, date, step = 1) => {
        const d = normalizeDate(date);
        const id = entryId(habitId, d);
        const existing = get().entries.find(e => e.id === id);
        const newValue = Math.max(0, (existing?.value ?? 0) - step);

        if (newValue === 0) {
          // Remove the entry entirely when it hits 0
          set(s => ({ entries: s.entries.filter(e => e.id !== id) }));
        } else {
          const entry: HabitEntry = {
            id,
            habitId,
            date: d,
            value: newValue,
            loggedAt: new Date().toISOString(),
          };
          set(s => ({
            entries: [...s.entries.filter(e => e.id !== id), entry],
          }));
        }
        const habit = get().habits.find(h => h.id === habitId);
        get().recomputeDaySummaries(getAffectedDatesForEntryEdit(habit, d));
      },

      // ── deleteEntry ─────────────────────────────────────────────────────────
      deleteEntry: (habitId, date) => {
        const d = normalizeDate(date);
        const id = entryId(habitId, d);
        set(s => ({ entries: s.entries.filter(e => e.id !== id) }));
        const habit = get().habits.find(h => h.id === habitId);
        get().recomputeDaySummaries(getAffectedDatesForEntryEdit(habit, d));
      },
    }),

    {
      name: 'fovere-habits',
      storage: createJSONStorage(() => appStorage),

      // Do not persist selectedDate: app always opens on today.
      partialize: (state) => ({
        _schemaVersion: state._schemaVersion,
        habits: state.habits,
        entries: state.entries,
      }),

      // Restore habits/entries from storage; never restore selectedDate — always today.
      merge: (persisted, current) => {
        const p = persisted as Partial<HabitState>;
        return {
          ...current,
          _schemaVersion: p._schemaVersion ?? current._schemaVersion,
          habits: p.habits ?? current.habits,
          entries: p.entries ?? current.entries,
          selectedDate: getTodayNormalized(),
        };
      },

      // Runs on EVERY rehydration (not just schema upgrades).
      // Coerces any numeric fields that stale AsyncStorage data might have
      // stored as strings (pre-createJSONStorage era), so that
      // Number("5") → 5 and Number(null) → 0 → handled below.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (Array.isArray(state.habits)) {
          const seenIds = new Set<string>();
          state.habits = state.habits
            .map(h => ({
              ...h,
              target:    safeTarget(h.target),
              sortOrder: safeSortOrder(h.sortOrder),
              pausedAt:  (h as any).pausedAt ?? null,
              archivedAt: h.archivedAt ?? null,
              goalType:  (h.goalType === 'break' ? 'break' : 'build') as 'build' | 'break',
            }))
            .filter(h => {
              if (seenIds.has(h.id)) return false;
              seenIds.add(h.id);
              return true;
            });
        }
        if (Array.isArray(state.entries)) {
          const seenEntries = new Set<string>();
          state.entries = state.entries
            .map(e => ({ ...e, value: safeEntryValue(e.value) }))
            .filter(e => {
              if (seenEntries.has(e.id)) return false;
              seenEntries.add(e.id);
              return true;
            });
        }

        // Hard-delete archived habits (and their entries) older than 30 days.
        const today = getTodayNormalized();
        const cutoff = addDays(today, -30);
        if (Array.isArray(state.habits) && Array.isArray(state.entries)) {
          const removedIds = new Set<string>();
          state.habits = state.habits.filter(h => {
            if (h.archivedAt && h.archivedAt < cutoff) {
              removedIds.add(h.id);
              return false;
            }
            return true;
          });
          if (removedIds.size > 0) {
            state.entries = state.entries.filter(e => !removedIds.has(e.habitId));
          }
        }
      },

      // Schema migration — runs once when the persisted version is older
      version: CURRENT_SCHEMA_VERSION,
      migrate: (persisted: unknown, fromVersion: number): HabitState => {
        // When we add fields in future versions, transform here:
        // if (fromVersion < 2) { ... add new fields to persisted habits }
        console.warn(`[HabitStore] migrating schema from v${fromVersion} → v${CURRENT_SCHEMA_VERSION}`);
        const s = persisted as HabitState;
        // Coerce any habits that might have numeric fields stored as strings
        if (Array.isArray(s?.habits)) {
          s.habits = s.habits.map(h => ({
            ...h,
            target:    safeTarget(h.target),
            sortOrder: safeSortOrder(h.sortOrder),
            pausedAt:  (h as any).pausedAt ?? null,
            archivedAt: h.archivedAt ?? null,
            goalType:  (h.goalType === 'break' ? 'break' : 'build') as 'build' | 'break',
          }));
        }
        if (Array.isArray(s?.entries)) {
          s.entries = s.entries.map(e => ({
            ...e,
            value: safeEntryValue(e.value),
          }));
        }
        return s;
      },
    },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────
// Pure functions: pass the store state as argument so they can be used both
// inside `useHabitStore(selector)` calls and in standalone lib functions.

/** Active (non-archived) habits sorted by sortOrder */
export const selectActiveHabits = (s: HabitState): Habit[] =>
  s.habits
    .filter(h => h.archivedAt === null && !h.pausedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);

/** Archived habits, newest first */
export const selectArchivedHabits = (s: HabitState): Habit[] =>
  s.habits
    .filter(h => h.archivedAt !== null)
    .sort((a, b) => (b.archivedAt! > a.archivedAt! ? 1 : -1));

/** All entries for a specific calendar date */
export const selectEntriesForDate =
  (date: string) =>
  (s: HabitState): HabitEntry[] =>
    s.entries.filter(e => e.date === date);

/** All entries in an inclusive date range [from, to] */
export const selectEntriesInRange =
  (from: string, to: string) =>
  (s: HabitState): HabitEntry[] =>
    s.entries.filter(e => e.date >= from && e.date <= to);

/** Single entry for a habit on a specific date, or undefined */
export const selectEntry =
  (habitId: string, date: string) =>
  (s: HabitState): HabitEntry | undefined =>
    s.entries.find(e => e.id === `${habitId}_${date}`);

/** Logged value for a habit on a date (0 if no entry) */
export const selectEntryValue =
  (habitId: string, date: string) =>
  (s: HabitState): number =>
    s.entries.find(e => e.id === `${habitId}_${date}`)?.value ?? 0;

/** Whether a habit is completed for a specific date */
export const selectIsCompleted =
  (habit: Habit, date: string) =>
  (s: HabitState): boolean => {
    const value = selectEntryValue(habit.id, date)(s);
    return value >= habit.target;
  };
