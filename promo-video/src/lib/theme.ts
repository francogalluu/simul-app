import { loadFont as loadLora } from '@remotion/google-fonts/Lora';
import { loadFont as loadNunito } from '@remotion/google-fonts/Nunito';
import { loadFont as loadCaveat } from '@remotion/google-fonts/Caveat';

// All three are SIL Open Font License (free for commercial use).
export const serif = loadLora('normal', { weights: ['400', '600', '700'], subsets: ['latin'] }).fontFamily; // Simul wordmark / titles
export const sans = loadNunito('normal', { weights: ['600', '700', '800'], subsets: ['latin'] }).fontFamily; // app body font
export const hand = loadCaveat('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily; // handwritten notes

// Simul palette (from src/lib/simulTheme.ts in the app).
export const C = {
  bg: '#FAF6EE',
  ink: '#262019',
  ink700: '#4A4238',
  ink500: '#7A7166',
  accent: '#6bb290',
  accentDeep: '#4F9B6E',
  gold: '#F7B500',
  amber: '#B08A3E',
  danger: '#D9534F',
  emily: '#D9739E',
  thomas: '#6F9BC7',
  paper: '#FFFDF7',
  tape: 'rgba(244, 226, 178, 0.82)',
  shadow: 'rgba(92, 58, 28, 0.24)',
};

export const W = 1920;
export const H = 1080;
export const FPS = 30;

// Global timeline (frames @30fps). Edit here to retime the whole video.
export const T = {
  s1: 0, // Hook
  s2: 150, // The idea
  s3a: 300, // Do your habit
  s3b: 420, // Send a photo
  s3c: 570, // They approve it
  s4: 720, // Why it works
  s5: 990, // Closing
  end: 1200,
};

// Safe area in design space. The camera drift zooms at most 2%, so these keep text
// clear of the edges and of the bottom ~170px where player controls sit.
export const SAFE = { left: 230, right: 1690, top: 130, bottom: 880 };
