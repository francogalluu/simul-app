import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useKindTranslation } from '@/lib/kind';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { useTasksStore } from '@/store/tasksStore';
import { useGoalsStore } from '@/store/goalsStore';
import { useMe } from '@/lib/people';
import { computeAchievements } from '@/lib/achievements';
import { NativeProgress } from '@/components/NativeControls';
import { S, fonts, SCREEN_PADDING } from '@/lib/simulTheme';

// Detail of one badge, presented as a native formSheet (see RootNavigator).
export default function AchievementDetailScreen() {
  const { t } = useKindTranslation();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'AchievementDetail'>>();
  const me = useMe();
  const habits = useTasksStore((s) => s.habits);
  const completions = useTasksStore((s) => s.completions);
  const goals = useGoalsStore((s) => s.goals);
  const achievement = useMemo(
    () => computeAchievements(habits, completions, goals, me).find((a) => a.id === params.id),
    [habits, completions, goals, me, params.id],
  );

  // A badge that no longer exists (shouldn't happen): just close.
  React.useEffect(() => {
    if (!achievement) navigation.goBack();
  }, [achievement, navigation]);
  if (!achievement) return null;

  const secretLocked = achievement.secret && !achievement.unlocked;
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, achievement.unlocked ? styles.iconUnlocked : secretLocked ? styles.iconSecret : styles.iconLocked]}>
        <Text style={[styles.icon, !achievement.unlocked && !secretLocked && { opacity: 0.35 }]}>
          {secretLocked ? '?' : achievement.icon}
        </Text>
      </View>
      <Text style={styles.title}>{secretLocked ? t('achievements.secretTitle') : t(`achievements.items.${achievement.id}.title`, { defaultValue: achievement.title })}</Text>
      <Text style={styles.body}>{secretLocked ? t('achievements.secretBody') : t(`achievements.items.${achievement.id}.description`, { defaultValue: achievement.description })}</Text>

      {achievement.progress && !achievement.unlocked && (
        <View style={styles.progress}>
          <NativeProgress value={achievement.progress.current / achievement.progress.target} color={S.gold} />
          <Text style={styles.progressText}>
            {achievement.progress.current} / {achievement.progress.target}
          </Text>
        </View>
      )}
      {achievement.unlocked && <Text style={styles.unlocked}>{t('achievements.unlocked')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    backgroundColor: S.bg,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconUnlocked: { backgroundColor: S.goldSoft, borderWidth: 3, borderColor: S.gold },
  iconLocked: { backgroundColor: S.card },
  iconSecret: { backgroundColor: S.black },
  icon: { fontSize: 42, fontFamily: fonts.bold, color: '#FFFFFF' },
  title: { fontFamily: fonts.bold, fontSize: 22, color: S.ink900, textAlign: 'center' },
  body: { marginTop: 6, fontSize: 14, lineHeight: 20, color: S.ink500, textAlign: 'center' },
  progress: { width: '100%', marginTop: 18 },
  progressText: { marginTop: 8, fontSize: 12, fontWeight: '700', color: S.tertiary, textAlign: 'center' },
  unlocked: { marginTop: 14, fontSize: 13, fontWeight: '800', color: S.accentDeep },
});
