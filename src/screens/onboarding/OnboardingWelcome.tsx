import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import GrowingPlantAnimation from './GrowingPlantAnimation';
import RootsPlantTree from './RootsPlantTree';

// ─── Phase 1 (welcome) entrance timing ──────────────────────────────────────
const P1_TITLE_DELAY = 300;
const P1_TITLE_DUR = 620;
const P1_DEF_DELAY = P1_TITLE_DELAY + P1_TITLE_DUR + 110;
const P1_DEF_DUR = 460;
const P1_BTN_DELAY = P1_DEF_DELAY + P1_DEF_DUR + 150;
const P1_BTN_DUR = 380;
/** Plant grows only after Continue is visible so it reads as grounded from the button. */
const P1_PLANT_DELAY_AFTER_BTN_MS = 120;
/** Shorten welcome plant so it does not crowd the subtitle; scales about the stem base in the SVG. */
const WELCOME_PLANT_VERTICAL_SCALE = 0.78;

// ─── Transition timing ──────────────────────────────────────────────────────
const FADE_DUR = 400;
const LIFT_DELAY = 380;
const LIFT_DUR = 800;
/** Roots screen → swipe demo: fade all UI out, then navigate (matches perceived “blank” beat). */
const ROOTS_EXIT_TO_DEMO_MS = 480;

// ─── Phase 2 (roots) timing ─────────────────────────────────────────────────
const TRUNK_DELAY = 1250;
const TRUNK_DUR = 3000;
const BRANCH_GROW = 500;
const TEXT_FADE = 450;
const BRANCH_TEXT_GAP = 200;
const BRANCH_BUFFER = 100;
const BTN2_EXTRA = 400;
const BTN2_DUR = 500;

// ─── Easing presets ──────────────────────────────────────────────────────────
const E_OUT = Easing.out(Easing.quad);
const E_OUT_C = Easing.out(Easing.cubic);
const E_IO = Easing.inOut(Easing.quad);

// ─── Root layout constants ───────────────────────────────────────────────────
const TRUNK_LEFT_RATIO = 0.18;
const TRUNK_W = 2.5;
const BRANCH_LEN = 30;
const DOT_SZ = 7;
const TEXT_L_GAP = 14;
const TITLE_LIFT_TARGET = 30;
const TITLE_APPROX_H = 70;
const ROOT_TITLE_GAP = 16;
const ROOT_BTN_GAP = 20;
const BTN_AREA_H = 80;
const TITLE_BLOCK_H = 107;
/** Vertical center of each list line (text line box) */
const ROOT_LIST_ROW_OFFSET = 2;
/** Nudge bullets up vs the line box so they sit on the line’s optical center (not the baseline) */
const BULLET_ABOVE_LINE_CENTER = 9;
const BRANCH_LINE_H = 27;
/** Shift list copy up vs the shared row anchor so marker dots align with the cap line’s optical center */
const ROOT_LIST_TEXT_OPTICAL_UP = 4;
/** Extra room for list lines on narrow widths */
const ROOT_LIST_RIGHT_INSET = 8;

// ─── Colors ──────────────────────────────────────────────────────────────────
const BG = '#FAFAFA';
const TEAL = '#008080';
const TEXT1 = '#1A1A1A';
const TEXT2 = '#2A2A2A';

type Props = { onContinue: () => void };
type Phase = 'welcome' | 'transitioning' | 'roots' | 'exiting';

type BranchLabelProps = {
  text: string;
  y: number;
  delay: number;
  textLeft: number;
  maxTextW: number;
};

function RootBranchLabel({ text, y, delay, textLeft, maxTextW }: BranchLabelProps) {
  const tp = useSharedValue(0);

  useEffect(() => {
    tp.value = withDelay(
      delay + BRANCH_TEXT_GAP,
      withTiming(1, { duration: TEXT_FADE, easing: E_OUT_C }),
    );
    const timer = setTimeout(() => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const txtS = useAnimatedStyle(() => ({
    opacity: tp.value,
    transform: [{ translateX: interpolate(tp.value, [0, 1], [-10, 0]) }],
  }));

  return (
    <Animated.Text
      style={[
        s.branchText,
        txtS,
        {
          position: 'absolute',
          left: textLeft,
          top: y - BRANCH_LINE_H / 2 - ROOT_LIST_TEXT_OPTICAL_UP,
          maxWidth: maxTextW,
        },
      ]}
      numberOfLines={3}
    >
      {text}
    </Animated.Text>
  );
}

export default function OnboardingWelcome({ onContinue }: Props) {
  const { t } = useTranslation();
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
  });

  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const safeH = screenH - insets.top - insets.bottom;
  const centerH = safeH - BTN_AREA_H;

  const [phase, setPhase] = useState<Phase>('welcome');
  const [showPlant, setShowPlant] = useState(true);
  /** Y position of the Continue button top within the main screen area (for clipping the plant to “grow” from the button). */
  const [welcomeBtnTopY, setWelcomeBtnTopY] = useState(0);
  const [showRoots, setShowRoots] = useState(false);
  /** When true, second CTA copy is shown — aligned with btnOp fade-in, without enabling press early. */
  const [secondCtaLabel, setSecondCtaLabel] = useState(false);

  const titleIn = useSharedValue(0);
  const defIn = useSharedValue(0);
  const btnOp = useSharedValue(0);
  const plantCover = useSharedValue(0);
  const defOp = useSharedValue(1);
  const lift = useSharedValue(0);
  const trunkProg = useSharedValue(0);
  /** 1 until “Start Tutorial”; animates to 0 so the whole screen fades before opening the swipe tutorial. */
  const screenExitOpacity = useSharedValue(1);

  const titleOffset = (centerH - TITLE_BLOCK_H) / 2 - TITLE_LIFT_TARGET;
  const trunkTop = TITLE_LIFT_TARGET + TITLE_APPROX_H + ROOT_TITLE_GAP;
  const trunkH = centerH - trunkTop - ROOT_BTN_GAP;

  const rootItems = useMemo(
    () => [
      t('onboarding.welcomeRootFree'),
      t('onboarding.welcomeRootNoAds'),
      t('onboarding.welcomeRootPrivacy'),
      t('onboarding.welcomeRootAnalytics'),
      t('onboarding.welcomeRootForever'),
    ],
    [t],
  );

  const rootLayout = useMemo(() => {
    const tLeft = screenW * TRUNK_LEFT_RATIO;
    const textLeftEdge = tLeft + TRUNK_W / 2 + DOT_SZ / 2 + BRANCH_LEN + TEXT_L_GAP;
    /** Center x of list bullets — just left of the copy */
    const bulletX = textLeftEdge - 12;
    const stemX = tLeft + 9;
    const maxTextW = screenW - textLeftEdge - ROOT_LIST_RIGHT_INSET;

    const branches = rootItems.map((text, i) => {
      const frac = (i + 1) / (rootItems.length + 1);
      return {
        text,
        y: frac * trunkH,
        delay: TRUNK_DELAY + frac * TRUNK_DUR + BRANCH_BUFFER,
      };
    });

    const last = branches[branches.length - 1];
    const btn2Delay = last.delay + BRANCH_GROW + TEXT_FADE + BTN2_EXTRA;

    return { tLeft, maxTextW, branches, btn2Delay, textLeftEdge, bulletX, stemX };
  }, [screenW, trunkH, rootItems]);

  const branchYs = useMemo(
    () =>
      rootLayout.branches.map(
        b => trunkTop + b.y + ROOT_LIST_ROW_OFFSET - BULLET_ABOVE_LINE_CENTER,
      ),
    [rootLayout.branches, trunkTop],
  );

  const plantStartDelayMs = P1_BTN_DELAY + P1_BTN_DUR + P1_PLANT_DELAY_AFTER_BTN_MS;

  useEffect(() => {
    if (!fontsLoaded) return;
    titleIn.value = withDelay(P1_TITLE_DELAY, withTiming(1, { duration: P1_TITLE_DUR, easing: E_OUT }));
    defIn.value = withDelay(P1_DEF_DELAY, withTiming(1, { duration: P1_DEF_DUR, easing: E_OUT }));
    btnOp.value = withDelay(P1_BTN_DELAY, withTiming(1, { duration: P1_BTN_DUR, easing: E_OUT }));
  }, [fontsLoaded]);

  const handlePress = useCallback(() => {
    if (phase === 'welcome') {
      setPhase('transitioning');
      setShowRoots(true);

      plantCover.value = withTiming(1, { duration: FADE_DUR, easing: E_OUT });
      defOp.value = withTiming(0, { duration: 350, easing: E_OUT });

      btnOp.value = withSequence(
        withTiming(0, { duration: 300, easing: E_OUT }),
        withDelay(
          rootLayout.btn2Delay - 300,
          withTiming(1, { duration: BTN2_DUR, easing: E_OUT }),
        ),
      );

      lift.value = withDelay(
        LIFT_DELAY,
        withTiming(1, { duration: LIFT_DUR, easing: E_OUT_C }),
      );

      trunkProg.value = withDelay(
        TRUNK_DELAY,
        withTiming(1, { duration: TRUNK_DUR, easing: E_IO }),
      );

      setTimeout(() => setShowPlant(false), FADE_DUR + 50);
      setTimeout(() => setSecondCtaLabel(true), rootLayout.btn2Delay);
      setTimeout(() => setPhase('roots'), rootLayout.btn2Delay + BTN2_DUR);
    } else if (phase === 'roots') {
      setPhase('exiting');
      screenExitOpacity.value = withTiming(
        0,
        { duration: ROOTS_EXIT_TO_DEMO_MS, easing: E_OUT },
        finished => {
          if (finished) runOnJS(onContinue)();
        },
      );
    }
  }, [phase, onContinue, rootLayout, screenExitOpacity]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleIn.value,
    transform: [
      { translateY: interpolate(titleIn.value, [0, 1], [12, 0]) },
      { translateY: interpolate(lift.value, [0, 1], [0, -titleOffset]) },
    ],
  }));

  const defStyle = useAnimatedStyle(() => ({
    opacity: defIn.value * defOp.value,
    transform: [{ translateY: interpolate(defIn.value, [0, 1], [8, 0]) }],
  }));

  const plantCoverStyle = useAnimatedStyle(() => ({
    opacity: plantCover.value,
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    opacity: btnOp.value,
  }));

  const screenExitStyle = useAnimatedStyle(() => ({
    opacity: screenExitOpacity.value,
  }));

  if (!fontsLoaded) return <View style={s.container} />;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <Animated.View style={[s.fill, screenExitStyle]} needsOffscreenAlphaCompositing>
        {showPlant && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: welcomeBtnTopY > 0 ? welcomeBtnTopY : centerH,
            }}
            pointerEvents="none"
          >
            <GrowingPlantAnimation
              startDelayMs={plantStartDelayMs}
              timeScale={0.85}
              verticalScale={WELCOME_PLANT_VERTICAL_SCALE}
            />
          </View>
        )}

        <Animated.View
          style={[StyleSheet.absoluteFill, s.plantCover, plantCoverStyle]}
          pointerEvents="none"
        />

        <View style={s.center}>
          <Animated.Text style={[s.title, titleStyle]}>Fovere</Animated.Text>
          <Animated.Text style={[s.definition, defStyle]}>
            {t('onboarding.welcomeDefinition')}
          </Animated.Text>

          {showRoots && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <RootsPlantTree
                width={screenW}
                height={centerH}
                trunkTop={trunkTop}
                trunkH={trunkH}
                stemX={rootLayout.stemX}
                bulletX={rootLayout.bulletX}
                branchYs={branchYs}
                trunkProg={trunkProg}
                bulletMountDelayMs={TRUNK_DELAY}
              />
              {rootLayout.branches.map((b, i) => (
                <RootBranchLabel
                  key={i}
                  text={b.text}
                  y={trunkTop + b.y + ROOT_LIST_ROW_OFFSET - BULLET_ABOVE_LINE_CENTER}
                  delay={b.delay}
                  textLeft={rootLayout.textLeftEdge}
                  maxTextW={rootLayout.maxTextW}
                />
              ))}
            </View>
          )}
        </View>

        <Animated.View
          style={[s.buttonWrap, btnAnimStyle]}
          onLayout={e => setWelcomeBtnTopY(e.nativeEvent.layout.y)}
        >
          <Pressable
            onPress={handlePress}
            disabled={phase === 'transitioning' || phase === 'exiting'}
            style={({ pressed }) => [s.button, pressed && s.buttonPressed]}
          >
            <Text style={s.buttonText}>
              {phase === 'welcome' || !secondCtaLabel
                ? t('onboarding.welcomeContinue')
                : t('onboarding.welcomeStartTutorial')}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  fill: {
    flex: 1,
  },
  plantCover: {
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 52,
    color: TEXT1,
    letterSpacing: 1,
    marginBottom: 12,
  },
  definition: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 22,
    color: TEXT2,
  },
  branchText: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 19,
    color: TEXT1,
    lineHeight: 27,
    paddingVertical: 0,
    ...Platform.select({
      android: { includeFontPadding: false as const },
      default: {},
    }),
  },
  buttonWrap: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  button: {
    backgroundColor: TEAL,
    paddingHorizontal: 60,
    paddingVertical: 16,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
