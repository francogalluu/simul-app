import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasksStore } from '@/store/tasksStore';
import { useGoalsStore } from '@/store/goalsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { computeAchievements, type Achievement } from '@/lib/achievements';
import { haptic } from '@/lib/haptics';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function AchievementsScreen() {
  const me = useSettingsStore((s) => s.perspective);
  const habits = useTasksStore((s) => s.habits);
  const completions = useTasksStore((s) => s.completions);
  const goals = useGoalsStore((s) => s.goals);
  const [selected, setSelected] = useState<Achievement | null>(null);

  const achievements = useMemo(() => computeAchievements(habits, completions, goals, me), [habits, completions, goals, me]);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const pct = achievements.length ? unlockedCount / achievements.length : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Achievements" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroTitle}>{unlockedCount === 0 ? 'No badges yet' : `${unlockedCount} of ${achievements.length}`}</Text>
            <Text style={styles.heroEmoji}>{unlockedCount === 0 ? '🥚' : unlockedCount === achievements.length ? '👑' : '🏅'}</Text>
          </View>
          <Text style={styles.heroBody}>
            {unlockedCount === 0
              ? 'Complete your first habit to earn one. Some badges stay hidden until you find them.'
              : `${achievements.length - unlockedCount} to go. A few are secret — keep going to reveal them.`}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(pct * 100, unlockedCount ? 6 : 0)}%` }]} />
          </View>
        </View>

        <View style={styles.grid}>
          {achievements.map((a) => (
            <Badge key={a.id} achievement={a} onPress={() => { haptic.tap(); setSelected(a); }} />
          ))}
        </View>
      </ScrollView>

      <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          {selected && (
            <View style={styles.detail}>
              <View style={[styles.detailIconWrap, selected.unlocked ? styles.detailIconUnlocked : selected.secret ? styles.detailIconSecret : styles.detailIconLocked]}>
                <Text style={[styles.detailIcon, !selected.unlocked && !selected.secret && { opacity: 0.35 }]}>
                  {selected.secret && !selected.unlocked ? '?' : selected.icon}
                </Text>
              </View>
              <Text style={styles.detailTitle}>{selected.secret && !selected.unlocked ? 'Secret badge' : selected.title}</Text>
              <Text style={styles.detailBody}>
                {selected.secret && !selected.unlocked ? 'Keep going to reveal this one.' : selected.description}
              </Text>
              {selected.progress && !selected.unlocked && (
                <View style={{ width: '100%', marginTop: 16 }}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${(selected.progress.current / selected.progress.target) * 100}%` }]} />
                  </View>
                  <Text style={styles.detailProgress}>{selected.progress.current} / {selected.progress.target}</Text>
                </View>
              )}
              {selected.unlocked && <Text style={styles.detailUnlocked}>Unlocked ✓</Text>}
              <Pressable onPress={() => setSelected(null)} style={({ pressed }) => [styles.detailClose, pressed && { opacity: 0.7 }]}>
                <Text style={styles.detailCloseText}>Close</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Badge({ achievement: a, onPress }: { achievement: Achievement; onPress: () => void }) {
  const secretLocked = a.secret && !a.unlocked;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.badge, secretLocked && styles.badgeSecret, !a.unlocked && !secretLocked && styles.badgeLocked, pressed && { opacity: 0.8 }]}>
      <View style={[styles.badgeIconWrap, a.unlocked && styles.badgeIconUnlocked, secretLocked && styles.badgeIconSecret]}>
        <Text style={[styles.badgeIcon, !a.unlocked && !secretLocked && { opacity: 0.35 }, secretLocked && { color: '#FFFFFF' }]}>
          {secretLocked ? '?' : a.icon}
        </Text>
      </View>
      <Text style={[styles.badgeTitle, secretLocked && { color: 'rgba(255,255,255,0.7)' }, !a.unlocked && !secretLocked && { color: S.muted }]} numberOfLines={2}>
        {secretLocked ? '???' : a.title}
      </Text>
      {!a.unlocked && !secretLocked && (
        <View style={styles.lock}>
          <Text style={styles.lockText}>🔒</Text>
        </View>
      )}
    </Pressable>
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
  hero: {
    marginTop: 12,
    backgroundColor: S.card,
    borderRadius: 20,
    padding: 18,
    ...cardShadow,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: S.ink900,
  },
  heroEmoji: {
    fontSize: 28,
  },
  heroBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: S.ink500,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: S.lineSoft,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: S.gold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  badge: {
    width: '31%',
    alignItems: 'center',
    gap: 8,
    backgroundColor: S.card,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    minHeight: 124,
    ...cardShadow,
  },
  badgeLocked: {
    backgroundColor: S.cardMuted,
  },
  badgeSecret: {
    backgroundColor: S.black,
  },
  badgeIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: S.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconUnlocked: {
    backgroundColor: S.goldSoft,
    borderWidth: 2,
    borderColor: S.gold,
  },
  badgeIconSecret: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeIcon: {
    fontSize: 26,
    fontFamily: fonts.bold,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: S.ink900,
    textAlign: 'center',
  },
  lock: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  lockText: {
    fontSize: 11,
    opacity: 0.6,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 18, 16, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  detail: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: S.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  detailIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  detailIconUnlocked: {
    backgroundColor: S.goldSoft,
    borderWidth: 3,
    borderColor: S.gold,
  },
  detailIconLocked: {
    backgroundColor: S.bg,
  },
  detailIconSecret: {
    backgroundColor: S.black,
  },
  detailIcon: {
    fontSize: 42,
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
  detailTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: S.ink900,
    textAlign: 'center',
  },
  detailBody: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: S.ink500,
    textAlign: 'center',
  },
  detailProgress: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: S.tertiary,
    textAlign: 'center',
  },
  detailUnlocked: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '800',
    color: S.accentDeep,
  },
  detailClose: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: S.bg,
  },
  detailCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: S.ink700,
  },
});
