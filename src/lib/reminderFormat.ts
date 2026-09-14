/**
 * Format habit reminder for display (detail screen, list, etc.).
 * Uses i18n for weekday names and optional "day of month" phrasing.
 */

import type { TFunction } from 'i18next';
import type { Habit } from '@/types/habit';
import type { Frequency } from '@/types/habit';

const WEEKDAY_KEYS = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'] as const;

function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Format day of month as ordinal: 1 → "1st", 2 → "2nd", 31 → "31st". */
function dayOrdinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  const last = day % 10;
  if (last === 1) return `${day}st`;
  if (last === 2) return `${day}nd`;
  if (last === 3) return `${day}rd`;
  return `${day}th`;
}

/**
 * Returns a short display string for the habit's reminder (e.g. "8:00 AM", "Mon, Wed 8:00 AM", "15th 8:00 AM").
 * Returns null if habit has no reminder.
 */
export function formatReminderDisplay(
  habit: Habit,
  t: TFunction,
): string | null {
  if (!habit.reminderTime) return null;
  const timeStr = formatTime(habit.reminderTime);
  if (habit.frequency === 'weekly' && habit.reminderWeekdays?.length) {
    const days = habit.reminderWeekdays
      .slice()
      .sort((a, b) => a - b)
      .map(w => t(`wizard.${WEEKDAY_KEYS[w - 1]}`))
      .join(', ');
    return `${days} ${timeStr}`;
  }
  if (habit.frequency === 'monthly' && habit.reminderDayOfMonth != null) {
    const day = Math.min(31, Math.max(1, habit.reminderDayOfMonth));
    return t('wizard.reminderMonthlyPreview', { day: dayOrdinal(day), time: timeStr });
  }
  return timeStr;
}

/**
 * Format reminder for display from wizard/store parts (no full Habit).
 * Use in Edit/Create habit screen so the label shows e.g. "21st at 8:00 AM" for monthly.
 */
export function formatReminderSummary(
  reminderTime: string,
  frequency: Frequency,
  reminderWeekdays: number[] | undefined,
  reminderDayOfMonth: number | undefined,
  t: TFunction,
): string {
  const timeStr = formatTime(reminderTime);
  if (frequency === 'weekly' && reminderWeekdays?.length) {
    const days = reminderWeekdays
      .slice()
      .sort((a, b) => a - b)
      .map(w => t(`wizard.${WEEKDAY_KEYS[w - 1]}`))
      .join(', ');
    return t('wizard.reminderWeeklyPreview', { days, time: timeStr });
  }
  if (frequency === 'monthly' && reminderDayOfMonth != null) {
    const day = Math.min(31, Math.max(1, reminderDayOfMonth));
    return t('wizard.reminderMonthlyPreview', { day: dayOrdinal(day), time: timeStr });
  }
  return timeStr;
}
