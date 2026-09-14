import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/context/ThemeContext';
import { useHabitStore } from '@/store';

export default function DeletedHabitsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const habits = useHabitStore(s => s.habits);
  const unarchiveHabit = useHabitStore(s => s.unarchiveHabit);

  const [query, setQuery] = useState('');

  const deletedHabits = useMemo(
    () =>
      habits
        .filter(h => h.archivedAt != null)
        .sort((a, b) => (b.archivedAt! > a.archivedAt! ? 1 : -1)),
    [habits],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deletedHabits;
    return deletedHabits.filter(h => h.name.toLowerCase().includes(q));
  }, [deletedHabits, query]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[s.title, { color: colors.text1 }]}>{t('deletedHabits.title')}</Text>

        <Text style={[s.subtitle, { color: colors.text3 }]}>
          {t('deletedHabits.subtitle')}
        </Text>

        <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.separator }]}>
          <TextInput
            placeholder={t('deletedHabits.searchPlaceholder')}
            placeholderTextColor={colors.text3}
            value={query}
            onChangeText={setQuery}
            style={[
              s.searchInput,
              {
                color: colors.text1,
                backgroundColor: colors.bgSecondary,
                borderColor: colors.separatorLight,
              },
            ]}
          />

          {filtered.length === 0 ? (
            <Text style={[s.emptyText, { color: colors.text2 }]}>{t('deletedHabits.empty')}</Text>
          ) : (
            filtered.map(h => (
              <View key={h.id} style={[s.row, { borderBottomColor: colors.separator }]}>
                <View style={s.left}>
                  <Text style={s.icon}>{h.icon}</Text>
                  <Text style={[s.name, { color: colors.text1 }]} numberOfLines={1}>
                    {h.name}
                  </Text>
                </View>
                <Pressable
                  onPress={() => unarchiveHabit(h.id)}
                  style={({ pressed }) => [
                    s.restoreBtn,
                    { backgroundColor: colors.teal },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[s.restoreText, { color: colors.white }]}>{t('deletedHabits.reactivate')}</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
    fontSize: 15,
  },
  emptyText: {
    paddingVertical: 8,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  icon: {
    fontSize: 20,
  },
  name: {
    flex: 1,
    fontSize: 16,
  },
  restoreBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  restoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

