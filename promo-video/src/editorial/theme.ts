import { Easing, interpolate } from 'remotion';
import { loadFont as loadLora } from '@remotion/google-fonts/Lora';
import { loadFont as loadNunito } from '@remotion/google-fonts/Nunito';

// Both SIL Open Font License.
export const serif = loadLora('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily;
export const sans = loadNunito('normal', { weights: ['600', '700', '800'], subsets: ['latin'] }).fontFamily;

// Simul palette (src/lib/simulTheme.ts in the app).
export const C = {
  bg: '#FAF6EE',
  bg2: '#F6EFE4',
  ink: '#262019',
  ink500: '#7A7166',
  tertiary: '#8C8377',
  muted: '#A69C8F',
  line: '#E4E1DB',
  outline: '#CFC9BF',
  accent: '#6bb290',
  accentDeep: '#4F9B6E',
  accentSoft: 'rgba(107, 178, 144, 0.16)',
  thomas: '#6F9BC7',
  emily: '#D9739E',
  black: '#141210',
};

export const W = 1920;
export const H = 1080;
export const FPS = 30;

// Timeline in frames at 30 fps (38.0 s). Edit here to retime the video.
export const TE = {
  s1: 0, // Hook
  s2: 120, // The idea
  s3a: 270, // 1 Do your habit
  s3b: 405, // 2 Send a photo
  s3c: 500, // 3 Your partner approves
  s4: 660, // Why it works (study)
  s5: 930, // Closing
  end: 1140,
};
export const XF = 12; // cross-dissolve between scenes (0.4 s)

// Moments the sound cues hang on.
export const CUE = {
  meet: TE.s2 + 24, // avatars meet
  check: TE.s3a + 84, // habit checkbox fills
  badge: TE.s3b + 44, // notification badge
  tap: TE.s3c + 56, // tap on Approve
  approve: TE.s3c + 68, // green check
};

// Text stays inside this box (design px): clear of the player controls and of the camera's 1.5% zoom.
export const SAFE = { left: 230, right: 1690, top: 130, bottom: 880 };

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const EASE = Easing.bezier(0.45, 0, 0.2, 1); // gentle ease-in-out
export const EASE_OUT = Easing.bezier(0.2, 0.7, 0.2, 1);

/** 0 -> 1 between frames a and b. */
export const ramp = (f: number, a: number, b: number, easing = EASE) => interpolate(f, [a, b], [0, 1], { ...clamp, easing });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Scene opacity: dissolves in over XF frames from `start`, out over the XF frames before `end`. */
export const sceneOpacity = (f: number, start: number, end: number, fadeIn = true, fadeOut = true) =>
  Math.min(fadeIn ? ramp(f, start, start + XF, Easing.linear) : 1, fadeOut ? 1 - ramp(f, end - XF, end, Easing.linear) : 1);
