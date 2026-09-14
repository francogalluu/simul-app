/**
 * MeasureByStep — pick Completion (boolean), Quantity (numeric), or Time (duration).
 * When Quantity is selected: target stepper + unit field.
 * When Time is selected: native iOS countdown wheel on iOS; inline hour+minute wheels on Android.
 */
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, TextInput,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Check, Minus, Plus } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WizardStackParamList } from '@/navigation/types';
import { useTheme } from '@/context/ThemeContext';
import { useWizardStore } from '@/store/wizardStore';
import { isMinuteUnit } from '@/lib/habitUnitLabel';
import {
  navHeaderBarPressable,
  navHeaderItemWrap,
  navHeaderLabelText,
} from '@/lib/navigationHeaderStyles';
import { DurationWheelPicker } from '@/components/DurationWheelPicker';

type Props = NativeStackScreenProps<WizardStackParamList, 'MeasureBy'>;

/** True when measure-by is "Time" (numeric + minute unit). */
function isTimeMode(kind: string, unit: string, unitKey: string | null): boolean {
  return kind === 'numeric' && isMinuteUnit(unit, unitKey);
}

const MAX_DURATION_MINUTES = 24 * 60; // 24 hours
/** Default duration when switching from quantity (count must not become minutes). */
const DEFAULT_DURATION_MINUTES = 30;

/** 2001-01-01 00:00 UTC in ms. Unpatched native sends ref + duration. */
const IOS_COUNTDOWN_REF_MS = 978307200 * 1000;

/**
 * Value for iOS countdown picker. Midnight-local + duration so the wheel shows correct
 * h/m in every timezone. Both the unpatched UIDatePicker (Expo Go) and our patched
 * `setDate:` extract duration from local-time hour/minute components of this date.
 */
function minutesToCountdownDate(minutes: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setTime(d.getTime() + Math.max(0, Math.floor(minutes)) * 60 * 1000);
  return d;
}

/** Midnight today (local) in ms. Used by minutesToCountdownDate and countdownTimestampToMinutes. */
function getMidnightTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local midnight for the calendar day of `dateMs` (same semantics as `Date` in local TZ). */
function getLocalMidnightMsForDate(dateMs: number): number {
  const d = new Date(dateMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function clampDurationMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || Number.isNaN(minutes) || minutes < 1) return 1;
  return Math.min(MAX_DURATION_MINUTES, minutes);
}

/**
 * iOS countdown onChange: native always sends `date.timeIntervalSince1970` in ms (Paper + Fabric).
 * The same `NSDate` can line up with different JS heuristics across Expo Go vs standalone builds
 * (calendar day vs "today", 24h edge). We try encodings in safe order and avoid the bad fallback
 * `timestamp / 60000` on wall-clock values (that produced a stuck 1440 = MAX).
 *
 * Encodings seen in the wild:
 * (A) duration in ms only (small), e.g. 120000 → 2 min
 * (B) 2001-01-01 UTC ref + duration
 * (C) local midnight (of the value's day) + duration — matches UIDatePicker countdown `date`
 * (D) Apple docs: time-of-day fields (H/M/S) encode the interval
 */
function countdownTimestampToMinutes(timestamp: number): number {
  const refMs = IOS_COUNTDOWN_REF_MS;
  const maxDurationMs = MAX_DURATION_MINUTES * 60 * 1000;
  const midnightToday = getMidnightTodayMs();

  // (B) Reference date + duration
  if (timestamp >= refMs && timestamp <= refMs + maxDurationMs) {
    return clampDurationMinutes(Math.round((timestamp - refMs) / 60000));
  }

  // (A) Raw duration in ms (0 .. 24h)
  if (timestamp >= 0 && timestamp <= maxDurationMs) {
    return clampDurationMinutes(Math.round(timestamp / 60000));
  }

  // 24h from *today* local midnight → next calendar midnight (delta-from-midnight alone reads as 0)
  if (Math.abs(timestamp - (midnightToday + maxDurationMs)) <= 60 * 1000) {
    return MAX_DURATION_MINUTES;
  }

  // Legacy: value still within "today" window (onChange at same calendar day as getMidnightTodayMs)
  if (timestamp >= midnightToday && timestamp <= midnightToday + maxDurationMs) {
    return clampDurationMinutes(Math.round((timestamp - midnightToday) / 60000));
  }

  // (C) Minutes since local midnight of the date represented by `timestamp` (works when the picker
  // day is not the same instant as `midnightToday`, and for absolute NSDate-style values)
  const midnightOfValue = getLocalMidnightMsForDate(timestamp);
  const minutesSinceLocalMidnight = Math.round((timestamp - midnightOfValue) / 60000);
  if (minutesSinceLocalMidnight >= 1 && minutesSinceLocalMidnight <= MAX_DURATION_MINUTES) {
    return minutesSinceLocalMidnight;
  }

  // (D) Time-of-day fields (local) — covers odd encodings; 24h still ambiguous as 00:00 next day
  const d = new Date(timestamp);
  const fromClock = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  const roundedClock = Math.round(fromClock);
  if (roundedClock >= 1 && roundedClock <= MAX_DURATION_MINUTES) {
    return roundedClock;
  }

  return clampDurationMinutes(minutesSinceLocalMidnight);
}

/** Split total minutes into hours and minutes (for Android stepper). */
function totalMinutesToHoursMinutes(total: number): { hours: number; minutes: number } {
  const t = Math.max(0, Math.floor(total));
  const hours = Math.min(24, Math.floor(t / 60));
  const minutes = hours === 24 ? 0 : t % 60;
  return { hours, minutes };
}

export default function MeasureByStep({ navigation }: Props) {
  const { t } = useTranslation();
  const headerHeight = useHeaderHeight();
  const { colors, isDark } = useTheme();
  const { kind, target, unit, unitKey, goalType, setKind, setTarget, setUnit, setUnitKey } = useWizardStore();
  const timeMode = isTimeMode(kind, unit, unitKey);
  /** When leaving quantity for time, stash count so switching back does not keep duration-as-count. */
  const quantityTargetBeforeTimeRef = useRef<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  /** Y offset of the quantity + unit block inside the scroll content (for keyboard scroll-into-view). */
  const quantityBlockY = useRef(0);

  const scrollQuantityIntoView = useCallback((which: 'target' | 'unit') => {
    const top = quantityBlockY.current;
    if (top <= 0) return;
    const lead = which === 'unit' ? 12 : 48;
    const delay = Platform.OS === 'ios' ? 80 : 120;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, top - lead), animated: true });
    }, delay);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('wizard.measureBy'),
      headerRight: () => (
        <View style={navHeaderItemWrap}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={navHeaderBarPressable}>
            <Text style={[navHeaderLabelText, { color: colors.teal }]}>{t('common.done')}</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, colors.teal, t]);

  const handleDecrement = () => setTarget(Math.max(1, target - 1));
  const handleIncrement = () => setTarget(target + 1);

  const [quantityInput, setQuantityInput] = useState<string | null>(null);
  const quantityDisplayValue = quantityInput !== null ? quantityInput : String(target);
  const onQuantityFocus = () => setQuantityInput(String(target));
  const onQuantityChange = (text: string) => {
    setQuantityInput(text.replace(/\D/g, ''));
  };
  const onQuantityBlur = () => {
    const n = quantityInput === '' ? 1 : Math.max(1, Math.min(999999, parseInt(quantityInput || '1', 10) || 1));
    setTarget(n);
    setQuantityInput(null);
  };

  const selectCompletion = () => setKind('boolean');
  const selectQuantity = () => {
    if (timeMode) {
      const restored = quantityTargetBeforeTimeRef.current;
      setTarget(restored != null ? Math.max(1, restored) : 1);
      quantityTargetBeforeTimeRef.current = null;
    }
    setKind('numeric');
    if (isMinuteUnit(unit, unitKey)) {
      setUnitKey(null);
      setUnit('');
    }
  };
  const selectTime = () => {
    const fromQuantity = kind === 'numeric' && !isTimeMode(kind, unit, unitKey);
    if (fromQuantity) {
      quantityTargetBeforeTimeRef.current = target;
    }
    setKind('numeric');
    setUnitKey('units.min');
    setUnit('min');
    if (fromQuantity) {
      setTarget(DEFAULT_DURATION_MINUTES);
    } else if (target < 1) {
      setTarget(DEFAULT_DURATION_MINUTES);
    }
  };

  const countdownValue = useMemo(() => minutesToCountdownDate(target), [target]);
  const onCountdownChange = (event: { nativeEvent?: { timestamp?: number } }) => {
    const ts = event?.nativeEvent?.timestamp;
    if (typeof ts === 'number') setTarget(countdownTimestampToMinutes(ts));
  };

  const { hours, minutes: mins } = useMemo(
    () => totalMinutesToHoursMinutes(target),
    [target],
  );
  const setDuration = (h: number, m: number) => {
    const total = h * 60 + m;
    setTarget(total < 1 ? 1 : Math.min(MAX_DURATION_MINUTES, total));
  };

  const showQuantityBlock = kind === 'numeric' && !timeMode;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={[s.scroll, showQuantityBlock && s.scrollWithKeyboard]}
        >
          <Text style={[s.helper, { color: colors.text2 }]}>{t('wizard.measureByHelper')}</Text>

          {/* ── Kind selector ──────────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: colors.bgCard }]}>
            {/* Completion */}
            <Pressable
              onPress={selectCompletion}
              style={({ pressed }) => [s.row, s.rowBorder, { borderBottomColor: colors.separator }, pressed && { backgroundColor: colors.bgAnalytics }]}
            >
              <View style={s.rowText}>
                <Text style={[s.label, { color: colors.text1 }]}>{t('wizard.completionOption')}</Text>
                <Text style={[s.desc, { color: colors.text2 }]}>{t('wizard.completionDesc')}</Text>
              </View>
              {kind === 'boolean' && (
                <View style={[s.checkCircle, { backgroundColor: colors.teal }]}>
                  <Check size={14} color={colors.white} strokeWidth={3} />
                </View>
              )}
            </Pressable>

            {/* Quantity */}
            <Pressable
              onPress={selectQuantity}
              style={({ pressed }) => [s.row, s.rowBorder, { borderBottomColor: colors.separator }, pressed && { backgroundColor: colors.bgAnalytics }]}
            >
              <View style={s.rowText}>
                <Text style={[s.label, { color: colors.text1 }]}>{t('wizard.quantityOption')}</Text>
                <Text style={[s.desc, { color: colors.text2 }]}>{t('wizard.quantityDesc')}</Text>
              </View>
              {kind === 'numeric' && !timeMode && (
                <View style={[s.checkCircle, { backgroundColor: colors.teal }]}>
                  <Check size={14} color={colors.white} strokeWidth={3} />
                </View>
              )}
            </Pressable>

            {/* Time */}
            <Pressable
              onPress={selectTime}
              style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.bgAnalytics }]}
            >
              <View style={s.rowText}>
                <Text style={[s.label, { color: colors.text1 }]}>{t('wizard.timeOption')}</Text>
                <Text style={[s.desc, { color: colors.text2 }]}>{t('wizard.timeDesc')}</Text>
              </View>
              {timeMode && (
                <View style={[s.checkCircle, { backgroundColor: colors.teal }]}>
                  <Check size={14} color={colors.white} strokeWidth={3} />
                </View>
              )}
            </Pressable>
          </View>

          {/* ── Target: Quantity (stepper + unit) ───────────────────────── */}
          {showQuantityBlock && (
            <View
              collapsable={false}
              onLayout={(e) => {
                quantityBlockY.current = e.nativeEvent.layout.y;
              }}
            >
              <Text style={[s.sectionLabel, { color: colors.text2 }]}>{t('wizard.target').toUpperCase()}</Text>
              <View style={[s.card, { backgroundColor: colors.bgCard }]}>
                <View style={[s.row, s.rowBorder, { borderBottomColor: colors.separator }]}>
                  <Text style={[s.label, { color: colors.text1 }]}>{goalType === 'break' ? t('wizard.dailyLimit') : t('wizard.dailyTarget')}</Text>
                  <View style={s.stepper}>
                    <Pressable onPress={handleDecrement} style={s.stepBtn}>
                      <Minus size={18} color={target <= 1 ? colors.chevron : colors.teal} strokeWidth={2.5} />
                    </Pressable>
                    <TextInput
                      style={[s.stepValueInput, { color: colors.text1 }]}
                      value={quantityDisplayValue}
                      onChangeText={onQuantityChange}
                      onFocus={() => {
                        onQuantityFocus();
                        scrollQuantityIntoView('target');
                      }}
                      onBlur={onQuantityBlur}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      maxLength={6}
                      selectTextOnFocus
                      accessibilityLabel={t('wizard.dailyTarget')}
                    />
                    <Pressable onPress={handleIncrement} style={s.stepBtn}>
                      <Plus size={18} color={colors.teal} strokeWidth={2.5} />
                    </Pressable>
                  </View>
                </View>
                <View style={[s.row]}>
                  <Text style={[s.label, { color: colors.text1 }]}>{t('wizard.unit')}</Text>
                  <TextInput
                    style={[s.unitInput, { color: colors.text2 }]}
                    value={unitKey ? t(unitKey) : unit}
                    onChangeText={(text) => setUnit(text, true)}
                    onFocus={() => scrollQuantityIntoView('unit')}
                    placeholder={t('wizard.unitPlaceholder')}
                    placeholderTextColor={colors.chevron}
                    returnKeyType="done"
                    maxLength={20}
                    textAlign="right"
                  />
                </View>
              </View>
            </View>
          )}

          {/* ── Target: Time — iOS native countdown wheel; Android hours+minutes stepper ───── */}
          {timeMode && (
            <>
              <Text style={[s.sectionLabel, { color: colors.text2 }]}>DURATION</Text>
              <View style={[s.card, { backgroundColor: colors.bgCard }]}>
                {Platform.OS === 'ios' ? (
                  <>
                    <View style={s.timePickerWrap}>
                      <DateTimePicker
                        value={countdownValue}
                        mode="countdown"
                        onChange={onCountdownChange}
                        display="spinner"
                        minuteInterval={1}
                        style={s.timePicker}
                        {...(Platform.OS === 'ios' && { themeVariant: isDark ? 'dark' : 'light' })}
                      />
                    </View>
                    <View style={[s.row, s.durationSummary, { borderTopColor: colors.separator }]}>
                      <Text style={[s.durationSummaryText, { color: colors.text2 }]}>{target} min</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={s.timePickerWrap}>
                      <DurationWheelPicker
                        hours={hours}
                        minutes={mins}
                        onChange={setDuration}
                        colors={{ teal: colors.teal, text2: colors.text2 }}
                      />
                    </View>
                    <View style={[s.row, s.durationSummary, { borderTopColor: colors.separator }]}>
                      <Text style={[s.durationSummaryText, { color: colors.text2 }]}>{target} min</Text>
                    </View>
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { paddingBottom: 40 },
  /** Extra space so the unit row can scroll above the keyboard when KAV inset is tight. */
  scrollWithKeyboard: { paddingBottom: 280 },

  helper: {
    fontSize: 15,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText:   { flex: 1 },
  label:     { fontSize: 17, fontWeight: '400' },
  desc:      { fontSize: 13, marginTop: 2 },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepBtn:   { padding: 4 },
  stepValue: {
    fontSize: 20, fontWeight: '600',
    minWidth: 36, textAlign: 'center',
  },
  stepValueInput: {
    fontSize: 20, fontWeight: '600',
    minWidth: 48, paddingVertical: 4, paddingHorizontal: 8,
    textAlign: 'center',
    borderWidth: 1, borderColor: 'transparent', borderRadius: 8,
  },

  // Unit input
  unitInput: {
    fontSize: 17,
    flex: 1,
    textAlign: 'right',
    paddingLeft: 16,
    paddingVertical: 0,
  },

  timePickerWrap: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  timePicker: {
    width: '100%',
    height: 180,
  },
  durationSummary: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  durationSummaryText: {
    fontSize: 15,
  },
});
