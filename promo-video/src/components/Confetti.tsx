import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C } from '../lib/theme';

const COLORS = [C.accent, C.gold, C.emily, C.thomas, '#F2A65A'];

/** A small, gentle burst of paper confetti. */
export const Confetti: React.FC<{ start: number; x: number; y: number; n?: number; life?: number }> = ({ start, x, y, n = 16, life = 44 }) => {
  const f = useCurrentFrame() - start;
  if (f < 0 || f > life) return null;
  const t = f / 30;
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const ang = (i / n) * Math.PI * 2 + (i % 3) * 0.3;
        const speed = 240 + ((i * 53) % 120);
        const px = x + Math.cos(ang) * speed * t;
        const py = y + Math.sin(ang) * speed * t * 0.8 + 260 * t * t;
        const rot = i * 47 + f * (i % 2 ? 9 : -7);
        const op = Math.min(1, (life - f) / 12);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px,
              top: py,
              width: i % 3 === 0 ? 14 : 20,
              height: i % 3 === 0 ? 14 : 10,
              borderRadius: i % 3 === 0 ? 7 : 2,
              background: COLORS[i % COLORS.length],
              transform: `translate(-50%,-50%) rotate(${rot}deg)`,
              opacity: op,
              boxShadow: '0 2px 3px rgba(92,58,28,0.18)',
            }}
          />
        );
      })}
    </>
  );
};
