import { Alert } from 'react-native';
import { i18n } from '@/i18n';
import type { AppErrorCode } from './supabase';

/** User-facing copy for an error code. Raw server messages are never shown. */
export const errorMessage = (code: AppErrorCode | string) =>
  i18n.t(`errors.${code}`, { defaultValue: i18n.t('errors.unknown') });

let lastShownAt = 0;

/** Alert for failed background syncs; throttled so a flaky connection doesn't stack dialogs. */
export function showSyncError(code: AppErrorCode) {
  const now = Date.now();
  if (now - lastShownAt < 4000) return;
  lastShownAt = now;
  Alert.alert(i18n.t('errors.syncTitle'), errorMessage(code));
}
