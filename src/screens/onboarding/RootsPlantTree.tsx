import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const TEAL = '#008080';
const GREEN = '#34C759';
const EMERALD = '#2ECC71';

/** Bullet sits just left of the text — reads as a real list marker */
const BULLET_R = 4;

/** X on the main stem cubic at height y (same curve as mainStemD) — stubs must start here, not at stemX */
function stemXAtY(
  stemX: number,
  sway: number,
  t0: number,
  t1: number,
  trunkH: number,
  y: number,
): number {
  const p0x = stemX;
  const p1x = stemX - sway * 1.2;
  const p2x = stemX + sway * 1.4;
  const p3x = stemX - sway * 0.6;
  const p0y = t0;
  const p1y = t0 + trunkH * 0.22;
  const p2y = t0 + trunkH * 0.55;
  const p3y = t1;

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 22; i++) {
    const t = (lo + hi) / 2;
    const oy =
      (1 - t) ** 3 * p0y +
      3 * (1 - t) ** 2 * t * p1y +
      3 * (1 - t) * t ** 2 * p2y +
      t ** 3 * p3y;
    if (oy < y) lo = t;
    else hi = t;
  }
  const t = (lo + hi) / 2;
  return (
    (1 - t) ** 3 * p0x +
    3 * (1 - t) ** 2 * t * p1x +
    3 * (1 - t) * t ** 2 * p2x +
    t ** 3 * p3x
  );
}

/** Y positions midway between branch rows / stem ends — avoids crossing horizontal stubs */
function stemLeafAnchorYs(branchYs: readonly number[], t0: number, t1: number): number[] {
  const sorted = [...branchYs].sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const out: number[] = [];
  out.push((t0 + sorted[0]) / 2);
  for (let i = 0; i < sorted.length - 1; i++) {
    out.push((sorted[i] + sorted[i + 1]) / 2);
  }
  out.push((sorted[sorted.length - 1] + t1) / 2);
  return out;
}

type Props = {
  width: number;
  height: number;
  trunkTop: number;
  trunkH: number;
  stemX: number;
  /** Horizontal center of each row bullet (same for all rows) */
  bulletX: number;
  branchYs: readonly number[];
  trunkProg: SharedValue<number>;
  /**
   * Wait this long after mount before rendering bullet circles. Avoids a one-frame SVG flash
   * (full-opacity fill) before Reanimated applies animatedProps — should match the trunk
   * `withDelay` used with `trunkProg` in the parent.
   */
  bulletMountDelayMs?: number;
};

type StemPathProps = {
  d: string;
  length: number;
  color: string;
  strokeWidth: number;
  opacity: number;
  start: number;
  end: number;
  trunkProg: SharedValue<number>;
};

/**
 * Dashed stroke + round caps: when offset hides the dash, iOS/Android still paint a pin at the
 * path origin until `trunkProg` passes `start`. Hide stroke until then.
 */
function AnimatedStem({ d, length, color, strokeWidth, opacity, start, end, trunkProg }: StemPathProps) {
  const animatedProps = useAnimatedProps(() => {
    const t = trunkProg.value;
    return {
      strokeDashoffset: interpolate(t, [start, end], [length, 0], Extrapolation.CLAMP),
      strokeOpacity: t > start ? opacity : 0,
    };
  });

  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeDasharray={`${length}`}
      strokeLinecap="round"
      strokeLinejoin="round"
      animatedProps={animatedProps}
    />
  );
}

type BulletProps = {
  cx: number;
  cy: number;
  revealAt: number;
  trunkProg: SharedValue<number>;
};

function Bullet({ cx, cy, revealAt, trunkProg }: BulletProps) {
  const animatedProps = useAnimatedProps(() => ({
    fillOpacity: interpolate(trunkProg.value, [revealAt, revealAt + 0.05], [0, 1], Extrapolation.CLAMP),
  }));

  return <AnimatedCircle cx={cx} cy={cy} r={BULLET_R} fill={TEAL} animatedProps={animatedProps} />;
}

export default function RootsPlantTree({
  width,
  height,
  trunkTop,
  trunkH,
  stemX,
  bulletX,
  branchYs,
  trunkProg,
  bulletMountDelayMs = 0,
}: Props) {
  const [bulletsMounted, setBulletsMounted] = useState(bulletMountDelayMs <= 0);

  useEffect(() => {
    if (bulletMountDelayMs <= 0) return;
    const id = setTimeout(() => setBulletsMounted(true), bulletMountDelayMs);
    return () => clearTimeout(id);
  }, [bulletMountDelayMs]);

  const t0 = trunkTop;
  const t1 = trunkTop + trunkH;

  const sway = trunkH * 0.04;

  const mainStemD = useMemo(() => {
    return `M ${stemX} ${t0} C ${stemX - sway * 1.2} ${t0 + trunkH * 0.22} ${stemX + sway * 1.4} ${t0 + trunkH * 0.55} ${stemX - sway * 0.6} ${t1}`;
  }, [stemX, t0, t1, trunkH, sway]);

  const mainStemHighlightD = useMemo(() => {
    const hx = stemX + 1.8;
    return `M ${hx} ${t0} C ${hx - sway * 1.2} ${t0 + trunkH * 0.22} ${hx + sway * 1.4} ${t0 + trunkH * 0.55} ${hx - sway * 0.6} ${t1}`;
  }, [stemX, t0, t1, trunkH, sway]);

  const mainLen = trunkH * 1.22;

  const branchStubs = useMemo(() => {
    const lineEndX = bulletX - BULLET_R;
    return branchYs.map((y, i) => {
      const x0 = stemXAtY(stemX, sway, t0, t1, trunkH, y);
      const d = `M ${x0} ${y} L ${lineEndX} ${y}`;
      const len = Math.max(8, lineEndX - x0);
      const n = branchYs.length;
      const stagger = i / (n + 1);
      const start = 0.14 + stagger * 0.52;
      const end = start + 0.18;
      return { d, len, start, end, key: `stub-${i}`, y, revealAt: end };
    });
  }, [branchYs, stemX, bulletX, sway, t0, t1, trunkH]);

  const stemLeaves = useMemo(() => {
    const items: {
      d: string;
      len: number;
      color: string;
      strokeWidth: number;
      opacity: number;
      start: number;
      end: number;
      key: string;
    }[] = [];

    const anchorYs = stemLeafAnchorYs(branchYs, t0, t1);
    const leafExtend = 23;

    anchorYs.forEach((y, i) => {
      const f = trunkH > 0 ? (y - t0) / trunkH : 0;
      // Only curve to the left — never bulge toward horizontal branch stubs on the right
      const d = `M ${stemX} ${y} Q ${stemX - 12} ${y - 7} ${stemX - leafExtend} ${y - 4}`;
      items.push({
        d,
        len: 30,
        color: i % 3 === 0 ? EMERALD : GREEN,
        strokeWidth: 5 + (i % 2),
        opacity: 0.4 + (i % 3) * 0.06,
        start: 0.04 + f * 0.4,
        end: 0.1 + f * 0.4,
        key: `stem-leaf-${i}`,
      });
    });

    return items;
  }, [branchYs, stemX, t0, t1, trunkH]);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill} pointerEvents="none">
      <AnimatedStem
        d={mainStemD}
        length={mainLen}
        color={TEAL}
        strokeWidth={3.2}
        opacity={0.55}
        start={0}
        end={0.38}
        trunkProg={trunkProg}
      />
      <AnimatedStem
        d={mainStemHighlightD}
        length={mainLen}
        color={EMERALD}
        strokeWidth={1.4}
        opacity={0.35}
        start={0}
        end={0.38}
        trunkProg={trunkProg}
      />

      {stemLeaves.map(l => (
        <AnimatedStem
          key={l.key}
          d={l.d}
          length={l.len}
          color={l.color}
          strokeWidth={l.strokeWidth}
          opacity={l.opacity}
          start={l.start}
          end={l.end}
          trunkProg={trunkProg}
        />
      ))}

      {branchStubs.map(b => (
        <AnimatedStem
          key={b.key}
          d={b.d}
          length={b.len}
          color={TEAL}
          strokeWidth={2.2}
          opacity={0.55}
          start={b.start}
          end={b.end}
          trunkProg={trunkProg}
        />
      ))}

      {bulletsMounted &&
        branchStubs.map(b => (
          <Bullet key={`${b.key}-dot`} cx={bulletX} cy={b.y} revealAt={b.revealAt} trunkProg={trunkProg} />
        ))}
    </Svg>
  );
}
