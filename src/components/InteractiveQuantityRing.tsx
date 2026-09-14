/**
 * Interactive quantity ring: drag the marker to set value (no keypad).
 * Uses Reanimated shared value so drag updates run on UI thread (smooth); store updates only on gesture end.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedProps, runOnJS } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { getProgressColor, PROGRESS_COLORS } from '@/lib/progressColors';

const RING_SIZE = 220;
const STROKE_WIDTH = 12;
const RADIUS = 80;
const THUMB_R = 14;
const CENTER_X = RING_SIZE / 2;
const CENTER_Y = RING_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Break habits: max value = 10× limit; one full 360° = one limit, ring resets each lap */
const BREAK_MAX_MULTIPLIER = 10;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface InteractiveQuantityRingProps {
  value: number;
  target: number;
  unit?: string;
  isBreak: boolean;
  disabled: boolean;
  strokeColor: string;
  onValueChange: (value: number) => void;
}

export function InteractiveQuantityRing({
  value,
  target,
  unit,
  isBreak,
  disabled,
  strokeColor,
  onValueChange,
}: InteractiveQuantityRingProps) {
  const { colors } = useTheme();
  const hapticEnabled = useSettingsStore((s) => s.hapticFeedback);
  const targetNum = Math.max(1, target);
  const displayValue = useSharedValue(value);
  const lastDragValue = useSharedValue(value);
  const lastHapticValue = useSharedValue(Math.round(value));
  const strokeColorShared = useSharedValue(strokeColor);
  /** Break only: angle (0–360) at last gesture update, for rotation delta */
  const prevAngle = useSharedValue(0);
  const [labelValue, setLabelValue] = useState(value);

  useEffect(() => {
    displayValue.value = value;
    lastDragValue.value = value;
    lastHapticValue.value = Math.round(value);
    strokeColorShared.value = strokeColor;
    setLabelValue(value);
  }, [value, strokeColor, displayValue, lastDragValue, lastHapticValue, strokeColorShared]);

  const setLabel = useCallback((v: number) => {
    setLabelValue(Math.round(v));
  }, []);

  const updateRingColor = useCallback(
    (v: number) => {
      const pct = targetNum > 0 ? (v / targetNum) * 100 : 0;
      const c =
        isBreak && pct >= 100
          ? PROGRESS_COLORS.LOW
          : isBreak && pct < 100
            ? PROGRESS_COLORS.MID
          : !isBreak && pct >= 100
            ? PROGRESS_COLORS.HIGH
            : getProgressColor(pct);
      strokeColorShared.value = c;
    },
    [targetNum, isBreak, strokeColorShared],
  );

  const triggerHaptic = useCallback(() => {
    if (hapticEnabled) Haptics.selectionAsync();
  }, [hapticEnabled]);

  const commitValue = useCallback(
    (v: number) => {
      const rounded = Math.max(0, Math.round(v));
      const capped = isBreak
        ? Math.min(rounded, target * BREAK_MAX_MULTIPLIER)
        : Math.min(rounded, target);
      onValueChange(capped);
    },
    [target, isBreak, onValueChange],
  );

  const maxBreakValue = isBreak ? targetNum * BREAK_MAX_MULTIPLIER : targetNum;

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart((e) => {
      'worklet';
      const dx = e.x - CENTER_X;
      const dy = e.y - CENTER_Y;
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      let progressDeg = (angleDeg + 90 + 360) % 360;
      if (progressDeg < 0) progressDeg += 360;
      const p = progressDeg / 360;
      let v: number;
      if (isBreak) {
        prevAngle.value = progressDeg;
        v = displayValue.value;
      } else {
        v = p * targetNum;
        v = Math.max(0, Math.min(targetNum, v));
        const prev = lastDragValue.value;
        if (prev >= targetNum * 0.95 && v < targetNum * 0.5) v = targetNum;
        else if (prev <= targetNum * 0.05 && v > targetNum * 0.5) v = 0;
        else v = Math.max(0, Math.min(targetNum, v));
      }
      lastDragValue.value = v;
      displayValue.value = v;
      runOnJS(setLabel)(v);
      runOnJS(updateRingColor)(v);
      const rounded = Math.round(v);
      if (rounded !== lastHapticValue.value) {
        lastHapticValue.value = rounded;
        runOnJS(triggerHaptic)();
      }
    })
    .onUpdate((e) => {
      'worklet';
      const dx = e.x - CENTER_X;
      const dy = e.y - CENTER_Y;
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      let progressDeg = (angleDeg + 90 + 360) % 360;
      if (progressDeg < 0) progressDeg += 360;
      let v: number;
      if (isBreak) {
        let delta = progressDeg - prevAngle.value;
        if (delta === -360) delta = 360;
        else if (delta > 180) delta -= 360;
        else if (delta < -180) delta += 360;
        v = displayValue.value + (delta / 360) * targetNum;
        v = Math.max(0, Math.min(maxBreakValue, v));
        prevAngle.value = progressDeg;
      } else {
        const p = progressDeg / 360;
        v = p * targetNum;
        const prev = lastDragValue.value;
        if (prev >= targetNum * 0.95 && v < targetNum * 0.5) v = targetNum;
        else if (prev <= targetNum * 0.05 && v > targetNum * 0.5) v = 0;
        else v = Math.max(0, Math.min(targetNum, v));
      }
      lastDragValue.value = v;
      displayValue.value = v;
      runOnJS(setLabel)(v);
      runOnJS(updateRingColor)(v);
      const rounded = Math.round(v);
      if (rounded !== lastHapticValue.value) {
        lastHapticValue.value = rounded;
        runOnJS(triggerHaptic)();
      }
    })
    .onEnd(() => {
      'worklet';
      runOnJS(commitValue)(displayValue.value);
    });

  // Build: fill = value/target (cap 1). Break: fill = (value/limit)%1 so one full circle = one limit, ring resets each lap.
  const animatedProgressProps = useAnimatedProps(() => {
    'worklet';
    const ratio = targetNum > 0 ? displayValue.value / targetNum : 0;
    const p = isBreak ? ratio - Math.floor(ratio) : Math.min(1, ratio);
    return {
      strokeDashoffset: CIRCUMFERENCE * (1 - p),
      stroke: strokeColorShared.value,
    };
  });

  const animatedThumbProps = useAnimatedProps(() => {
    'worklet';
    const ratio = targetNum > 0 ? displayValue.value / targetNum : 0;
    const p = isBreak ? ratio - Math.floor(ratio) : Math.min(1, ratio);
    const angleRad = p * 2 * Math.PI;
    return {
      cx: CENTER_X + RADIUS * Math.cos(angleRad),
      cy: CENTER_Y + RADIUS * Math.sin(angleRad),
      fill: strokeColorShared.value,
    };
  });

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={styles.svg}>
            <Circle cx={CENTER_X} cy={CENTER_Y} r={RADIUS} fill="none" stroke={colors.ring} strokeWidth={STROKE_WIDTH} />
            <AnimatedCircle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={CIRCUMFERENCE}
              strokeLinecap="round"
              animatedProps={animatedProgressProps}
            />
            {!disabled && (
              <AnimatedCircle
                r={THUMB_R}
                stroke={colors.bgCard}
                strokeWidth={3}
                animatedProps={animatedThumbProps}
              />
            )}
          </Svg>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.center}>
              <Text style={[styles.valueText, { color: colors.text1 }]}>{labelValue}</Text>
              <Text style={[styles.targetText, { color: colors.text4 }]}>/{target}</Text>
              {unit ? <Text style={[styles.unitText, { color: colors.text4 }]}>{unit}</Text> : null}
            </View>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    marginBottom: 20,
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 48,
    fontWeight: '300',
  },
  targetText: {
    fontSize: 28,
  },
  unitText: {
    fontSize: 15,
    marginTop: 4,
  },
});
