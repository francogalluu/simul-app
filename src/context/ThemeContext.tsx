import React, { createContext, useMemo, useContext } from 'react';
import { StatusBar } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { getPalette, type Palette } from '@/lib/theme';

type ThemeContextValue = {
  isDark: boolean;
  colors: Palette;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const darkMode = useSettingsStore((s) => s.darkMode);
  const colors = useMemo(() => getPalette(darkMode), [darkMode]);
  const value = useMemo(
    () => ({ isDark: darkMode, colors }),
    [darkMode, colors],
  );
  return (
    <ThemeContext.Provider value={value}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
