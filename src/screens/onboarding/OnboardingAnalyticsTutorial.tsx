import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing as REasing,
} from 'react-native-reanimated';

import { C, F, R } from '@/lib/tokens';
import { BarChartWithTooltip, type ChartBar } from '@/components/charts/BarChartWithTooltip';

const BAR_ANIM_DURATION = 700;
const BAR_STAGGER_DELAY = 150;

const DEMO_BAR_DATA: Omit<ChartBar, 'label'>[] = [
  { key: 'mon', percent: 85, completed: 6, target: 7 },
  { key: 'tue', percent: 57, completed: 4, target: 7 },
  { key: 'wed', percent: 100, completed: 7, target: 7 },
  { key: 'thu', percent: 42, completed: 3, target: 7 },
  { key: 'fri', percent: 71, completed: 5, target: 7 },
  { key: 'sat', percent: 28, completed: 2, target: 7 },
  { key: 'sun', percent: 100, completed: 7, target: 7 },
];

const WEEKDAY_LABEL_KEYS = [
  'wizard.weekdayMon',
  'wizard.weekdayTue',
  'wizard.weekdayWed',
  'wizard.weekdayThu',
  'wizard.weekdayFri',
  'wizard.weekdaySat',
  'wizard.weekdaySun',
] as const;

type Props = {
  onContinue: () => void;
};

/** Analytics onboarding step — embed inside a parent SafeArea (e.g. after crossfade from swipe tutorial). */
export function AnalyticsTutorialContent({ onContinue }: Props) {
  const { t } = useTranslation();

  const demoBars = useMemo(
    () =>
      DEMO_BAR_DATA.map((b, i) => ({
        ...b,
        label: t(WEEKDAY_LABEL_KEYS[i]),
      })),
    [t],
  );

  const [hintVisible, setHintVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const hintOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const successOpacity = useRef(new Animated.Value(0)).current;

  const totalAnimMs =
    (DEMO_BAR_DATA.length - 1) * BAR_STAGGER_DELAY + BAR_ANIM_DURATION + 400;

  useEffect(() => {
    const id = setTimeout(() => {
      setHintVisible(true);
      hintOpacity.value = withTiming(1, { duration: 500, easing: REasing.out(REasing.ease) });
    }, totalAnimMs);
    return () => clearTimeout(id);
  }, []);

  const handlePressIn = useCallback(() => {
    if (hasInteracted) return;
    setHasInteracted(true);
  }, [hasInteracted]);

  useEffect(() => {
    if (!hasInteracted) return;
    const id = setTimeout(() => {
      ctaOpacity.value = withTiming(1, { duration: 400, easing: REasing.out(REasing.ease) });
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 600);
    return () => clearTimeout(id);
  }, [hasInteracted, ctaOpacity, successOpacity]);

  const hintAnimStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));
  const ctaAnimStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value }));

  const getTooltipDateLabel = useCallback(
    (bar: ChartBar) => bar.label,
    [],
  );

  return (
    <View style={s.container}>
      <View style={s.content}>
        <Text style={s.title}>{t('onboarding.analyticsTutorialTitle')}</Text>
        <Text style={s.subtitle}>{t('onboarding.analyticsTutorialSubtitle')}</Text>

        <View style={s.chartArea} onTouchStart={hintVisible ? handlePressIn : undefined}>
          <BarChartWithTooltip
            bars={demoBars}
            chartAreaHeight={220}
            getTooltipDateLabel={getTooltipDateLabel}
            barAnimDuration={BAR_ANIM_DURATION}
            barStaggerDelay={BAR_STAGGER_DELAY}
          />
        </View>

        <ReAnimated.View style={[s.hintRow, hintAnimStyle]} pointerEvents={hintVisible ? 'auto' : 'none'}>
          <Text style={s.hintText}>{t('onboarding.analyticsTutorialHint')}</Text>
        </ReAnimated.View>

        <Animated.View style={[s.successWrap, { opacity: successOpacity }]}>
          <Text style={s.successText}>{t('onboarding.analyticsTutorialSuccess')}</Text>
        </Animated.View>
      </View>

      <View style={s.footer}>
        {!hasInteracted && (
          <Pressable onPress={onContinue} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={s.skipText}>{t('onboarding.swipeTutorialSkip')}</Text>
          </Pressable>
        )}
        {hasInteracted && (
          <ReAnimated.View style={ctaAnimStyle}>
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [s.primaryButton, pressed && { opacity: 0.9 }]}
            >
              <Text style={s.primaryButtonText}>{t('onboarding.swipeTutorialContinue')}</Text>
            </Pressable>
          </ReAnimated.View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14 },
  content: { flex: 1, paddingTop: 32, alignItems: 'center' },
  title: {
    fontSize: F.screenTitle,
    fontWeight: '700',
    color: C.text1,
    textAlign: 'center',
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  subtitle: {
    fontSize: F.label,
    color: C.text3,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 4,
    alignSelf: 'stretch',
  },
  chartArea: {
    width: '100%',
    paddingHorizontal: 4,
  },
  hintRow: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  hintText: {
    fontSize: F.body,
    color: C.text2,
    textAlign: 'center',
    lineHeight: 21,
  },
  successWrap: {
    alignSelf: 'stretch',
    marginTop: 16,
    paddingHorizontal: 24,
  },
  successText: {
    fontSize: F.caption,
    fontWeight: '400',
    color: C.text3,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    paddingBottom: 24,
    paddingTop: 8,
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: F.label,
    fontWeight: '500',
    color: C.text2,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: C.teal,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: R.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
