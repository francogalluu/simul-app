/**
 * Full-screen confetti rain. Runs once when mounted, then calls onComplete.
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
const PARTICLE_COUNT = 55;
const DURATION = 2800;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function makeParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_WIDTH,
    size: 6 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 400,
    duration: DURATION + (Math.random() - 0.5) * 600,
    drift: (Math.random() - 0.5) * 120,
    rotate: (Math.random() - 0.5) * 720,
  }));
}

function Particle({
  x,
  size,
  color,
  delay,
  duration,
  drift,
  rotate,
  onDone,
}: {
  x: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
  onDone: () => void;
}) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 50, {
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
      delay + duration * 0.7,
      withTiming(0, { duration: 300 }, () => runOnJS(onDone)()),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x,
    top: 0,
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

export interface ConfettiOverlayProps {
  onComplete?: () => void;
}

export function ConfettiOverlay({ onComplete }: ConfettiOverlayProps) {
  const particles = useMemo(() => makeParticles(), []);
  const doneCountRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleParticleDone = () => {
    doneCountRef.current += 1;
    if (doneCountRef.current >= PARTICLE_COUNT) {
      onCompleteRef.current?.();
    }
  };

  // Fallback: call onComplete after max duration so overlay can unmount
  useEffect(() => {
    const t = setTimeout(() => {
      onComplete?.();
    }, DURATION + 1000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {particles.map((p) => (
        <Particle
          key={p.id}
          x={p.x}
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
    zIndex: 9999,
  },
});
