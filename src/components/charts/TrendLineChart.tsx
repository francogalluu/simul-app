import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type TrendLinePoint = {
  key: string;
  value: number;
  /** @deprecated no longer rendered */
  secondaryValue?: number;
};

const Y_LABELS = [0, 25, 50, 75, 100];
const LABEL_WIDTH = 40; // left gutter for y-axis labels
const RIGHT_PAD = 24;   // breathing room so line never crowds the edge
const TOP_PAD = 14;     // prevent 100% points from being clipped at the top

export function TrendLineChart({
  data,
  height = 180,
  minValue = 0,
  maxValue = 100,
  startLabel,
  middleLabel,
  endLabel,
}: {
  data: TrendLinePoint[];
  height?: number;
  minValue?: number;
  maxValue?: number;
  startLabel?: string;
  middleLabel?: string;
  endLabel?: string;
}) {
  const { colors } = useTheme();
  const [totalWidth, setTotalWidth] = useState(0);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: false }),
        Animated.delay(600),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);
  const pulseR = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [5, 20] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.55, 0.35, 0] });

  const plotWidth = totalWidth - LABEL_WIDTH - RIGHT_PAD;
  const plotHeight = height; // axis labels sit below in their own row

  const yForValue = useCallback(
    (value: number) => {
      const max = Math.max(minValue + 1, maxValue);
      const clamped = Math.max(minValue, Math.min(max, value));
      const ratio = (clamped - minValue) / (max - minValue);
      return TOP_PAD + (plotHeight - TOP_PAD) * (1 - ratio);
    },
    [minValue, maxValue, plotHeight],
  );

  const geometry = useMemo(() => {
    if (data.length === 0 || plotWidth <= 0) return null;
    const step = data.length === 1 ? plotWidth : plotWidth / (data.length - 1);
    const primary = data
      .map((pt, i) => `${LABEL_WIDTH + i * step},${yForValue(pt.value)}`)
      .join(' ');
    const lastX = LABEL_WIDTH + (data.length - 1) * step;
    const lastY = yForValue(data[data.length - 1]?.value ?? 0);
    return { primary, lastX, lastY };
  }, [data, plotWidth, yForValue]);

  return (
    <View>
      {/* Chart area: SVG overlaid with absolute RN labels */}
      <View
        style={[styles.chartWrap, { height: plotHeight }]}
        onLayout={e => {
          const w = e.nativeEvent.layout.width;
          setTotalWidth(prev => (prev === w ? prev : w));
        }}
      >
        {/* Y-axis labels — RN Text positioned absolutely */}
        {totalWidth > 0 && Y_LABELS.map(pct => {
          const y = yForValue(pct);
          return (
            <Text
              key={pct}
              numberOfLines={1}
              style={[
                styles.yLabel,
                { color: colors.text2, top: y - 7 },
              ]}
            >
              {pct}%
            </Text>
          );
        })}

        {/* SVG: grid lines + line + dot */}
        {totalWidth > 0 && geometry && (
          <Svg
            width={totalWidth}
            height={plotHeight}
            style={StyleSheet.absoluteFill}
          >
            {Y_LABELS.map(pct => {
              const y = yForValue(pct);
              return (
                <Line
                  key={pct}
                  x1={LABEL_WIDTH}
                  y1={y}
                  x2={totalWidth - RIGHT_PAD}
                  y2={y}
                  stroke={colors.separator}
                  strokeWidth={pct === 0 ? 1.5 : 1}
                  strokeDasharray={pct === 0 ? undefined : '3 4'}
                />
              );
            })}
            <Polyline
              points={geometry.primary}
              fill="none"
              stroke={colors.success}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Animated pulse ring */}
            <AnimatedCircle
              cx={geometry.lastX}
              cy={geometry.lastY}
              r={pulseR}
              fill={colors.success}
              fillOpacity={pulseOpacity}
            />
            {/* Static halo + solid dot */}
            <Circle cx={geometry.lastX} cy={geometry.lastY} r={7} fill={colors.successSoft} />
            <Circle cx={geometry.lastX} cy={geometry.lastY} r={4} fill={colors.success} />
          </Svg>
        )}
      </View>

      {/* X-axis date labels */}
      <View style={[styles.axisRow, { paddingLeft: LABEL_WIDTH, paddingRight: RIGHT_PAD }]}>
        <Text style={[styles.axisLabel, { color: colors.text2 }]}>{startLabel ?? ''}</Text>
        <Text style={[styles.axisLabel, { color: colors.text2 }]}>{middleLabel ?? ''}</Text>
        <Text style={[styles.axisLabel, { color: colors.text2 }]}>{endLabel ?? ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: { width: '100%' },
  yLabel: {
    position: 'absolute',
    left: 0,
    width: LABEL_WIDTH - 4,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 0,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisLabel: { fontSize: 11, fontWeight: '600' },
});
