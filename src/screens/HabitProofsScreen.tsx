import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import type { RootStackParamList } from '@/navigation/types';
import { useTasksStore, type Proof } from '@/store/tasksStore';
import { partnerOf, useMe, usePeople, type Person } from '@/lib/people';
import { useKindTranslation } from '@/lib/kind';
import { getDateLocale } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { ProofCard } from '@/components/ProofCard';
import { S, SCREEN_PADDING } from '@/lib/simulTheme';

type Entry = { date: string; person: Person; proof: Proof };

// The photos attached to one habit's completions, newest first. Presented as a native formSheet
// from the edit-habit sheet. The other person approves or rejects the pending ones here.
export default function HabitProofsScreen() {
  const { t } = useKindTranslation();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'HabitProofs'>>();
  const me = useMe();
  const people = usePeople();
  const habit = useTasksStore((s) => s.habits.find((h) => h.id === params.habitId));
  const proofs = useTasksStore((s) => s.proofs);
  const reviewProof = useTasksStore((s) => s.reviewProof);

  React.useEffect(() => {
    if (!habit) navigation.goBack();
  }, [habit, navigation]);

  const entries = useMemo(() => {
    const out: Entry[] = [];
    for (const [date, byHabit] of Object.entries(proofs)) {
      const byPerson = byHabit[params.habitId];
      if (!byPerson) continue;
      for (const person of ['A', 'S'] as Person[]) {
        const proof = byPerson[person];
        if (proof) out.push({ date, person, proof });
      }
    }
    return out.sort((a, b) => b.date.localeCompare(a.date) || (a.person === me ? 1 : -1));
  }, [proofs, params.habitId, me]);

  if (!habit) return null;
  const locale = getDateLocale();
  const hasPendingForMe = entries.some((e) => e.person !== me && e.proof.status === 'pending');

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {entries.length === 0 ? (
        <Text style={styles.empty}>{t('proofs.empty')}</Text>
      ) : (
        <View style={styles.list}>
          {entries.map((e) => (
            <ProofCard
              key={e.proof.id}
              proof={e.proof}
              title={e.person === me ? t('home.you') : t('proofs.from', { name: people[e.person].name })}
              subtitle={format(parseISO(e.date), 'EEEE d MMMM', { locale })}
              canReview={e.person === partnerOf(me)}
              onApprove={() => { haptic.success(); reviewProof(e.proof.id, true); }}
              onReject={() => { haptic.warning(); reviewProof(e.proof.id, false); }}
            />
          ))}
          {hasPendingForMe && <Text style={styles.hint}>{t('proofs.rejectHint')}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: S.bg },
  content: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 32 },
  list: { gap: 16 },
  empty: { marginTop: 40, fontSize: 14, lineHeight: 20, color: S.tertiary, textAlign: 'center' },
  hint: { fontSize: 12, color: S.tertiary, textAlign: 'center', marginTop: 4 },
});
