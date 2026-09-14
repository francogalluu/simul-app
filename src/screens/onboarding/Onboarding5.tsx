import React, { useCallback, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList, OnboardingCategory } from '@/navigation/types';
import { C, F, R, S } from '@/lib/tokens';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding5'>;

const CATEGORY_KEYS: Record<OnboardingCategory, string> = {
  'health-fitness': 'onboarding.categoryHealthFitness',
  'mind-mood': 'onboarding.categoryMindMood',
  'career-study': 'onboarding.categoryCareerStudy',
  'home-organization': 'onboarding.categoryHomeOrganization',
  finances: 'onboarding.categoryFinances',
  relationships: 'onboarding.categoryRelationships',
  'creativity-hobbies': 'onboarding.categoryCreativityHobbies',
};

const CATEGORIES: { key: OnboardingCategory; emoji: string }[] = [
  { key: 'health-fitness', emoji: '❤️' },
  { key: 'mind-mood', emoji: '🧘' },
  { key: 'career-study', emoji: '🎯' },
  { key: 'home-organization', emoji: '🏠' },
  { key: 'finances', emoji: '💰' },
  { key: 'relationships', emoji: '👥' },
  { key: 'creativity-hobbies', emoji: '🎨' },
];

const TITLE_ENTER_MS = 480;
const CARD_ENTER_MS = 400;
const FIRST_CARD_DELAY_MS = 140;
const CARD_STAGGER_MS = 68;
const TITLE_INITIAL_SHIFT = 14;
const CARD_INITIAL_SHIFT = 18;

export default function Onboarding5() {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(TITLE_INITIAL_SHIFT)).current;
  const cardAnims = useRef(
    CATEGORIES.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(CARD_INITIAL_SHIFT),
    })),
  ).current;

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    const titleAnim = Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: TITLE_ENTER_MS,
        easing,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslate, {
        toValue: 0,
        duration: TITLE_ENTER_MS,
        easing,
        useNativeDriver: true,
      }),
    ]);
    const cardBlocks = cardAnims.map((a, i) =>
      Animated.parallel([
        Animated.timing(a.opacity, {
          toValue: 1,
          duration: CARD_ENTER_MS,
          delay: FIRST_CARD_DELAY_MS + i * CARD_STAGGER_MS,
          easing,
          useNativeDriver: true,
        }),
        Animated.timing(a.translateY, {
          toValue: 0,
          duration: CARD_ENTER_MS,
          delay: FIRST_CARD_DELAY_MS + i * CARD_STAGGER_MS,
          easing,
          useNativeDriver: true,
        }),
      ]),
    );
    Animated.parallel([titleAnim, ...cardBlocks]).start();
  }, []);

  const handleSelect = useCallback(
    (category: OnboardingCategory) => {
      navigation.navigate('NewHabit', {
        screen: 'HabitSource',
        params: {
          onboardingCategory: category,
        },
      });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.container}>
        <View style={s.content}>
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslate }],
            }}
          >
            <Text style={s.title}>{t('onboarding.step5Title')}</Text>
          </Animated.View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
          >
            {CATEGORIES.map((cat, i) => (
              <Animated.View
                key={cat.key}
                style={[
                  s.cardElevated,
                  {
                    opacity: cardAnims[i].opacity,
                    transform: [{ translateY: cardAnims[i].translateY }],
                  },
                ]}
              >
                <Pressable
                  onPress={() => handleSelect(cat.key)}
                  style={({ pressed }) => [s.cardInner, pressed && s.cardPressed]}
                >
                  <Text style={s.cardEmoji}>{cat.emoji}</Text>
                  <Text style={s.cardLabel}>{t(CATEGORY_KEYS[cat.key])}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
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
    paddingHorizontal: 14,
  },
  content: {
    flex: 1,
    paddingTop: 28,
    overflow: 'visible',
  },
  title: {
    fontSize: F.screenTitle,
    fontWeight: '700',
    color: C.text1,
    textAlign: 'center',
    alignSelf: 'stretch',
    marginBottom: 24,
    paddingHorizontal: 0,
    lineHeight: F.screenTitle * 1.25,
  },
  scroll: {
    flex: 1,
    overflow: 'visible',
  },
  scrollContent: {
    // Inset so ScrollView / web overflow doesn't clip S.card shadow on any side
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  // Shadow + transform must live on the same view, or iOS clips the shadow under a transformed parent
  cardElevated: {
    marginBottom: 12,
    backgroundColor: C.bgCard,
    borderRadius: R.cardSm,
    overflow: 'visible',
    ...S.card,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  cardLabel: {
    flex: 1,
    fontSize: F.label,
    fontWeight: '600',
    color: C.text1,
  },
});
