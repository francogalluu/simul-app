import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { liftOut, paperShadow, stickIn } from '../lib/anim';
import { C, hand } from '../lib/theme';

/** Textured cream-to-peach paper board. Sized larger than the frame so the camera drift never shows an edge. */
export const PaperBackground: React.FC = () => (
  <AbsoluteFill style={{ left: -120, top: -80, width: 2160, height: 1240 }}>
    <AbsoluteFill
      style={{ background: 'linear-gradient(128deg, #FCF7EE 0%, #FAEDDD 42%, #F7DCC4 78%, #F4CFB2 100%)' }}
    />
    <svg width="2160" height="1240" style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.36  0 0 0 0 0.25  0 0 0 0 0.16  0 0 0 1.1 -0.25" />
        </filter>
        <filter id="fibers" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.011" numOctaves="3" seed="11" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.38  0 0 0 0 0.22  0 0 0 1.6 -0.62" />
        </filter>
        <radialGradient id="vignette" cx="50%" cy="46%" r="72%">
          <stop offset="62%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#5a3518" stopOpacity="0.13" />
        </radialGradient>
      </defs>
      <rect width="2160" height="1240" filter="url(#fibers)" opacity="0.22" />
      <rect width="2160" height="1240" filter="url(#grain)" opacity="0.22" />
      <rect width="2160" height="1240" fill="url(#vignette)" />
    </svg>
  </AbsoluteFill>
);

/** SVG filter that draws the thick white die-cut sticker border around any shape. */
export const StickerDefs: React.FC = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      {[
        ['stk', 9],
        ['stkS', 6],
      ].map(([id, r]) => (
        <filter key={id} id={id as string} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius={r} result="d" />
          <feGaussianBlur in="d" stdDeviation="0.7" result="db" />
          <feFlood floodColor="#FFFEFA" />
          <feComposite in2="db" operator="in" result="outline" />
          <feMerge>
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      ))}
    </defs>
  </svg>
);

type StickProps = {
  start: number;
  end?: number; // frame when it peels away
  cx: number;
  cy: number;
  rotate?: number;
  outline?: 'stk' | 'stkS' | false;
  fromRot?: number;
  fromScale?: number;
  anchor?: 'center' | 'left'; // 'left': cx is the left edge
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/** Positions a piece by its center and animates it being stuck on (and optionally peeled off). */
export const Stick: React.FC<StickProps> = ({ start, end, cx, cy, rotate = 0, outline = false, fromRot, fromScale, anchor = 'center', style, children }) => {
  const frame = useCurrentFrame();
  const a = stickIn(frame, start, { fromRot, fromScale });
  const o = end !== undefined ? liftOut(frame, end) : { scale: 1, opacity: 1, y: 0, lift: 0, gone: false };
  if (!a.visible || o.gone) return null;
  const lift = Math.max(a.lift, o.lift);
  const filter = `${outline ? `url(#${outline}) ` : ''}${paperShadow(lift)}`;
  return (
    <div
      style={{
        position: 'absolute',
        left: cx,
        top: cy,
        transformOrigin: anchor === 'left' ? 'left center' : 'center',
        transform: `translate(${anchor === 'left' ? '0' : '-50%'}, -50%) translateY(${o.y}px) rotate(${rotate + a.rot}deg) scale(${a.scale * o.scale})`,
        opacity: a.opacity * o.opacity,
        filter,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Semi-transparent washi tape strip with torn ends. */
export const Tape: React.FC<{ w?: number; h?: number; color?: string }> = ({ w = 150, h = 42, color = C.tape }) => {
  const teeth = (side: 'l' | 'r') => {
    const pts: string[] = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const y = (i / n) * 100;
      const x = side === 'l' ? (i % 2 ? 4 : 0) : i % 2 ? 96 : 100;
      pts.push(`${x}% ${y}%`);
    }
    return side === 'l' ? pts : pts.reverse();
  };
  return (
    <div
      style={{
        width: w,
        height: h,
        background: `repeating-linear-gradient(90deg, ${color} 0 10px, rgba(255,247,222,0.82) 10px 12px)`,
        clipPath: `polygon(${[...teeth('l'), ...teeth('r')].join(',')})`,
        mixBlendMode: 'multiply',
      }}
    />
  );
};

// Deterministic jagged edge for torn paper.
function tornPolygon(seed: number, jag = 1.6) {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const top: string[] = [];
  const bottom: string[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) top.push(`${(i / n) * 100}% ${(rnd() * jag * 2).toFixed(2)}%`);
  for (let i = n; i >= 0; i--) bottom.push(`${(i / n) * 100}% ${(100 - rnd() * jag * 2).toFixed(2)}%`);
  return `polygon(${[...top, ...bottom].join(',')})`;
}

/** Torn paper note with handwritten text. */
export const TornNote: React.FC<{
  children: React.ReactNode;
  seed?: number;
  size?: number;
  color?: string;
  paper?: string;
  padX?: number;
  padY?: number;
  lined?: boolean;
  style?: React.CSSProperties;
}> = ({ children, seed = 3, size = 56, color = C.ink, paper = C.paper, padX = 34, padY = 18, lined = false, style }) => (
  <div
    style={{
      clipPath: tornPolygon(seed),
      background: lined
        ? `repeating-linear-gradient(180deg, ${paper} 0 ${size * 1.05}px, rgba(111,155,199,0.22) ${size * 1.05}px ${size * 1.05 + 2}px), ${paper}`
        : paper,
      padding: `${padY + 6}px ${padX}px ${padY + 4}px`,
      fontFamily: hand,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1.05,
      color,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);
