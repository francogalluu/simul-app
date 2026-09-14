import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const EASE = Easing.bezier(0.25, 0.1, 0.25, 1.0);
const TEAL = '#008080';
const GREEN = '#34C759';
const EMERALD = '#2ECC71';

interface StemConfig {
  d: string;
  length: number;
  delay: number;
  duration: number;
  color: string;
  strokeWidth: number;
  opacity: number;
}

function AnimatedStem({
  d,
  length,
  delay,
  duration,
  color,
  strokeWidth,
  opacity,
}: StemConfig) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: EASE }),
    );
  }, [delay, duration]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [length, 0]),
    /** Dashed stroke + round caps leaves a pin at the path start until the stroke draws. */
    strokeOpacity: progress.value > 0 ? opacity : 0,
  }));

  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeDasharray={`${length}`}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
}

type GrowingPlantAnimationProps = {
  /** Added to every stem delay so the plant can start after other UI (e.g. Continue). */
  startDelayMs?: number;
  /** Scales plant-relative delays and stem draw durations; values below 1 run faster. Default 1. */
  timeScale?: number;
  /** Vertical scale about the viewBox bottom center (y=800); values below 1 shorten the plant without moving its base. */
  verticalScale?: number;
};

const VB_H = 800;
/** ViewBox x-center; transforms scale from this x and the bottom y=VB_H */
const VB_CX = 200;

export default function GrowingPlantAnimation({
  startDelayMs = 0,
  timeScale = 1,
  verticalScale = 1,
}: GrowingPlantAnimationProps) {
  const t = (ms: number) => startDelayMs + Math.round(ms * timeScale);
  const d = (ms: number) => Math.round(ms * timeScale);

  const plantTransform =
    verticalScale !== 1
      ? `translate(${VB_CX} ${VB_H}) scale(1 ${verticalScale}) translate(${-VB_CX} ${-VB_H})`
      : undefined;

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 400 ${VB_H}`}
      preserveAspectRatio="xMidYMax slice"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <G transform={plantTransform}>
      {/* ── Grass blades ── */}
      <AnimatedStem d="M 120 800 C 114 778 106 760 98 748" length={68} delay={t(0)} duration={d(1300)} color={TEAL} strokeWidth={2.5} opacity={0.35} />
      <AnimatedStem d="M 148 800 C 140 765 128 738 118 715" length={105} delay={t(80)} duration={d(1500)} color={GREEN} strokeWidth={2.8} opacity={0.40} />
      <AnimatedStem d="M 172 800 C 168 772 162 748 158 732" length={80} delay={t(150)} duration={d(1200)} color={EMERALD} strokeWidth={2.2} opacity={0.38} />
      <AnimatedStem d="M 190 800 C 188 780 185 764 183 752" length={55} delay={t(200)} duration={d(1000)} color={GREEN} strokeWidth={1.8} opacity={0.32} />
      <AnimatedStem d="M 210 800 C 212 780 215 764 217 752" length={55} delay={t(220)} duration={d(1000)} color={GREEN} strokeWidth={1.8} opacity={0.32} />
      <AnimatedStem d="M 228 800 C 232 772 238 748 242 732" length={80} delay={t(120)} duration={d(1200)} color={EMERALD} strokeWidth={2.2} opacity={0.38} />
      <AnimatedStem d="M 252 800 C 260 765 272 738 282 715" length={105} delay={t(60)} duration={d(1500)} color={GREEN} strokeWidth={2.8} opacity={0.40} />
      <AnimatedStem d="M 280 800 C 286 778 294 760 302 748" length={68} delay={t(180)} duration={d(1300)} color={TEAL} strokeWidth={2.5} opacity={0.35} />

      {/* ── Extra short grass ── */}
      <AnimatedStem d="M 135 800 C 132 786 128 776 125 770" length={38} delay={t(100)} duration={d(900)} color={GREEN} strokeWidth={2} opacity={0.30} />
      <AnimatedStem d="M 265 800 C 268 786 272 776 275 770" length={38} delay={t(140)} duration={d(900)} color={GREEN} strokeWidth={2} opacity={0.30} />

      {/* ── Main stem ── */}
      <AnimatedStem
        d="M 200 800 C 198 745 195 695 197 650 C 199 610 201 580 200 555"
        length={300}
        delay={t(200)}
        duration={d(2500)}
        color={TEAL}
        strokeWidth={3.5}
        opacity={0.50}
      />

      {/* ── Small sub-branches ── */}
      <AnimatedStem d="M 198 710 C 186 698 174 690 164 686" length={50} delay={t(1200)} duration={d(900)} color={TEAL} strokeWidth={2.5} opacity={0.42} />
      <AnimatedStem d="M 199 660 C 212 648 226 640 238 636" length={55} delay={t(1500)} duration={d(900)} color={TEAL} strokeWidth={2.5} opacity={0.42} />

      {/* ── Main branches ── */}
      <AnimatedStem d="M 197 640 C 178 622 155 610 130 602" length={90} delay={t(1600)} duration={d(1200)} color={TEAL} strokeWidth={3} opacity={0.48} />
      <AnimatedStem d="M 200 590 C 220 576 244 566 268 560" length={95} delay={t(1900)} duration={d(1200)} color={TEAL} strokeWidth={3} opacity={0.48} />

      {/* ── Leaves (thick brushstrokes) ── */}
      {/* Top of main stem — two leaves splaying out */}
      <AnimatedStem d="M 200 558 C 190 546 176 540 164 542" length={48} delay={t(2400)} duration={d(800)} color={GREEN} strokeWidth={7} opacity={0.55} />
      <AnimatedStem d="M 200 558 C 210 546 224 540 236 542" length={48} delay={t(2500)} duration={d(800)} color={EMERALD} strokeWidth={7} opacity={0.50} />
      <AnimatedStem d="M 200 555 C 198 544 196 532 198 522" length={40} delay={t(2600)} duration={d(700)} color={GREEN} strokeWidth={6} opacity={0.45} />

      {/* Left branch tip leaves */}
      <AnimatedStem d="M 130 602 C 120 594 108 592 98 596" length={42} delay={t(2600)} duration={d(750)} color={GREEN} strokeWidth={6.5} opacity={0.52} />
      <AnimatedStem d="M 132 604 C 126 594 118 586 112 580" length={35} delay={t(2700)} duration={d(700)} color={EMERALD} strokeWidth={5.5} opacity={0.45} />

      {/* Right branch tip leaves */}
      <AnimatedStem d="M 268 560 C 278 552 290 550 300 554" length={42} delay={t(2800)} duration={d(750)} color={GREEN} strokeWidth={6.5} opacity={0.52} />
      <AnimatedStem d="M 266 562 C 274 554 282 546 288 540" length={35} delay={t(2900)} duration={d(700)} color={EMERALD} strokeWidth={5.5} opacity={0.45} />

      {/* Small branch leaves */}
      <AnimatedStem d="M 164 686 C 154 680 144 680 136 684" length={36} delay={t(2100)} duration={d(700)} color={GREEN} strokeWidth={5.5} opacity={0.48} />
      <AnimatedStem d="M 238 636 C 248 630 258 630 266 634" length={36} delay={t(2300)} duration={d(700)} color={EMERALD} strokeWidth={5.5} opacity={0.48} />

      {/* Extra leaves along main stem */}
      <AnimatedStem d="M 198 690 C 188 682 176 680 166 684" length={40} delay={t(1800)} duration={d(700)} color={EMERALD} strokeWidth={5} opacity={0.40} />
      <AnimatedStem d="M 199 620 C 210 612 222 610 232 614" length={40} delay={t(2000)} duration={d(700)} color={GREEN} strokeWidth={5} opacity={0.40} />
      </G>
    </Svg>
  );
}
