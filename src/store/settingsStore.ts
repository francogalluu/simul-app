import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';
import type { Person } from '@/lib/people';

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
  /**
   * Whose side of the app we're looking at. There's only one real account
   * (no backend yet), so this is how "Mora's side" gets previewed: flip it
   * and the whole app re-renders from her perspective.
   */
  perspective: Person;

  setHapticFeedback: (enabled: boolean) => void;
  setWeekStartsOn: (day: WeekStartDay) => void;
  setDarkMode: (enabled: boolean) => void;
  setLanguage: (lang: Language) => void;
  setPerspective: (p: Person) => void;
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
      perspective: 'A',

      setHapticFeedback: (enabled) => set({ hapticFeedback: enabled }),
      setWeekStartsOn: (day) => set({ weekStartsOn: day }),
      setDarkMode: (enabled) => set({ darkMode: enabled }),
      setLanguage: (lang) => set({ language: lang }),
      setPerspective: (p) => set({ perspective: p }),
    }),
    {
      name: 'simul-settings',
      storage: createJSONStorage(() => appStorage),
      version: 2,
      partialize: (s) => ({
        hapticFeedback: s.hapticFeedback,
        weekStartsOn: s.weekStartsOn,
        darkMode: s.darkMode,
        language: s.language,
        perspective: s.perspective,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hapticFeedback = toBoolean(state.hapticFeedback, true);
        const ws = Number(state.weekStartsOn);
        state.weekStartsOn = (ws === 0 || ws === 1 ? ws : 1) as WeekStartDay;
        state.darkMode = toBoolean(state.darkMode, false);
        const lang = (state as { language?: unknown }).language;
        if (lang !== 'en' && lang !== 'es') state.language = undefined;
        if (state.perspective !== 'A' && state.perspective !== 'S') state.perspective = 'A';
      },
    },
  ),
);
