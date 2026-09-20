import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { HABIT_ICONS } from '@/lib/habitIcons';
import { haptic } from '@/lib/haptics';
import { S, SCREEN_PADDING } from '@/lib/simulTheme';

const COLUMNS = 6;

// Icon grid, presented as a native formSheet from the habit sheet (see RootNavigator). Picking one
// hands it back to the habit sheet through its route params and closes.
export default function IconPickerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'IconPicker'>>();

  const pick = (icon: string) => {
    haptic.tap();
    // Go back to the habit sheet that opened this page (not push a new one) and hand it the icon.
    navigation.popTo('AddHabit', { icon }, { merge: true });
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {HABIT_ICONS.map((emoji) => {
          const selected = emoji === params.current;
          return (
            <Pressable
              key={emoji}
              onPress={() => pick(emoji)}
              style={({ pressed }) => [styles.cell, selected && styles.cellSelected, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: S.bg },
  content: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  cell: {
    width: `${100 / COLUMNS - 1.6}%`,
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: S.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: { borderWidth: 2.5, borderColor: S.accent, backgroundColor: S.accentSoft ?? S.card },
  emoji: { fontSize: 28 },
});
