import React from 'react';
import { useCurrentFrame } from 'remotion';
import { liftOut, paperShadow, stickIn, track } from '../lib/anim';
import { T } from '../lib/theme';
import { Character, PoseKey, Who } from './Character';

/** A character placed by its feet (x = center, bottom = feet line), with stick-on/peel-off. */
export const Placed: React.FC<{
  who: Who;
  x: number;
  bottom: number;
  scale: number;
  enter: number;
  exit?: number;
  poses: PoseKey[];
  mood?: 'happy' | 'sad';
  look?: number;
  slideFromX?: number; // enter by sliding in from this x
  blinkSeed?: number;
  flip?: boolean; // mirror horizontally
}> = ({ who, x, bottom, scale, enter, exit, poses, mood, look, slideFromX, blinkSeed, flip }) => {
  const frame = useCurrentFrame();
  const a = stickIn(frame, enter, { fromScale: 1.1, fromRot: slideFromX ? 0 : 4 });
  const o = exit !== undefined ? liftOut(frame, exit, 14) : { scale: 1, opacity: 1, y: 0, lift: 0, gone: false };
  if (!a.visible || o.gone) return null;
  const slide = slideFromX !== undefined ? track(frame, [[enter, slideFromX], [enter + 18, x]]) : x;
  const lift = Math.max(a.lift, o.lift);
  const s = scale * a.scale * o.scale;
  return (
    <div
      style={{
        position: 'absolute',
        left: slide - 150,
        top: bottom - 620,
        width: 300,
        height: 620,
        transformOrigin: '150px 600px',
        transform: `translateY(${o.y}px) rotate(${a.rot}deg) scale(${flip ? -s : s}, ${s})`,
        opacity: a.opacity * o.opacity,
        filter: `url(#stk) ${paperShadow(lift)}`,
      }}
    >
      <Character who={who} frame={frame} poses={poses} mood={mood} look={look} blinkSeed={blinkSeed} />
    </div>
  );
};

// S1 -> S3 the couple stays on the board and is re-arranged, so it's one continuous instance each.
export const S3_THOMAS = { x: 330, bottom: 905, scale: 0.82 };
export const S3_EMILY = { x: 645, bottom: 905, scale: 0.82 };

export const StoryCast: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= T.s4) return null;
  const move = T.s3a; // rearrange for the app demo

  const tx = track(frame, [[T.s2 + 10, 1420], [T.s2 + 32, 1210], [move, 1210], [move + 22, S3_THOMAS.x]]);
  const ts = track(frame, [[move, 1], [move + 22, S3_THOMAS.scale]]);
  const tb = track(frame, [[move, 900], [move + 22, S3_THOMAS.bottom]]);
  const ex = track(frame, [[move, 1530], [move + 22, S3_EMILY.x]]);
  const es = track(frame, [[move, 1], [move + 22, S3_EMILY.scale]]);
  const eb = track(frame, [[move, 900], [move + 22, S3_EMILY.bottom]]);
  const emilyIn = T.s2 + 22;

  return (
    <>
      <Placed
        who="thomas"
        x={tx}
        bottom={tb}
        scale={ts}
        enter={6}
        exit={T.s4 - 14}
        mood={frame < T.s2 + 18 ? 'sad' : 'happy'}
        look={frame > T.s2 + 30 && frame < T.s3a ? 1 : 0}
        poses={[
          [0, 'holdBook'],
          [T.s2 + 14, 'idle'],
          [T.s3a + 26, 'holdBook'],
          [T.s3b + 8, 'holdPhone'],
          [T.s3b + 100, 'idle'],
          [T.s3c + 66, 'cheer'],
        ]}
        blinkSeed={0}
      />
      {frame >= emilyIn && (
        <Placed
          who="emily"
          x={frame < move ? 1530 : ex}
          bottom={eb}
          scale={es}
          enter={emilyIn}
          slideFromX={frame < move ? 2200 : undefined}
          exit={T.s4 - 14}
          look={frame < T.s3a ? -1 : frame >= T.s3b + 60 && frame < T.s3c + 66 ? 1 : 0}
          poses={[
            [0, 'idle'],
            [T.s3b + 88, 'holdPhone'],
            [T.s3c + 66, 'cheer'],
          ]}
          blinkSeed={3}
        />
      )}
    </>
  );
};
