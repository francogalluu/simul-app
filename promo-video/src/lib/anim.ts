import { Easing, interpolate, spring } from 'remotion';
import { FPS } from './theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Paper being stuck onto the board: starts lifted (bigger, tilted, deep shadow) and presses down with a short bounce. */
export function stickIn(frame: number, start: number, opts: { fromScale?: number; fromRot?: number } = {}) {
  const f = frame - start;
  const s = spring({ frame: f, fps: FPS, config: { damping: 12, stiffness: 190, mass: 0.75 } });
  return {
    visible: f >= 0,
    scale: interpolate(s, [0, 1], [opts.fromScale ?? 1.2, 1]),
    rot: interpolate(s, [0, 1], [opts.fromRot ?? 5, 0]),
    opacity: interpolate(f, [0, 4], [0, 1], clamp),
    lift: interpolate(s, [0, 1], [1, 0], clamp),
  };
}

/** Peeled off the board and lifted away. */
export function liftOut(frame: number, start: number, dur = 12) {
  const t = interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return { scale: 1 + 0.06 * t, opacity: 1 - t, y: -26 * t, lift: t, gone: t >= 1 };
}

/** Piecewise keyframe track with ease-in-out between keys. keys: [frame, value][] sorted by frame. */
export function track(frame: number, keys: [number, number][]) {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1] = keys[i + 1];
    if (frame <= f1) {
      return interpolate(frame, [f0, f1], [v0, v1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    }
  }
  return keys[keys.length - 1][1];
}

export function ramp(frame: number, a: number, b: number, ease = Easing.inOut(Easing.cubic)) {
  return interpolate(frame, [a, b], [0, 1], { ...clamp, easing: ease });
}

/** Shadow that deepens while a piece is "in the air". */
export function paperShadow(lift: number) {
  const y = 5 + 16 * lift;
  const blur = 7 + 18 * lift;
  const a = 0.26 - 0.08 * lift;
  return `drop-shadow(0px ${y.toFixed(1)}px ${blur.toFixed(1)}px rgba(92,58,28,${a.toFixed(3)}))`;
}
