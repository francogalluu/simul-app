import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

interface SwipeHintBannerProps {
  onDismiss: () => void;
}

const ARROW_TRAVEL = -14;
const ARROW_DURATION = 800;

export function SwipeHintBanner({ onDismiss }: SwipeHintBannerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enterAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, {
          toValue: ARROW_TRAVEL,
          duration: ARROW_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnim, {
          toValue: 0,
          duration: ARROW_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [arrowAnim]);

  const handleDismiss = () => {
    Animated.timing(enterAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  return (
    <Animated.View
      style={[
        s.container,
        {
          backgroundColor: colors.tealSoft,
          borderColor: colors.teal,
          opacity: enterAnim,
          transform: [{
            translateY: enterAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          }],
        },
      ]}
    >
      <Animated.Text
        style={[s.arrow, { color: colors.teal, transform: [{ translateX: arrowAnim }] }]}
      >
        ←
      </Animated.Text>
      <Text style={[s.text, { color: colors.text1 }]}>
        {t('home.swipeHintText')}
      </Text>
      <Pressable
        onPress={handleDismiss}
        hitSlop={12}
        style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.6 }]}
        accessibilityLabel={t('common.close')}
      >
        <X size={16} color={colors.text2} strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
