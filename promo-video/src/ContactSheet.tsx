import React from 'react';
import { AbsoluteFill, Freeze } from 'remotion';
import { SimulPromo } from './SimulPromo';
import { T } from './lib/theme';
import { Lang } from './lib/copy';

// Review aid: a 6x5 grid of frames (start, start+step, ...). Not part of the video.
export const ContactSheet: React.FC<{ start: number; step: number; lang: Lang }> = ({ start, step, lang }) => (
  <AbsoluteFill style={{ background: '#222', display: 'flex', flexWrap: 'wrap', flexDirection: 'row' }}>
    {Array.from({ length: 30 }).map((_, i) => {
      const fr = Math.min(T.end - 1, start + i * step);
      return (
        <div key={i} style={{ width: 384, height: 216, position: 'relative', overflow: 'hidden', outline: '1px solid #222' }}>
          <div style={{ width: 1920, height: 1080, transform: 'scale(0.2)', transformOrigin: '0 0', position: 'absolute' }}>
            <Freeze frame={fr}>
              <SimulPromo lang={lang} />
            </Freeze>
          </div>
          <div style={{ position: 'absolute', left: 4, top: 2, color: '#fff', background: 'rgba(0,0,0,.6)', font: '700 14px sans-serif', padding: '1px 4px' }}>{fr}</div>
        </div>
      );
    })}
  </AbsoluteFill>
);
