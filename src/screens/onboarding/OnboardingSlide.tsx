import React from 'react';
import { View, Image, Text, Pressable, StyleSheet, ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { C, R } from '@/lib/tokens';

export const ONBOARDING_STEPS = 3;

type Props = {
  image: ImageSourcePropType;
  step: number;
  onNext: () => void;
  onBack?: () => void;
  buttonText: string;
};

export default function OnboardingSlide({ image, step, onNext, onBack, buttonText }: Props) {
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.container}>
        <View style={s.headerRow}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              style={({ pressed }) => [s.backButton, pressed && { opacity: 0.7 }]}
            >
              <ChevronLeft size={22} color={C.text1} />
            </Pressable>
          ) : (
            <View style={s.backButton} />
          )}

          <View style={s.progressWrap}>
            {Array.from({ length: ONBOARDING_STEPS }).map((_, i) => (
              <View key={i} style={[s.progressDot, i < step && s.progressDotActive]} />
            ))}
          </View>
        </View>

        <View style={s.imageWrap}>
          <Image source={image} style={s.image} resizeMode="contain" />
        </View>

        <View style={s.footer}>
          <Pressable
            onPress={onNext}
            style={({ pressed }) => [s.button, pressed && { opacity: 0.9 }]}
          >
            <Text style={s.buttonText}>{buttonText}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bgHome,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 26,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.separatorLight,
  },
  progressDotActive: {
    backgroundColor: C.teal,
  },
  imageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    paddingBottom: 24,
    paddingTop: 8,
    alignItems: 'center',
  },
  button: {
    backgroundColor: C.teal,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: R.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
