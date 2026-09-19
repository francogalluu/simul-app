import { Host } from '@expo/ui/swift-ui';
import { requireNativeView } from 'expo';
import React from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

export type SmoothChartProps = {
  /** One value per point, oldest first. */
  values: number[];
  /** Line colour as `#RRGGBB`. */
  color?: string;
  /** Top of the y axis (the bottom is always 0). */
  maxValue?: number;
  /** Draws a dot on the last point. Default true. */
  showsLastPoint?: boolean;
  style?: StyleProp<ViewStyle>;
};

type NativeChartProps = Omit<SmoothChartProps, 'style'>;

// The native view only exists on iOS; elsewhere `SmoothChart` renders nothing.
const NativeChart: React.ComponentType<NativeChartProps> | null =
  Platform.OS === 'ios' ? requireNativeView('SimulChart', 'SimulChartView') : null;

/** Smooth SwiftUI line chart (Swift Charts, Catmull-Rom curve). */
export function SmoothChart({ style, ...props }: SmoothChartProps) {
  if (!NativeChart) return null;
  return (
    <Host style={style}>
      <NativeChart {...props} />
    </Host>
  );
}
