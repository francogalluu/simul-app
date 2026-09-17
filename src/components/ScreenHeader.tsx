import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { S, fonts, SCREEN_PADDING } from '@/lib/simulTheme';

/** Simple in-screen header: back/close on the left, Lora title centered, optional slot on the right. */
export function ScreenHeader({
  title,
  variant = 'back',
  right,
}: {
  title: string;
  variant?: 'back' | 'close';
  right?: React.ReactNode;
}) {
  const navigation = useNavigation();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={variant === 'back' ? 'Back' : 'Close'}
        onPress={() => navigation.goBack()}
        hitSlop={8}
        style={styles.button}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={S.ink900} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          {variant === 'back' ? <Path d="M15 5l-7 7 7 7" /> : <><Path d="M6 6l12 12" /><Path d="M18 6L6 18" /></>}
        </Svg>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.button}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING - 6,
    paddingTop: 8,
    paddingBottom: 6,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 19,
    color: S.ink900,
  },
});
