// Simul visual language. Single source for the new screens — don't reach for
// the legacy `useTheme()` palette (that's only kept alive for ErrorBoundary).

export const S = {
  bg: '#FAF6EE',
  card: '#FFFFFF',
  cardMuted: '#F7F6F9',

  ink900: '#262019',
  ink700: '#4A4238',
  ink600: '#5C544A',
  ink500: '#7A7166',
  tertiary: '#8C8377',
  muted: '#A69C8F',

  line: '#E4E1DB',
  lineSoft: '#ECE9E3',

  accent: '#6bb290',
  accentDeep: '#4F9B6E',
  accentSoft: 'rgba(107, 178, 144, 0.16)',

  gold: '#F7B500',
  goldSoft: '#FFF3D1',
  amber: '#B08A3E',
  amberSoft: '#F6EAD2',

  danger: '#D9534F',
  dangerSoft: '#FBE9E8',

  personA: '#D9739E',
  personB: '#6F9BC7',

  black: '#141210',

  // Frosted-glass surfaces (see GlassSheet / CustomTabBar). The tint sits on
  // top of a BlurView so the blur reads as a warm, milky pane rather than
  // grey; the hairline is what sells the "edge of glass" at the sheet lip.
  glassTint: 'rgba(255, 252, 246, 0.72)',
  glassTintStrong: 'rgba(255, 252, 246, 0.86)',
  glassEdge: 'rgba(255, 255, 255, 0.65)',
  glassLine: 'rgba(38, 32, 25, 0.08)',
  scrim: 'rgba(20, 18, 16, 0.32)',
} as const;

export const fonts = {
  bold: 'Lora_700Bold',
  regular: 'Lora_400Regular',
} as const;

export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
} as const;

export const softShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.045,
  shadowRadius: 8,
  elevation: 1,
} as const;

export const SCREEN_PADDING = 22;
