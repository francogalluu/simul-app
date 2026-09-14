import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/context/ThemeContext';

type InfoTab = 'scoring' | 'breakHabits' | 'frequencies' | 'streaks';

export default function HabitsScoringScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InfoTab>('scoring');

  const section = (titleKey: string, paragraphKeys: string[]) => (
    <View key={titleKey} style={[s.card, { backgroundColor: colors.bgCard }]}>
      <Text style={[s.sectionTitle, { color: colors.text1 }]}>{t(`habitsScoring.${titleKey}`)}</Text>
      {paragraphKeys.map((key) => (
        <Text key={key} style={[s.paragraph, { color: colors.text1 }]}>
          {t(`habitsScoring.${key}`)}
        </Text>
      ))}
    </View>
  );

  const tabs = useMemo(
    () => [
      { id: 'scoring' as const, labelKey: 'tabScoring' },
      { id: 'breakHabits' as const, labelKey: 'tabBreakHabits' },
      { id: 'frequencies' as const, labelKey: 'tabFrequencies' },
      { id: 'streaks' as const, labelKey: 'tabStreaks' },
    ],
    [],
  );

  const renderTabContent = () => {
    if (activeTab === 'scoring') {
      return (
        <>
          {section('pointsTitle', ['pointsIntro', 'pointsGood', 'pointsBad'])}
          {section('penaltiesTitle', ['penaltiesIntro', 'penaltiesFormula', 'penaltiesExample'])}
          <View style={[s.card, { backgroundColor: colors.bgCard }]}>
            <Text style={[s.paragraph, { color: colors.text1 }]}>{t('habitsScoring.homeRingNote')}</Text>
          </View>
        </>
      );
    }

    if (activeTab === 'breakHabits') {
      return section('badHabitsTitle', [
        'badHabitsIntro',
        'badHabitsDaily',
        'badHabitsWeekly',
        'badHabitsMonthly',
        'badHabitsBoolean',
      ]);
    }

    if (activeTab === 'frequencies') {
      return (
        <>
          {section('dailyHabitsTitle', ['dailyHabitsIntro'])}
          {section('weeklyHabitsTitle', ['weeklyHabitsIntro', 'weeklyHabitsProgress', 'weeklyHabitsReminder'])}
          {section('monthlyHabitsTitle', ['monthlyHabitsIntro'])}
        </>
      );
    }

    return section('streaksTitle', [
      'streaksIntro',
      'streaksDaily',
      'streaksWeekly',
      'streaksMonthly',
      'streaksExample',
    ]);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[s.title, { color: colors.text1 }]}>{t('habitsScoring.title')}</Text>
        <Text style={[s.subtitle, { color: colors.text2 }]}>{t('habitsScoring.menuHint')}</Text>

        <View style={s.tabsRow}>
          {tabs.map(tab => {
            const selected = tab.id === activeTab;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={({ pressed }) => [
                  s.tabButton,
                  {
                    backgroundColor: selected ? colors.tealSoft : colors.bgCard,
                    borderColor: selected ? colors.teal : colors.border,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    s.tabLabel,
                    { color: selected ? colors.teal : colors.text2 },
                  ]}
                >
                  {t(`habitsScoring.${tab.labelKey}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {renderTabContent()}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tabButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
});
