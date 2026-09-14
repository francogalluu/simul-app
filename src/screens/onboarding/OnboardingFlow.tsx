import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Image,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const SLIDES_EN: readonly ImageSourcePropType[] = [
  require('@/assets/images/onboarding/A02B0F31-51D7-41C6-98E7-1F96962A123C_1_201_a.jpeg'),
  require('@/assets/images/onboarding/7DB6FD4D-C29D-4E4D-B39A-D9074C39A31B_1_201_a.jpeg'),
];

const SLIDES_ES: readonly ImageSourcePropType[] = [
  require('@/assets/images/onboarding/Calendar Spanish.png'),
  require('@/assets/images/onboarding/Analisis Spanish.png'),
];

type OnboardingFlowProps = {
  onComplete?: () => void;
};

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { width } = useWindowDimensions();
  const { t, i18n } = useTranslation();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const slides = useMemo(
    () => (i18n.language === 'es' ? SLIDES_ES : SLIDES_EN),
    [i18n.language],
  );
  const isLastSlide = currentIndex === slides.length - 1;

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / e.nativeEvent.layoutMeasurement.width);
    if (index >= 0 && index < slides.length) {
      setCurrentIndex(index);
    }
  }, [slides.length]);

  const handleMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / e.nativeEvent.layoutMeasurement.width);
    setCurrentIndex(index);
  }, []);

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      onComplete?.();
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }, [currentIndex, isLastSlide, onComplete]);

  const renderSlide = useCallback(
    ({ item }: { item: ImageSourcePropType }) => (
      <View style={[s.slide, { width }]}>
        <View style={s.imageWrap}>
          <Image source={item} style={s.image} resizeMode="contain" />
        </View>
      </View>
    ),
    [width],
  );

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          }, 100);
        }}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      <View style={s.overlay} pointerEvents="box-none">
        <View style={s.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[s.dot, i === currentIndex && s.dotActive]} />
          ))}
        </View>
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [s.button, pressed && s.buttonPressed]}
        >
          <Text style={s.buttonText}>
            {isLastSlide ? t('onboarding.getStarted') : t('onboarding.next')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    flex: 1,
  },
  imageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E1E4E9',
  },
  dotActive: {
    backgroundColor: '#1A1C1E',
  },
  button: {
    backgroundColor: '#008080',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
