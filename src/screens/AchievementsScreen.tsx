import React, { useMemo } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { useTasksStore } from '@/store/tasksStore';
import { useGoalsStore } from '@/store/goalsStore';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { NativeProgress } from '@/components/NativeControls';
import { useMe } from '@/lib/people';
import { computeAchievements, type Achievement } from '@/lib/achievements';
import { haptic } from '@/lib/haptics';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';

export default function AchievementsScreen() {
  const { t } = useTranslation();
  const me = useMe();
  const habits = useTasksStore((s) => s.habits);
  const completions = useTasksStore((s) => s.completions);
  const goals = useGoalsStore((s) => s.goals);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const achievements = useMemo(() => computeAchievements(habits, completions, goals, me), [habits, completions, goals, me]);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const pct = achievements.length ? unlockedCount / achievements.length : 0;

  return (
    // The title is the native large-title header (see RootNavigator); the ScrollView is the screen's
    // first child so that header can collapse as it scrolls and handle the top inset.
    <>
      <ScrollView
        style={styles.safe}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroTitle}>{unlockedCount === 0 ? t('achievements.noneYet') : t('achievements.ofTotal', { unlocked: unlockedCount, total: achievements.length })}</Text>
            <Text style={styles.heroEmoji}>{unlockedCount === 0 ? '🥚' : unlockedCount === achievements.length ? '👑' : '🏅'}</Text>
          </View>
          <Text style={styles.heroBody}>
            {unlockedCount === 0
              ? t('achievements.bodyNone')
              : t('achievements.bodyProgress', { count: achievements.length - unlockedCount })}
          </Text>
          <View style={{ marginTop: 14 }}>
            <NativeProgress value={pct} color={S.gold} />
          </View>
        </View>

        <View style={styles.grid}>
          {achievements.map((a) => (
            <Badge key={a.id} achievement={a} onPress={() => { haptic.tap(); navigation.navigate('AchievementDetail', { id: a.id }); }} />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

function Badge({ achievement: a, onPress }: { achievement: Achievement; onPress: () => void }) {
  const { t } = useTranslation();
  const secretLocked = a.secret && !a.unlocked;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.badge, secretLocked && styles.badgeSecret, !a.unlocked && !secretLocked && styles.badgeLocked, pressed && { opacity: 0.8 }]}>
      <View style={[styles.badgeIconWrap, a.unlocked && styles.badgeIconUnlocked, secretLocked && styles.badgeIconSecret]}>
        <Text style={[styles.badgeIcon, !a.unlocked && !secretLocked && { opacity: 0.35 }, secretLocked && { color: '#FFFFFF' }]}>
          {secretLocked ? '?' : a.icon}
        </Text>
      </View>
      <Text style={[styles.badgeTitle, secretLocked && { color: 'rgba(255,255,255,0.7)' }, !a.unlocked && !secretLocked && { color: S.muted }]} numberOfLines={2}>
        {secretLocked ? '???' : t(`achievements.items.${a.id}.title`, { defaultValue: a.title })}
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
});
