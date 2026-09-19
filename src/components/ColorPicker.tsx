import React from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AVATAR_COLORS } from '@/lib/avatarColors';
import { haptic } from '@/lib/haptics';
import { NativeColorPicker } from '@/components/NativeControls';

function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 12l5 5L20 6" />
    </Svg>
  );
}

/** Row of swatches from the curated palette, plus the native iOS color picker for custom colors. */
export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {AVATAR_COLORS.map((color) => {
        const selected = color.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={color}
            accessibilityState={{ selected }}
            onPress={() => { if (!selected) { haptic.tap(); onChange(color); } }}
            hitSlop={4}
            style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchSelected]}
          >
            {selected && <CheckIcon />}
          </Pressable>
        );
      })}
      <NativeColorPicker value={value} onChange={(hex) => { haptic.tap(); onChange(hex); }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});
