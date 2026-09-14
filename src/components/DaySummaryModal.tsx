import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { formatDateTitle } from '@/lib/dates';
import { useTheme } from '@/context/ThemeContext';
import { ScoreRing } from '@/components/ScoreRing';
import { PROGRESS_COLORS } from '@/lib/progressColors';
import type { Habit } from '@/types/habit';
import { getHabitUnitLabel } from '@/lib/habitUnitLabel';

export interface DaySummaryHabit {
  habit: Habit;
  currentValue: number;
  isCompleted: boolean;
  isOverLimit?: boolean;
}

export interface DaySummarySection {
  title: string;
  habits: DaySummaryHabit[];
}

const ROW_ANIM_DURATION = 420;
const ROW_ANIM_DELAY_PER_ITEM = 85;

function AnimatedSummaryRow({
  visible,
  animationIndex,
  isLast,
  habit,
  currentValue,
  isCompleted,
  isOverLimit: over,
  styles: st,
  colors,
}: {
  visible: boolean;
  animationIndex: number;
  isLast: boolean;
  habit: Habit;
  currentValue: number;
  isCompleted: boolean;
  isOverLimit?: boolean;
  styles: {
    row: object;
    rowLast: object;
    iconWrap: object;
    iconWrapDone: object;
    icon: object;
    rowCenter: object;
    habitName: object;
    rowMeta: object;
    rowMetaDanger: object;
    statusWrap: object;
    dot: object;
    pct: object;
  };
  colors: { bgCard: string; success: string; danger: string; text1: string; text2: string; ring: string };
}) {
  const { t } = useTranslation();
  const unitLabel = getHabitUnitLabel(habit, t);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      translateY.setValue(14);
      return;
    }
    const anim = Animated.sequence([
      Animated.delay(animationIndex * ROW_ANIM_DELAY_PER_ITEM),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ROW_ANIM_DURATION,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: ROW_ANIM_DURATION,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, animationIndex, opacity, translateY]);

  return (
    <Animated.View
      style={[
        st.row,
        isLast && st.rowLast,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[st.iconWrap, { backgroundColor: colors.ring }, isCompleted && !over && [st.iconWrapDone, { backgroundColor: colors.success }]]}>
        <Text style={st.icon}>{habit.icon}</Text>
      </View>
      <View style={st.rowCenter}>
        <Text style={[st.habitName, { color: colors.text1 }]} numberOfLines={1}>
          {habit.name}
        </Text>
        {habit.kind === 'numeric' && (
          <Text style={[st.rowMeta, { color: colors.text2 }, over && { color: colors.danger }]}>
            {currentValue} / {habit.target}
            {unitLabel ? ` ${unitLabel}` : ''}
            {over ? ` · ${t('daySummary.overLimit')}` : ''}
          </Text>
        )}
      </View>
      <View style={st.statusWrap}>
        {isCompleted && !over ? (
          <Check size={20} color={colors.success} strokeWidth={2.5} />
        ) : over ? (
          <AlertTriangle size={20} color={colors.danger} strokeWidth={2} />
        ) : habit.kind === 'boolean' ? (
          <View style={[st.dot, { backgroundColor: colors.text2 }]} />
        ) : (
          <Text style={[st.pct, { color: colors.text2 }]}>{Math.min(100, Math.round((currentValue / habit.target) * 100))}%</Text>
        )}
      </View>
    </Animated.View>
  );
}

interface DaySummaryModalProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  completed: number;
  total: number;
  overLimit?: number;
  sections: DaySummarySection[];
}

export function DaySummaryModal({
  visible,
  onClose,
  date,
  completed,
  total,
  overLimit = 0,
  sections,
}: DaySummaryModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hasAnyHabits = sections.some((sec) => sec.habits.length > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['top', 'bottom']}>
        <View style={[s.header, { borderBottomColor: colors.separatorLight, backgroundColor: colors.bgCard }]}>
          <Text style={[s.title, { color: colors.text1 }]}>{formatDateTitle(date)}</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [s.closeBtn, pressed && s.closeBtnPressed]}
            accessibilityLabel={t('common.close')}
          >
            <X size={24} color={colors.text1} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.hero, { backgroundColor: colors.bgCard }]}>
            <View style={s.heroLeft}>
              <Text style={[s.heroLabel, { color: colors.text2 }]}>{t('daySummary.todaysProgress')}</Text>
              {total > 0 ? (
                <Text style={[s.heroSub, { color: colors.text1 }]}>
                  {t('daySummary.ofHabitsCompleted', { completed, total })}
                </Text>
              ) : (
                <Text style={[s.heroSub, { color: colors.text1 }]}>{t('daySummary.noHabitsForDay')}</Text>
              )}
              {overLimit > 0 && (
                <Text style={[s.overLimit, { color: colors.danger }]}>
                  {t('daySummary.overLimitLine', {
                    count: overLimit,
                    habitWord: overLimit === 1 ? t('daySummaryOverLimit.habit') : t('daySummaryOverLimit.habits'),
                  })}
                </Text>
              )}
            </View>
            <View style={s.ringWrap}>
              <ScoreRing
                value={pct}
                size={100}
                strokeWidth={10}
                radius={40}
                labelStyle={[s.ringLabel, { color: colors.text1 }]}
                labelStyleWhenFull={s.ringLabelFull}
              />
            </View>
          </View>

          {hasAnyHabits ? (
            <View style={s.listSection}>
              {(() => {
                let globalIndex = 0;
                return sections.map(
                  (section) =>
                    section.habits.length > 0 && (
                      <View key={section.title} style={s.categoryBlock}>
                        <Text style={[s.sectionTitle, { color: colors.text2 }]}>{section.title}</Text>
                        <View style={[s.list, { backgroundColor: colors.bgCard }]}>
                          {section.habits.map(({ habit, currentValue, isCompleted, isOverLimit: over }, index) => {
                            const animIndex = globalIndex++;
                            return (
                              <AnimatedSummaryRow
                                key={habit.id}
                                visible={visible}
                                animationIndex={animIndex}
                                isLast={index === section.habits.length - 1}
                                habit={habit}
                                currentValue={currentValue}
                                isCompleted={isCompleted}
                                isOverLimit={over}
                                styles={s}
                                colors={colors}
                              />
                            );
                          })}
                        </View>
                      </View>
                    ),
                );
              })()}
            </View>
          ) : (
            <View style={s.empty}>
              <Text style={[s.emptyText, { color: colors.text2 }]}>{t('daySummary.noHabitsForDay')}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 8,
    marginRight: -8,
  },
  closeBtnPressed: {
    opacity: 0.6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 16,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 17,
    fontWeight: '500',
  },
  overLimit: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  },
  ringWrap: {
    width: 100,
    height: 100,
  },
  ringLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  ringLabelFull: {
    fontSize: 15,
    fontWeight: '700',
  },
  listSection: {
    marginTop: 24,
    marginHorizontal: 20,
  },
  categoryBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  list: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapDone: {},
  icon: {
    fontSize: 20,
  },
  rowCenter: {
    flex: 1,
    minWidth: 0,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  rowMetaDanger: {},
  statusWrap: {
    width: 44,
    alignItems: 'flex-end',
  },
  pct: {
    fontSize: 13,
    fontWeight: '600',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  empty: {
    marginTop: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
