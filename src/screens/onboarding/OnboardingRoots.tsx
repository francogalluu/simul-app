import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import * as Haptics from 'expo-haptics';

const DEFAULT_ITEMS = [
  'Completely Free',
  'No ads. Ever.',
  "We don't store your data.",
  'Full analytics included.',
  'Always free. Forever.',
];

const INITIAL_DELAY = 400;
const TRUNK_DURATION = 3000;
const BRANCH_GROW_MS = 500;
const TEXT_FADE_MS = 450;
const BRANCH_TO_TEXT_GAP_MS = 200;
const BRANCH_BUFFER_MS = 100;
const BUTTON_EXTRA_DELAY = 400;
const BUTTON_DURATION = 500;

const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN_OUT = Easing.inOut(Easing.quad);

const TRUNK_LEFT_RATIO = 0.12;
const TRUNK_TOP_RATIO = 0.14;
const TRUNK_BOTTOM_RATIO = 0.74;
const TRUNK_W = 2;
const BRANCH_LEN = 28;
const DOT_SIZE = 6;
const TEXT_GAP = 16;

const ROOT_CLR = '#6BA89A';
const BG = '#FAFAFA';
const TEXT_CLR = '#2A2A2A';
const BTN_BG = '#008080';

type Props = {
  items?: string[];
  onContinue: () => void;
};

type BranchProps = {
  text: string;
  yPosition: number;
  delay: number;
  trunkLeft: number;
  maxTextWidth: number;
};

function RootBranch({ text, yPosition, delay, trunkLeft, maxTextWidth }: BranchProps) {
  const branchProg = useSharedValue(0);
  const textProg = useSharedValue(0);

  useEffect(() => {
    branchProg.value = withDelay(
      delay,
      withTiming(1, { duration: BRANCH_GROW_MS, easing: EASE_OUT }),
    );
    textProg.value = withDelay(
      delay + BRANCH_TO_TEXT_GAP_MS,
      withTiming(1, { duration: TEXT_FADE_MS, easing: EASE_OUT }),
    );

    const timer = setTimeout(() => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: branchProg.value,
    transform: [
      { scale: interpolate(branchProg.value, [0, 0.6, 1], [0, 1.2, 1]) },
    ],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: interpolate(branchProg.value, [0, 1], [0, BRANCH_LEN]),
    opacity: branchProg.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textProg.value,
    transform: [
      { translateX: interpolate(textProg.value, [0, 1], [-10, 0]) },
    ],
  }));

  return (
    <View
      style={[
        s.branchRow,
        {
          top: yPosition - DOT_SIZE / 2,
          left: trunkLeft + TRUNK_W / 2 - DOT_SIZE / 2,
        },
      ]}
    >
      <Animated.View style={[s.dot, dotStyle]} />
      <Animated.View style={[s.branchLine, lineStyle]} />
      <Animated.Text
        style={[s.branchText, textStyle, { maxWidth: maxTextWidth }]}
        numberOfLines={2}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

export default function OnboardingRoots({
  items = DEFAULT_ITEMS,
  onContinue,
}: Props) {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
  });

  const { width: screenW, height: screenH } = useWindowDimensions();

  const layout = useMemo(() => {
    const trunkLeft = screenW * TRUNK_LEFT_RATIO;
    const trunkTop = screenH * TRUNK_TOP_RATIO;
    const trunkHeight = screenH * (TRUNK_BOTTOM_RATIO - TRUNK_TOP_RATIO);
    const textLeftEdge =
      trunkLeft + TRUNK_W / 2 + DOT_SIZE / 2 + BRANCH_LEN + TEXT_GAP;
    const maxTextWidth = screenW - textLeftEdge - 24;

    const branches = items.map((text, i) => {
      const fraction = (i + 1) / (items.length + 1);
      const y = fraction * trunkHeight;
      const delay =
        INITIAL_DELAY + fraction * TRUNK_DURATION + BRANCH_BUFFER_MS;
      return { text, y, delay };
    });

    const last = branches[branches.length - 1];
    const buttonDelay = last
      ? last.delay + BRANCH_GROW_MS + TEXT_FADE_MS + BUTTON_EXTRA_DELAY
      : INITIAL_DELAY + TRUNK_DURATION;

    return { trunkLeft, trunkTop, trunkHeight, maxTextWidth, branches, buttonDelay };
  }, [screenW, screenH, items]);

  const trunkProgress = useSharedValue(0);
  const buttonProgress = useSharedValue(0);

  useEffect(() => {
    if (!fontsLoaded) return;

    trunkProgress.value = withDelay(
      INITIAL_DELAY,
      withTiming(1, { duration: TRUNK_DURATION, easing: EASE_IN_OUT }),
    );

    buttonProgress.value = withDelay(
      layout.buttonDelay,
      withTiming(1, { duration: BUTTON_DURATION, easing: EASE_OUT }),
    );
  }, [fontsLoaded]);

  const trunkStyle = useAnimatedStyle(() => ({
    height: interpolate(trunkProgress.value, [0, 1], [0, layout.trunkHeight]),
    opacity: interpolate(trunkProgress.value, [0, 0.02, 1], [0, 0.5, 1]),
  }));

  const btnStyle = useAnimatedStyle(() => ({
    opacity: buttonProgress.value,
  }));

  if (!fontsLoaded) return <View style={s.container} />;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.rootArea}>
        <Animated.View
          style={[
            s.trunk,
            { left: layout.trunkLeft, top: layout.trunkTop },
            trunkStyle,
          ]}
        />

        {layout.branches.map((b, i) => (
          <RootBranch
            key={i}
            text={b.text}
            yPosition={layout.trunkTop + b.y}
            delay={b.delay}
            trunkLeft={layout.trunkLeft}
            maxTextWidth={layout.maxTextWidth}
          />
        ))}
      </View>

      <Animated.View style={[s.buttonWrap, btnStyle]}>
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [s.button, pressed && s.buttonPressed]}
        >
          <Text style={s.buttonText}>Continue</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  rootArea: {
    flex: 1,
  },
  trunk: {
    position: 'absolute',
    width: TRUNK_W,
    backgroundColor: ROOT_CLR,
    borderRadius: TRUNK_W,
  },
  branchRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: ROOT_CLR,
  },
  branchLine: {
    height: TRUNK_W,
    backgroundColor: ROOT_CLR,
    borderRadius: TRUNK_W,
    marginLeft: -1,
  },
  branchText: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 18,
    color: TEXT_CLR,
    marginLeft: TEXT_GAP,
    lineHeight: 26,
  },
  buttonWrap: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  button: {
    backgroundColor: BTN_BG,
    paddingHorizontal: 48,
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
