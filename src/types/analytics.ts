// ─── Time-series shapes ───────────────────────────────────────────────────────

/** Completion percentage for a single calendar day (0–100) */
export interface DailyScore {
  date: string;        // YYYY-MM-DD
  completion: number;  // 0–100
}

/** Aggregated score across a full week */
export interface WeeklyScore {
  /** YYYY-MM-DD of the week's Sunday (week anchor) */
  weekStart: string;
  score: number;          // mean daily completion 0–100
  completedDays: number;  // days where completion === 100
  totalDays: number;      // always 7 (or partial for current week)
}

/** Aggregated score for a full calendar month */
export interface MonthlyScore {
  year: number;
  month: number;          // 1–12
  score: number;          // mean daily completion 0–100
  completedDays: number;  // days where completion === 100
  totalDays: number;
}

// ─── Streak types ─────────────────────────────────────────────────────────────

export interface StreakInfo {
  /** Consecutive days completed up to and including today (or yesterday) */
  current: number;
  /** Longest ever run of consecutive completed days */
  longest: number;
}

// ─── Per-habit analytics ──────────────────────────────────────────────────────

export interface HabitAnalytics {
  habitId: string;
  streak: StreakInfo;
  /** Total number of days the habit has been fully completed */
  totalCompleted: number;
  /** completedDays / daysActive * 100 (0–100) */
  completionRate: number;
  /** Daily series from habit creation to today */
  dailySeries: DailyScore[];
}

// ─── Weekly bar-chart shape (used by AnalyticsScreen) ────────────────────────

/** One bar in the weekly completion bar chart */
export interface WeekBarPoint {
  /** Short label: "Sun", "Mon", … */
  day: string;
  /** YYYY-MM-DD */
  fullDate: string;
  completion: number;  // 0–100
}
