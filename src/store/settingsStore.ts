import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';
import type { NotificationPermission } from '@/lib/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

/** 0 = Sunday, 1 = Monday (matches date-fns weekStartsOn) */
export type WeekStartDay = 0 | 1;

/** App UI language; persisted and synced with i18n. */
export type Language = 'en' | 'es';

interface SettingsState {
  hapticFeedback: boolean;
  weekStartsOn: WeekStartDay;
  /** Kept for the legacy ThemeContext used by ErrorBoundary; the Simul screens are light-only. */
  darkMode: boolean;
  /** UI language: 'en' | 'es'. undefined = use device locale (set on first app load). */
  language: Language | undefined;
  /** Whether the one-time onboarding notification prompt has been shown. */
  notificationsPrompted: boolean;
  /** Last known OS permission result, for the Settings row. null = never asked. */
  notificationsPermission: NotificationPermission | null;

  setHapticFeedback: (enabled: boolean) => void;
  setWeekStartsOn: (day: WeekStartDay) => void;
  setDarkMode: (enabled: boolean) => void;
  setLanguage: (lang: Language) => void;
  setNotificationsPrompted: (prompted: boolean) => void;
  setNotificationsPermission: (permission: NotificationPermission) => void;
}

function toBoolean(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1' || v === 1) return true;
  if (v === 'false' || v === '0' || v === 0) return false;
  return fallback;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hapticFeedback: true,
      weekStartsOn: 1,
      darkMode: false,
      language: undefined,
      notificationsPrompted: false,
      notificationsPermission: null,

      setHapticFeedback: (enabled) => set({ hapticFeedback: enabled }),
      setWeekStartsOn: (day) => set({ weekStartsOn: day }),
      setDarkMode: (enabled) => set({ darkMode: enabled }),
      setLanguage: (lang) => set({ language: lang }),
      setNotificationsPrompted: (prompted) => set({ notificationsPrompted: prompted }),
      setNotificationsPermission: (permission) => set({ notificationsPermission: permission }),
    }),
    {
      name: 'simul-settings',
      storage: createJSONStorage(() => appStorage),
      // v3: dropped `perspective` (the signed-in account is always "me" now).
      version: 3,
      migrate: (persisted) => {
        const { perspective: _dropped, ...rest } = (persisted ?? {}) as Record<string, unknown>;
        return rest as unknown as SettingsState;
      },
      partialize: (s) => ({
        hapticFeedback: s.hapticFeedback,
        weekStartsOn: s.weekStartsOn,
        darkMode: s.darkMode,
        language: s.language,
        notificationsPrompted: s.notificationsPrompted,
        notificationsPermission: s.notificationsPermission,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hapticFeedback = toBoolean(state.hapticFeedback, true);
        const ws = Number(state.weekStartsOn);
        state.weekStartsOn = (ws === 0 || ws === 1 ? ws : 1) as WeekStartDay;
        state.darkMode = toBoolean(state.darkMode, false);
        const lang = (state as { language?: unknown }).language;
        if (lang !== 'en' && lang !== 'es') state.language = undefined;
      },
    },
  ),
);
