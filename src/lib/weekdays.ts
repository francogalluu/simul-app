import { getDateLocale, getDayOfWeekIndex, type WeekStartDay } from './dates';

/**
 * Which weekdays a habit repeats on, as a 7-bit mask. Bit `n` follows Date.getDay()
 * (0 = Sunday … 6 = Saturday), so the same number is stored in `habits.days_of_week`.
 */
export const EVERY_DAY = 0b1111111;

export const hasDay = (mask: number, dow: number) => (mask & (1 << dow)) !== 0;

export const toggleDay = (mask: number, dow: number) => mask ^ (1 << dow);

/** Anything that isn't a 1..127 integer (missing column, bad data) means every day. */
export const normalizeDays = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= EVERY_DAY ? value : EVERY_DAY;

/** Is a habit with this schedule due on `date` (YYYY-MM-DD)? */
export const isScheduledOn = (mask: number, date: string) => hasDay(mask, getDayOfWeekIndex(date));

/** Weekday numbers (Date.getDay()) in the order they are shown, first day of the week first. */
export const weekdayOrder = (weekStartsOn: WeekStartDay): number[] =>
  weekStartsOn === 0 ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];

const WEEKDAYS = 0b0111110; // Mon–Fri
const WEEKEND = 0b1000001; // Sat + Sun

export type DaysSummary = { kind: 'every' | 'weekdays' | 'weekend' } | { kind: 'custom'; text: string };

/** Short description of a schedule for the caption under the day selector. */
export function summarizeDays(mask: number, weekStartsOn: WeekStartDay): DaysSummary {
  if (mask === EVERY_DAY) return { kind: 'every' };
  if (mask === WEEKDAYS) return { kind: 'weekdays' };
  if (mask === WEEKEND) return { kind: 'weekend' };
  const locale = getDateLocale();
  const text = weekdayOrder(weekStartsOn)
    .filter((dow) => hasDay(mask, dow))
    .map((dow) => locale.localize.day(dow as 0 | 1 | 2 | 3 | 4 | 5 | 6, { width: 'abbreviated' }))
    .join(', ');
  return { kind: 'custom', text };
}

// ─── Pauses ───────────────────────────────────────────────────────────────────
// Stored in habits.pauses as [{ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' | null }]: `to` is the last paused
// day (inclusive), null while the pause is still open. A paused day behaves like a day the habit doesn't
// repeat on: it isn't due, and it neither counts toward a streak nor breaks it.

export interface Pause {
  from: string;
  to: string | null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Keep only well-formed pauses (the column is free-form JSON). */
export function normalizePauses(value: unknown): Pause[] {
  if (!Array.isArray(value)) return [];
  const out: Pause[] = [];
  for (const p of value) {
    if (!p || typeof p !== 'object') continue;
    const { from, to } = p as { from?: unknown; to?: unknown };
    if (typeof from !== 'string' || !DATE.test(from)) continue;
    out.push({ from, to: typeof to === 'string' && DATE.test(to) ? to : null });
  }
  return out;
}

export const isPausedOn = (pauses: Pause[], date: string) =>
  pauses.some((p) => p.from <= date && (p.to == null || date <= p.to));

/** The pause that is still open (no end date), if any. */
export const openPause = (pauses: Pause[]) => pauses.find((p) => p.to == null);

/** Start a pause today. */
export const startPause = (pauses: Pause[], todayStr: string): Pause[] =>
  openPause(pauses) ? pauses : [...pauses, { from: todayStr, to: null }];

/** End the open pause: today counts again, so it ran through yesterday (or never happened if it began today). */
export const endPause = (pauses: Pause[], todayStr: string, yesterdayStr: string): Pause[] =>
  pauses.flatMap((p) => {
    if (p.to != null) return [p];
    return p.from >= todayStr ? [] : [{ from: p.from, to: yesterdayStr }];
  });
