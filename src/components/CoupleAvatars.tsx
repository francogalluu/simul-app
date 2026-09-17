import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Avatar } from './Avatar';
import { usePeople } from '@/lib/people';

/**
 * The two avatars as one unit: overlapping, wrapped by a single ring that
 * blends from one person's color into the other's. Where only one person has
 * joined so far, the ring is theirs alone (the partner's slot stays faint).
 */
export function CoupleAvatars({
  size = 34,
  overlap = 0.45,
  ring = true,
  style,
}: {
  size?: number;
  /** Fraction of `size` the second avatar overlaps the first. */
  overlap?: number;
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const people = usePeople();
  const step = size * (1 - overlap);
  const width = size + step;
  const pad = ring ? 3 : 0;
  const totalW = width + pad * 2;
  const totalH = size + pad * 2;
  const r = size / 2 + pad;
  const stroke = 2;
  const colorA = people.A.color;
  const colorB = people.S.joined ? people.S.color : people.A.color;

  // A stadium (pill) outline around both circles: two arcs joined by straight lines.
  const cx1 = r;
  const cx2 = r + step;
  const cy = r;
  const rr = r - stroke / 2;
  const d = `M ${cx1} ${cy - rr} L ${cx2} ${cy - rr} A ${rr} ${rr} 0 0 1 ${cx2} ${cy + rr} L ${cx1} ${cy + rr} A ${rr} ${rr} 0 0 1 ${cx1} ${cy - rr} Z`;

  return (
    <View style={[{ width: totalW, height: totalH }, style]}>
      {ring && (
        <Svg width={totalW} height={totalH} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="couple-ring" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colorA} />
              <Stop offset="1" stopColor={colorB} />
            </LinearGradient>
          </Defs>
          <Path d={d} fill="none" stroke="url(#couple-ring)" strokeWidth={stroke} opacity={0.9} />
        </Svg>
      )}
      <Avatar person="A" size={size} style={[styles.avatar, { left: pad, top: pad, borderWidth: 2 }]} />
      <Avatar person="S" size={size} style={[styles.avatar, { left: pad + step, top: pad, borderWidth: 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    position: 'absolute',
    borderColor: '#FFFFFF',
  },
});
