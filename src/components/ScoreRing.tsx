/**
 * Shared animated score ring. Used by Home, Analytics, Calendar, Habit Detail, HabitCard.
 * Animates from 0 → value once per app session per animationSlot when animateOnSessionStart is true.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getProgressColor } from '@/lib/progressColors';
import { useTheme } from '@/context/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ANIM_DURATION_MS = 550;
const ANIM_EASING = Easing.out(Easing.ease);

/** Per-slot session flags. Resets on app restart. Enables one animation per slot per session (e.g. 'home', 'calendar'). */
const hasAnimatedBySlot: Record<string, boolean> = {};
const DEFAULT_SLOT = 'default';

export interface ScoreRingProps {
  /** Progress 0–100 */
  value: number;
  /** Outer size (width/height). Default 130. */
  size?: number;
  /** Stroke width. Default 14. */
  strokeWidth?: number;
  /** Radius of the circle. Default size/2 - strokeWidth. */
  radius?: number;
  /** Override ring color. If omitted, uses getProgressColor(value). */
  strokeColor?: string;
  /** When true (default), animate 0→value once per session for this animationSlot. When false, show value immediately. */
  animateOnSessionStart?: boolean;
  /** Animation slot key. Each slot animates once per app session (e.g. 'home', 'calendar'). Omit to use default (single shared animation). */
  animationSlot?: string;
  /** Optional trigger key; when provided, changing this value restarts the animation regardless of session slot. */
  animationTrigger?: number;
  /** When true, value changes after mount animate smoothly instead of snapping. */
  smoothValueChanges?: boolean;
  /** Custom center content. Receives current display percent (integer) during animation. If omitted, shows "{displayPercent}%". */
  renderCenter?: (displayPercent: number) => React.ReactNode;
  /** Text style for default center "%" label (when renderCenter is not used). */
  labelStyle?: object;
  /** Optional extra style when value is 100% (e.g. smaller fontSize so "100%" doesn't touch the ring). */
  labelStyleWhenFull?: object;
}

export function ScoreRing({
  value,
  size = 130,
  strokeWidth = 14,
  radius: radiusProp,
  strokeColor: strokeColorProp,
  animateOnSessionStart = true,
  animationSlot = DEFAULT_SLOT,
  animationTrigger,
  smoothValueChanges = false,
  renderCenter,
  labelStyle,
  labelStyleWhenFull,
}: ScoreRingProps) {
  const { colors } = useTheme();
  const target = Math.max(0, Math.min(100, Math.round(value)));
  const radius = radiusProp ?? size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const progressColor = strokeColorProp ?? getProgressColor(target);
  const trackColor = colors.ring;
  const cx = size / 2;
  const cy = size / 2;

  const slotHasAnimated = hasAnimatedBySlot[animationSlot] === true;
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayPercent, setDisplayPercent] = useState(
    animateOnSessionStart && !slotHasAnimated ? 0 : target,
  );
  const hasAnimatedThisMount = useRef(false);

  const useManualTrigger = typeof animationTrigger === 'number';
  const smoothListenerRef = useRef<string | null>(null);

  // Sync to target when not in "first mount animation" phase
  useEffect(() => {
    if (useManualTrigger) return;
    const slotAlreadyUsed = hasAnimatedBySlot[animationSlot] === true;
    const shouldSync =
      !animateOnSessionStart ||
      hasAnimatedThisMount.current ||
      slotAlreadyUsed;
    if (shouldSync) {
      if (smoothValueChanges) {
        if (smoothListenerRef.current) {
          animValue.removeListener(smoothListenerRef.current);
        }
        smoothListenerRef.current = animValue.addListener(({ value: v }) => {
          setDisplayPercent(Math.round(v));
        });
        Animated.timing(animValue, {
          toValue: target,
          duration: ANIM_DURATION_MS,
          easing: ANIM_EASING,
          useNativeDriver: false,
        }).start(() => {
          if (smoothListenerRef.current) {
            animValue.removeListener(smoothListenerRef.current);
            smoothListenerRef.current = null;
          }
          setDisplayPercent(target);
        });
      } else {
        animValue.setValue(target);
        setDisplayPercent(target);
      }
    }
  }, [animateOnSessionStart, animationSlot, target, animValue, smoothValueChanges]);

  // One-time session animation for this slot
  useEffect(() => {
    if (useManualTrigger) return;
    if (!animateOnSessionStart || hasAnimatedBySlot[animationSlot] || hasAnimatedThisMount.current) return;
    hasAnimatedThisMount.current = true;
    hasAnimatedBySlot[animationSlot] = true;
    animValue.setValue(0);
    setDisplayPercent(0);

    const listenerId = animValue.addListener(({ value: v }) => {
      setDisplayPercent(Math.round(v));
    });

    Animated.timing(animValue, {
      toValue: target,
      duration: ANIM_DURATION_MS,
      easing: ANIM_EASING,
      useNativeDriver: false,
    }).start(() => {
      animValue.removeListener(listenerId);
      setDisplayPercent(target);
    });

    return () => {
      animValue.removeAllListeners();
    };
  }, [animateOnSessionStart, animationSlot, target, useManualTrigger, animValue]);

  // Manual re-triggered animation, used by Home tab presses
  useEffect(() => {
    if (!useManualTrigger) return;
    animValue.setValue(0);
    setDisplayPercent(0);

    const listenerId = animValue.addListener(({ value: v }) => {
      setDisplayPercent(Math.round(v));
    });

    Animated.timing(animValue, {
      toValue: target,
      duration: ANIM_DURATION_MS,
      easing: ANIM_EASING,
      useNativeDriver: false,
    }).start(() => {
      animValue.removeListener(listenerId);
      setDisplayPercent(target);
    });

    return () => {
      animValue.removeAllListeners();
    };
  }, [animationTrigger, target, useManualTrigger, animValue]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.svg}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={styles.center}>
          {renderCenter
            ? renderCenter(displayPercent)
            : (
              <Text style={[
                styles.label,
                labelStyle,
                displayPercent === 100 && labelStyleWhenFull,
                { color: displayPercent > 0 ? colors.text1 : colors.text2 },
              ]}>
                {displayPercent}%
              </Text>
            )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
});
