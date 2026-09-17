import { notificationsUnsupported } from './notifications';
import { logError } from './supabase';
import { isPausedOn } from './streaks';
import { today } from './dates';
import type { Habit } from '@/store/tasksStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Daily local reminders, one per habit with a `reminderTime`. The whole set is
 * rebuilt whenever the relevant inputs change (see `useReminderSync`), which is
 * simpler and safer than tracking individual notification ids across
 * reinstalls: cancel everything we own, schedule what's current.
 *
 * Follows the Expo Go / Android rule from BACKLOG.md: expo-notifications is
 * only ever loaded through a deferred import, behind `notificationsUnsupported`.
 */

const CATEGORY = 'habit-reminder';
export const DEFAULT_REMINDER_BY_BUCKET: Record<string, string> = {
  Morning: '08:00',
  Afternoon: '14:00',
  Evening: '20:00',
  'All day': '12:00',
};

/** Only what affects scheduling, so completions changing doesn't reschedule anything. */
export function reminderSignature(habits: Habit[]): string {
  const t = today();
  return habits
    .filter((h) => h.status === 'active' && h.reminderTime && !isPausedOn(h, t))
    .map((h) => `${h.id}:${h.reminderTime}:${h.name}:${h.icon}`)
    .sort()
    .join('|');
}

export async function syncReminders(habits: Habit[]): Promise<void> {
  if (notificationsUnsupported) return;
  if (useSettingsStore.getState().notificationsPermission !== 'granted') return;
  try {
    const Notifications = await import('expo-notifications');
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => (n.content.data as { category?: string } | null)?.category === CATEGORY)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );

    const t = today();
    const due = habits.filter((h) => h.status === 'active' && h.reminderTime && !isPausedOn(h, t));
    for (const h of due) {
      const [hour, minute] = h.reminderTime!.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${h.icon} ${h.name}`,
          body: h.owner === 'both' ? 'Time to do this one together.' : 'A little nudge from Simul.',
          data: { category: CATEGORY, habitId: h.id },
          sound: 'default',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
    }
  } catch (e) {
    logError('reminders.sync', e);
  }
}

/** Lets the OS show reminders while the app is in the foreground too. */
export async function configureNotificationHandler(): Promise<void> {
  if (notificationsUnsupported) return;
  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    logError('reminders.handler', e);
  }
}

export const formatClock = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
};
