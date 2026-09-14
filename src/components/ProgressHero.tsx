import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDateTitle, isToday } from '@/lib/dates';
import { useTheme } from '@/context/ThemeContext';
import { ScoreRing } from '@/components/ScoreRing';

interface ProgressHeroProps {
  selectedDate: string;  // YYYY-MM-DD
  completed: number;
  total: number;
  overLimit?: number;
  /** When set, used for the ring % instead of (completed/total)*100 (e.g. weighted completion). */
  percentage?: number;
  onPress?: () => void;
  /** Smaller layout for compact home view */
  compact?: boolean;
  /** Optional trigger that restarts the score ring animation when it changes. */
  animationTrigger?: number;
}

export function ProgressHero({
  selectedDate,
  completed,
  total,
  overLimit = 0,
  percentage,
  onPress,
  compact = false,
  animationTrigger,
}: ProgressHeroProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const targetPercentage =
    percentage != null ? percentage : (total > 0 ? Math.round((completed / total) * 100) : 0);
  const title = isToday(selectedDate) ? t('home.completedToday') : formatDateTitle(selectedDate);
  const cardShadow = {
    shadowColor: colors.shadowColorHero,
    shadowOpacity: colors.shadowOpacityHero,
    shadowRadius: colors.shadowRadiusHero,
    elevation: 5,
  };
  const cardStyle = compact
    ? [styles.card, styles.cardCompact, { backgroundColor: colors.bgCard }, cardShadow]
    : [styles.card, { backgroundColor: colors.bgCard }, cardShadow];
  const leftStyle = compact ? [styles.leftContent, styles.leftContentCompact] : styles.leftContent;
  const titleStyle = compact ? [styles.title, styles.titleCompact, { color: colors.text1 }] : [styles.title, { color: colors.text1 }];
  const subStyle = compact ? [styles.subtitle, styles.subtitleCompact, { color: colors.text2 }] : [styles.subtitle, { color: colors.text2 }];
  const ringStyle = compact ? [styles.ringContainer, styles.ringContainerCompact] : styles.ringContainer;

  const content = (
    <>
      <View style={leftStyle}>
        <Text style={titleStyle}>{title}</Text>
        {total > 0 ? (
          <Text style={subStyle}>
            {t('home.ofHabitsCompleted', { completed, total })}
          </Text>
        ) : (
          <Text style={subStyle}>{t('home.noHabitsYet')}</Text>
        )}
        {overLimit > 0 && (
          <Text style={[styles.overLimitWarn, { color: colors.danger }, compact && styles.overLimitWarnCompact]}>
            {t('progressHero.overLimit', {
              count: overLimit,
              habitWord: overLimit === 1 ? t('home.breakHabit') : t('home.breakHabitsCount'),
            })}
          </Text>
        )}
      </View>

      <View style={ringStyle}>
        <ScoreRing
          value={targetPercentage}
          size={compact ? 88 : 130}
          strokeWidth={compact ? 10 : 14}
          radius={compact ? 34 : 50}
          animationSlot="home"
          animationTrigger={animationTrigger}
          labelStyle={[compact ? styles.percentageTextCompact : styles.percentageText, { color: colors.text1 }]}
          labelStyleWhenFull={compact ? styles.percentageTextFullCompact : styles.percentageTextFull}
        />
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [cardStyle, pressed && styles.cardPressed]}>
        {content}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 0,
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  cardCompact: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  cardPressed: {
    opacity: 0.92,
  },
  leftContent: {
    flex: 1,
    paddingRight: 12,
  },
  leftContentCompact: {
    paddingRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  titleCompact: {
    fontSize: 16,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 22,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  ringContainer: {
    width: 130,
    height: 130,
    flexShrink: 0,
  },
  ringContainerCompact: {
    width: 88,
    height: 88,
  },
  percentageText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  percentageTextFull: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  percentageTextCompact: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  percentageTextFullCompact: {
    fontSize: 16,
  },
  overLimitWarn: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  },
  overLimitWarnCompact: {
    fontSize: 11,
    marginTop: 2,
  },
});
