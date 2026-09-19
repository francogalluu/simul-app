import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import Svg, { Circle } from 'react-native-svg';
import { format } from 'date-fns';
import { getDateLocale, getWeekDates, isFuture, today } from '@/lib/dates';
import { usePeople } from '@/lib/people';
import { Avatar } from '@/components/Avatar';
import { streakProgress, summarizeDay } from '@/lib/streaks';
import { NativeRing } from '@/components/NativeControls';
import { S, fonts, cardShadow } from '@/lib/simulTheme';
import type { WeekStartDay } from '@/store/settingsStore';
import type { Completions, Habit } from '@/store/tasksStore';
import { LightningIcon } from './HomeTopBar';

const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function CalendarCard({
  selectedDate,
  weekDates,
  togetherStreak,
  habits,
  completions,
  onSelectDate,
}: {
  selectedDate: string;
  weekDates: string[];
  togetherStreak: number;
  habits: Habit[];
  completions: Completions;
  onSelectDate: (date: string) => void;
}) {
  const { t: tr } = useTranslation();
  const t = today();
  const people = usePeople();
  const selected = new Date(selectedDate + 'T00:00:00');
  const locale = getDateLocale();

  const days = useMemo(
    () =>
      weekDates.map((date) => {
        const d = new Date(date + 'T00:00:00');
        return {
          date,
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

  const title = selectedDate === t ? tr('common.today') : format(selected, 'EEEE', { locale });
  const subtitle = format(selected, 'MMMM yyyy', { locale });

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatarNameRow}>
          <View style={styles.avatarStack}>
            <Avatar person="A" size={34} style={[styles.avatar, { left: 0 }]} />
            <Avatar person="S" size={34} style={[styles.avatar, { left: 18 }]} />
          </View>
          <Text style={styles.coupleName}>{people.A.name} &amp; {people.S.name}</Text>
        </View>
        <View style={styles.streakPill}>
          <View style={styles.streakRing}>
            <NativeRing value={streakProgress(togetherStreak).progress} size={30} />
            <View style={styles.streakBolt} pointerEvents="none">
              <LightningIcon size={12} />
            </View>
          </View>
          <Text style={styles.streakText}>
            {tr('home.day', { count: togetherStreak })}
          </Text>
        </View>
      </View>

      <View style={styles.calHeaderRow}>
        <Text style={styles.calTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {title}
        </Text>
        <Text style={styles.calMonth}>{subtitle}</Text>
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
                    { backgroundColor: filled ? S.accent : d.isSelected ? S.lineSoft : 'transparent' },
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
  },
  avatarNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarStack: {
    width: 52,
    height: 34,
  },
  avatar: {
    position: 'absolute',
    top: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  coupleName: {
    fontSize: 15,
    fontWeight: '700',
    color: S.ink900,
  },
  streakRing: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBolt: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: 7,
    paddingRight: 12,
    paddingVertical: 4,
    ...cardShadow,
  },
  streakText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: S.ink900,
  },
  calHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
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
  calMonth: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: S.tertiary,
    flexShrink: 0,
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
