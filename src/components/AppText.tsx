import React from 'react';
import { Text as RNText, StyleSheet, type Text as RNTextInstance, type TextProps } from 'react-native';

// Mural (github.com/Chuloo/mural) pairs a rounded display face for titles with
// the plain system font for body/subtitle copy — a deliberate two-tier
// hierarchy instead of one default font everywhere. Simul already has its
// distinct display face (Lora, via `fonts.bold` in simulTheme), so this gives
// body/subtitle/label text its own equally deliberate face — Nunito, the same
// one Mural bundles for this exact role on its Android build — instead of
// falling back to whatever the OS happens to render by default.
//
// Expo Google Fonts ships one static font file per weight (there's no single
// variable-weight "Nunito" family RN can fake-bold from), so `fontWeight`
// alone no longer selects a heavier face once a custom fontFamily is set.
// This picks the matching Nunito weight from whatever `fontWeight` a style
// already asks for, so every existing bold label/button stays visually bold —
// just in Nunito instead of the OS default — with zero changes needed at each
// call site. An explicit `fontFamily` (Simul's Lora titles) always wins.
const NUNITO_BY_WEIGHT: Record<string, string> = {
  '100': 'Nunito_400Regular',
  '200': 'Nunito_400Regular',
  '300': 'Nunito_400Regular',
  '400': 'Nunito_400Regular',
  normal: 'Nunito_400Regular',
  '500': 'Nunito_500Medium',
  '600': 'Nunito_600SemiBold',
  '700': 'Nunito_700Bold',
  bold: 'Nunito_700Bold',
  '800': 'Nunito_800ExtraBold',
  '900': 'Nunito_800ExtraBold',
};

export const Text = React.forwardRef<RNTextInstance, TextProps>(function Text({ style, ...rest }, ref) {
  const flat = (StyleSheet.flatten(style) ?? {}) as { fontFamily?: string; fontWeight?: string | number };
  const fontFamily = flat.fontFamily ?? NUNITO_BY_WEIGHT[String(flat.fontWeight ?? '400')] ?? 'Nunito_400Regular';
  return <RNText ref={ref} style={[style, { fontFamily }]} {...rest} />;
});
