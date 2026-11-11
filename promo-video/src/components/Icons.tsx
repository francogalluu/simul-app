import React from 'react';
import { C } from '../lib/theme';

export const Shoe: React.FC<{ size?: number }> = ({ size = 150 }) => (
  <svg width={size} height={size * 0.66} viewBox="0 0 150 100">
    <path d="M14 60 Q14 30 34 26 L60 22 Q70 40 92 44 L128 54 Q142 60 140 76 L14 76 Z" fill="#E86F55" />
    <path d="M60 22 Q70 40 92 44" stroke="#B94E3A" strokeWidth={5} fill="none" />
    <path d="M44 40 L58 34 M50 50 L66 42 M58 58 L74 50" stroke="#FFF4E8" strokeWidth={5} strokeLinecap="round" />
    <rect x={10} y={74} width={134} height={14} rx={7} fill="#F6EFE4" stroke="#D9CDBB" strokeWidth={3} />
  </svg>
);

export const Pan: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size * 0.62} viewBox="0 0 160 100">
    <rect x={98} y={44} width={58} height={14} rx={7} fill="#6B4B33" />
    <ellipse cx={58} cy={52} rx={52} ry={40} fill="#3B3430" />
    <ellipse cx={58} cy={50} rx={42} ry={31} fill="#57504A" />
    <path d="M30 50 Q34 28 58 30 Q84 30 82 52 Q80 72 56 70 Q30 70 30 50 Z" fill="#FFFDF7" />
    <circle cx={60} cy={50} r={12} fill={C.gold} />
  </svg>
);

export const Heart: React.FC<{ size?: number; color?: string }> = ({ size = 90, color = '#E8708F' }) => (
  <svg width={size} height={size * 0.9} viewBox="0 0 100 90">
    <path d="M50 86 Q8 56 6 30 Q6 6 28 6 Q44 6 50 22 Q56 6 72 6 Q94 6 94 30 Q92 56 50 86 Z" fill={color} />
    <path d="M24 22 Q30 16 38 18" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={6} fill="none" strokeLinecap="round" />
  </svg>
);

export const CheckBadge: React.FC<{ size?: number; color?: string }> = ({ size = 130, color = C.accentDeep }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <circle cx={50} cy={50} r={46} fill={color} />
    <path d="M28 52 L44 67 L73 35" stroke="#FFFFFF" strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const NotifBadge: React.FC<{ size?: number; n?: number }> = ({ size = 64, n = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <circle cx={32} cy={32} r={30} fill={C.danger} />
    <text x={32} y={44} textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight={800} fontSize={34} fill="#fff">
      {n}
    </text>
  </svg>
);

/** Hand-drawn style thought cloud. */
export const ThoughtCloud: React.FC<{ size?: number }> = ({ size = 150 }) => (
  <svg width={size} height={size * 0.8} viewBox="0 0 150 120">
    <path
      d="M38 74 Q16 74 16 56 Q16 38 36 38 Q40 16 64 18 Q80 6 98 18 Q124 16 128 40 Q146 46 140 66 Q136 82 114 80 Q104 94 84 88 Q66 98 54 86 Q40 90 38 74 Z"
      fill="#FFFDF7"
      stroke="#D8C9B4"
      strokeWidth={3}
    />
    <circle cx={30} cy={98} r={9} fill="#FFFDF7" stroke="#D8C9B4" strokeWidth={3} />
    <circle cx={16} cy={112} r={5} fill="#FFFDF7" stroke="#D8C9B4" strokeWidth={3} />
    <circle cx={60} cy={54} r={5} fill="#BDB09D" />
    <circle cx={80} cy={54} r={5} fill="#BDB09D" />
    <circle cx={100} cy={54} r={5} fill="#BDB09D" />
  </svg>
);

/** Cartoon pointing hand for the tap. Fingertip is at (34, 6). */
export const PointerHand: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <svg width={size} height={size * 1.25} viewBox="0 0 96 120">
    <path
      d="M24 14 Q24 2 34 2 Q44 2 44 14 L44 52 Q48 44 56 46 Q64 48 63 58 Q68 52 75 55 Q82 58 81 68 Q88 64 92 72 Q96 80 94 92 Q90 116 64 118 L44 118 Q26 116 18 98 L6 74 Q2 64 10 62 Q18 60 24 70 Z"
      fill="#F1C6A2"
      stroke="#C99474"
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <path d="M28 10 Q34 6 40 10 L40 18 Q34 14 28 18 Z" fill="#FBE4D3" />
    <rect x={30} y={104} width={52} height={16} rx={6} fill={C.thomas} opacity={0} />
  </svg>
);
