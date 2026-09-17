import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { S } from '@/lib/simulTheme';

/**
 * The frosted-glass backing used by the sheet, the toasts and the tab bar:
 * a blur layer under a warm milky tint, so the glass reads as Simul's cream
 * rather than grey.
 *
 * iOS blurs for real. On Android, expo-blur (SDK 57) only blurs when given a
 * `blurTarget` ref to a `BlurTargetView` that wraps the content *behind* the
 * pane — and our panes sit over navigator scenes / the whole app, which
 * isn't a single view we can hand it. So Android gets the library's own
 * fallback (`blurMethod="none"`, a translucent pane) with a slightly stronger
 * tint to keep text legible. Same look, minus the blur.
 */
export function Frost({ intensity = 46, strong, style }: { intensity?: number; strong?: boolean; style?: StyleProp<ViewStyle> }) {
  const android = Platform.OS === 'android';
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {!android && <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: strong || android ? S.glassTintStrong : S.glassTint },
          android && { backgroundColor: strong ? 'rgba(255, 252, 246, 0.96)' : 'rgba(255, 252, 246, 0.93)' },
        ]}
      />
    </View>
  );
}
