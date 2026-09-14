import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

const ITEM_H = 44;
const VISIBLE_ROWS = 5;
const PAD = ((VISIBLE_ROWS - 1) / 2) * ITEM_H;

type WheelColors = {
  text2: string;
  teal: string;
};

type Props = {
  hours: number;
  minutes: number;
  onChange: (hours: number, minutes: number) => void;
  colors: WheelColors;
};

function clampHour(h: number): number {
  if (!Number.isFinite(h)) return 0;
  return Math.max(0, Math.min(24, Math.round(h)));
}

function clampMinute(m: number, hour: number): number {
  if (hour === 24) return 0;
  if (!Number.isFinite(m)) return 0;
  return Math.max(0, Math.min(59, Math.round(m)));
}

function WheelColumn({
  data,
  value,
  onPick,
  colors,
}: {
  data: number[];
  value: number;
  onPick: (v: number) => void;
  colors: WheelColors;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const dataKey = data.join(',');

  const scrollToValue = useCallback((v: number) => {
    const idx = data.indexOf(v);
    if (idx < 0) return;
    scrollRef.current?.scrollTo({ y: idx * ITEM_H, animated: false });
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) scrollToValue(value);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [value, dataKey, scrollToValue]);

  const commitScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const raw = Math.round(y / ITEM_H);
      const idx = Math.max(0, Math.min(data.length - 1, raw));
      const snapped = idx * ITEM_H;
      if (Math.abs(snapped - y) > 0.5) {
        scrollRef.current?.scrollTo({ y: snapped, animated: true });
      }
      const picked = data[idx]!;
      if (picked !== value) onPick(picked);
    },
    [data, onPick, value],
  );

  return (
    <View style={styles.column}>
      <View style={styles.mask} pointerEvents="none">
        <View style={[styles.selectorBar, { borderColor: colors.text2 }]} />
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingVertical: PAD }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={commitScroll}
        onScrollEndDrag={commitScroll}
      >
        {data.map(n => {
          const active = n === value;
          return (
            <View key={n} style={styles.cell}>
              <Text
                style={[
                  styles.cellText,
                  { color: active ? colors.teal : colors.text2 },
                  active && styles.cellTextActive,
                ]}
              >
                {n}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * Inline hour + minute wheels for Android (iOS uses native countdown DateTimePicker).
 */
export function DurationWheelPicker({ hours, minutes, onChange, colors }: Props) {
  const hourData = React.useMemo(() => Array.from({ length: 25 }, (_, i) => i), []);
  const minuteData = React.useMemo(
    () => (hours === 24 ? [0] : Array.from({ length: 60 }, (_, i) => i)),
    [hours],
  );

  const onHourPick = useCallback(
    (h: number) => {
      const ch = clampHour(h);
      if (ch === 24) onChange(24, 0);
      else onChange(ch, clampMinute(minutes, ch));
    },
    [minutes, onChange],
  );

  const onMinutePick = useCallback(
    (m: number) => {
      onChange(clampHour(hours), clampMinute(m, hours));
    },
    [hours, onChange],
  );

  return (
    <View style={styles.row}>
      <View style={styles.wheelBlock}>
        <Text style={[styles.caption, { color: colors.text2 }]}>Hours</Text>
        <WheelColumn data={hourData} value={hours} onPick={onHourPick} colors={colors} />
      </View>
      <View style={styles.wheelBlock}>
        <Text style={[styles.caption, { color: colors.text2 }]}>Minutes</Text>
        <WheelColumn
          key={hours === 24 ? 'min-24' : 'min-0-59'}
          data={minuteData}
          value={minutes}
          onPick={onMinutePick}
          colors={colors}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  wheelBlock: {
    flex: 1,
    alignItems: 'stretch',
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  column: {
    height: ITEM_H * VISIBLE_ROWS,
    position: 'relative',
  },
  mask: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    zIndex: 1,
  },
  selectorBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 4,
    height: ITEM_H,
  },
  scroll: {
    flex: 1,
  },
  cell: {
    height: ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 20,
    fontWeight: '500',
  },
  cellTextActive: {
    fontSize: 22,
    fontWeight: '700',
  },
});
