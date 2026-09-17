import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import Svg, { Circle } from 'react-native-svg';
import { ChevronDown } from 'lucide-react-native';
import { format } from 'date-fns';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { getDateLocale, isFuture, today } from '@/lib/dates';
import { usePeople } from '@/lib/people';
import { CoupleAvatars } from '@/components/CoupleAvatars';
import { summarizeDay } from '@/lib/streaks';
import { S, fonts, cardShadow } from '@/lib/simulTheme';
import type { Completions, Habit } from '@/store/tasksStore';
import { LightningIcon } from './HomeTopBar';

const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export type HomeMode = 'day' | 'week';

export function CalendarCard({
  selectedDate,
  weekDates,
  togetherStreak,
  habits,
  completions,
  partnerHere,
  mode,
  onSelectDate,
  onOpenMonth,
  onChangeMode,
}: {
  selectedDate: string;
  weekDates: string[];
  togetherStreak: number;
  habits: Habit[];
  completions: Completions;
  partnerHere: boolean;
  mode: HomeMode;
  onSelectDate: (date: string) => void;
  onOpenMonth: () => void;
  onChangeMode: (mode: HomeMode) => void;
}) {
  const t = today();
  const people = usePeople();
  const selected = new Date(selectedDate + 'T00:00:00');
  const locale = getDateLocale();

  const days = useMemo(
    () =>
      weekDates.map((date) => {
        const d = new Date(date + 'T00:00:00');
        return {
          label: format(d, 'EEEEE', { locale }),
          num: d.getDate(),
          isSelected: date === selectedDate,
          isToday: date === t,
          future: isFuture(date),
          ...summarizeDay(habits, completions, date),
        };
      }),
    [weekDates, selectedDate, habits, completions, t, locale],
  );

  const title = mode === 'week' ? 'This week' : selectedDate === t ? 'Today' : format(selected, 'EEEE', { locale });
  const subtitle = format(selected, 'MMMM yyyy', { locale });
  // A brand-new household's "0 Days" read as a failure before there'd been a
  // chance to do anything. Until day one, the pill is an invitation instead.
  const hasStreak = togetherStreak > 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatarNameRow}>
          <CoupleAvatars size={34} />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.coupleName} numberOfLines={1}>{people.A.name} &amp; {people.S.name}</Text>
            {partnerHere && (
              <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={styles.presenceRow}>
                <View style={styles.presenceDot} />
                <Text style={styles.presenceText}>{people.S.joined ? 'Both here right now' : 'Here right now'}</Text>
              </Animated.View>
            )}
          </View>
        </View>
        <View style={[styles.streakPill, !hasStreak && styles.streakPillInvite]}>
          <LightningIcon size={14} color={hasStreak ? S.gold : S.accent} />
          <Text style={[styles.streakText, !hasStreak && { color: S.accentDeep }]}>
            {hasStreak ? `${togetherStreak} ${togetherStreak === 1 ? 'Day' : 'Days'}` : 'Start today'}
          </Text>
        </View>
      </View>

      <View style={styles.calHeaderRow}>
        <Text style={styles.calTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {title}
        </Text>
        <View style={styles.calRight}>
          <View style={styles.modeToggle}>
            {(['day', 'week'] as HomeMode[]).map((m) => (
              <Pressable key={m} onPress={() => onChangeMode(m)} style={[styles.modeOption, mode === m && styles.modeOptionActive]} hitSlop={4}>
                <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m === 'day' ? 'Day' : 'Week'}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={onOpenMonth} hitSlop={8} style={({ pressed }) => [styles.monthButton, pressed && { opacity: 0.6 }]} accessibilityLabel="Open month view">
            <Text style={styles.calMonth}>{subtitle}</Text>
            <ChevronDown size={13} color={S.tertiary} strokeWidth={2.6} />
          </Pressable>
        </View>
      </View>

      <View style={styles.stripRow}>
        {days.map((d) => {
          const filled = d.full;
          const numColor = filled ? '#FFFFFF' : d.isSelected ? S.ink900 : d.future ? S.line : S.muted;
          return (
            <Pressable key={d.date} onPress={() => onSelectDate(d.date)} style={styles.dayCol} hitSlop={4}>
              <Text style={[styles.dayLabel, { color: d.isToday ? S.accent : d.isSelected ? S.ink700 : S.muted }]}>
                {d.label}
              </Text>
              <View style={styles.ringWrap}>
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: filled ? S.accent : d.isSelected && mode === 'day' ? S.lineSoft : 'transparent' },
                  ]}
                />
                {!filled && (
                  <Svg width={36} height={36} style={styles.ringSvg}>
                    <Circle cx={18} cy={18} r={RING_RADIUS} fill="none" stroke={S.line} strokeWidth={2.5} />
                    {d.pct > 0 && (
                      <Circle
                        cx={18}
                        cy={18}
                        r={RING_RADIUS}
                        fill="none"
                        stroke={S.accent}
                        strokeWidth={2.5}
                        strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                        strokeDashoffset={RING_CIRCUMFERENCE * (1 - d.pct)}
                        strokeLinecap="round"
                      />
                    )}
                  </Svg>
                )}
                <View style={styles.numWrap}>
                  <Text
                    style={[
                      styles.num,
                      { color: numColor, fontFamily: d.isSelected || filled ? fonts.bold : fonts.regular },
                    ]}
                  >
                    {d.num}
                  </Text>
                </View>
              </View>
              <View style={styles.dotsRow}>
                <Dot done={d.aDone} future={d.future} color={people.A.color} />
                <Dot done={d.bDone} future={d.future} color={people.S.color} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Dot({ done, future, color }: { done: boolean; future: boolean; color: string }) {
  if (future) return <View style={[styles.dot, { borderColor: S.line, backgroundColor: 'transparent' }]} />;
  return <View style={[styles.dot, { borderColor: color, backgroundColor: done ? color : 'transparent' }]} />;
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    backgroundColor: S.card,
    borderRadius: 20,
    padding: 18,
    ...cardShadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  avatarNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  coupleName: {
    fontSize: 15,
    fontWeight: '700',
    color: S.ink900,
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  presenceDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: S.accent,
  },
  presenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: S.accentDeep,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexShrink: 0,
    ...cardShadow,
  },
  streakPillInvite: {
    backgroundColor: S.accentSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
  streakText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: S.ink900,
  },
  calHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 18,
  },
  calTitle: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: S.ink900,
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  calRight: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: S.bg,
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  modeOption: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  modeOptionActive: {
    backgroundColor: S.ink900,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.ink600,
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  calMonth: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: S.tertiary,
  },
  stripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  dayCol: {
    alignItems: 'center',
    gap: 5,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ringWrap: {
    width: 36,
    height: 36,
  },
  pill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
  },
  ringSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: [{ rotate: '-90deg' }],
  },
  numWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontSize: 15,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1.2,
  },
});
