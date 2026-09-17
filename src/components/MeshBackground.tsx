import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// A soft, slowly-drifting warm gradient wash — three overlapping radial glows
// over a cream base, one of them gently wandering. Approximates a mesh
// gradient (react-native-svg has no native mesh gradient support) with plain
// radial gradients faded to transparent, which reads the same at this scale.
const CREAM = '#FFFAF0';
const BUTTER = '#FFF1C8';
const PEACH = '#FFE1CB';
const LILAC = '#ECE3FA';

const AnimatedRadialGradient = Animated.createAnimatedComponent(RadialGradient);

/**
 * Full-bleed animated background wash. Renders behind its siblings — mount it
 * as the first child of a `position: relative` (the default) container and
 * give that container a transparent background so it shows through.
 */
export function MeshBackground() {
  const { width, height } = useWindowDimensions();
  const phase = useSharedValue(0);

  useEffect(() => {
    // One full lap every 45s — near-imperceptible frame to frame, but alive.
    phase.value = withRepeat(withTiming(Math.PI * 2, { duration: 45000, easing: Easing.linear }), -1, false);
  }, [phase]);

  const driftingCenter = useAnimatedProps(() => ({
    cx: `${50 + Math.sin(phase.value) * 12}%`,
    cy: `${45 + Math.cos(phase.value) * 9}%`,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="butter" cx="50%" cy="6%" r="60%">
            <Stop offset="0" stopColor={BUTTER} stopOpacity={0.6} />
            <Stop offset="1" stopColor={BUTTER} stopOpacity={0} />
          </RadialGradient>
          <AnimatedRadialGradient id="peach" animatedProps={driftingCenter} r="62%">
            <Stop offset="0" stopColor={PEACH} stopOpacity={0.75} />
            <Stop offset="1" stopColor={PEACH} stopOpacity={0} />
          </AnimatedRadialGradient>
          <RadialGradient id="lilac" cx="88%" cy="40%" r="52%">
            <Stop offset="0" stopColor={LILAC} stopOpacity={0.5} />
            <Stop offset="1" stopColor={LILAC} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={CREAM} />
        <Rect x={0} y={0} width={width} height={height} fill="url(#butter)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#peach)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#lilac)" />
      </Svg>
    </View>
  );
}
