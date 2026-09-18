import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
  RefreshControl,
  ScrollView as GestureHandlerScrollView,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { X } from 'lucide-react-native';
import type { RootStackParamList } from '@/navigation/types';
import { useTabBarInset } from '@/navigation/CustomTabBar';
import { useSettingsStore } from '@/store/settingsStore';
import { useTasksStore, type Habit } from '@/store/tasksStore';
import { useHouseholdStore } from '@/store/householdStore';
import { addDays, getDayOfWeekIndex, getWeekDates, isFuture, today } from '@/lib/dates';
import { partnerOf, useMe } from '@/lib/people';
import { togetherStreak } from '@/lib/streaks';
import { computeMilestones } from '@/lib/milestones';
import { usePartnerPresence } from '@/lib/presence';
import { haptic } from '@/lib/haptics';
import { Text } from '@/components/AppText';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';
import { HomeTopBar } from '@/components/home/HomeTopBar';
import { CalendarCard, type HomeMode } from '@/components/home/CalendarCard';
import { TaskList } from '@/components/home/TaskList';
import { WeekView } from '@/components/home/WeekView';
import { HabitSheet } from '@/components/home/HabitSheet';
import { MonthSheet } from '@/components/home/MonthSheet';
import { WeeklyRecapCard } from '@/components/home/WeeklyRecapCard';
import { PullRefreshIndicator } from '@/components/home/PullRefreshIndicator';

/** Native spinner is hidden (see RefreshControl below) in favor of PullRefreshIndicator. */
const TRANSPARENT_REFRESH_COLORS = ['transparent'];

// Plain reanimated Animated.ScrollView wraps RN's own ScrollView, which isn't
// gesture-handler-aware — its native pan responder (and RefreshControl's)
// competes ad-hoc with the day-swipe Pan gesture below instead of properly
// negotiating with it, and can win the very first touch, making that first
// swipe attempt silently do nothing. Gesture-handler's own ScrollView is
// coordinated with the rest of RNGH, so the two negotiate correctly.
const AnimatedScrollView = Animated.createAnimatedComponent(GestureHandlerScrollView);

const SWIPE_DISTANCE = 64;
const SWIPE_VELOCITY = 650;
const SLIDE_SPRING = { damping: 20, stiffness: 190, mass: 0.7 };

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const tabInset = useTabBarInset();

  const me = useMe();
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  const habits = useTasksStore((s) => s.habits);
  const completions = useTasksStore((s) => s.completions);
  const proofs = useTasksStore((s) => s.proofs);
  const proofStatuses = useTasksStore((s) => s.proofStatuses);
  const toggleCompletion = useTasksStore((s) => s.toggleCompletion);
  const anniversary = useHouseholdStore((s) => s.household?.anniversary ?? null);
  const { partnerHere } = usePartnerPresence();

  const [selectedDate, setSelectedDate] = useState(today);
  const [mode, setMode] = useState<HomeMode>('day');
  const [sheetHabit, setSheetHabit] = useState<Habit | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const [milestoneDismissed, setMilestoneDismissed] = useState(false);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const weekDates = useMemo(() => getWeekDates(selectedDate, weekStartsOn), [selectedDate, weekStartsOn]);
  const ourStreak = useMemo(() => togetherStreak(habits, completions), [habits, completions]);
  const unread = useMemo(
    () => habits.filter((h) => h.status === 'pending' && h.requestedBy != null && h.requestedBy !== me).length,
    [habits, me],
  );
  const milestone = useMemo(() => computeMilestones(anniversary, habits, completions).today[0] ?? null, [anniversary, habits, completions]);
  const readOnly = isFuture(selectedDate);
  const t = today();
  // The Sunday recap: the week that's just wrapped up, on the last day of it.
  const showRecap = mode === 'day' && selectedDate === t && getDayOfWeekIndex(t) === 0;

  // ─── Day swiping ────────────────────────────────────────────────────────────
  // Content slides out in the swipe direction, the date swaps, then the new
  // day's content springs in from the opposite side. In week mode a swipe
  // moves a whole week.
  const tx = useSharedValue(0);
  const slideOffset = width * 0.5;

  const slide = useCallback(
    (dir: 1 | -1, applyDate: () => void) => {
      tx.value = withTiming(-dir * slideOffset, { duration: 140 }, (finished) => {
        if (!finished) return;
        runOnJS(applyDate)();
        tx.value = dir * slideOffset;
        tx.value = withSpring(0, SLIDE_SPRING);
      });
    },
    [tx, slideOffset],
  );

  const shiftDay = useCallback(
    (dir: 1 | -1) => {
      haptic.tap();
      const step = mode === 'week' ? 7 : 1;
      slide(dir, () => setSelectedDate((d) => addDays(d, dir * step)));
    },
    [slide, mode],
  );

  const goToDate = useCallback(
    (next: string) => {
      if (next === selectedDate) return;
      haptic.tap();
      slide(next > selectedDate ? 1 : -1, () => setSelectedDate(next));
    },
    [selectedDate, slide],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onUpdate((e) => {
          tx.value = e.translationX * 0.55;
        })
        .onEnd((e) => {
          const go = Math.abs(e.translationX) > SWIPE_DISTANCE || Math.abs(e.velocityX) > SWIPE_VELOCITY;
          if (!go) {
            tx.value = withSpring(0, SLIDE_SPRING);
            return;
          }
          runOnJS(shiftDay)(e.translationX < 0 ? 1 : -1);
        }),
    [tx, shiftDay],
  );

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    opacity: interpolate(Math.abs(tx.value), [0, slideOffset], [1, 0.25], Extrapolation.CLAMP),
  }));

  // ─── Completing habits ──────────────────────────────────────────────────────
  const toggleOn = useCallback(
    (habit: Habit, date: string) => {
      if (isFuture(date)) return;
      const next = toggleCompletion(habit.id, date, me);
      const nowDone = Boolean(next[me]);
      if (habit.owner === 'both' && nowDone && next[partnerOf(me)]) {
        haptic.success();
        setCelebratingId(habit.id);
        if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
        celebrateTimer.current = setTimeout(() => setCelebratingId(null), 1800);
      } else if (nowDone) {
        haptic.success();
      } else {
        haptic.tap();
      }
    },
    [toggleCompletion, me],
  );

  const handleToggle = useCallback((habit: Habit) => toggleOn(habit, selectedDate), [toggleOn, selectedDate]);

  const openSheet = useCallback((habit: Habit) => {
    haptic.medium();
    setSheetHabit(habit);
  }, []);

  const changeMode = useCallback(
    (next: HomeMode) => {
      if (next === mode) return;
      haptic.tap();
      setMode(next);
    },
    [mode],
  );

  // ─── Pull to refresh ────────────────────────────────────────────────────────
  // How far past the top the scroll view has been dragged (iOS reports this
  // live via a negative offset while bouncing; Android never goes negative,
  // so there the badge only appears once `refreshing` actually flips true —
  // still correct, just not live-tracked mid-drag).
  const pullDistance = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    pullDistance.value = Math.max(0, -e.contentOffset.y);
  });

  const onRefresh = useCallback(async () => {
    haptic.tap();
    setRefreshing(true);
    // Keeps the animation visible for a beat even when the refetch is instant.
    const minDuration = new Promise((resolve) => setTimeout(resolve, 700));
    await Promise.all([useTasksStore.getState().refetch(), useHouseholdStore.getState().refreshMembers(), minDuration]);
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PullRefreshIndicator refreshing={refreshing} pullDistance={pullDistance} />
      <AnimatedScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabInset + 12 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={TRANSPARENT_REFRESH_COLORS}
            progressBackgroundColor="transparent"
          />
        }
      >
        <HomeTopBar
          streakDays={ourStreak}
          unreadCount={unread}
          onMailbox={() => navigation.navigate('Mailbox')}
          onAchievements={() => navigation.navigate('Achievements')}
        />

        {milestone && !milestoneDismissed && (
          <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} style={styles.milestone}>
            <Text style={styles.milestoneIcon}>{milestone.icon}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.milestoneTitle}>{milestone.title}</Text>
              <Text style={styles.milestoneBody}>{milestone.subtitle}</Text>
            </View>
            <Pressable onPress={() => setMilestoneDismissed(true)} hitSlop={10} accessibilityLabel="Dismiss">
              <X size={16} color={S.ink500} strokeWidth={2.4} />
            </Pressable>
          </Animated.View>
        )}

        <GestureDetector gesture={pan}>
          <Animated.View style={swipeStyle}>
            <CalendarCard
              selectedDate={selectedDate}
              weekDates={weekDates}
              habits={habits}
              completions={completions}
              partnerHere={partnerHere}
              mode={mode}
              onSelectDate={goToDate}
              onOpenMonth={() => { haptic.tap(); setMonthOpen(true); }}
              onChangeMode={changeMode}
            />
            {showRecap && (
              <View style={{ marginTop: 16 }}>
                <WeeklyRecapCard weekDates={weekDates} habits={habits} completions={completions} title="Your week, wrapped" compact />
              </View>
            )}
            {mode === 'week' ? (
              <WeekView
                me={me}
                weekDates={weekDates}
                selectedDate={selectedDate}
                habits={habits}
                completions={completions}
                onToggle={toggleOn}
                onSelectDate={(d) => { setSelectedDate(d); haptic.tap(); }}
                onLongPress={openSheet}
                onAddHabit={() => navigation.navigate('AddHabit')}
              />
            ) : (
              <TaskList
                me={me}
                date={selectedDate}
                readOnly={readOnly}
                habits={habits}
                completions={completions}
                proofs={proofs}
                proofStatuses={proofStatuses}
                celebratingId={celebratingId}
                onToggle={handleToggle}
                onLongPress={openSheet}
                onAddHabit={() => navigation.navigate('AddHabit')}
              />
            )}
          </Animated.View>
        </GestureDetector>
      </AnimatedScrollView>

      <HabitSheet
        habit={sheetHabit}
        date={selectedDate}
        me={me}
        onClose={() => setSheetHabit(null)}
        onEdit={(h) => navigation.navigate('AddHabit', { habitId: h.id })}
      />
      <MonthSheet
        visible={monthOpen}
        onClose={() => setMonthOpen(false)}
        selectedDate={selectedDate}
        weekStartsOn={weekStartsOn}
        habits={habits}
        completions={completions}
        onSelectDate={goToDate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: S.bg,
  },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: S.goldSoft,
    ...cardShadow,
  },
  milestoneIcon: {
    fontSize: 26,
  },
  milestoneTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: S.ink900,
  },
  milestoneBody: {
    fontSize: 12.5,
    color: S.ink600,
    marginTop: 1,
  },
});
