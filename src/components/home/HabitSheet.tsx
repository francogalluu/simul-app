import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { BellRing, Camera, Check, Pause, Pencil, Play, SkipForward, Trash2 } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Text } from '@/components/AppText';
import { GlassSheet } from '@/components/GlassSheet';
import { Avatar } from '@/components/Avatar';
import { partnerOf, usePeople, type Person } from '@/lib/people';
import { addDays, isFuture, today } from '@/lib/dates';
import { habitCompletionCount, habitDayComplete, habitLongestStreak, habitStreak, isDoneBy, isPausedNow, isPausedOn } from '@/lib/streaks';
import { formatClock } from '@/lib/reminders';
import { pickProofFromCamera, pickProofFromLibrary, type ProofPickResult } from '@/lib/proofUpload';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { S, fonts } from '@/lib/simulTheme';
import { useTasksStore, type Habit } from '@/store/tasksStore';
import { useHouseholdStore } from '@/store/householdStore';

/**
 * Everything about one habit, on a glass sheet that slides up over Home:
 * a quick read of how it's going (streak, best, total, the last two weeks),
 * the proof photo for the selected day, and the actions — nudge, edit,
 * skip today, pause/resume, delete.
 */
export function HabitSheet({
  habit,
  date,
  me,
  onClose,
  onEdit,
}: {
  habit: Habit | null;
  date: string;
  me: Person;
  onClose: () => void;
  onEdit: (habit: Habit) => void;
}) {
  // Keep the last habit around while the sheet animates out.
  const [shown, setShown] = useState<Habit | null>(habit);
  if (habit && habit !== shown) setShown(habit);
  const live = useTasksStore((s) => (shown ? s.habits.find((h) => h.id === shown.id) ?? null : null));
  const current = live ?? shown;

  return (
    <GlassSheet visible={habit !== null} onClose={onClose}>
      {current && <SheetBody habit={current} date={date} me={me} onClose={onClose} onEdit={onEdit} />}
    </GlassSheet>
  );
}

function SheetBody({ habit, date, me, onClose, onEdit }: { habit: Habit; date: string; me: Person; onClose: () => void; onEdit: (habit: Habit) => void }) {
  const people = usePeople();
  const partner = partnerOf(me);
  const partnerName = people[partner].name;
  const userId = useHouseholdStore((s) => s.userId);
  const completions = useTasksStore((s) => s.completions);
  const proofs = useTasksStore((s) => s.proofs);
  const nudges = useTasksStore((s) => s.nudges);
  const removeHabit = useTasksStore((s) => s.removeHabit);
  const pauseHabit = useTasksStore((s) => s.pauseHabit);
  const resumeHabit = useTasksStore((s) => s.resumeHabit);
  const skipDay = useTasksStore((s) => s.skipDay);
  const setProof = useTasksStore((s) => s.setProof);
  const sendNudge = useTasksStore((s) => s.sendNudge);
  const [uploading, setUploading] = useState(false);
  const [nudging, setNudging] = useState(false);

  const isPendingInvite = habit.status === 'pending';
  const shared = habit.owner === 'both';
  const canManage = shared || habit.owner === me;
  const paused = isPausedNow(habit);
  const skippedThisDay = !paused && isPausedOn(habit, date);
  const t = today();
  const isToday = date === t;

  const stats = useMemo(() => {
    const who: Person | undefined = habit.owner === 'both' ? undefined : habit.owner;
    return {
      streak: habitStreak(habit, completions, who),
      best: habitLongestStreak(habit, completions, who),
      total: habitCompletionCount(habit, completions, who),
      mine: shared ? habitStreak(habit, completions, me) : null,
    };
  }, [habit, completions, shared, me]);

  const last14 = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(t, i - 13)), [t]);

  const mineDone = isDoneBy(completions, habit.id, date, me);
  const theirsDone = isDoneBy(completions, habit.id, date, partner);
  const nudgeKey = `${habit.id}|${date}`;
  const nudgedByMe = nudges[nudgeKey] === me;
  const canNudge = shared && isToday && !isPendingInvite && people[partner].joined && !theirsDone && !paused;
  const myProof = proofs[date]?.[habit.id]?.[me];
  const theirProof = proofs[date]?.[habit.id]?.[partner];
  const canAddProof = mineDone && !isFuture(date) && (shared || habit.owner === me);

  const subtitle = [
    habit.owner === 'both' ? `Together with ${partnerName}` : habit.owner === me ? 'Just you' : `${people[habit.owner].name}'s habit`,
    habit.time,
    habit.reminderTime ? `⏰ ${formatClock(habit.reminderTime)}` : null,
  ].filter(Boolean).join(' • ');

  const confirmDelete = () => {
    Alert.alert(
      isPendingInvite ? 'Cancel invite?' : 'Delete habit?',
      isPendingInvite
        ? `${partnerName} won't see "${habit.name}" anymore.`
        : `"${habit.name}" and its history will be removed${shared ? ` for both you and ${partnerName}` : ''}. Prefer a break? Pause it instead — nothing is lost.`,
      [
        { text: 'Keep', style: 'cancel' },
        { text: isPendingInvite ? 'Cancel invite' : 'Delete', style: 'destructive', onPress: () => { haptic.warning(); removeHabit(habit.id); onClose(); } },
      ],
    );
  };

  const nudge = async () => {
    if (nudging || nudgedByMe) return;
    setNudging(true);
    haptic.medium();
    const ok = await sendNudge(habit.id, date);
    setNudging(false);
    if (ok) toast.success(`Nudged ${partnerName} 🌱`, `They'll see that you're waiting on "${habit.name}".`);
  };

  const handleProof = (result: ProofPickResult) => {
    if ('cancelled' in result) return;
    if ('error' in result) {
      toast.error(result.error === 'permission' ? 'Camera access needed' : "Couldn't add that photo", result.detail);
      return;
    }
    setProof(habit.id, date, result.path);
    haptic.success();
    toast.success('Photo added 📸', 'Saved with today\'s check-in.');
  };

  const addProof = () => {
    if (!userId) return;
    Alert.alert('Add a photo', 'A little proof for the scrapbook.', [
      { text: 'Take photo', onPress: async () => { setUploading(true); handleProof(await pickProofFromCamera(userId, habit.id, date)); setUploading(false); } },
      { text: 'Choose from library', onPress: async () => { setUploading(true); handleProof(await pickProofFromLibrary(userId, habit.id, date)); setUploading(false); } },
      ...(myProof ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => setProof(habit.id, date, null) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <View>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{habit.icon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={2}>{habit.name}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
        </View>
        {paused && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedBadgeText}>Paused</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      {!isPendingInvite && (
        <>
          <View style={styles.statsRow}>
            <Stat label={shared ? 'Together' : 'Streak'} value={stats.streak} unit="d" accent />
            {stats.mine !== null && <Stat label="You" value={stats.mine} unit="d" />}
            <Stat label="Best" value={stats.best} unit="d" />
            <Stat label="Total" value={stats.total} />
          </View>

          <View style={styles.dotsRow}>
            {last14.map((d) => {
              const active = habit.status === 'active' && habit.createdAt <= d;
              const pausedDay = isPausedOn(habit, d);
              const a = isDoneBy(completions, habit.id, d, 'A');
              const s = isDoneBy(completions, habit.id, d, 'S');
              const full = habitDayComplete(habit, completions, d);
              return (
                <View key={d} style={styles.dotCol}>
                  <View style={[styles.dot, !active && styles.dotInactive, pausedDay && styles.dotPaused, full && styles.dotFull]}>
                    {!full && active && !pausedDay && shared && (a || s) && (
                      <View style={[styles.halfDot, { backgroundColor: a ? people.A.color : people.S.color }]} />
                    )}
                  </View>
                  {d === t && <View style={styles.todayTick} />}
                </View>
              );
            })}
          </View>
          <Text style={styles.dotsCaption}>Last two weeks</Text>
        </>
      )}

      {/* Proof photo */}
      {(canAddProof || myProof || theirProof) && !isPendingInvite && (
        <View style={styles.proofRow}>
          {[{ person: me, url: myProof }, { person: partner, url: theirProof }]
            .filter((p) => p.url || (p.person === me && canAddProof))
            .map((p) => (
              <Pressable
                key={p.person}
                onPress={p.person === me && canAddProof ? addProof : undefined}
                style={({ pressed }) => [styles.proofTile, pressed && p.person === me && { opacity: 0.85 }]}
              >
                {p.url ? (
                  <Image source={{ uri: p.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={styles.proofEmpty}>
                    <Camera size={20} color={S.ink600} strokeWidth={2} />
                    <Text style={styles.proofEmptyText}>{uploading ? 'Uploading…' : 'Add photo'}</Text>
                  </View>
                )}
                <Avatar person={p.person} size={18} style={styles.proofAvatar} />
              </Pressable>
            ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {canNudge && (
          <ActionRow
            icon={nudgedByMe ? <Check size={18} color={S.accentDeep} strokeWidth={2.4} /> : <BellRing size={18} color={S.ink900} strokeWidth={2} />}
            label={nudgedByMe ? `Nudged ${partnerName} today` : `Nudge ${partnerName}`}
            hint={nudgedByMe ? undefined : `${partnerName} hasn't done this yet`}
            onPress={nudge}
            disabled={nudgedByMe || nudging}
            tint={S.accentSoft}
          />
        )}
        {canManage && !isPendingInvite && (
          <ActionRow icon={<Pencil size={18} color={S.ink900} strokeWidth={2} />} label="Edit" onPress={() => { onClose(); onEdit(habit); }} />
        )}
        {canManage && !isPendingInvite && !paused && !isFuture(date) && (
          <ActionRow
            icon={<SkipForward size={18} color={S.ink900} strokeWidth={2} />}
            label={skippedThisDay ? (isToday ? 'Skipped today' : 'Skipped this day') : isToday ? 'Skip today' : 'Skip this day'}
            hint={skippedThisDay ? 'Doesn\'t count against your streak' : 'Take the day off without breaking the streak'}
            onPress={() => { haptic.tap(); skipDay(habit.id, date); }}
            disabled={skippedThisDay}
          />
        )}
        {canManage && !isPendingInvite && (
          <ActionRow
            icon={paused ? <Play size={18} color={S.ink900} strokeWidth={2} /> : <Pause size={18} color={S.ink900} strokeWidth={2} />}
            label={paused ? 'Resume' : 'Pause'}
            hint={paused ? 'Pick it back up from today' : 'Travelling, sick, busy — keep the history, stop the clock'}
            onPress={() => { haptic.tap(); (paused ? resumeHabit : pauseHabit)(habit.id); }}
          />
        )}
        {canManage && (
          <ActionRow
            icon={<Trash2 size={18} color={S.danger} strokeWidth={2} />}
            label={isPendingInvite ? 'Cancel invite' : 'Delete'}
            onPress={confirmDelete}
            danger
          />
        )}
      </View>
    </View>
  );
}

function Stat({ label, value, unit, accent }: { label: string; value: number; unit?: string; accent?: boolean }) {
  return (
    <View style={[styles.stat, accent && styles.statAccent]}>
      <Text style={[styles.statValue, accent && { color: S.accentDeep }]}>
        {value}
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionRow({ icon, label, hint, onPress, disabled, danger, tint }: { icon: React.ReactNode; label: string; hint?: string; onPress: () => void; disabled?: boolean; danger?: boolean; tint?: string }) {
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [styles.action, tint ? { backgroundColor: tint } : null, pressed && !disabled && styles.actionPressed, disabled && { opacity: 0.6 }]}
      >
        <View style={styles.actionIcon}>{icon}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.actionLabel, danger && { color: S.danger }]}>{label}</Text>
          {hint ? <Text style={styles.actionHint} numberOfLines={1}>{hint}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: S.glassLine,
  },
  icon: {
    fontSize: 26,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: S.ink900,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: S.ink500,
    marginTop: 3,
  },
  pausedBadge: {
    backgroundColor: S.amberSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pausedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.amber,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: S.glassLine,
  },
  statAccent: {
    backgroundColor: 'rgba(107, 178, 144, 0.16)',
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: S.ink900,
  },
  statUnit: {
    fontSize: 13,
    color: S.ink500,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: S.tertiary,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 2,
  },
  dotCol: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1.4,
    borderColor: S.line,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInactive: {
    opacity: 0.25,
  },
  dotPaused: {
    borderStyle: 'dashed',
    borderColor: S.amber,
  },
  dotFull: {
    backgroundColor: S.accent,
    borderColor: S.accent,
  },
  halfDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  todayTick: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: S.accentDeep,
  },
  dotsCaption: {
    fontSize: 11,
    fontWeight: '600',
    color: S.tertiary,
    textAlign: 'center',
    marginTop: 6,
  },
  proofRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  proofTile: {
    flex: 1,
    height: 96,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: S.glassLine,
  },
  proofEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  proofEmptyText: {
    fontSize: 12,
    fontWeight: '700',
    color: S.ink600,
  },
  proofAvatar: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: S.glassLine,
  },
  actionPressed: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    transform: [{ scale: 0.99 }],
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(38, 32, 25, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: S.ink900,
  },
  actionHint: {
    fontSize: 12,
    color: S.tertiary,
    marginTop: 1,
  },
});
