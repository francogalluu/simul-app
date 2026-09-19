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
// The native tab bar floats over the screen, so scrollable content needs this much room at the bottom.
export const TAB_BAR_CLEARANCE = 120;
