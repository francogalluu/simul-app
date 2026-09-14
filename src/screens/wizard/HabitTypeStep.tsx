/**
 * HabitTypeStep — the wizard's entry screen / summary form.
 * Build/break choice is made earlier (add-habit sheet); goalType comes from store.
 *   • Circular back (left) | title | Save (right) — back returns to habit picker when possible; else closes modal
 *   • Section 1: Name (same-line field), Icon, Description — tap name to edit; icon/description → sub-steps
 *   • Section 2: Frequency, Measure By     — chevron rows → sub-steps
 *   • Section 3: Reminder toggle, Time row  — inline toggle + conditional row
 */
import React, { useLayoutEffect, useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, TextInput, Switch, Pressable,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WizardStackParamList } from '@/navigation/types';

import { useTranslation } from 'react-i18next';
import { useHabitStore } from '@/store';
import { useWizardStore } from '@/store/wizardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/context/ThemeContext';
import { formatReminderSummary } from '@/lib/reminderFormat';
import {
  navHeaderBarPressable,
  navHeaderItemWrap,
  navHeaderLabelText,
} from '@/lib/navigationHeaderStyles';
import { HeaderBackButton } from '@/components/HeaderBackButton';

type Props = NativeStackScreenProps<WizardStackParamList, 'HabitType'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function measureByLabel(
  kind: 'boolean' | 'numeric',
  target: number,
  unit: string,
  unitKey: string | null,
  t: (k: string) => string,
): string {
  if (kind === 'boolean') return t('wizard.completion');
  const n = target > 0 ? target : 1;
  const u = unitKey ? t(unitKey) : unit.trim();
  return u ? `${n} ${u}` : String(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HabitTypeStep({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // ── Wizard store ───────────────────────────────────────────────────────────
  const {
    habitId, goalType, name, icon, description, kind, frequency,
    target, unit, unitKey, reminderEnabled, reminderTime, reminderWeekdays, reminderDayOfMonth,
    reset, loadHabit, setFromOnboarding, setGoalType,
    setName,
    setReminderEnabled,
  } = useWizardStore();

  // ── Habit store actions ────────────────────────────────────────────────────
  const addHabit    = useHabitStore(s => s.addHabit);
  const updateHabit = useHabitStore(s => s.updateHabit);

  // ── Init: detect edit vs new (once per wizard mount) ───────────────────────
  const didInitWizard = useRef(false);
  useEffect(() => {
    if (didInitWizard.current) return;
    didInitWizard.current = true;

    const parentState = navigation.getParent()?.getState();
    const editRoute   = parentState?.routes.find(r => r.name === 'EditHabit');
    const editId      = (editRoute?.params as { id?: string } | undefined)?.id;

    if (editId) {
      const habit = useHabitStore.getState().habits.find(h => h.id === editId);
      if (habit) {
        loadHabit(habit);
        return;
      }
    }
    // New habit: reset only when store is still empty (e.g. direct open).
    // Do not reset when pre-filled from predetermined picker (name already set).
    if (!habitId && !name.trim()) {
      const { goalType: keepGoalType, fromOnboarding: keepOnboarding } = useWizardStore.getState();
      reset();
      setGoalType(keepGoalType);
      if (keepOnboarding) setFromOnboarding(true);
    }
  }, [navigation, habitId, name, reset, loadHabit, setFromOnboarding, setGoalType]);

  const isEdit = !!habitId;

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleHeaderBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    reset();
    navigation.getParent()?.goBack();
  }, [navigation, reset]);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('wizard.nameRequiredTitle'), t('wizard.nameRequiredMessage'));
      return;
    }
    const fromOnboarding = useWizardStore.getState().fromOnboarding;
    const draftUnitKey   = useWizardStore.getState().unitKey?.trim();
    const resolvedTarget = kind === 'boolean' ? 1 : Math.max(1, target);
    const unitPatch =
      kind === 'boolean'
        ? {}
        : draftUnitKey
          ? { unitKey: draftUnitKey, unit: undefined }
          : { unitKey: undefined, unit: unit.trim() || undefined };
    const resolvedReminder = reminderEnabled ? reminderTime : undefined;
    const resolvedWeekdays = reminderEnabled && frequency === 'weekly' ? reminderWeekdays : undefined;
    const resolvedDayOfMonth = reminderEnabled && frequency === 'monthly' ? reminderDayOfMonth : undefined;

    const resolvedDescription = description.trim() || undefined;

    const reminderPatch = {
      reminderTime: resolvedReminder,
      reminderWeekdays: resolvedWeekdays,
      reminderDayOfMonth: resolvedDayOfMonth,
    };

    if (isEdit && habitId) {
      updateHabit(habitId, {
        goalType,
        name: trimmed,
        icon,
        description: resolvedDescription,
        kind,
        frequency,
        target: resolvedTarget,
        ...unitPatch,
        ...reminderPatch,
      });
    } else {
      addHabit({
        goalType,
        name: trimmed,
        icon,
        description: resolvedDescription,
        kind,
        frequency,
        target: resolvedTarget,
        ...unitPatch,
        ...reminderPatch,
      });
    }
    reset();
    const root = navigation.getParent();
    if (fromOnboarding && root) {
      useSettingsStore.getState().setHasCompletedOnboarding(true);
      root.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Tabs' }],
        }),
      );
    } else {
      root?.goBack();
    }
  }, [name, icon, description, kind, frequency, target, unit, unitKey, reminderEnabled, reminderTime, reminderWeekdays, reminderDayOfMonth, isEdit, habitId, addHabit, updateHabit, reset, navigation]);

  // ── Header buttons ─────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? t('wizard.editHabit') : t('wizard.newHabit'),
      headerLeft: () => (
        <HeaderBackButton onPress={handleHeaderBack} accessibilityLabel={t('common.back')} />
      ),
      headerRight: () => (
        <View style={navHeaderItemWrap}>
          <Pressable onPress={handleSave} hitSlop={8} style={navHeaderBarPressable}>
            <Text style={[navHeaderLabelText, { color: colors.teal }]}>{t('wizard.save')}</Text>
          </Pressable>
        </View>
      ),
    });
  }, [isEdit, navigation, handleSave, handleHeaderBack, colors.teal, t]);

  // ── Derived display values ─────────────────────────────────────────────────
  const freqLabel    = frequency === 'daily' ? t('wizard.frequencyDaily') : frequency === 'weekly' ? t('wizard.frequencyWeekly') : t('wizard.frequencyMonthly');
  const measureLabel = measureByLabel(kind, target, unit, unitKey, t);

  // ── UI ─────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Section 1: Name & Icon ──────────────────────────────────── */}
        <View style={[s.section, { backgroundColor: colors.bgCard }]}>
          <NameRow
            label={t('wizard.name')}
            name={name}
            setName={setName}
            emptyLabel={t('wizard.namePlaceholder')}
          />
          <Row
            label={t('wizard.icon')}
            value={icon}
            onPress={() => navigation.navigate('HabitIcon')}
          />
          <Row
            label={t('wizard.description')}
            value={description.trim() || t('wizard.descriptionPlaceholderShort')}
            valueFaded={!description.trim()}
            onPress={() => navigation.navigate('Description')}
            last
          />
        </View>

        {/* ── Section 2: Frequency & Measure By ──────────────────────── */}
        <View style={[s.section, { backgroundColor: colors.bgCard }]}>
          <Row
            label={t('wizard.frequency')}
            value={freqLabel}
            onPress={() => navigation.navigate('Frequency')}
          />
          <Row
            label={t('wizard.measureBy')}
            value={measureLabel}
            onPress={() => navigation.navigate('MeasureBy')}
            last
          />
        </View>

        {/* ── Section 3: Reminder ─────────────────────────────────────── */}
        <View style={[s.section, { backgroundColor: colors.bgCard }]}>
          <View style={[s.row, { backgroundColor: colors.bgCard, borderBottomColor: colors.separator }, !reminderEnabled && s.rowLast]}>
            <Text style={[s.rowLabel, { color: colors.text1 }]}>{t('wizard.reminder')}</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: colors.separatorLight, true: colors.teal }}
              thumbColor={colors.white}
            />
          </View>
          {reminderEnabled && (
            <Row
              label={t('wizard.timeLabel')}
              value={formatReminderSummary(reminderTime, frequency, reminderWeekdays, reminderDayOfMonth, t)}
              onPress={() => navigation.navigate('Reminder')}
              last
            />
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Name row: same line as other settings rows; tap to edit, ellipsis when collapsed ─

function NameRow({
  label,
  name,
  setName,
  emptyLabel,
}: {
  label: string;
  name: string;
  setName: (v: string) => void;
  emptyLabel: string;
}) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const empty = !name.trim();

  return (
    <View
      style={[
        s.row,
        { backgroundColor: colors.bgCard, borderBottomColor: colors.separator },
      ]}
    >
      <Text style={[s.rowLabel, { color: colors.text1 }]}>{label}</Text>
      {!editing ? (
        <Pressable
          onPress={() => setEditing(true)}
          style={({ pressed }) => [
            s.nameRowValueHit,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Text
            style={[s.nameRowValueText, { color: empty ? colors.chevron : colors.text2 }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {empty ? emptyLabel : name}
          </Text>
        </Pressable>
      ) : (
        <TextInput
          ref={inputRef}
          style={[s.nameRowInput, { color: colors.text1 }]}
          value={name}
          onChangeText={setName}
          placeholder={emptyLabel}
          placeholderTextColor={colors.chevron}
          onBlur={() => setEditing(false)}
          returnKeyType="done"
          onSubmitEditing={() => inputRef.current?.blur()}
          maxLength={40}
          autoFocus
          underlineColorAndroid="transparent"
        />
      )}
    </View>
  );
}

// ─── Row sub-component ────────────────────────────────────────────────────────

function Row({
  label, value, valueFaded = false, onPress, last = false,
}: {
  label: string;
  value: string;
  valueFaded?: boolean;
  onPress?: () => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        { backgroundColor: colors.bgCard, borderBottomColor: colors.separator },
        last && s.rowLast,
        pressed && { backgroundColor: colors.bgSecondary },
      ]}
    >
      <Text style={[s.rowLabel, { color: colors.text1 }]}>{label}</Text>
      <View style={s.rowRight}>
        <Text style={[s.rowValue, { color: colors.text2 }, valueFaded && { color: colors.chevron }]} numberOfLines={1}>
          {value}
        </Text>
        <ChevronRight size={20} color={colors.chevron} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingTop: 24, paddingBottom: 40 },

  nameRowValueHit: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  nameRowValueText: {
    fontSize: 17,
    width: '100%',
    textAlign: 'right',
  },
  nameRowInput: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16,
    fontSize: 17,
    textAlign: 'right',
    padding: 0,
  },

  // Section card
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 17, flexShrink: 0 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, marginLeft: 16 },
  rowValue: { fontSize: 17, flexShrink: 1 },
});
