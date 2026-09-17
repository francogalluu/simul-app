import { i18n } from '@/i18n';
import { toast } from './toast';
import type { AppErrorCode } from './supabase';

/** User-facing copy for an error code. Raw server messages are never shown. */
export const errorMessage = (code: AppErrorCode | string) =>
  i18n.t(`errors.${code}`, { defaultValue: i18n.t('errors.unknown') });

let lastShownAt = 0;

/**
 * Quiet notice for a failed background sync (a habit toggle that didn't
 * reach the server, a dropped connection). The local state has already been
 * rolled back by the caller, so a dismissable toast is enough — a blocking
 * Alert is reserved for actions the person explicitly kicked off (see the
 * Settings / Onboarding screens). Throttled so a flaky connection doesn't
 * stack notices.
 */
export function showSyncError(code: AppErrorCode) {
  const now = Date.now();
  if (now - lastShownAt < 4000) return;
  lastShownAt = now;
  toast.error(i18n.t('errors.syncTitle'), errorMessage(code));
}
