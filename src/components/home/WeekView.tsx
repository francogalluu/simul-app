import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { format } from 'date-fns';
import { Text } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { getDateLocale, isFuture, today } from '@/lib/dates';
import { involves, partnerOf, usePeople, type Person } from '@/lib/people';
import { isDoneBy, isHabitActiveOn, isPausedOn } from '@/lib/streaks';
import { S, fonts, softShadow } from '@/lib/simulTheme';
import type { Completions, Habit } from '@/store/tasksStore';

/**
 * The shape of the whole week at a glance: one row per habit, one column per
 * day. Tapping a cell on a day that's already happened toggles your own
 * check-in, so catching up on yesterday doesn't need a swipe.
 */
export function WeekView({
  me,
  weekDates,
  selectedDate,
  habits,
  completions,
  onToggle,
  onSelectDate,
  onLongPress,
  onAddHabit,
}: {
  me: Person;
  weekDates: string[];
  selectedDate: string;
  habits: Habit[];
  completions: Completions;
  onToggle: (habit: Habit, date: string) => void;
  onSelectDate: (date: string) => void;
  onLongPress: (habit: Habit) => void;
  onAddHabit: () => void;
}) {
  const people = usePeople();
  const partner = partnerOf(me);
  const t = today();
  const locale = getDateLocale();
  const visible = habits.filter((h) => h.status === 'active' && weekDates.some((d) => h.createdAt <= d));

  const sections = [
    { key: 'together', label: 'Together', items: visible.filter((h) => h.owner === 'both') },
    { key: 'me', label: 'You', items: visible.filter((h) => h.owner === me) },
    { key: 'partner', label: people[partner].name, items: visible.filter((h) => h.owner === partner) },
  ].filter((s) => s.items.length > 0);

  if (sections.length === 0) {
    return <EmptyState icon="🗓️" title="An empty week" body="Add a habit and this fills in as the days go by." actionLabel="Add a habit" onAction={onAddHabit} />;
  }

  const dayHeader = (
    <>
      {weekDates.map((d) => (
        <Pressable key={d} onPress={() => onSelectDate(d)} style={styles.dayCol} hitSlop={4}>
          <Text style={[styles.dayLabel, d === t && { color: S.accentDeep }]}>{format(new Date(d + 'T00:00:00'), 'EEEEE', { locale })}</Text>
          <View style={[styles.dayNumWrap, d === selectedDate && styles.dayNumSelected]}>
            <Text
              style={[
                styles.dayNum,
                { fontFamily: d === selectedDate ? fonts.bold : fonts.regular },
                d === selectedDate && styles.dayNumTextSelected,
                isFuture(d) && { color: S.muted },
              ]}
            >
              {Number(d.slice(8))}
            </Text>
          </View>
        </Pressable>
      ))}
    </>
  );

  return (
    <View style={styles.wrap}>
      {sections.map((section, idx) => (
        <View key={section.key} style={styles.section}>
          {/* The day-of-week header rides along with the first section's
              label instead of floating above everything on its own — it was
              reading as a separate, disconnected block. */}
          {idx === 0 ? (
            <View style={styles.headerRow}>
              <Text style={[styles.sectionLabel, styles.sectionLabelInline]} numberOfLines={1}>{section.label}</Text>
              {dayHeader}
            </View>
          ) : (
            <Text style={styles.sectionLabel}>{section.label}</Text>
          )}
          <View style={styles.card}>
            {section.items.map((habit, idx) => (
              <View key={habit.id} style={[styles.row, idx > 0 && styles.rowBorder]}>
                <Pressable onLongPress={() => onLongPress(habit)} delayLongPress={320} style={styles.nameCol}>
                  <Text style={styles.icon}>{habit.icon}</Text>
                  <Text style={styles.name} numberOfLines={1}>{habit.name}</Text>
                </Pressable>
                {weekDates.map((d) => {
                  const active = isHabitActiveOn(habit, d);
                  const paused = isPausedOn(habit, d);
                  const future = isFuture(d);
                  const mine = isDoneBy(completions, habit.id, d, me);
                  const theirs = isDoneBy(completions, habit.id, d, partner);
                  const canTap = active && !future && involves(habit.owner, me);
                  return (
                    <Pressable
                      key={d}
                      onPress={canTap ? () => onToggle(habit, d) : undefined}
                      disabled={!canTap}
                      style={styles.dayCol}
                      hitSlop={2}
                    >
                      <Cell habit={habit} active={active} paused={paused} future={future} mine={mine} theirs={theirs} me={me} colors={{ A: people.A.color, S: people.S.color }} />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function Cell({ habit, active, paused, future, mine, theirs, me, colors }: { habit: Habit; active: boolean; paused: boolean; future: boolean; mine: boolean; theirs: boolean; me: Person; colors: Record<Person, string> }) {
  if (paused) return <View style={[styles.cell, styles.cellPaused]} />;
  if (!active || (habit.createdAt > today() && future)) return <View style={[styles.cell, styles.cellInactive]} />;
  if (habit.owner === 'both') {
    const both = mine && theirs;
    return (
      <View style={[styles.cell, both && { backgroundColor: S.accent, borderColor: S.accent }, future && styles.cellFuture]}>
        {!both && (mine || theirs) && (
          <View style={styles.halves}>
            <View style={[styles.half, { backgroundColor: mine ? colors[me] : 'transparent' }]} />
            <View style={[styles.half, { backgroundColor: theirs ? colors[me === 'A' ? 'S' : 'A'] : 'transparent' }]} />
          </View>
        )}
      </View>
    );
  }
  const done = habit.owner === me ? mine : theirs;
  const color = colors[habit.owner];
  return <View style={[styles.cell, done && { backgroundColor: color, borderColor: color }, future && styles.cellFuture]} />;
}

const NAME_COL = 104;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  nameCol: {
    width: NAME_COL,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 6,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: S.muted,
  },
  dayNumWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumSelected: {
    // The app's accent green, not black — readable against a white number
    // and consistent with how "selected" reads everywhere else in the app.
    backgroundColor: S.accent,
  },
  dayNum: {
    fontSize: 12,
    color: S.ink900,
  },
  dayNumTextSelected: {
    color: '#FFFFFF',
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: S.ink700,
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  sectionLabelInline: {
    width: NAME_COL,
    marginBottom: 0,
    paddingHorizontal: 0,
    paddingRight: 6,
  },
  card: {
    backgroundColor: S.card,
    borderRadius: 18,
    paddingHorizontal: 6,
    ...softShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: S.lineSoft,
  },
  icon: {
    fontSize: 14,
  },
  name: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: S.ink900,
  },
  cell: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.4,
    borderColor: '#DEDAD2',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cellInactive: {
    opacity: 0.18,
  },
  cellFuture: {
    borderStyle: 'dashed',
    borderColor: S.lineSoft,
  },
  cellPaused: {
    borderStyle: 'dashed',
    borderColor: S.amber,
    backgroundColor: S.amberSoft,
    opacity: 0.8,
  },
  halves: {
    flex: 1,
    flexDirection: 'row',
  },
  half: {
    flex: 1,
  },
});
