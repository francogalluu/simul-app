/**
 * HabitSourceStep — first screen when adding a habit.
 * Shows "+ Create a custom habit" button, search bar, and predetermined habits by category.
 * Tapping a predetermined habit pre-fills the wizard and navigates to HabitType.
 */
import React, { useLayoutEffect, useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ChevronRight } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WizardStackParamList } from '@/navigation/types';

import { useWizardStore } from '@/store/wizardStore';
import {
  PREDETERMINED_CATEGORIES,
  searchPredetermined,
  type PredeterminedHabit,
} from '@/lib/predeterminedHabits';
import { capitalizeLabel } from '@/lib/habitUnitLabel';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { R } from '@/lib/tokens';
import {
  navHeaderBarPressable,
  navHeaderItemWrap,
  navHeaderLabelText,
} from '@/lib/navigationHeaderStyles';

type Props = NativeStackScreenProps<WizardStackParamList, 'HabitSource'>;

export default function HabitSourceStep({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { reset, loadPredetermined, setGoalType, setFromOnboarding } = useWizardStore();
  const [query, setQuery] = useState('');
  const goalType = route.params?.goalType;
  const onboardingCategory = route.params?.onboardingCategory;
  /** Onboarding picks a theme only; merged route params may still carry goalType from a prior "add habit". Skip filtering so themed lists show related habits. */
  const goalTypeForSearch = onboardingCategory ? undefined : goalType;

  const categories = useMemo(
    () => searchPredetermined(query, goalTypeForSearch, t, onboardingCategory),
    [query, goalTypeForSearch, t, onboardingCategory],
  );

  useEffect(() => {
    if (goalType) setGoalType(goalType);
  }, [goalType, setGoalType]);

  useEffect(() => {
    setFromOnboarding(!!onboardingCategory);
  }, [onboardingCategory, setFromOnboarding]);

  const handleCancel = useCallback(() => {
    reset();
    navigation.getParent()?.goBack();
  }, [reset, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <View style={navHeaderItemWrap}>
          <Pressable
            onPress={handleCancel}
            hitSlop={12}
            style={({ pressed }) => [navHeaderBarPressable, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[navHeaderLabelText, { color: colors.teal }]}>{t('wizard.cancel')}</Text>
          </Pressable>
        </View>
      ),
      headerRight: () => null,
    });
  }, [navigation, handleCancel]);

  const handleCreateCustom = useCallback(() => {
    const resolvedGoalType = goalType ?? useWizardStore.getState().goalType;
    reset();
    setGoalType(resolvedGoalType);
    // reset() clears fromOnboarding; restore so Save can finish onboarding (same as predetermined path).
    setFromOnboarding(!!onboardingCategory);
    navigation.navigate('HabitType');
  }, [reset, navigation, setFromOnboarding, onboardingCategory, goalType, setGoalType]);

  const handleSelectPredetermined = useCallback(
    (habit: PredeterminedHabit) => {
      loadPredetermined({
        name: t(habit.nameKey),
        icon: habit.icon,
        goalType: habit.goalType,
        kind: habit.kind,
        frequency: habit.frequency,
        target: habit.target,
        unit: habit.unitKey ? capitalizeLabel(t(habit.unitKey)) : '',
        unitKey: habit.unitKey ?? null,
      });
      navigation.navigate('HabitType');
    },
    [loadPredetermined, navigation, t],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={handleCreateCustom}
            style={({ pressed }) => [styles.createCustomBtn, { backgroundColor: colors.teal }, pressed && styles.createCustomBtnPressed]}
          >
            <Plus size={20} color={colors.white} strokeWidth={2.5} />
            <Text style={[styles.createCustomText, { color: colors.white }]}>{t('wizard.createCustom')}</Text>
          </Pressable>

          <View style={styles.searchWrap}>
            <TextInput
              placeholder={t('wizard.searchHabitsPlaceholder')}
              placeholderTextColor={colors.text4}
              value={query}
              onChangeText={setQuery}
              style={[styles.searchInput, { backgroundColor: colors.bgCard, color: colors.text1 }]}
            />
          </View>

          {categories.map((cat) => (
            <View key={cat.titleKey} style={styles.category}>
              <Text style={[styles.categoryTitle, { color: colors.text2 }]}>{t(cat.titleKey)}</Text>
              <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
                {cat.habits.map((habit, index) => (
                  <Pressable
                    key={habit.id}
                    onPress={() => handleSelectPredetermined(habit)}
                    style={({ pressed }) => [
                      styles.habitRow,
                      { borderBottomColor: colors.separatorLight },
                      index === cat.habits.length - 1 && styles.habitRowLast,
                      pressed && { backgroundColor: colors.separator },
                    ]}
                  >
                    <Text style={styles.habitIcon}>{habit.icon}</Text>
                    <Text style={[styles.habitName, { color: colors.text1 }]} numberOfLines={1}>
                      {t(habit.nameKey)}
                    </Text>
                    <ChevronRight size={18} color={colors.chevron} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  createCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: R.cardSm,
    marginBottom: 16,
  },
  createCustomBtnPressed: {
    opacity: 0.9,
  },
  createCustomText: {
    fontSize: 17,
    fontWeight: '600',
  },
  searchWrap: {
    marginBottom: 20,
  },
  searchInput: {
    borderRadius: R.cardSm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  category: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: R.cardSm,
    overflow: 'hidden',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  habitRowLast: {
    borderBottomWidth: 0,
  },
  habitIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  habitName: {
    flex: 1,
    fontSize: 17,
  },
});
