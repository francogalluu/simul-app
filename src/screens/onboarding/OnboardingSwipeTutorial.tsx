import React, { useRef, useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Pressable, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';
import { ChevronRight, Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing as REasing,
} from 'react-native-reanimated';

import type { RootStackParamList } from '@/navigation/types';
import { C, F, R, S } from '@/lib/tokens';
import { AnalyticsTutorialContent } from './OnboardingAnalyticsTutorial';
import { ScoreRing } from '@/components/ScoreRing';
import { ConfettiOverlay } from '@/components/ConfettiOverlay';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OnboardingSwipeTutorial'>;

const DEMO_ICON = '💧';
const DELETE_DEMO_ICON = '☕';
const DEMO_TARGET = 8;
const DELETE_DEMO_LIMIT = 2;
const NUDGE_TRANSLATE = -60;
const NUDGE_TRANSLATE_RIGHT = 60;
const NUDGE_DURATION = 600;
const NUDGE_DELAY = 1200;
/** Screen 2 → 3: fade out swipe UI, then fade in analytics (RN Animated so RNGH + nested Animated views fade reliably). */
/** After welcome fades out, swipe tutorial fades in (stack uses animation: 'none'). */
const SWIPE_ENTER_FROM_WELCOME_MS = 520;
const SWIPE_FADE_OUT_MS = 480;
/** Brief beat between “gone” and analytics entering — reads as two steps, not one jump cut. */
const BETWEEN_PHASES_MS = 100;
const ANALYTICS_FADE_IN_MS = 520;
const ANALYTICS_FADE_OUT_TO_ONBOARDING5_MS = 480;

const CHECK_SPRING = { damping: 10, stiffness: 260, mass: 0.6 };
const CARD_SPRING = { damping: 14, stiffness: 300, mass: 0.5 };

function DemoRightAction({ t }: { t: (key: string) => string }) {
  return (
    <View style={[s.rightAction, { backgroundColor: C.teal }]}>
      <Text style={s.actionText}>{t('common.done')}</Text>
    </View>
  );
}

function DemoLeftAction({ t }: { t: (key: string) => string }) {
  return (
    <View style={[s.leftAction, { backgroundColor: '#FF3B30' }]}>
      <Text style={s.actionText}>{t('common.delete')}</Text>
    </View>
  );
}

function AnimatedCheck({ visible, size, color }: { visible: boolean; size: number; color: string }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withDelay(120, withSpring(1, CHECK_SPRING));
      opacity.value = withDelay(120, withTiming(1, { duration: 180 }));
    } else {
      scale.value = withTiming(0.3, { duration: 180, easing: REasing.in(REasing.ease) });
      opacity.value = withTiming(0, { duration: 150, easing: REasing.in(REasing.ease) });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <ReAnimated.View style={[{ position: 'absolute' }, animStyle]}>
      <Check size={size} color={color} strokeWidth={3} />
    </ReAnimated.View>
  );
}

function AnimatedX({ visible, size, color }: { visible: boolean; size: number; color: string }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withDelay(120, withSpring(1, CHECK_SPRING));
      opacity.value = withDelay(120, withTiming(1, { duration: 180 }));
    } else {
      scale.value = withTiming(0.3, { duration: 180, easing: REasing.in(REasing.ease) });
      opacity.value = withTiming(0, { duration: 150, easing: REasing.in(REasing.ease) });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <ReAnimated.View style={[{ position: 'absolute' }, animStyle]}>
      <X size={size} color={color} strokeWidth={3} />
    </ReAnimated.View>
  );
}

export default function OnboardingSwipeTutorial() {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();

  const [showAnalytics, setShowAnalytics] = useState(false);
  /** Starts at 0 so the screen can fade in after OnboardingWelcome fades out (same stack, no push animation). */
  const swipeScreenOpacity = useRef(new Animated.Value(0)).current;
  const analyticsScreenOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(swipeScreenOpacity, {
      toValue: 1,
      duration: SWIPE_ENTER_FROM_WELCOME_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [swipeScreenOpacity]);

  const goToOnboarding5 = useCallback(() => {
    Animated.timing(analyticsScreenOpacity, {
      toValue: 0,
      duration: ANALYTICS_FADE_OUT_TO_ONBOARDING5_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setTimeout(() => navigation.navigate('Onboarding5'), BETWEEN_PHASES_MS);
    });
  }, [navigation, analyticsScreenOpacity]);

  const goToAnalytics = useCallback(() => {
    Animated.timing(swipeScreenOpacity, {
      toValue: 0,
      duration: SWIPE_FADE_OUT_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setTimeout(() => setShowAnalytics(true), BETWEEN_PHASES_MS);
    });
  }, [swipeScreenOpacity]);

  useEffect(() => {
    if (!showAnalytics) return;
    analyticsScreenOpacity.setValue(0);
    Animated.timing(analyticsScreenOpacity, {
      toValue: 1,
      duration: ANALYTICS_FADE_IN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showAnalytics, analyticsScreenOpacity]);

  // Card 1 state
  const swipeRef = useRef<Swipeable>(null);
  const [swiped, setSwiped] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const nudgeAnim = useRef(new Animated.Value(0)).current;

  // Card 2 state
  const deleteSwipeRef = useRef<Swipeable>(null);
  const [deleted, setDeleted] = useState(false);
  const deleteNudgeAnim = useRef(new Animated.Value(0)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const rewardOpacity = useRef(new Animated.Value(0)).current;

  // Card 1 reanimated values
  const cardScale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);
  const chevronOpacity = useSharedValue(1);

  // Card 2 reanimated values
  const card2Scale = useSharedValue(1);
  const deleteBorderOpacity = useSharedValue(0);
  const deleteChevronOpacity = useSharedValue(1);
  const deleteCardDim = useSharedValue(1);

  // Card 1 nudge (left)
  useEffect(() => {
    if (swiped) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(NUDGE_DELAY),
        Animated.timing(nudgeAnim, {
          toValue: NUDGE_TRANSLATE,
          duration: NUDGE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(nudgeAnim, {
          toValue: 0,
          duration: NUDGE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [swiped, nudgeAnim]);

  // Card 2 nudge (right)
  useEffect(() => {
    if (!swiped || deleted) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(NUDGE_DELAY),
        Animated.timing(deleteNudgeAnim, {
          toValue: NUDGE_TRANSLATE_RIGHT,
          duration: NUDGE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(deleteNudgeAnim, {
          toValue: 0,
          duration: NUDGE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [swiped, deleted, deleteNudgeAnim]);

  useEffect(() => {
    if (!deleted) {
      rewardOpacity.setValue(0);
      return;
    }
    rewardOpacity.setValue(0);
    Animated.timing(rewardOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [deleted, rewardOpacity]);

  const handleSwipeOpen = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSwiped(true);
    nudgeAnim.stopAnimation();
    nudgeAnim.setValue(0);
    swipeRef.current?.close();

    cardScale.value = withSequence(
      withSpring(1.025, CARD_SPRING),
      withSpring(1, CARD_SPRING),
    );
    borderOpacity.value = withTiming(1, { duration: 350, easing: REasing.out(REasing.ease) });
    chevronOpacity.value = withTiming(0.4, { duration: 300 });

    Animated.timing(card2Opacity, {
      toValue: 1,
      duration: 400,
      delay: 800,
      useNativeDriver: true,
    }).start();
  };

  const handleDeleteSwipe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowConfetti(true);
    setDeleted(true);
    deleteNudgeAnim.stopAnimation();
    deleteNudgeAnim.setValue(0);
    deleteSwipeRef.current?.close();

    card2Scale.value = withSequence(
      withSpring(1.025, CARD_SPRING),
      withSpring(1, CARD_SPRING),
    );
    deleteBorderOpacity.value = withTiming(1, { duration: 350, easing: REasing.out(REasing.ease) });
    deleteChevronOpacity.value = withTiming(0.4, { duration: 300 });
    if (Platform.OS !== 'android') {
      deleteCardDim.value = withTiming(0.5, { duration: 380, easing: REasing.out(REasing.ease) });
    }
  };

  const handleContinue = () => {
    goToAnalytics();
  };

  const handleSkip = () => {
    goToAnalytics();
  };

  // Card 1 animated styles
  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));
  const iconBorderStyle = useAnimatedStyle(() => ({
    borderWidth: 1.5,
    borderColor: '#34C759',
    opacity: borderOpacity.value,
  }));
  const chevronAnimStyle = useAnimatedStyle(() => ({
    opacity: chevronOpacity.value,
  }));

  // Card 2 animated styles
  const card2AnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: card2Scale.value }],
  }));
  const deleteIconBorderStyle = useAnimatedStyle(() => ({
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    opacity: deleteBorderOpacity.value,
  }));
  const deleteChevronAnimStyle = useAnimatedStyle(() => ({
    opacity: deleteChevronOpacity.value,
  }));
  const deleteCardDimStyle = useAnimatedStyle(() => ({
    opacity: deleteCardDim.value,
  }));

  const renderDeleteCardBody = (isDeleted: boolean) => (
    <ReAnimated.View
      style={[card2AnimStyle, ...(Platform.OS === 'android' ? [] : [deleteCardDimStyle])]}
    >
      <View
        style={[
          s.demoCard,
          Platform.OS === 'android' && isDeleted && s.demoCardAndroidDeleted,
        ]}
      >
        <View style={s.iconWrapper}>
          <View style={s.iconCircle}>
            <ReAnimated.View
              style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }, deleteIconBorderStyle]}
              pointerEvents="none"
            />
            <Text style={s.iconEmoji}>{DELETE_DEMO_ICON}</Text>
          </View>
        </View>

        <View style={s.infoCol}>
          <Text style={[s.habitName, isDeleted && s.habitNameDeleted]} numberOfLines={1}>
            {t('onboarding.swipeTutorialDeleteHabitName')}
          </Text>
          <Text style={[s.progressText, isDeleted && s.progressTextDeleted]}>
            0 / {DELETE_DEMO_LIMIT} {t('onboarding.swipeTutorialDeleteHabitUnit')}
          </Text>
        </View>

        <ScoreRing
          value={isDeleted ? 100 : 0}
          size={48}
          strokeWidth={3}
          radius={20}
          strokeColor={isDeleted ? '#FF3B30' : C.ring}
          animateOnSessionStart={false}
          smoothValueChanges
          renderCenter={() => (
            <View style={s.centerStack}>
              <AnimatedX visible={isDeleted} size={18} color="#FF3B30" />
            </View>
          )}
        />

        <ReAnimated.View style={[s.chevron, deleteChevronAnimStyle]}>
          <ChevronRight size={20} color={C.chevron} strokeWidth={2} />
        </ReAnimated.View>
      </View>
    </ReAnimated.View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.stage}>
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { opacity: swipeScreenOpacity }]}
          pointerEvents={showAnalytics ? 'none' : 'auto'}
          needsOffscreenAlphaCompositing
        >
          <View style={s.container}>
        <View style={s.content}>
          <View style={s.headerText}>
            <Text style={s.title}>{t('onboarding.swipeTutorialTitle')}</Text>
            <Text style={s.subtitle}>{t('onboarding.swipeTutorialSubtitle')}</Text>
          </View>

          <View style={s.middle}>
            {/* Card 1 — swipe left to complete */}
            <View style={s.cardArea}>
              <Animated.View style={{ width: '100%', transform: [{ translateX: swiped ? 0 : nudgeAnim }] }}>
                <Swipeable
                  ref={swipeRef}
                  renderRightActions={() => <DemoRightAction t={t} />}
                  onSwipeableRightOpen={handleSwipeOpen}
                  rightThreshold={42}
                  overshootRight={false}
                  enabled={!swiped}
                  containerStyle={s.swipeContainer}
                >
                  <ReAnimated.View style={cardAnimStyle}>
                    <View style={s.demoCard}>
                      <View style={s.iconWrapper}>
                        <View style={s.iconCircle}>
                          <ReAnimated.View
                            style={[
                              StyleSheet.absoluteFillObject,
                              { borderRadius: 24 },
                              iconBorderStyle,
                            ]}
                            pointerEvents="none"
                          />
                          <Text style={s.iconEmoji}>{DEMO_ICON}</Text>
                        </View>
                      </View>

                      <View style={s.infoCol}>
                        <Text style={s.habitName} numberOfLines={1}>
                          {t('onboarding.swipeTutorialHabitName')}
                        </Text>
                        <Text style={[s.progressText, swiped && s.progressTextDone]}>
                          {swiped ? DEMO_TARGET : 0} / {DEMO_TARGET} {t('onboarding.swipeTutorialHabitUnit')}
                        </Text>
                      </View>

                      <ScoreRing
                        value={swiped ? 100 : 0}
                        size={48}
                        strokeWidth={3}
                        radius={20}
                        strokeColor={swiped ? '#34C759' : C.ring}
                        animateOnSessionStart={false}
                        smoothValueChanges
                        renderCenter={() => (
                          <View style={s.centerStack}>
                            <AnimatedCheck visible={swiped} size={18} color="#34C759" />
                          </View>
                        )}
                      />

                      <ReAnimated.View style={[s.chevron, chevronAnimStyle]}>
                        <ChevronRight size={20} color={C.chevron} strokeWidth={2} />
                      </ReAnimated.View>
                    </View>
                  </ReAnimated.View>
                </Swipeable>
              </Animated.View>

              {!swiped && (
                <View style={s.hintRow}>
                  <Text style={s.hintArrow}>←</Text>
                  <Text style={s.hintText}>{t('onboarding.swipeTutorialHint')}</Text>
                </View>
              )}
            </View>

            {/* Card 2 — swipe right to delete */}
            <Animated.View
              style={[s.card2Wrapper, { opacity: card2Opacity }]}
              pointerEvents={swiped ? 'auto' : 'none'}
            >
              <View style={s.cardArea}>
                <Animated.View style={{ width: '100%', transform: [{ translateX: deleted ? 0 : deleteNudgeAnim }] }}>
                  <Swipeable
                    ref={deleteSwipeRef}
                    renderLeftActions={deleted ? undefined : () => <DemoLeftAction t={t} />}
                    onSwipeableLeftOpen={handleDeleteSwipe}
                    leftThreshold={42}
                    overshootLeft={false}
                    enabled={!deleted}
                    containerStyle={s.swipeContainer}
                  >
                    {renderDeleteCardBody(deleted)}
                  </Swipeable>
                </Animated.View>

                {swiped && !deleted && (
                  <View style={s.hintRow}>
                    <Text style={s.hintText}>{t('onboarding.swipeTutorialDeleteHint')}</Text>
                    <Text style={s.hintArrowRight}>→</Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {deleted && (
              <Animated.View style={[s.successWrap, { opacity: rewardOpacity }]}>
                <Text style={s.successText}>{t('onboarding.swipeTutorialReward')}</Text>
              </Animated.View>
            )}
          </View>
        </View>

        <View style={s.footer}>
          {!swiped && (
            <Pressable onPress={handleSkip} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Text style={s.skipText}>{t('onboarding.swipeTutorialSkip')}</Text>
            </Pressable>
          )}
          {swiped && (
            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => [s.primaryButton, pressed && { opacity: 0.9 }]}
            >
              <Text style={s.primaryButtonText}>{t('onboarding.swipeTutorialContinue')}</Text>
            </Pressable>
          )}
        </View>
          </View>
        </Animated.View>

        {showAnalytics && (
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { opacity: analyticsScreenOpacity }]}
            pointerEvents="auto"
            needsOffscreenAlphaCompositing
          >
            <AnalyticsTutorialContent onContinue={goToOnboarding5} />
          </Animated.View>
        )}
      </View>
      {showConfetti && <ConfettiOverlay onComplete={() => setShowConfetti(false)} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  stage: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },

  content: { flex: 1, paddingTop: 32, alignItems: 'center' },
  headerText: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: F.screenTitle,
    fontWeight: '700',
    color: C.text1,
    textAlign: 'center',
    marginBottom: 18,
  },
  subtitle: {
    fontSize: F.label,
    color: C.text3,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },

  middle: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  cardArea: { width: '100%', alignItems: 'center' },
  swipeContainer: { overflow: 'visible', width: '100%' },

  card2Wrapper: {
    width: '100%',
    marginTop: 20,
  },

  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: C.bgCard,
    ...S.card,
  },
  /** Android: avoid parent opacity + elevation compositing glitch when “deleted”. */
  demoCardAndroidDeleted: {
    backgroundColor: '#E8E8EA',
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  iconWrapper: {
    marginRight: 14,
    width: 48,
    height: 48,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  iconEmoji: { fontSize: 26 },
  infoCol: { flex: 1, minWidth: 0 },
  habitName: {
    fontSize: 17,
    fontWeight: '500',
    color: C.text1,
    marginBottom: 2,
  },
  habitNameDeleted: {
    textDecorationLine: 'line-through',
    color: C.text3,
  },
  progressText: {
    fontSize: 15,
    color: C.text2,
  },
  progressTextDone: {
    color: '#34C759',
  },
  progressTextDeleted: {
    color: C.text3,
  },
  centerStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { marginLeft: 8 },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  hintArrow: {
    fontSize: 18,
    color: C.teal,
    fontWeight: '600',
  },
  hintArrowRight: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: '600',
  },
  hintText: {
    fontSize: F.body,
    color: C.text2,
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

  rightAction: {
    width: 90,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  leftAction: {
    width: 90,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
