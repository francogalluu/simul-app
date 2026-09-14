import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  FlatList,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Play } from 'lucide-react-native';

import { useHabitStore } from '@/store';
import { useSettingsStore } from '@/store/settingsStore';
import {
  dailyOverLimitCount,
  getHabitCurrentValue,
  isHabitActiveOnDate,
  isHabitCompleted,
} from '@/lib/aggregates';
import { today, getTodayNormalized, isFuture, getWeeksRange, formatDateTitle, addDays } from '@/lib/dates';
import { useTheme } from '@/context/ThemeContext';
import type { RootStackParamList } from '@/navigation/types';
import { homeScrollToTopRef } from '@/navigation/homeScrollToTopRef';
import { homeHeroAnimationRef } from '@/navigation/homeHeroAnimationRef';
import type { Habit } from '@/types/habit';

import { WeekCalendar } from '@/components/WeekCalendar';
import { ProgressHero } from '@/components/ProgressHero';
import { SwipeableHabitCard } from '@/components/SwipeableHabitCard';
import { SwipeHintBanner } from '@/components/SwipeHintBanner';
import { DaySummaryModal, type DaySummaryHabit, type DaySummarySection } from '@/components/DaySummaryModal';

const DAYS_BACK = 90;
const DAYS_FORWARD = 30;

// ─── HomeDayContent: one "page" of hero + habits for a given date ─────────────

function HomeDayContent({
  date,
  onJumpToToday,
  compact = false,
  weekStartsOn,
  colors,
  selectedDate,
  registerScrollRef,
  heroAnimationKey,
}: {
  date: string;
  onJumpToToday: () => void;
  compact?: boolean;
  weekStartsOn: 0 | 1;
  colors: ReturnType<typeof useTheme>['colors'];
  selectedDate: string;
  registerScrollRef: (d: string, ref: ScrollView | null) => void;
  heroAnimationKey?: number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const haptic = Boolean(useSettingsStore(s => s.hapticFeedback));
  const strictScoreMode = useSettingsStore(s => s.strictScoreMode);
  const hasSeenSwipeHint = useSettingsStore(s => s.hasSeenSwipeHint);
  const setHasSeenSwipeHint = useSettingsStore(s => s.setHasSeenSwipeHint);
  const rawHabits = useHabitStore(s => s.habits);
  const entries = useHabitStore(s => s.entries);
  const logEntry = useHabitStore(s => s.logEntry);
  const deleteEntry = useHabitStore(s => s.deleteEntry);
  const pauseHabit = useHabitStore(s => s.pauseHabit);
  const unpauseHabit = useHabitStore(s => s.unpauseHabit);
  const archiveHabit = useHabitStore(s => s.archiveHabit);
  const addHabit = useHabitStore(s => s.addHabit);

  const habits = useMemo(() => {
    const seen = new Set<string>();
    return rawHabits
      .filter(h => {
        if (!isHabitActiveOnDate(h, date) || seen.has(h.id)) return false;
        seen.add(h.id);
        return true;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [rawHabits, date]);

  const pausedHabits = useMemo(
    () =>
      rawHabits
        .filter(h => h.pausedAt && !h.archivedAt)
        .sort((a, b) => (b.pausedAt! > a.pausedAt! ? 1 : -1)),
    [rawHabits],
  );

  // Home UX rule:
  // - Good habits keep current behavior (past + today count as completed).
  // - Bad (break) habits must NOT count as completed on future selected dates.
  const isReadOnly = isFuture(date);

  const { completed, total } = useMemo(
    () => {
      const active = rawHabits.filter(
        h => isHabitActiveOnDate(h, date) && h.createdAt <= date && h.frequency === 'daily',
      );
      const total = active.length;
      if (total === 0) return { completed: 0, total: 0 };

      const completed = active.filter(h => {
        if (h.goalType === 'break' && isReadOnly) return false;
        return isHabitCompleted(h, entries, date, weekStartsOn);
      }).length;

      return { completed, total };
    },
    [rawHabits, entries, date, weekStartsOn, isReadOnly],
  );

  const weightedPct = useMemo(
    () => {
      const active = rawHabits.filter(
        h => isHabitActiveOnDate(h, date) && h.createdAt <= date && h.frequency === 'daily',
      );
      if (active.length === 0) return 0;

      const sum = active.reduce((acc, h) => {
        // On Home, break habits never contribute progress on future dates.
        if (h.goalType === 'break' && isReadOnly) return acc;

        const value = getHabitCurrentValue(h, entries, date, weekStartsOn);

        if (h.goalType === 'break') {
          if (h.kind === 'boolean') return acc + (value === 0 ? 100 : 0);
          return acc + (value <= h.target ? 100 : 0);
        }

        if (h.kind === 'boolean') return acc + (value >= h.target ? 100 : 0);

        const target = h.target;
        if (target <= 0) return acc + (value >= target ? 100 : 0);
        return acc + Math.min(100, Math.round((value / target) * 100));
      }, 0);

      return Math.round(sum / active.length);
    },
    [rawHabits, entries, date, weekStartsOn, isReadOnly],
  );

  const weeklyBuildHabitsForProgress = useMemo(
    () => habits.filter(h => h.frequency === 'weekly' && h.goalType !== 'break'),
    [habits],
  );
  const { completed: weeklyBuildCompleted, total: weeklyBuildTotal } = useMemo(() => {
    const active = weeklyBuildHabitsForProgress.filter(h => h.createdAt <= date);
    return {
      completed: active.filter(h => isHabitCompleted(h, entries, date, weekStartsOn)).length,
      total: active.length,
    };
  }, [weeklyBuildHabitsForProgress, entries, date, weekStartsOn]);

  const dailyBuildHabits = useMemo(
    () => habits.filter(h => h.frequency === 'daily' && h.goalType !== 'break'),
    [habits],
  );
  const dailyBreakHabits = useMemo(
    () => habits.filter(h => h.frequency === 'daily' && h.goalType === 'break'),
    [habits],
  );
  const weeklyBreakHabits = useMemo(
    () => habits.filter(h => h.frequency === 'weekly' && h.goalType === 'break'),
    [habits],
  );
  const weeklyBuildHabits = useMemo(
    () => habits.filter(h => h.frequency === 'weekly' && h.goalType !== 'break'),
    [habits],
  );
  const monthlyBuildHabits = useMemo(
    () => habits.filter(h => h.frequency === 'monthly' && h.goalType !== 'break'),
    [habits],
  );
  const { completed: monthlyBuildCompleted, total: monthlyBuildTotal } = useMemo(() => {
    const active = monthlyBuildHabits.filter(h => h.createdAt <= date);
    return {
      completed: active.filter(h => isHabitCompleted(h, entries, date, weekStartsOn)).length,
      total: active.length,
    };
  }, [monthlyBuildHabits, entries, date, weekStartsOn]);
  const allBreakHabits = useMemo(
    () => [...dailyBreakHabits, ...weeklyBreakHabits],
    [dailyBreakHabits, weeklyBreakHabits],
  );

  // Only show habits that existed on the viewed date (avoid showing today's new habit on yesterday)
  const dailyBuildHabitsOnDate = useMemo(
    () => dailyBuildHabits.filter(h => h.createdAt <= date),
    [dailyBuildHabits, date],
  );
  const dailyBreakHabitsOnDate = useMemo(
    () => dailyBreakHabits.filter(h => h.createdAt <= date),
    [dailyBreakHabits, date],
  );
  const weeklyBuildHabitsOnDate = useMemo(
    () => weeklyBuildHabits.filter(h => h.createdAt <= date),
    [weeklyBuildHabits, date],
  );
  const weeklyBreakHabitsOnDate = useMemo(
    () => weeklyBreakHabits.filter(h => h.createdAt <= date),
    [weeklyBreakHabits, date],
  );
  const monthlyBuildHabitsOnDate = useMemo(
    () => monthlyBuildHabits.filter(h => h.createdAt <= date),
    [monthlyBuildHabits, date],
  );
  const allBreakHabitsOnDate = useMemo(
    () => [...dailyBreakHabitsOnDate, ...weeklyBreakHabitsOnDate],
    [dailyBreakHabitsOnDate, weeklyBreakHabitsOnDate],
  );

  const overLimitCount = useMemo(
    () => (isReadOnly ? 0 : dailyOverLimitCount(rawHabits, entries, date, weekStartsOn)),
    [isReadOnly, rawHabits, entries, date, weekStartsOn],
  );

  const isTodayDate = date === today();
  const dailySectionLabel = t('home.todaysHabits', { date: formatDateTitle(date) });

  const getCardData = useCallback(
    (habit: Habit) => {
      const isBadHabit = habit.goalType === 'break';
      if (isBadHabit && isReadOnly) {
        // Neutral / pending state for bad habits on future dates.
        return { currentValue: 0, isCompleted: false };
      }

      return {
        currentValue: getHabitCurrentValue(habit, entries, date, weekStartsOn),
        isCompleted: isHabitCompleted(habit, entries, date, weekStartsOn),
      };
    },
    [entries, date, weekStartsOn, isReadOnly],
  );

  const [summaryVisible, setSummaryVisible] = useState(false);

  const toSummaryHabit = useCallback(
    (habit: Habit): DaySummaryHabit => {
      const { currentValue, isCompleted } = getCardData(habit);
      const isOverLimit = habit.goalType === 'break' && currentValue > habit.target;
      return { habit, currentValue, isCompleted, isOverLimit };
    },
    [getCardData],
  );

  const summarySections: DaySummarySection[] = useMemo(
    () => [
      { title: t('daySummary.daily'), habits: dailyBuildHabitsOnDate.map(toSummaryHabit) },
      { title: t('daySummary.weekly'), habits: weeklyBuildHabitsOnDate.map(toSummaryHabit) },
      { title: t('daySummary.monthly'), habits: monthlyBuildHabitsOnDate.map(toSummaryHabit) },
      { title: t('daySummary.breakHabits'), habits: allBreakHabitsOnDate.map(toSummaryHabit) },
    ],
    [t, dailyBuildHabitsOnDate, weeklyBuildHabitsOnDate, monthlyBuildHabitsOnDate, allBreakHabitsOnDate, toSummaryHabit],
  );

  const handleComplete = useCallback(
    (habit: Habit) => {
      if (isReadOnly) return;
      const { currentValue, isCompleted: done } = getCardData(habit);
      const shouldUndo = habit.goalType === 'break' ? currentValue > 0 : done;
      if (shouldUndo) {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        deleteEntry(habit.id, date);
      } else {
        if (haptic) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        logEntry(habit.id, date, habit.target);
      }
    },
    [isReadOnly, getCardData, haptic, deleteEntry, logEntry, date],
  );

  const handleNavigateToDetail = (habitId: string) => {
    if (isReadOnly) return;
    navigation.navigate('HabitDetail', { id: habitId, date });
  };

  const renderHabitCard = (habit: Habit) => {
    const { currentValue, isCompleted } = getCardData(habit);
    const showUndoAction = habit.goalType === 'break' ? currentValue > 0 : isCompleted;
    return (
      <SwipeableHabitCard
        key={habit.id}
        habit={habit}
        currentValue={currentValue}
        isCompleted={isCompleted}
        showUndoAction={showUndoAction}
        readOnly={isReadOnly}
        onPress={() => handleNavigateToDetail(habit.id)}
        onComplete={() => handleComplete(habit)}
        onDelete={isTodayDate ? () => archiveHabit(habit.id) : undefined}
        onPause={isTodayDate ? () => pauseHabit(habit.id) : undefined}
        compact={compact}
      />
    );
  };

  useEffect(() => {
    if (date !== selectedDate) registerScrollRef(date, null);
  }, [date, selectedDate, registerScrollRef]);

  return (
    <>
    <ScrollView
      ref={(r) => {
        (scrollRef as React.MutableRefObject<ScrollView | null>).current = r;
        if (date === selectedDate && r) registerScrollRef(date, r);
      }}
      style={[s.dayScroll, { backgroundColor: colors.bgHome }]}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[compact ? s.heroWrapCompact : s.heroWrap]}>
        <ProgressHero
          selectedDate={date}
          completed={completed}
          total={total}
          overLimit={overLimitCount}
          percentage={strictScoreMode ? undefined : weightedPct}
          onPress={() => setSummaryVisible(true)}
          compact={compact}
          animationTrigger={heroAnimationKey}
        />
      </View>

      {dailyBuildHabitsOnDate.length > 0 && (
        <View style={[s.section, compact && s.sectionCompact]}>
          <View style={s.sectionTitleRow}>
            <View style={s.sectionTitleWithLine}>
              <View style={[s.sectionTitleLine, { backgroundColor: colors.teal }]} />
              <Text style={[s.sectionTitleText, compact && s.sectionTitleCompact, { color: colors.text1 }]}>{dailySectionLabel}</Text>
            </View>
            {!isTodayDate && (
              <View style={[s.sectionBadge, { backgroundColor: colors.bgSecondary }]}>
                <Text style={[s.sectionBadgeText, { color: colors.text2 }]}>{isReadOnly ? t('home.upcoming') : t('home.past')}</Text>
              </View>
            )}
          </View>
          {isTodayDate && !hasSeenSwipeHint && (
            <SwipeHintBanner onDismiss={() => setHasSeenSwipeHint(true)} />
          )}
          <View style={{ opacity: isReadOnly ? 0.5 : 1 }}>
            {dailyBuildHabitsOnDate.map(renderHabitCard)}
          </View>
        </View>
      )}

      {allBreakHabitsOnDate.length > 0 && (
        <View style={[s.section, compact && s.sectionCompact]}>
          <View style={s.sectionTitleRow}>
            <View style={s.sectionTitleWithLine}>
              <View style={[s.sectionTitleLine, { backgroundColor: colors.danger }]} />
              <Text style={[s.sectionTitleText, compact && s.sectionTitleCompact, { color: colors.text1 }]}>{t('home.breakHabits')}</Text>
            </View>
            {!isTodayDate && (
              <View style={[s.sectionBadge, { backgroundColor: colors.bgSecondary }]}>
                <Text style={[s.sectionBadgeText, { color: colors.text2 }]}>{isReadOnly ? t('home.upcoming') : t('home.past')}</Text>
              </View>
            )}
          </View>
          <View style={{ opacity: isReadOnly ? 0.5 : 1 }}>
            {allBreakHabitsOnDate.map(renderHabitCard)}
          </View>
        </View>
      )}

      {weeklyBuildHabitsOnDate.length > 0 && (
        <View style={[s.section, compact && s.sectionCompact]}>
          <View style={s.sectionTitleRow}>
            <View style={s.sectionTitleWithLine}>
              <View style={[s.sectionTitleLine, { backgroundColor: colors.success }]} />
              <Text style={[s.sectionTitleText, compact && s.sectionTitleCompact, { color: colors.text1 }]}>{t('home.weeklyHabits')}</Text>
            </View>
            {weeklyBuildTotal > 0 && (
              <Text style={[s.sectionMeta, { color: colors.text2 }]}>
                {t('home.percentThisWeek', { pct: String(Math.round((weeklyBuildCompleted / weeklyBuildTotal) * 100)) })}
              </Text>
            )}
          </View>
          <View style={{ opacity: isReadOnly ? 0.5 : 1 }}>
            {weeklyBuildHabitsOnDate.map(renderHabitCard)}
          </View>
        </View>
      )}

      {monthlyBuildHabitsOnDate.length > 0 && (
        <View style={[s.section, compact && s.sectionCompact]}>
          <View style={s.sectionTitleRow}>
            <View style={s.sectionTitleWithLine}>
              <View style={[s.sectionTitleLine, { backgroundColor: colors.warning }]} />
              <Text style={[s.sectionTitleText, compact && s.sectionTitleCompact, { color: colors.text1 }]}>{t('home.monthlyHabits')}</Text>
            </View>
            {monthlyBuildTotal > 0 && (
              <Text style={[s.sectionMeta, { color: colors.text2 }]}>
                {t('home.percentThisMonth', { pct: String(Math.round((monthlyBuildCompleted / monthlyBuildTotal) * 100)) })}
              </Text>
            )}
          </View>
          <View style={{ opacity: isReadOnly ? 0.5 : 1 }}>
            {monthlyBuildHabitsOnDate.map(renderHabitCard)}
          </View>
        </View>
      )}

      {habits.length === 0 && (
        <View style={s.emptyState}>
          <Text style={[s.emptyTitle, { color: colors.text1 }]}>{t('home.noHabitsYetShort')}</Text>
          <Text style={[s.emptyBody, { color: colors.text2 }]}>
            {t('home.addOneBelow')}
          </Text>
        </View>
      )}

      {!isTodayDate && (
        <Pressable
          onPress={onJumpToToday}
          style={({ pressed }) => [
            s.todayPill,
            { backgroundColor: colors.bgHome, borderColor: colors.tealSoft },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[s.todayPillText, { color: colors.teal }]}>{t('home.jumpToToday')}</Text>
        </Pressable>
      )}

      {isTodayDate && pausedHabits.length > 0 && (
        <View style={[s.section, compact && s.sectionCompact]}>
          <View style={s.sectionTitleRow}>
            <View style={s.sectionTitleWithLine}>
              <View style={[s.sectionTitleLine, { backgroundColor: colors.text3 }]} />
              <Text style={[s.sectionTitleText, compact && s.sectionTitleCompact, { color: colors.text1 }]}>{t('home.paused')}</Text>
            </View>
          </View>
          <View style={s.pausedList}>
            {pausedHabits.map(h => (
              <View key={h.id} style={[s.pausedRow, { backgroundColor: colors.bgCard }]}>
                <Text style={s.pausedIcon}>{h.icon}</Text>
                <Text style={[s.pausedName, { color: colors.text1 }]} numberOfLines={1}>{h.name}</Text>
                <Pressable
                  onPress={() => {
                    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    unpauseHabit(h.id);
                  }}
                  style={({ pressed }) => [s.resumeBtn, { backgroundColor: colors.teal }, pressed && { opacity: 0.8 }]}
                >
                  <Play size={16} color={colors.white} strokeWidth={2.5} />
                  <Text style={[s.resumeBtnText, { color: colors.white }]}>{t('common.resume')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
    <DaySummaryModal
      visible={summaryVisible}
      onClose={() => setSummaryVisible(false)}
      date={date}
      completed={completed}
      total={total}
      overLimit={overLimitCount}
      sections={summarySections}
    />
    </>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const compactHomeView = useSettingsStore(s => s.compactHomeView);
  const weekStartsOn = useSettingsStore(s => s.weekStartsOn);
  const { width: screenWidth } = useWindowDimensions();
  const calendarPaddingTop =
    Platform.OS === 'android' ? space.space8 + insets.top : space.space8;
  const listRef = useRef<FlatList<string>>(null);
  const currentDayScrollRef = useRef<ScrollView | null>(null);
  const selectedDateRef = useRef<string>('');

  const rawHabits = useHabitStore(s => s.habits);
  const entries = useHabitStore(s => s.entries);
  const selectedDate = useHabitStore(s => s.selectedDate);
  const setSelectedDate = useHabitStore(s => s.setSelectedDate);

  const todayStr = today();
  const dates = useMemo(
    () =>
      Array.from({ length: DAYS_BACK + 1 + DAYS_FORWARD }, (_, i) =>
        addDays(todayStr, i - DAYS_BACK),
      ),
    [todayStr],
  );
  const todayIndex = DAYS_BACK;
  const hasScrolledToSelectedRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  // True only when selectedDate was set by a calendar tap (not a swipe).
  // The scroll effect reads this so swipe-originated changes do NOT re-trigger scrollToIndex,
  // which would set programmaticScrollRef=true and make the next swipe miss its marker update.
  const calendarTapRef = useRef(false);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Once on mount: open on today (do not re-run when the calendar day changes).
  useEffect(() => {
    setSelectedDate(getTodayNormalized());
  }, [setSelectedDate]);

  // Scroll list to selectedDate ONLY when the change came from a calendar tap.
  useEffect(() => {
    if (!hasScrolledToSelectedRef.current) {
      hasScrolledToSelectedRef.current = true;
      return;
    }
    if (!calendarTapRef.current) return;
    calendarTapRef.current = false;

    const idx = dates.indexOf(selectedDate);
    if (idx < 0 || !listRef.current) return;

    // Debounce: rapid taps cancel earlier scroll; only one scroll fires for the last-tapped day.
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      scrollDebounceRef.current = null;
      programmaticScrollRef.current = true;
      listRef.current?.scrollToIndex({ index: idx, animated: true });
    }, 80);
    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
        scrollDebounceRef.current = null;
      }
    };
  }, [selectedDate, dates]);

  const scrollableWeeks = useMemo(() => getWeeksRange(12, 12, weekStartsOn), [weekStartsOn]);

  const completionByDate = useMemo(() => {
    const result: Record<string, number> = {};
    scrollableWeeks.flat().forEach(d => {
      const active = rawHabits.filter(
        h => isHabitActiveOnDate(h, d) && h.createdAt <= d && h.frequency === 'daily',
      );
      if (active.length === 0) {
        result[d] = 0;
        return;
      }

      const future = isFuture(d);
      const completed = active.filter(h => {
        if (h.goalType === 'break' && future) return false;
        return isHabitCompleted(h, entries, d, weekStartsOn);
      }).length;

      result[d] = Math.round((completed / active.length) * 100);
    });
    return result;
  }, [rawHabits, entries, scrollableWeeks, weekStartsOn, todayStr]);

  const handleDateSelect = useCallback((date: string) => {
    calendarTapRef.current = true;
    setSelectedDate(date);
  }, []);

  const handleJumpToToday = useCallback(() => {
    calendarTapRef.current = true;
    setSelectedDate(today());
  }, []);

  const [heroAnimationKey, setHeroAnimationKey] = useState(0);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (programmaticScrollRef.current) return;
      if (viewableItems.length === 0) return;
      const item = viewableItems[viewableItems.length - 1];
      const index = item.index;
      if (index == null || index < 0 || index >= dates.length) return;
      const newDate = dates[index];
      setSelectedDate(newDate);
    },
    [dates],
  );

  const onMomentumScrollEnd = useCallback(() => {
    if (programmaticScrollRef.current) programmaticScrollRef.current = false;
  }, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: screenWidth,
      offset: index * screenWidth,
      index,
    }),
    [screenWidth],
  );

  const onScrollToIndexFailed = useCallback(
    (info: { index: number }) => {
      setTimeout(() => {
        programmaticScrollRef.current = true;
        listRef.current?.scrollToIndex({
          index: info.index,
          animated: true,
        });
      }, 100);
    },
    [],
  );

  // When user taps Home tab while already on Home: if viewing today, scroll vertical to top; else scroll horizontal to today.
  useEffect(() => {
    const scrollToTop = () => {
      const current = selectedDateRef.current;
      if (current === todayStr) {
        currentDayScrollRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        calendarTapRef.current = true;
        setSelectedDate(todayStr);
        programmaticScrollRef.current = true;
        listRef.current?.scrollToIndex({ index: todayIndex, animated: true });
      }
    };
    homeScrollToTopRef.current = scrollToTop;
    return () => {
      homeScrollToTopRef.current = null;
    };
  }, [todayStr, todayIndex, setSelectedDate]);

  // Register hero animation restart handler for Home tab presses
  useEffect(() => {
    const restartHero = () => {
      setHeroAnimationKey((k) => k + 1);
    };
    homeHeroAnimationRef.current = restartHero;
    return () => {
      homeHeroAnimationRef.current = null;
    };
  }, []);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const registerScrollRef = useCallback((d: string, ref: ScrollView | null) => {
    if (d === selectedDate) currentDayScrollRef.current = ref;
  }, [selectedDate]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgHome }]}>
      <View style={[s.calendarWrap, { backgroundColor: colors.bgHome, paddingTop: calendarPaddingTop }]}>
        <WeekCalendar
          weeks={scrollableWeeks}
          selectedDate={selectedDate}
          completionByDate={completionByDate}
          onDateSelect={handleDateSelect}
          weekStartsOn={weekStartsOn}
        />
      </View>

      <FlatList
        ref={listRef}
        data={dates}
        keyExtractor={(d) => d}
        style={[s.dayList, { backgroundColor: colors.bgHome }]}
        contentContainerStyle={{ backgroundColor: colors.bgHome }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={getItemLayout}
        initialScrollIndex={todayIndex}
        onScrollToIndexFailed={onScrollToIndexFailed}
        windowSize={5}
        initialNumToRender={1}
        renderItem={({ item: date }) => (
          <View style={[s.dayPage, { width: screenWidth }]}>
            <HomeDayContent
              date={date}
              onJumpToToday={handleJumpToToday}
              compact={compactHomeView}
              weekStartsOn={weekStartsOn}
              colors={colors}
              selectedDate={selectedDate}
              registerScrollRef={registerScrollRef}
              heroAnimationKey={heroAnimationKey}
            />
          </View>
        )}
      />

    </SafeAreaView>
  );
}

// ─── Layout & design tokens (8pt grid, shadows) ─────────────────────────────────

const space = { space8: 8, space12: 12, space16: 16, space24: 24, space32: 32, space40: 40, space48: 48 } as const;
const LAYOUT_PADDING_H = 24;
const shadowCard = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  dayList: {
    flex: 1,
  },
  dayPage: {
    flex: 1,
  },
  dayScroll: {
    flex: 1,
  },
  scrollContent: {
    // Extra padding so card shadows (shadowRadius ~12, offset 4) aren’t cropped
    paddingHorizontal: LAYOUT_PADDING_H,
    // Reduced so there's less empty space right under the week calendar.
    paddingTop: space.space8,
    paddingBottom: space.space48,
  },
  calendarWrap: {
    width: '100%',
  },

  heroWrap: { marginTop: space.space8 },
  heroWrapCompact: { marginTop: space.space8 },
  section: {
    marginTop: space.space24,
  },
  sectionCompact: {
    marginTop: space.space16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
    marginBottom: space.space12,
  },
  sectionTitleWithLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleLine: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
    minHeight: 22,
  },
  sectionTitleText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 25,
  },
  sectionTitleCompact: {
    fontSize: 17,
    lineHeight: 22,
  },
  sectionMeta: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  sectionBadge: {
    paddingHorizontal: space.space8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: space.space32,
    paddingTop: space.space40,
    paddingBottom: space.space24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 25,
    marginBottom: space.space8,
  },
  emptyBody: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
  },
  todayPill: {
    alignSelf: 'center',
    marginTop: space.space16,
    minHeight: 44,
    paddingVertical: space.space12,
    paddingHorizontal: space.space24,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    ...shadowCard,
  },
  todayPillText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },

  pausedList: {
    gap: space.space8,
  },
  pausedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: space.space12,
    paddingHorizontal: space.space16,
    gap: space.space12,
    ...shadowCard,
  },
  pausedIcon: {
    fontSize: 24,
  },
  pausedName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.space8,
    paddingHorizontal: space.space16,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  resumeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },

});
