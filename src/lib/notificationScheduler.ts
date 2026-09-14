/**
 * Central scheduler for all app notifications: global daily reminder + per-habit reminders.
 * Call scheduleAllNotifications() whenever habits or daily reminder settings change.
 */

import type * as NotificationsType from 'expo-notifications';
import { Platform } from 'react-native';
import { useHabitStore } from '@/store/habitStore';
import { useSettingsStore } from '@/store/settingsStore';
import { i18n } from '@/i18n';
import { notificationsUnsupported } from '@/lib/expoGoGuard';

// expo-notifications throws on import on Android inside Expo Go (see expoGoGuard.ts),
// so it must be required lazily rather than statically imported.
const Notifications: typeof NotificationsType | null = notificationsUnsupported
  ? null
  : (require('expo-notifications') as typeof NotificationsType);

/**
 * Keeps `notificationsEnabled` aligned with whether anything should be scheduled:
 * global daily reminder and/or per-habit reminders on active (non-archived, non-paused) habits.
 */
export function reconcileNotificationsEnabled(): void {
  const settings = useSettingsStore.getState();
  const habits = useHabitStore.getState().habits;
  const hasHabitReminder = habits.some(
    h => Boolean(h.reminderTime) && h.archivedAt == null && !h.pausedAt,
  );
  const want = settings.dailyReminderEnabled || hasHabitReminder;
  if (want !== settings.notificationsEnabled) {
    settings.setNotificationsEnabled(want);
  }
}

function parseTime(hhmm: string): { hour: number; minute: number } {
  const [hStr, mStr] = hhmm.split(':');
  const hour = Number.parseInt(hStr ?? '20', 10);
  const minute = Number.parseInt(mStr ?? '0', 10);
  return {
    hour: Number.isNaN(hour) ? 20 : hour,
    minute: Number.isNaN(minute) ? 0 : minute,
  };
}

/**
 * Cancels all scheduled notifications, then schedules:
 * 1. Global daily reminder at settings time (if enabled)
 * 2. One daily notification per habit that has reminderTime and is not archived
 * Does nothing if notification permission is not granted.
 */
export async function scheduleAllNotifications(): Promise<void> {
  reconcileNotificationsEnabled();
  if (!Notifications) return;

  try {
    const { notificationsEnabled } = useSettingsStore.getState();
    if (!notificationsEnabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    const { dailyReminderEnabled, dailyReminderTime } = useSettingsStore.getState();
    const habits = useHabitStore.getState().habits;

    // 1. Global daily reminder
    if (dailyReminderEnabled) {
      const { hour, minute } = parseTime(dailyReminderTime);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t('notifications.dailyReminder'),
          body: i18n.t('notifications.reminderBody'),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }

    // 2. Per-habit reminders (active on Home: not archived, not paused)
    const isBreak = (h: { goalType?: string }) => h.goalType === 'break';
    for (const habit of habits) {
      if (!habit.reminderTime || habit.archivedAt != null || habit.pausedAt) continue;
      const { hour, minute } = parseTime(habit.reminderTime);
      const habitName = habit.name || i18n.t('notifications.habitReminderFallbackName');
      const title = isBreak(habit)
        ? i18n.t('notifications.breakHabitReminderTitle', { habitName })
        : i18n.t('notifications.habitReminderTitle', { habitName });
      const body = isBreak(habit)
        ? i18n.t('notifications.breakHabitReminderBody', { habitName })
        : i18n.t('notifications.habitReminderBody', { habitName });

      if (habit.frequency === 'weekly') {
        const weekdays = habit.reminderWeekdays?.length
          ? habit.reminderWeekdays
          : [1];
        for (const weekday of weekdays) {
          await Notifications.scheduleNotificationAsync({
            content: { title, body },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday,
              hour,
              minute,
            },
          });
        }
      } else if (habit.frequency === 'monthly') {
        const day = habit.reminderDayOfMonth ?? 1;
        const dayClamped = Math.min(31, Math.max(1, day));
        await Notifications.scheduleNotificationAsync({
          content: { title, body },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
            day: dayClamped,
            hour,
            minute,
          },
        });
      } else {
        await Notifications.scheduleNotificationAsync({
          content: { title, body },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[notificationScheduler] scheduleAllNotifications error', error);
    }
  }
}
