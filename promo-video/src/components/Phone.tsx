import React from 'react';
import { Img, staticFile } from 'remotion';

// Real simulator captures of the app in its demo mode (sample data: Thomas & Emily).
export const SHOT = { w: 1206, h: 2622 };
// Per-language screens live in src/lib/copy.ts (useScreens).
export const SCREENS_EN = {
  home: staticFile('screens/home.png'),
  proof: staticFile('screens/proof-review.png'),
};

/** Paper-cut phone: dark body, real screenshot inside, thick white sticker edge. `swap` 0..1 brings in the second screen. */
export const Phone: React.FC<{
  height: number;
  from: string;
  to?: string;
  swap?: number;
  overlay?: (screenScale: number) => React.ReactNode; // drawn over the first screen, in screenshot pixels * screenScale
}> = ({ height, from, to, swap = 0, overlay }) => {
  const bezel = Math.round(height * 0.017);
  const screenH = height - bezel * 2;
  const screenW = (screenH * SHOT.w) / SHOT.h;
  const w = screenW + bezel * 2;
  const r = height * 0.075;
  return (
    <div
      style={{
        width: w,
        height,
        borderRadius: r,
        background: '#1F1B18',
        padding: bezel,
        boxSizing: 'border-box',
        boxShadow: '0 0 0 10px #FFFEFA',
        position: 'relative',
      }}
    >
      <div style={{ width: screenW, height: screenH, borderRadius: r - bezel, overflow: 'hidden', position: 'relative', background: '#FAF6EE' }}>
        <Img src={from} style={{ position: 'absolute', width: screenW, height: screenH }} />
        {overlay?.(screenH / SHOT.h)}
        {to && swap > 0 && (
          <Img
            src={to}
            style={{
              position: 'absolute',
              width: screenW,
              height: screenH,
              opacity: Math.min(1, swap * 1.6),
              transform: `translateY(${(1 - swap) * 40}px)`,
            }}
          />
        )}
        {/* Dynamic Island */}
        <div
          style={{
            position: 'absolute',
            top: screenH * 0.013,
            left: '50%',
            transform: 'translateX(-50%)',
            width: screenW * 0.3,
            height: screenH * 0.04,
            borderRadius: 999,
            background: '#0D0B0A',
          }}
        />
      </div>
    </div>
  );
};

/** A rectangular crop of a screenshot, given in screenshot pixels, rendered at `scale`. */
export const ScreenCrop: React.FC<{
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
  radius?: number;
  children?: React.ReactNode;
}> = ({ src, x, y, w, h, scale, radius = 18, children }) => (
  <div style={{ width: w * scale, height: h * scale, overflow: 'hidden', position: 'relative', borderRadius: radius, background: '#fff' }}>
    <Img src={src} style={{ position: 'absolute', left: -x * scale, top: -y * scale, width: SHOT.w * scale, height: SHOT.h * scale, maxWidth: 'none' }} />
    {children}
  </div>
);
