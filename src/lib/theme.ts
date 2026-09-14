/**
 * Theme palettes for light and dark mode.
 * Single source for all UI colors; components use useTheme().colors.
 */

export type Palette = {
  // Brand
  teal: string;
  tealSoft: string;

  // Backgrounds
  bgHome: string;
  bgSecondary: string;
  bgAnalytics: string;
  bgCard: string;

  // Text
  text1: string;
  text2: string;
  text3: string;
  text4: string;

  // Borders / separators
  separator: string;
  separatorLight: string;

  // Status
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;

  // Misc
  chevron: string;
  ring: string;
  ringAlt: string;

  // Shadows (for cards / elevated surfaces)
  shadowColor: string;
  shadowColorHero: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOpacityHero: number;
  shadowRadiusHero: number;

  // Heatmap / charts
  heatmapEmpty: string;
  heatmapFuture: string;
  heatmapSuccess: string;
  heatmapWarning: string;
  heatmapWarningLight: string;
  heatmapLow: string;

  // Surfaces
  white: string;
  black: string;

  /** Tooltip bubble (always dark so white text is visible). */
  tooltipBg: string;
};

const LIGHT: Palette = {
  teal: '#008080',
  tealSoft: 'rgba(0, 128, 128, 0.14)',

  bgHome: '#F2F2F7',
  bgSecondary: '#EBEBF0',
  bgAnalytics: '#F2F2F7',
  bgCard: '#FFFFFF',

  text1: '#1A1A1A',
  text2: '#5C5C5E',
  text3: '#434344',
  text4: '#6E6E73',

  separator: 'rgba(0, 0, 0, 0.14)',
  separatorLight: '#D1D1D6',

  success: '#34C759',
  successSoft: 'rgba(52, 199, 89, 0.12)',
  warning: '#FF9F0A',
  warningSoft: 'rgba(255, 159, 10, 0.12)',
  danger: '#FF3B30',
  dangerSoft: 'rgba(255, 59, 48, 0.14)',

  chevron: '#8E8E93',
  ring: '#D1D1D6',
  ringAlt: '#C7C7CC',

  shadowColor: '#000',
  shadowColorHero: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 14,
  shadowOpacityHero: 0.12,
  shadowRadiusHero: 24,

  heatmapEmpty: '#D1D1D6',
  heatmapFuture: '#EBEBF0',
  heatmapSuccess: '#34C759',
  heatmapWarning: '#FF9F0A',
  heatmapWarningLight: '#FFD60A',
  heatmapLow: '#D1D1D6',

  white: '#FFFFFF',
  black: '#000000',
  tooltipBg: '#1A1A1A',
};

const DARK: Palette = {
  teal: '#008080',
  tealSoft: 'rgba(0, 128, 128, 0.25)',

  bgHome: '#000000',
  bgSecondary: '#1C1C1E',
  bgAnalytics: '#1C1C1E',
  bgCard: '#2C2C2E',

  text1: '#FFFFFF',
  text2: '#8E8E93',
  text3: '#98989D',
  text4: '#6E6E73',

  separator: 'rgba(255, 255, 255, 0.12)',
  separatorLight: '#38383A',

  success: '#34C759',
  successSoft: 'rgba(52, 199, 89, 0.2)',
  warning: '#FF9F0A',
  warningSoft: 'rgba(255, 159, 10, 0.2)',
  danger: '#FF3B30',
  dangerSoft: 'rgba(255, 59, 48, 0.2)',

  chevron: '#8E8E93',
  ring: '#38383A',
  ringAlt: '#3A3A3C',

  shadowColor: '#000',
  shadowColorHero: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 16,
  shadowOpacityHero: 0.25,
  shadowRadiusHero: 28,

  // Incomplete/future cells: lighter than bgCard (#2C2C2E) so they’re visible in dark mode
  heatmapEmpty: '#48484A',
  heatmapFuture: '#3A3A3C',
  heatmapSuccess: '#34C759',
  heatmapWarning: '#FF9F0A',
  heatmapWarningLight: '#FFD60A',
  heatmapLow: '#48484A',

  white: '#FFFFFF',
  black: '#000000',
  tooltipBg: '#2C2C2E',
};

export function getPalette(isDark: boolean): Palette {
  return isDark ? DARK : LIGHT;
}
