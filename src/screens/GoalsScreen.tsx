import React from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { useGoalsStore, type Goal } from '@/store/goalsStore';
import { PEOPLE } from '@/lib/people';
import { getDateLocale } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';
import { EmptyState } from '@/components/EmptyState';

export default function GoalsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const goals = useGoalsStore((s) => s.goals);
  const addProgress = useGoalsStore((s) => s.addProgress);
  const removeGoal = useGoalsStore((s) => s.removeGoal);

  const active = goals.filter((g) => !g.completedAt);
  const done = goals.filter((g) => g.completedAt);

  const bump = (goal: Goal, delta: number) => {
    const completed = addProgress(goal.id, delta);
    if (completed) {
      haptic.success();
      Alert.alert('Goal reached! 🎉', `You did it — "${goal.title}" is complete.`, [{ text: 'Nice' }]);
    } else {
      haptic.tap();
    }
  };

  const openMenu = (goal: Goal) => {
    haptic.medium();
    Alert.alert(goal.title, undefined, [
      { text: 'Edit', onPress: () => navigation.navigate('AddGoal', { goalId: goal.id }) },
      { text: 'Delete', style: 'destructive', onPress: () => { haptic.warning(); removeGoal(goal.id); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Goals</Text>
            <Text style={styles.subtitle}>
              {goals.length === 0 ? 'The big things, over time' : `${active.length} in progress • ${done.length} done`}
            </Text>
          </View>
          <Pressable accessibilityLabel="Add goal" onPress={() => { haptic.tap(); navigation.navigate('AddGoal'); }} style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85 }]}>
            <Plus color="#FFFFFF" size={22} strokeWidth={2.6} />
          </Pressable>
        </View>

        {goals.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="No goals yet"
            body="Set something bigger than a daily habit — a book count, a savings target, a race to train for."
            actionLabel="Add a goal"
            onAction={() => navigation.navigate('AddGoal')}
          />
        ) : (
          <>
            {active.map((g) => (
              <GoalCard key={g.id} goal={g} onBump={(d) => bump(g, d)} onLongPress={() => openMenu(g)} />
            ))}
            {done.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Completed</Text>
                {done.map((g) => (
                  <GoalCard key={g.id} goal={g} onBump={(d) => bump(g, d)} onLongPress={() => openMenu(g)} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalCard({ goal, onBump, onLongPress }: { goal: Goal; onBump: (delta: number) => void; onLongPress: () => void }) {
  const pct = goal.target > 0 ? Math.min(1, goal.current / goal.target) : 0;
  const isDone = Boolean(goal.completedAt);
  const step = goal.target >= 100 ? 10 : goal.target >= 30 ? 5 : 1;
  const deadline = goal.deadline ? format(new Date(goal.deadline + 'T00:00:00'), 'MMM d, yyyy', { locale: getDateLocale() }) : null;

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} exiting={FadeOut.duration(200)} layout={LinearTransition.springify()}>
      <Pressable onLongPress={onLongPress} delayLongPress={320} style={({ pressed }) => [styles.card, isDone && styles.cardDone, pressed && { opacity: 0.92 }]}>
        <View style={styles.cardTop}>
          <View style={[styles.iconWrap, isDone && { backgroundColor: S.goldSoft }]}>
            <Text style={styles.icon}>{goal.icon}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.goalTitle} numberOfLines={2}>{goal.title}</Text>
            <View style={styles.metaRow}>
              {goal.shared ? (
                <View style={styles.duo}>
                  <Image source={PEOPLE.A.avatar} style={[styles.duoImg, { left: 0 }]} />
                  <Image source={PEOPLE.S.avatar} style={[styles.duoImg, { left: 9 }]} />
                </View>
              ) : null}
              <Text style={styles.meta}>
                {goal.shared ? 'Together' : 'Personal'}
                {deadline ? ` • by ${deadline}` : ''}
              </Text>
            </View>
          </View>
          {isDone ? (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>Done ✓</Text>
            </View>
          ) : (
            <Pressable
              accessibilityLabel={`Add ${step}`}
              onPress={() => onBump(step)}
              hitSlop={6}
              style={({ pressed }) => [styles.bump, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
            >
              <Text style={styles.bumpText}>+{step}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.progressRow}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: isDone ? S.gold : S.accent }]} />
          </View>
          <Text style={styles.progressText}>
            <Text style={styles.progressCurrent}>{goal.current}</Text> / {goal.target} {goal.unit}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: S.bg,
  },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: S.ink900,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: S.tertiary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: S.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: S.tertiary,
    marginTop: 10,
    marginBottom: 10,
  },
  card: {
    backgroundColor: S.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    ...cardShadow,
  },
  cardDone: {
    opacity: 0.8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: S.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 23,
  },
  goalTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: S.ink900,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  duo: {
    width: 23,
    height: 14,
  },
  duoImg: {
    position: 'absolute',
    top: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
    color: S.tertiary,
  },
  bump: {
    minWidth: 48,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: S.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bumpText: {
    fontSize: 14,
    fontWeight: '800',
    color: S.accentDeep,
  },
  doneBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: S.goldSoft,
  },
  doneBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: S.amber,
  },
  progressRow: {
    marginTop: 14,
    gap: 6,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: S.lineSoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: S.tertiary,
  },
  progressCurrent: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: S.ink900,
  },
});
