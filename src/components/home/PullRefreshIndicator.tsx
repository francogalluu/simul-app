import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { S } from '@/lib/simulTheme';

const PULL_DISTANCE = 70;

/**
 * Custom pull-to-refresh visual. The native RefreshControl handles the actual
 * gesture but is made fully transparent (see HomeScreen); this badge holds the
 * real iOS activity indicator. It fades and grows in step with how far you've
 * pulled (the spinner's ticks turn with your finger), animates while the
 * refresh is in flight, then pops away.
 *
 * Fully invisible (opacity 0, not just scaled to nothing) whenever there's no
 * pull and no refresh in progress, so nothing sits on the screen at rest —
 * a scaled-to-zero view can still leave an Android elevation shadow behind,
 * opacity 0 can't.
 */
export function PullRefreshIndicator({ refreshing, pullDistance }: { refreshing: boolean; pullDistance: SharedValue<number> }) {
  const pop = useSharedValue(0); // one-shot "done" bounce, decays back to 0

  useEffect(() => {
    if (!refreshing) pop.value = withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 260 }));
  }, [refreshing, pop]);

  const refreshingSV = useSharedValue(refreshing);
  useEffect(() => {
    refreshingSV.value = refreshing;
  }, [refreshing, refreshingSV]);

  const style = useAnimatedStyle(() => {
    const dragProgress = interpolate(pullDistance.value, [0, PULL_DISTANCE], [0, 1], Extrapolation.CLAMP);
    // Whichever is driving right now: dragging it in, holding it during the
    // fetch, or the little pop as it lets go.
    const visibility = Math.max(dragProgress, refreshingSV.value ? 1 : 0, pop.value);
    const bounce = 1 + pop.value * 0.3;
    return {
      opacity: visibility,
      transform: [
        { scale: (0.5 + dragProgress * 0.5) * bounce },
        // While pulling the ticks turn with the finger; once it's loading the spinner animates itself.
        { rotate: `${refreshingSV.value ? 0 : dragProgress * 180}deg` },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.badge, style]}>
      <ActivityIndicator animating={refreshing} hidesWhenStopped={false} color={S.accentDeep} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    // Clear of the status bar / notch / camera cutout — sits roughly where
    // the top bar's icons are, which is where a finger naturally drags to.
    top: 54,
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: S.card,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
});
