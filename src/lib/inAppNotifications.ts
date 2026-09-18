import { AppState } from 'react-native';
import { toast } from './toast';
import { notificationsUnsupported } from './notifications';
import { useSettingsStore } from '@/store/settingsStore';
import { navigationRef } from '@/navigation/navigationRef';

/**
 * Moments that arrive from the partner over Realtime and deserve to be felt
 * immediately: a nudge, a shared-habit invite. In the foreground they show as
 * a toast; if the app is in the background (Realtime can stay connected for a
 * little while) they're also presented as a local notification. This is the
 * "notify someone else's phone" half that doesn't need remote push
 * infrastructure — it only reaches a partner whose app is running.
 */

async function presentLocal(title: string, body: string, data?: Record<string, unknown>) {
  if (notificationsUnsupported) return;
  if (useSettingsStore.getState().notificationsPermission !== 'granted') return;
  if (AppState.currentState === 'active') return; // the toast covers it
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({ content: { title, body, data, sound: 'default' }, trigger: null });
  } catch {
    // Best effort only.
  }
}

export function notifyNudge(habitName: string, fromName: string, icon?: string) {
  const title = `${fromName} is waiting for you ${icon ?? '🌱'}`;
  const body = `Finish "${habitName}" so you can count today together.`;
  toast.info(title, body, { icon: icon ?? '🌱' });
  void presentLocal(title, body, { kind: 'nudge' });
}

export function notifyInvite(habitName: string, fromName: string) {
  const title = `${fromName} wants to do "${habitName}" together 💌`;
  const body = 'Open your mailbox to accept.';
  toast.info(title, body, {
    icon: '💌',
    onPress: () => {
      if (navigationRef.isReady()) navigationRef.navigate('Mailbox');
    },
  });
  void presentLocal(title, body, { kind: 'invite' });
}

// ─── Proof of work ────────────────────────────────────────────────────────────

export function notifyProofPending(habitName: string, fromName: string, icon?: string) {
  const title = `${fromName} needs your OK ${icon ?? '📸'}`;
  const body = `Check the photo for "${habitName}" and say if it counts.`;
  toast.info(title, body, { icon: icon ?? '📸' });
  void presentLocal(title, body, { kind: 'proof-pending' });
}

export function notifyProofApproved(habitName: string, fromName: string, icon?: string) {
  const title = `${fromName} approved your photo ✅`;
  const body = `"${habitName}" is officially done.`;
  toast.success(title, body, { icon: icon ?? '✅' });
  void presentLocal(title, body, { kind: 'proof-approved' });
}

export function notifyProofRejected(habitName: string, fromName: string, icon?: string) {
  const title = `${fromName} asked for a redo`;
  const body = `Your photo for "${habitName}" didn't quite land — give it another shot.`;
  toast.info(title, body, { icon: icon ?? '🔁' });
  void presentLocal(title, body, { kind: 'proof-rejected' });
}
