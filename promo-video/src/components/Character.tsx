import React from 'react';
import { interpolate } from 'remotion';
import { C } from '../lib/theme';

// Flat vector couple drawn in one consistent style. viewBox 300 x 620, feet at the bottom.
export type Pose = 'idle' | 'holdBook' | 'holdPhone' | 'cheer' | 'wave';
export type Who = 'thomas' | 'emily';

// Arm = [elbowX, elbowY, handX, handY] for the left (screen-left) and right arm.
const POSES: Record<Pose, { l: number[]; r: number[] }> = {
  idle: { l: [86, 318, 84, 394], r: [214, 318, 216, 394] },
  holdBook: { l: [80, 338, 100, 306], r: [220, 338, 200, 306] },
  holdPhone: { l: [86, 318, 84, 394], r: [238, 340, 212, 290] },
  cheer: { l: [66, 186, 60, 112], r: [234, 186, 240, 112] },
  wave: { l: [86, 318, 84, 394], r: [262, 236, 290, 146] },
};

const LOOK: Record<Who, { skin: string; hair: string; shirt: string; shirtDark: string; pants: string; cover: string }> = {
  thomas: { skin: '#F1C6A2', hair: '#5A3A25', shirt: C.thomas, shirtDark: '#4F7BA6', pants: '#3D4A60', cover: '#C9573F' },
  emily: { skin: '#E8B28D', hair: '#2E211D', shirt: C.emily, shirtDark: '#B9537E', pants: '#3E6A68', cover: '#5E8F6E' },
};

export type PoseKey = [number, Pose];

/** Resolves the arm geometry for a frame from pose keyframes, blending over `blend` frames. */
export function armsAt(frame: number, keys: PoseKey[], blend = 8) {
  let cur = keys[0];
  let prev = keys[0];
  for (const k of keys) {
    if (frame >= k[0]) {
      prev = cur;
      cur = k;
    }
  }
  const t = prev === cur ? 1 : interpolate(frame, [cur[0], cur[0] + blend], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const mix = (a: number[], b: number[]) => a.map((v, i) => v + (b[i] - v) * e);
  const A = POSES[prev[1]];
  const B = POSES[cur[1]];
  return { l: mix(A.l, B.l), r: mix(A.r, B.r), pose: cur[1], prevPose: prev[1], t: e };
}

type Props = {
  who: Who;
  frame: number;
  poses: PoseKey[];
  mood?: 'happy' | 'sad';
  look?: number; // -1 (left) .. 1 (right)
  blinkSeed?: number;
};

export const Character: React.FC<Props> = ({ who, frame, poses, mood = 'happy', look = 0, blinkSeed = 0 }) => {
  const L = LOOK[who];
  const arms = armsAt(frame, poses);
  const propAlpha = (p: Pose) => (arms.pose === p ? arms.t : 0) + (arms.prevPose === p && arms.pose !== p ? 1 - arms.t : 0);
  const bookA = propAlpha('holdBook');
  const phoneA = propAlpha('holdPhone');
  const cheering = arms.pose === 'cheer' ? arms.t : 0;

  // Small life: breathing bob, blink, cheer hop, wave.
  const bob = Math.sin((frame + blinkSeed * 13) / 14) * 2.2;
  const hop = cheering * Math.abs(Math.sin(frame / 5)) * -10;
  const b = (frame + blinkSeed * 37) % 96;
  const blink = b < 2 || (b >= 2 && b < 4) ? 0.15 : 1;
  const readingDown = Math.max(bookA, phoneA) * 5;
  const eyeY = 138 + readingDown;
  const eyeX = look * 4;

  let r = arms.r;
  if (arms.pose === 'wave') {
    const osc = Math.sin(frame / 3.6) * 20 * arms.t;
    r = [r[0], r[1], r[2] + osc, r[3] + Math.abs(osc) * 0.2];
  }
  const arm = (pts: number[], sx: number) => (
    <g>
      <path d={`M${sx} 240 L${pts[0]} ${pts[1]} L${pts[2]} ${pts[3]}`} stroke={L.shirtDark} strokeWidth={38} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${sx} 240 L${pts[0]} ${pts[1]} L${pts[2]} ${pts[3]}`} stroke={L.shirt} strokeWidth={31} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[2]} cy={pts[3]} r={17} fill={L.skin} />
    </g>
  );

  const sad = mood === 'sad';
  return (
    <svg width={300} height={620} viewBox="0 0 300 620" style={{ overflow: 'visible', display: 'block' }}>
      <g transform={`translate(0 ${bob + hop})`}>
        {/* back hair */}
        {who === 'emily' && <path d="M72 140 Q64 46 150 44 Q236 46 228 140 L240 276 Q150 300 60 276 Z" fill={L.hair} />}
        {/* legs + shoes */}
        <rect x={106} y={390} width={38} height={176} rx={16} fill={L.pants} />
        <rect x={156} y={390} width={38} height={176} rx={16} fill={L.pants} />
        <ellipse cx={120} cy={572} rx={30} ry={15} fill="#2B2320" />
        <ellipse cx={180} cy={572} rx={30} ry={15} fill="#2B2320" />
        <rect x={92} y={576} width={56} height={8} rx={4} fill="#F4EEE4" />
        <rect x={152} y={576} width={56} height={8} rx={4} fill="#F4EEE4" />
        {/* torso */}
        <path d="M96 228 Q150 206 204 228 L224 404 Q150 418 76 404 Z" fill={L.shirt} />
        <path d="M128 214 Q150 236 172 214" stroke={L.shirtDark} strokeWidth={6} fill="none" strokeLinecap="round" />
        {/* neck + head */}
        <rect x={136} y={186} width={28} height={34} rx={10} fill={L.skin} />
        <g transform={`rotate(${sad ? 4 : 0} 150 200)`}>
          <circle cx={79} cy={140} r={14} fill={L.skin} />
          <circle cx={221} cy={140} r={14} fill={L.skin} />
          <circle cx={150} cy={130} r={72} fill={L.skin} />
          {/* front hair */}
          {who === 'thomas' ? (
            <path d="M76 132 Q70 52 148 46 Q230 46 226 124 Q214 96 176 88 Q150 106 108 102 Q88 110 76 132 Z" fill={L.hair} />
          ) : (
            <path d="M78 126 Q86 54 150 52 Q218 54 224 122 Q190 80 150 86 Q132 112 96 112 Q86 116 78 126 Z" fill={L.hair} />
          )}
          {/* face */}
          <ellipse cx={124 + eyeX} cy={eyeY} rx={6.5} ry={8.5 * blink} fill="#2B2320" />
          <ellipse cx={176 + eyeX} cy={eyeY} rx={6.5} ry={8.5 * blink} fill="#2B2320" />
          <path d={sad ? 'M110 120 Q122 116 134 110' : 'M110 118 Q122 110 134 116'} stroke={L.hair} strokeWidth={5} fill="none" strokeLinecap="round" />
          <path d={sad ? 'M166 110 Q178 116 190 120' : 'M166 116 Q178 110 190 118'} stroke={L.hair} strokeWidth={5} fill="none" strokeLinecap="round" />
          <circle cx={108} cy={164} r={13} fill="#EE8E7E" opacity={0.42} />
          <circle cx={192} cy={164} r={13} fill="#EE8E7E" opacity={0.42} />
          <path d="M146 150 Q150 156 154 150" stroke="#B9846A" strokeWidth={4} fill="none" strokeLinecap="round" />
          {sad ? (
            <path d="M134 178 Q150 168 166 178" stroke="#7A3E33" strokeWidth={5} fill="none" strokeLinecap="round" />
          ) : cheering > 0.5 ? (
            <path d="M130 168 Q150 196 170 168 Z" fill="#7A3E33" />
          ) : (
            <path d="M130 168 Q150 186 170 168" stroke="#7A3E33" strokeWidth={5} fill="none" strokeLinecap="round" />
          )}
        </g>
        {/* props held in front of the body */}
        {bookA > 0 && (
          <g opacity={bookA}>
            <path d="M150 284 L98 276 L102 334 L150 342 Z" fill="#FFFBF0" stroke={L.cover} strokeWidth={6} strokeLinejoin="round" />
            <path d="M150 284 L202 276 L198 334 L150 342 Z" fill="#FFF6E2" stroke={L.cover} strokeWidth={6} strokeLinejoin="round" />
            <path d="M112 294 L140 298 M112 306 L140 310 M112 318 L134 321 M160 298 L188 294 M160 310 L188 306 M160 321 L182 318" stroke="#C9BBA4" strokeWidth={3} strokeLinecap="round" />
          </g>
        )}
        {arm(arms.l, 104)}
        {arm(r, 196)}
        {phoneA > 0 && (
          <g opacity={phoneA}>
            <rect x={192} y={226} width={34} height={58} rx={7} fill="#2B2320" />
            <rect x={196} y={231} width={26} height={46} rx={4} fill="#FAF6EE" />
            <rect x={200} y={240} width={18} height={4} rx={2} fill={C.accent} />
            <rect x={200} y={250} width={14} height={4} rx={2} fill="#DDD3C3" />
          </g>
        )}
      </g>
    </svg>
  );
};
