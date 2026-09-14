import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────

/** 0 = Sunday, 1 = Monday (matches date-fns weekStartsOn) */
export type WeekStartDay = 0 | 1;

/** App UI language; persisted and synced with i18n. */
export type Language = 'en' | 'es';

interface SettingsState {
  /** Haptic feedback on habit completion / swipe actions */
  hapticFeedback: boolean;

  /**
   * Which day the week starts on.
   * 0 = Sunday (US default), 1 = Monday (ISO 8601 / European default)
   */
  weekStartsOn: WeekStartDay;

  /**
   * Whether the user has granted notification permissions and enabled reminders.
   * Flipped to true after the first successful permission grant.
   */
  notificationsEnabled: boolean;

  /**
   * Global daily reminder setting used to nudge the user to log for the day.
   * When true, we schedule a single local notification at `dailyReminderTime`.
   */
  dailyReminderEnabled: boolean;

  /** Local time for the global reminder, stored as "HH:MM" (24‑hour). */
  dailyReminderTime: string;

  /** ID of the scheduled notification for the daily reminder (if any). */
  dailyReminderNotificationId: string | null;

  /** Compact home screen layout (smaller hero and habit cards for faster scanning). */
  compactHomeView: boolean;

  /** True after the user has completed onboarding (first launch flow); prevents showing it again. */
  hasCompletedOnboarding: boolean;

  /** Dark mode (app-wide appearance). */
  darkMode: boolean;

  /**
   * When true, main score card shows strict completion (only fully completed habits count).
   * When false, main score card uses weighted completion (partial progress counts).
   */
  strictScoreMode: boolean;

  /** UI language: 'en' | 'es'. undefined = use device locale (set on first app load). */
  language: Language | undefined;

  /** True after user has seen the swipe-to-complete hint on Home (one-time coach mark). */
  hasSeenSwipeHint: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  setHapticFeedback: (enabled: boolean) => void;
  setWeekStartsOn: (day: WeekStartDay) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setDailyReminderEnabled: (enabled: boolean) => void;
  setDailyReminderTime: (hhmm: string) => void;
  setDailyReminderNotificationId: (id: string | null) => void;
  setCompactHomeView: (enabled: boolean) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  setDarkMode: (enabled: boolean) => void;
  setStrictScoreMode: (enabled: boolean) => void;
  setLanguage: (lang: Language) => void;
  setHasSeenSwipeHint: (seen: boolean) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Coerce a potentially-stringified boolean back to a real boolean.
 * AsyncStorage stores everything as strings; if stale data was written without
 * JSON.stringify, Zustand's JSON storage may rehydrate "true"/"false" strings
 * instead of booleans, which breaks Fabric's strict native prop type checks.
 */
function toBoolean(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true'  || v === '1' || v === 1) return true;
  if (v === 'false' || v === '0' || v === 0) return false;
  return fallback;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hapticFeedback: true,
      weekStartsOn: 1,          // Monday by default (matches legacy Settings screen)
      notificationsEnabled: false,
      dailyReminderEnabled: false,
      dailyReminderTime: '20:00',          // 8:00 PM local time
      dailyReminderNotificationId: null,
      compactHomeView: false,
      hasCompletedOnboarding: false,
      darkMode: false,
      strictScoreMode: false,
      language: undefined,
      hasSeenSwipeHint: false,

      setHapticFeedback: (enabled) => set({ hapticFeedback: enabled }),
      setWeekStartsOn: (day) => set({ weekStartsOn: day }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setDailyReminderEnabled: (enabled) => set({ dailyReminderEnabled: enabled }),
      setDailyReminderTime: (hhmm) => set({ dailyReminderTime: hhmm }),
      setDailyReminderNotificationId: (id) => set({ dailyReminderNotificationId: id }),
      setCompactHomeView: (enabled) => set({ compactHomeView: enabled }),
      setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),
      setDarkMode: (enabled) => set({ darkMode: enabled }),
      setStrictScoreMode: (enabled) => set({ strictScoreMode: enabled }),
      setLanguage: (lang) => set({ language: lang }),
      setHasSeenSwipeHint: (seen) => set({ hasSeenSwipeHint: seen }),
    }),
    {
      name: 'fovere-settings',
      storage: createJSONStorage(() => appStorage),
      version: 1,

      // Coerce any stringified booleans produced by stale AsyncStorage data.
      // This runs after Zustand JSON-parses the stored string, so it catches
      // values like "true"/"false" that weren't stored via JSON.stringify.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hapticFeedback      = toBoolean(state.hapticFeedback,      true);
        state.notificationsEnabled = toBoolean(state.notificationsEnabled, false);
        state.dailyReminderEnabled = toBoolean(
          (state as any).dailyReminderEnabled,
          false,
        );
        // If no time was ever set, keep the default defined above.
        if (!state.dailyReminderTime) {
          state.dailyReminderTime = '20:00';
        }
        // weekStartsOn must be 0 or 1 — clamp just in case
        const ws = Number(state.weekStartsOn);
        state.weekStartsOn = (ws === 0 || ws === 1 ? ws : 1) as WeekStartDay;
        state.compactHomeView = toBoolean(state.compactHomeView, false);
        state.hasCompletedOnboarding = toBoolean((state as any).hasCompletedOnboarding, false);
        state.darkMode = toBoolean(state.darkMode, false);
        state.strictScoreMode = toBoolean((state as any).strictScoreMode, false);
        state.hasSeenSwipeHint = toBoolean((state as any).hasSeenSwipeHint, false);
        const lang = (state as any).language;
        if (lang !== 'en' && lang !== 'es') {
          (state as any).language = undefined;
        }

        if (__DEV__) {
          console.log('[settingsStore] rehydrated →', {
            hapticFeedback:      `${typeof state.hapticFeedback}(${state.hapticFeedback})`,
            notificationsEnabled: `${typeof state.notificationsEnabled}(${state.notificationsEnabled})`,
            weekStartsOn:        `${typeof state.weekStartsOn}(${state.weekStartsOn})`,
          });
        }
      },
    },
  ),
);
