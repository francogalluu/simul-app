import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Palette } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useHabitStore } from '@/store';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/context/ThemeContext';
import { today, isFuture } from '@/lib/dates';
import { getHabitCurrentValue, isHabitCompleted } from '@/lib/aggregates';
import { getProgressColor, PROGRESS_COLORS } from '@/lib/progressColors';
import { formatReminderDisplay } from '@/lib/reminderFormat';
import { ScoreRing } from '@/components/ScoreRing';
import { InteractiveQuantityRing } from '@/components/InteractiveQuantityRing';
import { getHabitUnitLabel } from '@/lib/habitUnitLabel';
import { ConfettiOverlay } from '@/components/ConfettiOverlay';
import {
  navHeaderBarPressable,
  navHeaderItemWrap,
  navHeaderLabelText,
} from '@/lib/navigationHeaderStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'HabitDetail'>;

export default function HabitDetailScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { id, date: paramDate } = route.params;
  const todayStr = today();
  const viewDate = paramDate ?? todayStr;
  const isViewingFuture = isFuture(viewDate);

  const habit          = useHabitStore(s => s.habits.find(h => h.id === id));
  const allEntries     = useHabitStore(s => s.entries);
  const weekStartsOn   = useSettingsStore(s => s.weekStartsOn);
  const haptic         = Boolean(useSettingsStore(s => s.hapticFeedback));
  const incrementEntry = useHabitStore(s => s.incrementEntry);
  const decrementEntry = useHabitStore(s => s.decrementEntry);
  const logEntry       = useHabitStore(s => s.logEntry);
  const deleteEntry    = useHabitStore(s => s.deleteEntry);
  const pauseHabit     = useHabitStore(s => s.pauseHabit);
  const archiveHabit   = useHabitStore(s => s.archiveHabit);

  const currentValue = useMemo(
    () => habit ? getHabitCurrentValue(habit, allEntries, viewDate, weekStartsOn) : 0,
    [habit, allEntries, viewDate, weekStartsOn],
  );

  const completed = useMemo(
    () => habit ? isHabitCompleted(habit, allEntries, viewDate, weekStartsOn) : false,
    [habit, allEntries, viewDate, weekStartsOn],
  );

  const isBreak           = habit?.goalType === 'break';
  const isBreakBoolean    = isBreak && habit?.kind === 'boolean';
  const failed             = isBreakBoolean && currentValue >= 1; // bad-habit slip recorded
  const overLimit         = isBreak && currentValue > (habit?.target ?? 0);
  const progressPct       = habit ? Math.min((currentValue / habit.target) * 100, 100) : 0;
  // Break boolean: red when failed, else neutral/success. Break numeric: red at/over limit. Build: green when completed.
  const ringStrokeColor   = isBreakBoolean
    ? (failed ? PROGRESS_COLORS.LOW : PROGRESS_COLORS.MID)
    : isBreak && (progressPct >= 100 || overLimit)
      ? PROGRESS_COLORS.LOW
      : isBreak
        ? PROGRESS_COLORS.MID
        : completed
          ? PROGRESS_COLORS.HIGH
          : getProgressColor(progressPct);
  const accentColor = isBreakBoolean
    ? (failed ? PROGRESS_COLORS.LOW : '#008080')
    : isBreak
      ? PROGRESS_COLORS.LOW
      : (completed ? PROGRESS_COLORS.HIGH : '#008080');

  // Wire the navigation header title and Edit button
  useLayoutEffect(() => {
    if (!habit) return;
    navigation.setOptions({
      headerTitle: habit.name,
      headerTintColor: accentColor,
      headerRight: () => (
        <View style={navHeaderItemWrap}>
          <Pressable
            onPress={() => navigation.navigate('EditHabit', { id: habit.id, screen: 'HabitType' })}
            hitSlop={8}
            style={navHeaderBarPressable}
          >
            <Text style={[navHeaderLabelText, { color: accentColor }]}>{t('habitDetail.edit')}</Text>
          </Pressable>
        </View>
      ),
    });
  }, [habit, navigation, accentColor]);

  const [showConfetti, setShowConfetti] = useState(false);

  const handleToggle = useCallback(() => {
    if (!habit || isViewingFuture) return;
    if (isBreakBoolean) {
      if (failed) {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        deleteEntry(habit.id, viewDate);
      } else {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        logEntry(habit.id, viewDate, 1);
      }
    } else {
      if (completed) {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        deleteEntry(habit.id, viewDate);
      } else {
        if (haptic) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        logEntry(habit.id, viewDate, 1);
        setShowConfetti(true);
      }
    }
  }, [habit, completed, failed, isBreakBoolean, deleteEntry, logEntry, viewDate, isViewingFuture, haptic]);

  const handleIncrement = useCallback(() => {
    if (!habit || isViewingFuture) return;
    if (!isBreak && currentValue >= habit.target) return;
    const willReachGoal = currentValue + 1 >= habit.target;
    if (haptic && willReachGoal) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    incrementEntry(habit.id, viewDate);
  }, [habit, isBreak, currentValue, incrementEntry, viewDate, isViewingFuture, haptic]);

  const handleDecrement = useCallback(() => {
    if (!habit || currentValue <= 0 || isViewingFuture) return;
    decrementEntry(habit.id, viewDate);
  }, [habit, currentValue, decrementEntry, viewDate, isViewingFuture]);

  const handleSetQuantity = useCallback((value: number) => {
    if (!habit || isViewingFuture) return;
    const maxVal = isBreak ? 99999 : habit.target;
    const clamped = Math.max(0, Math.min(value, maxVal));
    if (haptic && !isBreak && clamped >= habit.target) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logEntry(habit.id, viewDate, clamped);
    if (!isBreak && clamped >= habit.target) setShowConfetti(true);
  }, [habit, isBreak, logEntry, viewDate, isViewingFuture, haptic]);

  const handlePause = () => {
    if (!habit) return;
    Alert.alert(
      t('habitDetail.pauseTitle'),
      t('habitDetail.pauseMessage', { name: habit.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('habitDetail.pause'), onPress: () => { pauseHabit(id); navigation.goBack(); } },
      ],
    );
  };

  const handleDelete = () => {
    if (!habit) return;
    Alert.alert(
      t('habitDetail.deleteTitle'),
      t('habitDetail.deleteMessage', { name: habit.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('habitDetail.delete'),
          style: 'destructive',
          onPress: () => { archiveHabit(id); navigation.goBack(); },
        },
      ],
    );
  };

  if (!habit) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
        <View style={s.notFound}>
          <Text style={[s.notFoundText, { color: colors.text2 }]}>{t('habitDetail.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const freqLabel    = habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1);
  const noun         = isBreak ? 'Limit' : 'Goal';
  const isViewingToday = viewDate === todayStr;
  const goalLabel    = habit.frequency === 'daily'
    ? (isViewingToday ? `Today's ${noun}` : `That day's ${noun}`)
    : habit.frequency === 'weekly'
      ? (isViewingToday ? `This Week's ${noun}` : `That week's ${noun}`)
      : (isViewingToday ? `This Month's ${noun}` : `That month's ${noun}`);
  const unitLabel    = getHabitUnitLabel(habit, t);
  const measureLabel = habit.kind === 'boolean' ? 'Yes / No' :
                       unitLabel ? `Count (${unitLabel})` : 'Count';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Progress ring (boolean) or label only (numeric: ring is in InteractiveQuantityRing) ─── */}
        <View style={s.ringSection}>
          {habit.kind === 'boolean' ? (
            <ScoreRing
              value={isBreakBoolean ? (failed ? 100 : 0) : progressPct}
              size={220}
              strokeWidth={12}
              radius={80}
              strokeColor={ringStrokeColor}
              renderCenter={() => (
                <View style={s.ringCenter}>
                  <Text style={[s.ringBoolMark, { color: isBreakBoolean ? (failed ? accentColor : colors.chevron) : (completed ? accentColor : colors.chevron) }]}>
                    {isBreakBoolean ? (failed ? '✗' : '○') : (completed ? '✓' : '○')}
                  </Text>
                </View>
              )}
            />
          ) : null}
          <Text style={[s.goalLabel, { color: colors.text3 }]}>{goalLabel}</Text>
          {overLimit && (
            <Text style={[s.overLimitBadge, { color: colors.danger }]}>{t('habitDetail.overLimitTooMany', { count: currentValue - habit.target })}</Text>
          )}
        </View>

        {/* ── Controls ──────────────────────────────────────────────────── */}
        {isViewingFuture && (
          <Text style={[s.futureDateNote, { color: colors.text2 }]}>{t('habitDetail.futureDateNote')}</Text>
        )}
        {habit.kind === 'boolean' ? (
          <View style={s.boolRow}>
            <Pressable
              onPress={isViewingFuture ? undefined : handleToggle}
              disabled={isViewingFuture}
              style={({ pressed }) => [
                s.boolBtn,
                { borderColor: accentColor },
                (completed || failed) && [s.boolBtnDone, { backgroundColor: accentColor }],
                !isViewingFuture && pressed && { opacity: 0.75 },
                isViewingFuture && s.ctrlBtnDisabled,
              ]}
            >
              <Text style={[s.boolBtnText, { color: accentColor }, (completed || failed) && { color: colors.white }]}>
                {isBreakBoolean
                  ? (failed ? t('common.undo') : t('habitDetail.markFailed'))
                  : (completed ? t('habitDetail.done') : t('habitDetail.markDone'))}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <InteractiveQuantityRing
              value={currentValue}
              target={habit.target}
              unit={unitLabel || undefined}
              isBreak={isBreak}
              disabled={isViewingFuture}
              strokeColor={ringStrokeColor}
              onValueChange={handleSetQuantity}
            />
            {!isViewingFuture && (
              <Text style={[s.ringHint, { color: colors.text3 }]}>{t('habitDetail.ringDragHint')}</Text>
            )}
          </>
        )}

        {/* ── Info rows ─────────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={[s.infoCard, { backgroundColor: colors.bgCard }]}>
            <InfoRow label={t('habitDetail.frequency')}   value={freqLabel}    last={false} colors={colors} />
            <InfoRow label={t('habitDetail.measurement')} value={measureLabel} last={false} colors={colors} />
            <InfoRow
              label={isBreak ? t('habitDetail.limit') : t('habitDetail.target')}
              value={`${habit.target}${unitLabel ? ' ' + unitLabel : ''}`}
              last={false}
              colors={colors}
            />
            <InfoRow
              label={t('habitDetail.reminder')}
              value={formatReminderDisplay(habit, t) ?? t('settings.off')}
              last={true}
              colors={colors}
            />
          </View>
        </View>

        {/* ── Description (optional) ───────────────────────────────────────────── */}
        {habit.description ? (
          <View style={s.section}>
            <View style={[s.descriptionCard, { backgroundColor: colors.bgCard }]}>
              <Text style={[s.descriptionLabel, { color: colors.text2 }]}>{t('habitDetail.description')}</Text>
              <Text style={[s.descriptionText, { color: colors.text1 }]}>{habit.description}</Text>
            </View>
          </View>
        ) : null}

        {/* ── Pause / Delete (only when viewing today — not past or future) ───── */}
        {isViewingToday && (
          <>
            <View style={s.section}>
              <Pressable
                onPress={handlePause}
                style={({ pressed }) => [s.pauseCard, { backgroundColor: colors.bgCard }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[s.pauseText, { color: colors.teal }]}>{t('habitDetail.pauseButton')}</Text>
              </Pressable>
            </View>
            <View style={s.section}>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [s.deleteCard, { backgroundColor: colors.bgCard }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[s.deleteText, { color: colors.danger }]}>{t('habitDetail.deleteButton')}</Text>
              </Pressable>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      {showConfetti && (
        <ConfettiOverlay onComplete={() => setShowConfetti(false)} />
      )}
    </SafeAreaView>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function InfoRow({ label, value, last, colors }: { label: string; value: string; last: boolean; colors: Palette }) {
  return (
    <View style={[s.infoRow, !last && [s.infoRowBorder, { borderBottomColor: colors.separator }]]}>
      <Text style={[s.infoLabel, { color: colors.text3 }]}>{label}</Text>
      <Text style={[s.infoValue, { color: colors.text1 }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#F2F2F7' },
  scroll:    { paddingBottom: 20 },
  notFound:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 17, color: '#8E8E93' },
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 22,
  },

  // Ring
  ringSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 4 },
  ringCenter:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringBoolMark:{ fontSize: 64, fontWeight: '300' },
  ringCurrent: { fontSize: 48, fontWeight: '300', color: '#1A1A1A' },
  ringTarget:  { fontSize: 32, color: '#999' },
  ringUnit:    { fontSize: 15, color: '#999', marginTop: 4 },
  goalLabel:   { fontSize: 17, color: '#666', marginTop: 8, marginBottom: 8 },
  overLimitBadge: {
    fontSize: 14, fontWeight: '600', color: '#FF3B30',
    marginBottom: 16, textAlign: 'center',
  },
  futureDateNote: {
    fontSize: 15, color: '#8E8E93', textAlign: 'center', marginBottom: 16,
  },
  ringHint: {
    fontSize: 14, textAlign: 'center', marginTop: -32, marginBottom: 8,
  },

  // Boolean toggle
  boolRow:     { alignItems: 'center', marginBottom: 32 },
  boolBtn:     {
    paddingHorizontal: 48, paddingVertical: 16, borderRadius: 50,
    borderWidth: 2, borderColor: '#008080', backgroundColor: 'transparent',
  },
  boolBtnDone: { backgroundColor: '#008080' },
  boolBtnText: { fontSize: 17, fontWeight: '600', color: '#008080' },
  boolBtnTextDone: { color: '#fff' },
  ctrlBtnDisabled: { opacity: 0.3 },

  // Info rows
  section:     { paddingHorizontal: 16, marginBottom: 12 },
  infoCard:    { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  infoRow:     {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  infoRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  infoLabel: { fontSize: 17, color: '#666' },
  infoValue: { fontSize: 17, color: '#1A1A1A', fontWeight: '500' },

  // Pause
  pauseCard: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  pauseText: { fontSize: 17, color: '#008080' },

  // Delete
  deleteCard: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  deleteText: { fontSize: 17, color: '#FF3B30' },
});
