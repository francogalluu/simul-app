import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { usePeople, type Person } from '@/lib/people';

/**
 * Round avatar: the person's uploaded photo if they have one, otherwise their
 * initial on their chosen color. `style` sets size/position/border like an
 * Image would (existing call sites lay these out in overlapping stacks).
 */
export function Avatar({ person, size, style }: { person: Person; size: number; style?: StyleProp<ViewStyle> }) {
  const p = usePeople()[person];
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(p.avatarUrl) && !imageFailed;

  return (
    <View
      accessibilityLabel={p.name}
      style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: p.color, opacity: p.joined ? 1 : 0.45 }, style]}
    >
      {showImage ? (
        <Image source={{ uri: p.avatarUrl! }} style={StyleSheet.absoluteFill} onError={() => setImageFailed(true)} />
      ) : (
        <Text style={[styles.initial, { fontSize: Math.max(7, Math.round(size * 0.45)) }]} allowFontScaling={false}>
          {p.initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '800',
    includeFontPadding: false,
  },
});
