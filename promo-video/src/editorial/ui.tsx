import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, EASE_OUT, lerp, ramp, sans, serif } from './theme';

/** One headline line revealed from behind a mask (rises into place). */
export const MaskLine: React.FC<{ f: number; at: number; size: number; weight?: number; align?: 'left' | 'center'; children: React.ReactNode }> = ({ f, at, size, weight = 700, align = 'left', children }) => {
  const p = ramp(f, at, at + 17, EASE_OUT);
  return (
    <div style={{ overflow: 'hidden', height: size * 1.3, marginBottom: -size * 0.2, textAlign: align }}>
      <div
        style={{
          fontFamily: serif,
          fontWeight: weight,
          fontSize: size,
          lineHeight: `${size * 1.3}px`,
          letterSpacing: '-0.022em',
          color: C.ink,
          whiteSpace: 'nowrap',
          transform: `translateY(${(1 - p) * 104}%)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Fade combined with a short upward slide. */
export const fadeUp = (f: number, at: number, dist = 16, dur = 15): React.CSSProperties => {
  const p = ramp(f, at, at + dur, EASE_OUT);
  return { opacity: p, transform: `translateY(${(1 - p) * dist}px)` };
};

export const FACE = { thomas: 'avatars/thomas-face.jpg', emily: 'avatars/emily-face.jpg' } as const;
export type Who = keyof typeof FACE;

/** Circular photo with a 3 px ring in the person's colour; `gap` adds an outer ring in the page colour (front avatar of a pair). */
export const Avatar: React.FC<{ who: Who; size: number; cx: number; cy: number; opacity?: number; gap?: number; ring?: number }> = ({ who, size, cx, cy, opacity = 1, gap = 0, ring = 3 }) => (
  <div
    style={{
      position: 'absolute',
      left: cx - size / 2,
      top: cy - size / 2,
      width: size,
      height: size,
      borderRadius: '50%',
      opacity,
      boxShadow: `0 0 0 ${ring}px ${C[who]}${gap ? `, 0 0 0 ${ring + gap}px ${C.bg}` : ''}`,
    }}
  >
    <Img src={staticFile(FACE[who])} style={{ width: size, height: size, borderRadius: '50%', display: 'block' }} />
  </div>
);

// Real simulator captures (1206 x 2622).
export const SHOT = { w: 1206, h: 2622 };
export const PHONE = { h: 900, bezel: 11 };
export const SCREEN_H = PHONE.h - PHONE.bezel * 2;
export const SCREEN_W = (SCREEN_H * SHOT.w) / SHOT.h;
export const PHONE_W = SCREEN_W + PHONE.bezel * 2;
export const K = SCREEN_W / SHOT.w; // screenshot px -> design px at scale 1

/**
 * Flat iPhone: thin dark bezel, Dynamic Island, soft low shadow. Children are laid out in screenshot
 * pixels (1206 x 2622). `cam` pushes in: `scale`, bringing the screenshot point (fx, fy) to the phone's centre.
 */
export const IPhone: React.FC<{ cx: number; cy: number; cam?: { p: number; scale: number; fx: number; fy: number }; style?: React.CSSProperties; children: React.ReactNode }> = ({ cx, cy, cam, style, children }) => {
  const p = cam?.p ?? 0;
  const s = lerp(1, cam?.scale ?? 1, p);
  const tx = cam ? -p * s * (cam.fx - SHOT.w / 2) * K : 0;
  const ty = cam ? -p * s * (cam.fy - SHOT.h / 2) * K : 0;
  const r = 66;
  return (
    <div style={{ position: 'absolute', left: cx - PHONE_W / 2, top: cy - PHONE.h / 2, width: PHONE_W, height: PHONE.h, ...style }}>
      <div
        style={{
          width: PHONE_W,
          height: PHONE.h,
          transform: `translate(${tx}px, ${ty}px) scale(${s})`,
          borderRadius: r,
          background: C.black,
          padding: PHONE.bezel,
          boxSizing: 'border-box',
          boxShadow: '0 34px 60px -30px rgba(38,32,25,0.30), 0 10px 22px -12px rgba(38,32,25,0.14), inset 0 0 0 1.5px #3A3530',
        }}
      >
        <div style={{ width: SCREEN_W, height: SCREEN_H, borderRadius: r - PHONE.bezel, overflow: 'hidden', position: 'relative', background: C.bg }}>
          <div style={{ width: SHOT.w, height: SHOT.h, transform: `scale(${K})`, transformOrigin: '0 0', position: 'absolute', left: 0, top: 0 }}>{children}</div>
          <div style={{ position: 'absolute', top: SCREEN_H * 0.0135, left: '50%', marginLeft: -SCREEN_W * 0.15, width: SCREEN_W * 0.3, height: SCREEN_H * 0.04, borderRadius: 999, background: '#0B0A09' }} />
        </div>
      </div>
    </div>
  );
};

/** A full capture, in screenshot pixels. */
export const Shot: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={staticFile(src)} style={{ position: 'absolute', left: 0, top: 0, width: SHOT.w, height: SHOT.h, maxWidth: 'none', ...style }} />
);

/** A rectangle of a capture re-drawn at (left, top), in screenshot pixels. */
export const Patch: React.FC<{ src: string; x: number; y: number; w: number; h: number; left: number; top: number; style?: React.CSSProperties }> = ({ src, x, y, w, h, left, top, style }) => (
  <div style={{ position: 'absolute', left, top, width: w, height: h, overflow: 'hidden', ...style }}>
    <Img src={staticFile(src)} style={{ position: 'absolute', left: -x, top: -y, width: SHOT.w, height: SHOT.h, maxWidth: 'none' }} />
  </div>
);

export const label = (size: number, weight = 700, color: string = C.ink500): React.CSSProperties => ({ fontFamily: sans, fontWeight: weight, fontSize: size, color, whiteSpace: 'nowrap' });
