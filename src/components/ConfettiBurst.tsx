/**
 * Small localized confetti burst (e.g. on home swipe complete).
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const COLORS = [
  '#34C759', '#FF3B30', '#FF9F0A', '#5AC8FA', '#AF52DE',
  '#FF2D55', '#32D74B', '#64D2FF', '#BF5AF2', '#FFD60A',
];
const PARTICLE_COUNT = 22;
const DURATION = 1600;
const FALL_DISTANCE = 180;
const SPREAD_WIDTH = 100;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_ORIGIN = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT * 0.38 };

function makeParticles(origin: { x: number; y: number }) {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    startX: origin.x + (Math.random() - 0.5) * SPREAD_WIDTH,
    startY: origin.y,
    size: 4 + Math.random() * 5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 150,
    duration: DURATION + (Math.random() - 0.5) * 400,
    drift: (Math.random() - 0.5) * 80,
    rotate: (Math.random() - 0.5) * 360,
  }));
}

function Particle({
  startX,
  startY,
  size,
  color,
  delay,
  duration,
  drift,
  rotate,
  onDone,
}: {
  startX: number;
  startY: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
  onDone: () => void;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(FALL_DISTANCE, {
        duration,
        easing: Easing.linear,
      }),
    );
    translateX.value = withDelay(
      delay,
      withTiming(drift, { duration, easing: Easing.inOut(Easing.ease) }),
    );
    rotation.value = withDelay(
      delay,
      withTiming(rotate, { duration, easing: Easing.linear }),
    );
    opacity.value = withDelay(
      delay + duration * 0.6,
      withTiming(0, { duration: 200 }, () => runOnJS(onDone)()),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: startX,
    top: startY,
    width: size,
    height: size * 1.4,
    backgroundColor: color,
    borderRadius: size * 0.2,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
}

export interface ConfettiBurstProps {
  onComplete?: () => void;
  origin?: { x: number; y: number };
}

export function ConfettiBurst({ onComplete, origin = DEFAULT_ORIGIN }: ConfettiBurstProps) {
  const particles = useMemo(() => makeParticles(origin), [origin.x, origin.y]);
  const doneCountRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleParticleDone = () => {
    doneCountRef.current += 1;
    if (doneCountRef.current >= PARTICLE_COUNT) {
      onCompleteRef.current?.();
    }
  };

  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), DURATION + 500);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {particles.map((p) => (
        <Particle
          key={p.id}
          startX={p.startX}
          startY={p.startY}
          size={p.size}
          color={p.color}
          delay={p.delay}
          duration={p.duration}
          drift={p.drift}
          rotate={p.rotate}
          onDone={handleParticleDone}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
});
