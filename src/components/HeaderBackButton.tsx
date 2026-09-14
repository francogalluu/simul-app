import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { navHeaderItemWrap } from '@/lib/navigationHeaderStyles';

const CIRCLE = 36;
const CHEVRON = 22;
const STROKE = 3;

type Props = {
  onPress: () => void;
  /** Defaults to translated "Back". */
  accessibilityLabel?: string;
};

/**
 * Circular white control + bold rounded chevron (matches native iOS bar look on Frequency, etc.).
 */
export function HeaderBackButton({ onPress, accessibilityLabel }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const label = accessibilityLabel ?? t('common.back');

  return (
    <View style={navHeaderItemWrap}>
      <Pressable
        onPress={onPress}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          styles.circle,
          {
            backgroundColor: isDark ? colors.bgCard : colors.white,
            borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
            borderColor: isDark ? colors.separatorLight : 'transparent',
            ...Platform.select({
              ios: {
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: colors.shadowOpacity,
                shadowRadius: 3,
              },
              android: { elevation: 3 },
              default: {},
            }),
          },
        ]}
      >
        <ChevronLeft
          size={CHEVRON}
          color={colors.teal}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
