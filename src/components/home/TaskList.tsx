import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { partnerOf, usePeople, type Person } from '@/lib/people';
import { Avatar } from '@/components/Avatar';
import { isDoneBy, isHabitActiveOn } from '@/lib/streaks';
import { S, fonts, softShadow } from '@/lib/simulTheme';
import type { Completions, Habit } from '@/store/tasksStore';
import { EmptyState } from '@/components/EmptyState';

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon({ size = 13, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="4 12 9 18 20 6" />
    </Svg>
  );
}

function ClockIcon({ size = 13, color = S.amber }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3.5 2" />
    </Svg>
  );
}

// ─── Row state ────────────────────────────────────────────────────────────────

type RowState =
  | { kind: 'todo' }
  | { kind: 'done' }
  | { kind: 'waiting-partner' }   // I did it, partner hasn't
  | { kind: 'partner-waiting' }   // partner did it, I haven't
  | { kind: 'partner-only-todo' } // partner's own habit, not done
  | { kind: 'partner-only-done' }
  | { kind: 'pending-invite' };   // shared invite I sent, not accepted yet

function rowState(habit: Habit, completions: Completions, date: string, me: Person): RowState {
  const partner = partnerOf(me);
  if (habit.status === 'pending') return { kind: 'pending-invite' };
  const mine = isDoneBy(completions, habit.id, date, me);
  const theirs = isDoneBy(completions, habit.id, date, partner);
  if (habit.owner === 'both') {
    if (mine && theirs) return { kind: 'done' };
    if (mine) return { kind: 'waiting-partner' };
    if (theirs) return { kind: 'partner-waiting' };
    return { kind: 'todo' };
  }
  if (habit.owner === me) return { kind: mine ? 'done' : 'todo' };
  return { kind: theirs ? 'partner-only-done' : 'partner-only-todo' };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export function TaskList({
  me,
  date,
  readOnly,
  habits,
  completions,
  celebratingId,
  onToggle,
  onEdit,
  onAddHabit,
}: {
  me: Person;
  date: string;
  readOnly: boolean;
  habits: Habit[];
  completions: Completions;
  celebratingId: string | null;
  onToggle: (habit: Habit) => void;
  onEdit: (habit: Habit) => void;
  onAddHabit: () => void;
}) {
  const { t } = useTranslation();
  const partner = partnerOf(me);
  const people = usePeople();
  const visible = habits.filter(
    (h) => (h.status === 'active' && isHabitActiveOn(h, date)) || (h.status === 'pending' && h.requestedBy === me),
  );

  const sections = [
    { key: 'together', label: t('home.together'), people: ['A', 'S'] as Person[], items: visible.filter((h) => h.owner === 'both') },
    { key: 'me', label: t('home.you'), people: [me], items: visible.filter((h) => h.owner === me) },
    { key: 'partner', label: people[partner].name, people: [partner], items: visible.filter((h) => h.owner === partner) },
  ].filter((s) => s.items.length > 0);

  if (sections.length === 0) {
    return (
      <EmptyState
        icon="🌱"
        title={readOnly ? t('home.emptyTitleReadOnly') : t('home.emptyTitle')}
        body={readOnly ? t('home.emptyBodyReadOnly') : t('home.emptyBody')}
        actionLabel={readOnly ? undefined : t('home.addHabit')}
        onAction={readOnly ? undefined : onAddHabit}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      {sections.map((section) => {
        const doneCount = section.items.filter((h) => {
          const st = rowState(h, completions, date, me).kind;
          return st === 'done' || st === 'partner-only-done';
        }).length;
        return (
          <View key={section.key}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                {section.people.length === 2 ? (
                  <View style={styles.sectionAvatarDuo}>
                    <Avatar person="A" size={22} style={[styles.sectionAvatarDuoImg, { left: 0 }]} />
                    <Avatar person="S" size={22} style={[styles.sectionAvatarDuoImg, { left: 12 }]} />
                  </View>
                ) : (
                  <Avatar person={section.people[0]} size={22} style={styles.sectionAvatarSingle} />
                )}
                <Text style={styles.sectionLabel}>{section.label}</Text>
              </View>
              <Text style={styles.sectionCount}>{doneCount}/{section.items.length}</Text>
            </View>
            <View style={styles.sectionCard}>
              {section.items.map((habit) => (
                <TaskRow
                  key={habit.id}
                  habit={habit}
                  me={me}
                  state={rowState(habit, completions, date, me)}
                  readOnly={readOnly}
                  celebrating={celebratingId === habit.id}
                  onToggle={() => onToggle(habit)}
                  // Only the owner can edit a habit; either person can edit a shared one.
                  onLongPress={habit.owner === 'both' || habit.owner === me ? () => onEdit(habit) : undefined}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function TaskRow({
  habit,
  me,
  state,
  readOnly,
  celebrating,
  onToggle,
  onLongPress,
}: {
  habit: Habit;
  me: Person;
  state: RowState;
  readOnly: boolean;
  celebrating: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
}) {
  const { t } = useTranslation();
  const partner = partnerOf(me);
  const partnerName = usePeople()[partner].name;
  const timeLabel = t(`times.${habit.time}`, { defaultValue: habit.time });
  const k = state.kind;
  const isDone = k === 'done' || k === 'partner-only-done';
  const dimmed = k === 'pending-invite';
  const canToggle = !readOnly && (k === 'todo' || k === 'done' || k === 'waiting-partner' || k === 'partner-waiting');

  const meta = (() => {
    if (k === 'pending-invite') return <Text style={styles.meta}>{t('home.waitingToAccept', { name: partnerName })}</Text>;
    return (
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{timeLabel}</Text>
        <Text style={styles.meta}> • </Text>
        {habit.owner === 'both' ? (
          <View style={styles.metaAvatarDuo}>
            <Avatar person="A" size={14} style={[styles.metaAvatarDuoImg, { left: 0 }]} />
            <Avatar person="S" size={14} style={[styles.metaAvatarDuoImg, { left: 8 }]} />
          </View>
        ) : (
          <Avatar person={habit.owner} size={14} style={styles.metaAvatarSingle} />
        )}
      </View>
    );
  })();

  const trailing = (() => {
    if (k === 'pending-invite') {
      return (
        <View style={[styles.checkbox, styles.checkboxAmber]}>
          <ClockIcon size={13} />
        </View>
      );
    }
    // Whoever completed it gets their picture in the pill; my own checkbox
    // reflects whether *I* still need to act.
    if (k === 'waiting-partner') {
      return (
        <>
          <View style={styles.waitPill}>
            <Avatar person={me} size={14} style={styles.waitAvatar} />
            <CheckIcon size={9} color={S.accentDeep} />
          </View>
          <View style={[styles.checkbox, styles.checkboxDone]}>
            <CheckIcon size={13} />
          </View>
        </>
      );
    }
    if (k === 'partner-waiting') {
      return (
        <>
          <View style={styles.waitPill}>
            <Avatar person={partner} size={14} style={styles.waitAvatar} />
            <CheckIcon size={9} color={S.accentDeep} />
          </View>
          <View style={[styles.checkbox, styles.checkboxTodo, { borderColor: S.accent }]} />
        </>
      );
    }
    if (k === 'partner-only-todo' || k === 'partner-only-done') {
      return (
        <View style={[styles.checkbox, isDone ? styles.checkboxDone : styles.checkboxTodo, { opacity: 0.55 }]}>
          {isDone && <CheckIcon size={13} />}
        </View>
      );
    }
    return (
      <View style={[styles.checkbox, isDone ? styles.checkboxDone : styles.checkboxTodo]}>
        {isDone && <CheckIcon size={13} />}
      </View>
    );
  })();

  return (
    <Pressable
      onPress={canToggle ? onToggle : undefined}
      onLongPress={onLongPress}
      delayLongPress={320}
      style={({ pressed }) => [styles.row, dimmed && styles.rowDimmed, pressed && canToggle && styles.rowPressed]}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.iconText}>{habit.icon}</Text>
      </View>

      <View style={styles.textWrap}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: isDone ? S.muted : S.ink900 }, isDone && styles.nameDone]} numberOfLines={1}>
            {habit.name}
          </Text>
          {k === 'pending-invite' && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{t('home.pending')}</Text>
            </View>
          )}
        </View>
        {meta}
      </View>

      <View style={styles.trailingWrap}>{trailing}</View>

      {celebrating && (
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          exiting={FadeOut.duration(250)}
          style={styles.celebrate}
          pointerEvents="none"
        >
          <Text style={styles.celebrateText}>{t('home.celebrate')}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
    paddingHorizontal: 3,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionAvatarDuo: {
    width: 34,
    height: 22,
  },
  sectionAvatarDuoImg: {
    position: 'absolute',
    top: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.6,
    borderColor: S.bg,
  },
  sectionAvatarSingle: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: S.ink900,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: S.tertiary,
  },
  sectionCard: {
    backgroundColor: S.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 2,
    ...softShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  rowDimmed: {
    opacity: 0.6,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: S.bg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: {
    fontSize: 17,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  nameDone: {
    textDecorationLine: 'line-through',
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
    color: S.tertiary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaAvatarDuo: {
    width: 22,
    height: 14,
  },
  metaAvatarDuoImg: {
    position: 'absolute',
    top: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
  },
  metaAvatarSingle: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  pendingBadge: {
    backgroundColor: S.amberSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: S.amber,
  },
  // Fixed width + right alignment so the checkbox always lands in the same
  // spot regardless of whether a wait-pill is shown next to it — otherwise
  // the checkbox visibly shifts between rows in different states.
  trailingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    width: 74,
    flexShrink: 0,
  },
  waitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: S.accentSoft,
  },
  waitAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxTodo: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DEDAD2',
  },
  checkboxDone: {
    backgroundColor: S.accentDeep,
    borderColor: S.accentDeep,
  },
  checkboxAmber: {
    backgroundColor: S.amberSoft,
    borderColor: S.amberSoft,
  },
  celebrate: {
    position: 'absolute',
    right: 40,
    top: 6,
    backgroundColor: S.ink900,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  celebrateText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
});
