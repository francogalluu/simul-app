// ─── Core domain types ────────────────────────────────────────────────────────

/**
 * "boolean" — done/not-done (target is always 1, value is 0 or 1)
 * "numeric" — count/quantity toward a target (e.g. 8 glasses, 30 min)
 */
export type HabitKind = 'boolean' | 'numeric';

/** How often the habit is expected to be completed */
export type Frequency = 'daily' | 'weekly' | 'monthly';

/**
 * A single tracked habit definition.
 *
 * Soft-delete strategy: archivedAt stores the ISO date-string of archival.
 * Archived habits are excluded from Home / entry flows but kept in analytics
 * so that historical entries remain accurate. Hard delete is only available
 * from the Archived Habits list and removes the habit + all its entries.
 */
export interface Habit {
  /** Unique identifier — timestamp string (Date.now().toString()) */
  id: string;

  /**
   * 'build' = work toward a goal (default, all existing habits)
   * 'break' = stay within a daily limit (e.g. cigarettes, screen time)
   * Optional for backward compatibility; treated as 'build' when absent.
   */
  goalType?: 'build' | 'break';

  /** Display name, e.g. "Morning Run" */
  name: string;

  /** Single emoji string, e.g. "🏃" */
  icon: string;

  /** Optional user-written description shown on the habit detail screen */
  description?: string;

  /** boolean = toggle; numeric = increment toward target */
  kind: HabitKind;

  frequency: Frequency;

  /**
   * Goal value.
   * - boolean habits: always 1
   * - numeric habits: the quantity to reach (e.g. 8 for 8 glasses)
   */
  target: number;

  /** Unit label for numeric habits, e.g. "min", "glasses", "pages" (custom or legacy). */
  unit?: string;

  /**
   * When set, `unit` is optional; show this i18n key instead (preset habits).
   * Stays in sync when the user changes app language.
   */
  unitKey?: string;

  /** Local notification time, stored as "HH:MM" (24-hour). undefined = no reminder. */
  reminderTime?: string;

  /**
   * For weekly habits: which weekdays to remind (1 = Sunday … 7 = Saturday, Expo convention).
   * If empty/undefined, defaults to [1] when scheduling.
   */
  reminderWeekdays?: number[];

  /**
   * For monthly habits: day of month (1–31) to remind.
   * If undefined, defaults to 1 when scheduling.
   */
  reminderDayOfMonth?: number;

  /** ISO date string YYYY-MM-DD — when the habit was created */
  createdAt: string;

  /**
   * ISO date string YYYY-MM-DD when paused, or null if active.
   * Paused habits are hidden from Home from that day forward, but can be
   * resumed. Their past history is always preserved.
   */
  pausedAt?: string | null;

  /**
   * ISO date string YYYY-MM-DD when archived (soft-deleted), or null if active.
   * Archived habits are hidden from Home / entry flows but preserved for
   * analytics and calendar so historical scores remain accurate.
   */
  archivedAt: string | null;

  /** Zero-based display order within the active habit list */
  sortOrder: number;
}

// ─── Entry / log types ────────────────────────────────────────────────────────

/**
 * One log entry — records how much of a habit was done on a given day.
 *
 * id is deterministic: `${habitId}_${date}`. This guarantees at most one
 * entry per habit per day and makes upsert trivial (filter + push).
 */
export interface HabitEntry {
  /** Composite key: `${habitId}_${date}` */
  id: string;

  habitId: string;

  /** YYYY-MM-DD in the user's local timezone */
  date: string;

  /**
   * Logged value.
   * - boolean: 0 (not done) or 1 (done)
   * - numeric: actual quantity logged (may exceed target, capped in UI)
   */
  value: number;

  /** Full ISO 8601 timestamp — used to order/audit multiple edits */
  loggedAt: string;
}

// ─── Derived/view types used by components ────────────────────────────────────

/** Shape passed to HabitCard / SwipeableHabitCard */
export interface HabitCardData {
  habit: Habit;
  /** Today's logged value for this habit (0 if no entry) */
  currentValue: number;
  /** Whether the habit is considered completed for the viewed date */
  isCompleted: boolean;
}
