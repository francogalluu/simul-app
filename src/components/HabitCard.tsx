import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Check, ChevronRight, TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { getProgressColor, PROGRESS_COLORS } from '@/lib/progressColors';
import { useTheme } from '@/context/ThemeContext';
import { ScoreRing } from '@/components/ScoreRing';
import type { Habit } from '@/types/habit';
import { getHabitUnitLabel } from '@/lib/habitUnitLabel';

// ─── Props ────────────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit: Habit;
  /** Pre-computed value for the viewed date/period */
  currentValue: number;
  /** Pre-computed completion flag */
  isCompleted: boolean;
  /** Whether the viewed date is in the future (read-only, disables interaction) */
  readOnly?: boolean;
  /** Navigate to HabitDetail */
  onPress: () => void;
  /** Compact layout (smaller card for home compact view) */
  compact?: boolean;
}

// ─── Icon ring constants (decorative ring around the habit icon) ──────────────

const ICON_WRAP = 56;
const ICON_INNER = 48;
const ICON_WRAP_COMPACT = 40;
const ICON_INNER_COMPACT = 34;
const ICON_R = 26;
const ICON_R_COMPACT = 18;
const ICON_CIRC = 2 * Math.PI * ICON_R;
const ICON_CIRC_COMPACT = 2 * Math.PI * ICON_R_COMPACT;

// ─── Spring configs ───────────────────────────────────────────────────────────

const CHECK_SPRING = { damping: 10, stiffness: 260, mass: 0.6 };
const CARD_SPRING = { damping: 14, stiffness: 300, mass: 0.5 };

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Thin decorative arc drawn around the habit icon when pct > 0 and not complete */
function IconArc({ pct, color, compact, ringColor }: { pct: number; color: string; compact?: boolean; ringColor: string }) {
  const wrap = compact ? ICON_WRAP_COMPACT : ICON_WRAP;
  const r = compact ? ICON_R_COMPACT : ICON_R;
  const circ = compact ? ICON_CIRC_COMPACT : ICON_CIRC;
  const offset = circ * (1 - pct / 100);
  return (
    <Svg
      width={wrap}
      height={wrap}
      viewBox={`0 0 ${wrap} ${wrap}`}
      style={{ position: 'absolute', top: -4, left: -4, transform: [{ rotate: '-90deg' }] }}
    >
      <Circle
        cx={wrap / 2} cy={wrap / 2} r={r}
        fill="none" stroke={ringColor} strokeWidth={2}
      />
      <Circle
        cx={wrap / 2} cy={wrap / 2} r={r}
        fill="none" stroke={color} strokeWidth={2}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" opacity={0.4}
      />
    </Svg>
  );
}

/** Animated checkmark that pops in / fades out */
function AnimatedCheck({ visible, size, color }: { visible: boolean; size: number; color: string }) {
  const scale = useSharedValue(visible ? 1 : 0);
  const opacity = useSharedValue(visible ? 1 : 0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      scale.value = visible ? 1 : 0;
      opacity.value = visible ? 1 : 0;
      return;
    }
    if (visible) {
      scale.value = withDelay(120, withSpring(1, CHECK_SPRING));
      opacity.value = withDelay(120, withTiming(1, { duration: 180 }));
    } else {
      scale.value = withTiming(0.3, { duration: 180, easing: Easing.in(Easing.ease) });
      opacity.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.ease) });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ position: 'absolute' }, animStyle]}>
      <Check size={size} color={color} strokeWidth={3} />
    </Animated.View>
  );
}

/** Animated wrapper for non-check center content (cross-fades opposite the check) */
function AnimatedCenterContent({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const opacity = useSharedValue(visible ? 1 : 0);
  const scale = useSharedValue(visible ? 1 : 0.7);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      opacity.value = visible ? 1 : 0;
      scale.value = visible ? 1 : 0.7;
      return;
    }
    if (visible) {
      opacity.value = withDelay(200, withTiming(1, { duration: 250 }));
      scale.value = withDelay(200, withTiming(1, { duration: 250 }));
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.7, { duration: 150 });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute' }, animStyle]}>
      {children}
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HabitCard({
  habit,
  currentValue,
  isCompleted,
  readOnly = false,
  onPress,
  compact = false,
}: HabitCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const unitLabel   = getHabitUnitLabel(habit, t);
  const isBreak       = habit.goalType === 'break';
  const isOverLimit   = isBreak && currentValue > habit.target;
  const pct           = Math.min(100, Math.round((currentValue / habit.target) * 100));
  const progressColor = isBreak && !isCompleted
    ? (pct >= 100 ? PROGRESS_COLORS.LOW : pct >= 50 ? PROGRESS_COLORS.MID : PROGRESS_COLORS.MID_LOW)
    : getProgressColor(pct);

  const cardShadow = {
    shadowColor: colors.shadowColor,
    shadowOpacity: colors.shadowOpacity,
    shadowRadius: colors.shadowRadius,
    elevation: 4,
  };
  const cardStyle = compact
    ? [s.card, s.cardCompact, { backgroundColor: colors.bgCard }, cardShadow]
    : [s.card, { backgroundColor: colors.bgCard }, cardShadow];
  const iconWrapStyle = compact ? [s.iconWrapper, s.iconWrapperCompact] : s.iconWrapper;
  const iconCircleStyle = compact ? [s.iconCircle, s.iconCircleCompact, { backgroundColor: colors.bgSecondary }] : [s.iconCircle, { backgroundColor: colors.bgSecondary }];
  const nameStyle = compact ? [s.habitName, s.habitNameCompact, { color: colors.text1 }] : [s.habitName, { color: colors.text1 }];
  const progressStyle = compact ? [s.progressText, s.progressTextCompact, { color: colors.text2 }] : [s.progressText, { color: colors.text2 }];
  const ringSize = compact ? 36 : 48;
  const ringRadius = compact ? 15 : 20;
  const checkSize = compact ? 14 : 18;

  // ── Completion animations ─────────────────────────────────────────────────
  const isFirstRender = useRef(true);
  const cardScale = useSharedValue(1);
  const borderOpacity = useSharedValue(isCompleted && !isOverLimit ? 1 : 0);
  const borderDangerOpacity = useSharedValue(isOverLimit ? 1 : 0);
  const chevronOpacity = useSharedValue(isCompleted ? 0.4 : 1);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Card scale pulse on completion
    if (isCompleted && !isOverLimit) {
      cardScale.value = withSequence(
        withSpring(1.025, CARD_SPRING),
        withSpring(1, CARD_SPRING),
      );
    }

    // Icon border fade in/out
    borderOpacity.value = withTiming(
      isCompleted && !isOverLimit ? 1 : 0,
      { duration: 350, easing: Easing.out(Easing.ease) },
    );
    borderDangerOpacity.value = withTiming(
      isOverLimit ? 1 : 0,
      { duration: 350, easing: Easing.out(Easing.ease) },
    );

    // Chevron dim on complete
    chevronOpacity.value = withTiming(
      isCompleted ? 0.4 : 1,
      { duration: 300 },
    );
  }, [isCompleted, isOverLimit]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const iconBorderAnimStyle = useAnimatedStyle(() => ({
    borderWidth: 1.5,
    borderColor: interpolateColor(
      borderDangerOpacity.value,
      [0, 1],
      [colors.success, colors.danger],
    ),
    opacity: Math.max(borderOpacity.value, borderDangerOpacity.value),
  }));

  const chevronAnimStyle = useAnimatedStyle(() => ({
    opacity: chevronOpacity.value,
  }));

  return (
    <Animated.View style={cardAnimStyle}>
      <Pressable
        onPress={readOnly ? undefined : onPress}
        disabled={readOnly}
        style={({ pressed }) => [
          cardStyle,
          !readOnly && pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={habit.name}
        accessibilityState={{ disabled: readOnly }}
      >
        {/* ── Icon + decorative arc ──────────────────────────────────────── */}
        <View style={iconWrapStyle}>
          {pct > 0 && !isCompleted && (
            <IconArc pct={pct} color={progressColor} compact={compact} ringColor={colors.ring} />
          )}
          <View style={iconCircleStyle}>
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                { borderRadius: compact ? ICON_INNER_COMPACT / 2 : ICON_INNER / 2 },
                iconBorderAnimStyle,
              ]}
              pointerEvents="none"
            />
            <Text style={compact ? [s.iconEmoji, s.iconEmojiCompact] : s.iconEmoji}>{habit.icon}</Text>
          </View>
        </View>

        {/* ── Name + progress text ───────────────────────────────────────── */}
        <View style={s.infoCol}>
          <Text style={nameStyle} numberOfLines={1}>{habit.name}</Text>
          {habit.kind === 'numeric' && (
            <Text style={[progressStyle, isOverLimit && { color: colors.danger }]}>
              {currentValue} / {habit.target}{unitLabel ? ` ${unitLabel}` : ''}
              {isOverLimit ? `  ${t('habitCard.overLimit')}` : ''}
            </Text>
          )}
        </View>

        {/* ── Progress ring (right side) ─────────────────────────────────── */}
        <ScoreRing
          value={isCompleted ? 100 : pct}
          size={ringSize}
          strokeWidth={compact ? 2.5 : 3}
          radius={ringRadius}
          strokeColor={isCompleted ? colors.success : progressColor}
          smoothValueChanges
          renderCenter={(displayPercent) => {
            if (compact) return null;
            const fallbackContent = isBreak && pct >= 100
              ? <TriangleAlert size={checkSize} color={colors.danger} strokeWidth={2.5} />
              : pct > 0
                ? <Text style={[s.ringPct, { color: progressColor }]}>{displayPercent}%</Text>
                : null;

            return (
              <View style={s.centerStack}>
                <AnimatedCheck visible={isCompleted} size={checkSize} color={colors.success} />
                {fallbackContent && (
                  <AnimatedCenterContent visible={!isCompleted}>
                    {fallbackContent}
                  </AnimatedCenterContent>
                )}
              </View>
            );
          }}
        />

        {/* ── Chevron ───────────────────────────────────────────────────── */}
        <Animated.View style={[s.chevron, compact && s.chevronCompact, chevronAnimStyle]}>
          <ChevronRight size={compact ? 16 : 20} color={colors.chevron} strokeWidth={2} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardCompact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 6,
    shadowRadius: 8,
  },

  // Icon
  iconWrapper: {
    marginRight: 14,
    width: ICON_INNER,
    height: ICON_INNER,
    position: 'relative',
  },
  iconWrapperCompact: {
    marginRight: 10,
    width: ICON_INNER_COMPACT,
    height: ICON_INNER_COMPACT,
  },
  iconCircle: {
    width: ICON_INNER,
    height: ICON_INNER,
    borderRadius: ICON_INNER / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircleCompact: {
    width: ICON_INNER_COMPACT,
    height: ICON_INNER_COMPACT,
    borderRadius: ICON_INNER_COMPACT / 2,
  },
  iconEmoji: { fontSize: 26 },
  iconEmojiCompact: { fontSize: 20 },

  // Info column
  infoCol: { flex: 1, minWidth: 0 },
  habitName: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 2,
  },
  habitNameCompact: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 0,
  },
  progressText: {
    fontSize: 15,
    fontWeight: '400',
  },
  progressTextCompact: {
    fontSize: 13,
  },

  // Ring center overlay
  centerStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringPct:    { fontSize: 12, fontWeight: '600' },
  ringPctCompact: { fontSize: 10 },

  // Chevron
  chevron: { marginLeft: 8 },
  chevronCompact: { marginLeft: 4 },
});
