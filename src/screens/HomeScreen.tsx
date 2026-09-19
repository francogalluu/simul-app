import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
  RefreshControl,
  ScrollView as GestureHandlerScrollView,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
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
import type { RootStackParamList } from '@/navigation/types';
import { useSettingsStore } from '@/store/settingsStore';
import { useTasksStore, type Habit } from '@/store/tasksStore';
import { useHouseholdStore } from '@/store/householdStore';
import { addDays, getWeekDates, isFuture, today } from '@/lib/dates';
import { partnerOf, useMe } from '@/lib/people';
import { togetherStreak } from '@/lib/streaks';
import { haptic } from '@/lib/haptics';
import { S, SCREEN_PADDING, TAB_BAR_CLEARANCE } from '@/lib/simulTheme';
import { useHabitsWidgetSync } from '@/widgets/useHabitsWidgetSync';
import { HomeTopBar } from '@/components/home/HomeTopBar';
import { CalendarCard } from '@/components/home/CalendarCard';
import { TaskList } from '@/components/home/TaskList';
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

  const me = useMe();
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  const habits = useTasksStore((s) => s.habits);
  const completions = useTasksStore((s) => s.completions);
  useHabitsWidgetSync(me, habits, completions);
  const toggleCompletion = useTasksStore((s) => s.toggleCompletion);

  const [selectedDate, setSelectedDate] = useState(today);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const weekDates = useMemo(() => getWeekDates(selectedDate, weekStartsOn), [selectedDate, weekStartsOn]);
  const ourStreak = useMemo(() => togetherStreak(habits, completions), [habits, completions]);
  const unread = useMemo(
    () => habits.filter((h) => h.status === 'pending' && h.requestedBy != null && h.requestedBy !== me).length,
    [habits, me],
  );
  const readOnly = isFuture(selectedDate);

  // ─── Day swiping ────────────────────────────────────────────────────────────
  // Content slides out in the swipe direction, the date swaps, then the new
  // day's content springs in from the opposite side.
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
      slide(dir, () => setSelectedDate((d) => addDays(d, dir)));
    },
    [slide],
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
  const handleToggle = useCallback(
    (habit: Habit) => {
      if (readOnly) return;
      const next = toggleCompletion(habit.id, selectedDate, me);
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
    [readOnly, toggleCompletion, selectedDate, me],
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
        contentContainerStyle={styles.scroll}
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
          unreadCount={unread}
          onMailbox={() => navigation.navigate('Mailbox')}
          onAchievements={() => navigation.navigate('Achievements')}
        />

        <GestureDetector gesture={pan}>
          <Animated.View style={swipeStyle}>
            <CalendarCard
              selectedDate={selectedDate}
              weekDates={weekDates}
              togetherStreak={ourStreak}
              habits={habits}
              completions={completions}
              onSelectDate={goToDate}
            />
            <TaskList
              me={me}
              date={selectedDate}
              readOnly={readOnly}
              habits={habits}
              completions={completions}
              celebratingId={celebratingId}
              onToggle={handleToggle}
              onEdit={(h) => {
                haptic.medium();
                navigation.navigate('AddHabit', { habitId: h.id });
              }}
              onAddHabit={() => navigation.navigate('AddHabit')}
            />
          </Animated.View>
        </GestureDetector>
      </AnimatedScrollView>

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
    paddingBottom: TAB_BAR_CLEARANCE,
  },
});
