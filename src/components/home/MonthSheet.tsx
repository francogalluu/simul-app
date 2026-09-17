import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';
import { Text } from '@/components/AppText';
import { GlassSheet } from '@/components/GlassSheet';
import { addMonths, getDateLocale, getMonthRange, getShortDayLabels, getDayOfWeekColumnIndex, isFuture, today, datesInRange } from '@/lib/dates';
import { summarizeDay } from '@/lib/streaks';
import { haptic } from '@/lib/haptics';
import { usePeople } from '@/lib/people';
import { S, fonts } from '@/lib/simulTheme';
import type { WeekStartDay } from '@/store/settingsStore';
import type { Completions, Habit } from '@/store/tasksStore';

/** Month grid for jumping straight to any day. Opened by tapping the month label on Home. */
export function MonthSheet({
  visible,
  onClose,
  selectedDate,
  weekStartsOn,
  habits,
  completions,
  onSelectDate,
}: {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  weekStartsOn: WeekStartDay;
  habits: Habit[];
  completions: Completions;
  onSelectDate: (date: string) => void;
}) {
  const [anchor, setAnchor] = useState(selectedDate);
  // Follow the selection when re-opened.
  const [lastSelected, setLastSelected] = useState(selectedDate);
  if (selectedDate !== lastSelected) {
    setLastSelected(selectedDate);
    setAnchor(selectedDate);
  }

  const people = usePeople();
  const t = today();
  const locale = getDateLocale();
  const labels = useMemo(() => getShortDayLabels(weekStartsOn, locale).map((l) => l.slice(0, 1).toUpperCase()), [weekStartsOn, locale]);

  const cells = useMemo(() => {
    const { start, end } = getMonthRange(anchor);
    const lead = getDayOfWeekColumnIndex(start, weekStartsOn);
    const days = datesInRange(start, end).map((date) => ({ ...summarizeDay(habits, completions, date), future: isFuture(date) }));
    const out: (typeof days[number] | null)[] = [...Array<null>(lead).fill(null), ...days];
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [anchor, weekStartsOn, habits, completions]);

  const title = format(new Date(anchor + 'T00:00:00'), 'MMMM yyyy', { locale });

  return (
    <GlassSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Pressable onPress={() => { haptic.tap(); setAnchor(addMonths(anchor, -1)); }} hitSlop={10} style={styles.navButton}>
          <ChevronLeft size={20} color={S.ink900} strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={() => { haptic.tap(); setAnchor(addMonths(anchor, 1)); }} hitSlop={10} style={styles.navButton}>
          <ChevronRight size={20} color={S.ink900} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={styles.labelsRow}>
        {labels.map((l, i) => (
          <Text key={i} style={styles.label}>{l}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((c, i) =>
          c === null ? (
            <View key={`blank-${i}`} style={styles.cell} />
          ) : (
            <Pressable
              key={c.date}
              onPress={() => { haptic.tap(); onSelectDate(c.date); onClose(); }}
              style={styles.cell}
            >
              <View
                style={[
                  styles.day,
                  c.full && styles.dayFull,
                  !c.full && c.pct > 0 && styles.dayPartial,
                  c.date === selectedDate && styles.daySelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { fontFamily: c.date === t || c.date === selectedDate ? fonts.bold : fonts.regular },
                    c.full && { color: '#FFFFFF' },
                    c.future && { color: S.line },
                    c.date === t && !c.full && { color: S.accentDeep },
                  ]}
                >
                  {Number(c.date.slice(8))}
                </Text>
              </View>
              <View style={styles.dots}>
                <View style={[styles.dot, { backgroundColor: c.aDone ? people.A.color : 'transparent', borderColor: c.future || c.empty ? 'transparent' : people.A.color }]} />
                <View style={[styles.dot, { backgroundColor: c.bDone ? people.S.color : 'transparent', borderColor: c.future || c.empty ? 'transparent' : people.S.color }]} />
              </View>
            </Pressable>
          ),
        )}
      </View>

      <Pressable onPress={() => { haptic.tap(); onSelectDate(t); onClose(); }} style={({ pressed }) => [styles.todayButton, pressed && { opacity: 0.8 }]}>
        <Text style={styles.todayButtonText}>Jump to today</Text>
      </Pressable>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: S.ink900,
    textTransform: 'capitalize',
  },
  labelsRow: {
    flexDirection: 'row',
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: S.tertiary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
  },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayFull: {
    backgroundColor: S.accent,
  },
  dayPartial: {
    backgroundColor: 'rgba(107, 178, 144, 0.18)',
  },
  daySelected: {
    borderWidth: 2,
    borderColor: S.ink900,
  },
  dayText: {
    fontSize: 14,
    color: S.ink900,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    height: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1,
  },
  todayButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: S.accentDeep,
  },
});
