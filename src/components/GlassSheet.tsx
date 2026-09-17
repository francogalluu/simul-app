import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { S } from '@/lib/simulTheme';

/**
 * A frosted, draggable bottom sheet — the surface every "tap a thing for more"
 * moment in the app slides up on (habit details, month picker, photo proof).
 *
 * It's a real translucent pane: an `expo-blur` layer under a warm milky tint,
 * with a hairline highlight along the lip so the edge of the glass reads. The
 * sheet springs up from the bottom, can be dragged down to dismiss (with a
 * rubber band when pulled the wrong way), and the scrim fades with it.
 *
 * Children are measured with onLayout, so the sheet is exactly as tall as its
 * content (capped at 92% of the screen — pass `scroll` content inside for more).
 */
export function GlassSheet({
  visible,
  onClose,
  children,
  contentStyle,
  dismissOnBackdrop = true,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  dismissOnBackdrop?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(0);

  // translateY: 0 = fully open; sheetHeight = fully hidden.
  const ty = useSharedValue(screenHeight);
  const dragStart = useSharedValue(0);
  const openProgress = useSharedValue(0);

  const open = useCallback(
    (h: number) => {
      ty.value = h;
      ty.value = withSpring(0, { damping: 26, stiffness: 260, mass: 0.8 });
      openProgress.value = withTiming(1, { duration: 220 });
    },
    [ty, openProgress],
  );

  const finishClose = useCallback(() => setMounted(false), []);

  const close = useCallback(() => {
    openProgress.value = withTiming(0, { duration: 180 });
    ty.value = withTiming(Math.max(sheetHeight, 1), { duration: 200 }, (finished) => {
      if (finished) runOnJS(finishClose)();
    });
  }, [ty, openProgress, sheetHeight, finishClose]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      close();
    }
    // `close` intentionally not a dep: re-running on sheetHeight changes would re-close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const onLayout = useCallback(
    (h: number) => {
      const first = sheetHeight === 0;
      setSheetHeight(h);
      if (first && visible) open(h);
    },
    [sheetHeight, visible, open],
  );

  // When re-shown after a close (same instance), animate open again.
  useEffect(() => {
    if (visible && mounted && sheetHeight > 0) open(sheetHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const requestClose = useCallback(() => onClose(), [onClose]);

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onStart(() => {
      dragStart.value = ty.value;
    })
    .onUpdate((e) => {
      const next = dragStart.value + e.translationY;
      // Rubber band when dragging up past open.
      ty.value = next < 0 ? -Math.pow(-next, 0.72) : next;
      openProgress.value = interpolate(ty.value, [0, sheetHeight || 1], [1, 0], Extrapolation.CLAMP);
    })
    .onEnd((e) => {
      const shouldClose = ty.value > (sheetHeight || 1) * 0.32 || e.velocityY > 900;
      if (shouldClose) {
        runOnJS(requestClose)();
      } else {
        ty.value = withSpring(0, { damping: 26, stiffness: 260, mass: 0.8 });
        openProgress.value = withTiming(1, { duration: 160 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: openProgress.value }));

  if (!mounted) return null;

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={requestClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissOnBackdrop ? requestClose : undefined} />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={(e) => onLayout(e.nativeEvent.layout.height)}
            style={[styles.sheet, { maxHeight: screenHeight * 0.92, paddingBottom: Math.max(insets.bottom, 14) }, sheetStyle]}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 46 : 70}
              tint="light"
              experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint]} />
            <View pointerEvents="none" style={styles.lipHighlight} />
            <View style={styles.handle} />
            <View style={[styles.content, contentStyle]}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: S.scrim,
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 252, 246, 0.35)',
    // Soft lift off the scrim.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  tint: {
    backgroundColor: S.glassTint,
  },
  lipHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: S.glassEdge,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(38, 32, 25, 0.18)',
    marginTop: 10,
    marginBottom: 6,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
});
