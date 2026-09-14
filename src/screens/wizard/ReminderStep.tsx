/**
 * ReminderStep — set the reminder time (HH:MM).
 * For weekly habits: also pick which weekdays to remind (1=Sun … 7=Sat).
 * For monthly habits: also pick day of month (1–31).
 * UI matches NotificationSettingsScreen: iOS uses DateTimePicker spinner, Android uses +/- steppers.
 */
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WizardStackParamList } from '@/navigation/types';
import { useTheme } from '@/context/ThemeContext';
import { useWizardStore } from '@/store/wizardStore';
import {
  navHeaderBarPressable,
  navHeaderItemWrap,
  navHeaderLabelText,
} from '@/lib/navigationHeaderStyles';

type Props = NativeStackScreenProps<WizardStackParamList, 'Reminder'>;

/** Expo: 1=Sunday … 7=Saturday */
const WEEKDAY_KEYS = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'] as const;

function pad(n: number) { return String(n).padStart(2, '0'); }

/** Format day of month as ordinal: 1 → "1st", 2 → "2nd", 31 → "31st". */
function dayOrdinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  const last = day % 10;
  if (last === 1) return `${day}st`;
  if (last === 2) return `${day}nd`;
  if (last === 3) return `${day}rd`;
  return `${day}th`;
}

function parseTime(hhmm: string): { h: number; m: number } {
  const [hStr, mStr] = hhmm.split(':');
  return { h: parseInt(hStr, 10), m: parseInt(mStr, 10) };
}

function formatDisplay(h: number): { h12: string; ampm: string } {
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { h12: String(h12), ampm };
}

export default function ReminderStep({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const frequency          = useWizardStore(s => s.frequency);
  const reminderTime      = useWizardStore(s => s.reminderTime);
  const reminderWeekdays  = useWizardStore(s => s.reminderWeekdays);
  const reminderDayOfMonth = useWizardStore(s => s.reminderDayOfMonth);
  const setReminderTime   = useWizardStore(s => s.setReminderTime);
  const setReminderWeekdays = useWizardStore(s => s.setReminderWeekdays);
  const setReminderDayOfMonth = useWizardStore(s => s.setReminderDayOfMonth);
  const [dayPickerVisible, setDayPickerVisible] = useState(false);

  const { h, m } = parseTime(reminderTime);
  const { h12, ampm } = formatDisplay(h);
  const formattedTime = `${h12}:${pad(m)} ${ampm}`;
  const timeValue = useMemo(() => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }, [h, m]);

  const setH = (newH: number) => setReminderTime(`${pad(newH)}:${pad(m)}`);
  const setM = (newM: number) => setReminderTime(`${pad(h)}:${pad(newM)}`);

  const incH = () => setH((h + 1) % 24);
  const decH = () => setH((h + 23) % 24);
  const incM = () => setM((m + 5) % 60);
  const decM = () => setM(Math.floor(m / 5) * 5 === m ? (m + 55) % 60 : Math.floor(m / 5) * 5);

  const changeTimeByMinutes = (deltaMinutes: number) => {
    const total = (h * 60 + m + deltaMinutes + 24 * 60) % (24 * 60);
    const nextH = Math.floor(total / 60);
    const nextM = total % 60;
    setReminderTime(`${pad(nextH)}:${pad(nextM)}`);
  };

  const handleTimePickerChange = (_event: unknown, date?: Date) => {
    if (!date) return;
    const nextH = date.getHours();
    const nextM = date.getMinutes();
    setReminderTime(`${pad(nextH)}:${pad(nextM)}`);
  };

  const toggleWeekday = (weekday: number) => {
    const has = reminderWeekdays.includes(weekday);
    if (has && reminderWeekdays.length <= 1) return;
    setReminderWeekdays(
      has ? reminderWeekdays.filter(w => w !== weekday) : [...reminderWeekdays, weekday].sort((a, b) => a - b),
    );
  };

  const previewText = useMemo(() => {
    if (frequency === 'weekly' && reminderWeekdays.length > 0) {
      const dayLabels = reminderWeekdays.map(w => t(`wizard.${WEEKDAY_KEYS[w - 1]}`)).join(', ');
      return t('wizard.reminderWeeklyPreview', { days: dayLabels, time: formattedTime });
    }
    if (frequency === 'monthly') {
      return t('wizard.reminderMonthlyPreview', { day: dayOrdinal(reminderDayOfMonth), time: formattedTime });
    }
    return t('wizard.reminderAt', { time: formattedTime });
  }, [frequency, reminderWeekdays, reminderDayOfMonth, formattedTime, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('wizard.reminderTime'),
      headerRight: () => (
        <View style={navHeaderItemWrap}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={navHeaderBarPressable}>
            <Text style={[navHeaderLabelText, { color: colors.teal }]}>{t('common.done')}</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, colors.teal, t]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={[s.helper, { color: colors.text2 }]}>{t('wizard.reminderHelper')}</Text>

        <View style={[s.card, { backgroundColor: colors.bgCard }]}>
          {Platform.OS === 'ios' ? (
            <View style={s.iosTimeSection}>
              <View style={s.rowText}>
                <Text style={[s.rowLabel, { color: colors.text1 }]}>{t('notifications.remindMeAt')}</Text>
                <Text style={[s.timeValue, { color: colors.text2 }]}>{formattedTime}</Text>
              </View>
              <View style={s.iosPickerWrap}>
                <DateTimePicker
                  value={timeValue}
                  mode="time"
                  onChange={handleTimePickerChange}
                  display="spinner"
                  minuteInterval={5}
                  themeVariant={isDark ? 'dark' : 'light'}
                  style={s.iosPicker}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={[s.row, s.rowTopBorder, { borderBottomColor: colors.separator }]}>
                <View style={s.rowText}>
                  <Text style={[s.rowLabel, { color: colors.text1 }]}>{t('notifications.remindMeAt')}</Text>
                </View>
                <View style={s.timeControls}>
                  <Pressable onPress={() => changeTimeByMinutes(-15)} hitSlop={8}>
                    <Text style={[s.stepper, { color: colors.teal }]}>−</Text>
                  </Pressable>
                  <Text style={[s.timeValue, { color: colors.teal }]}>{formattedTime}</Text>
                  <Pressable onPress={() => changeTimeByMinutes(15)} hitSlop={8}>
                    <Text style={[s.stepper, { color: colors.teal }]}>+</Text>
                  </Pressable>
                </View>
              </View>
              <View style={[s.androidStepperRow, { borderTopColor: colors.separator }]}>
                <TimeColumn value={h12} onInc={incH} onDec={decH} />
                <Text style={[s.colon, { color: colors.text1 }]}>:</Text>
                <TimeColumn value={pad(m)} onInc={incM} onDec={decM} />
                <View style={s.ampmCol}>
                  <Pressable
                    onPress={() => { if (h >= 12) setH(h - 12); }}
                    style={[s.ampmBtn, { backgroundColor: colors.bgSecondary }, h < 12 && [s.ampmBtnActive, { backgroundColor: colors.teal }]]}
                  >
                    <Text style={[s.ampmText, { color: colors.text2 }, h < 12 && { color: colors.white }]}>AM</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { if (h < 12) setH(h + 12); }}
                    style={[s.ampmBtn, { backgroundColor: colors.bgSecondary }, h >= 12 && [s.ampmBtnActive, { backgroundColor: colors.teal }]]}
                  >
                    <Text style={[s.ampmText, { color: colors.text2 }, h >= 12 && { color: colors.white }]}>PM</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>

        {frequency === 'weekly' && (
          <View style={s.weekdaySection}>
            <Text style={[s.weekdayLabel, { color: colors.text2 }]}>{t('wizard.reminderDaysLabel')}</Text>
            <View style={[s.weekdayCard, { backgroundColor: colors.bgCard }]}>
              <View style={s.weekdayRow}>
                {(WEEKDAY_KEYS as readonly string[]).map((key, i) => {
                  const weekday = i + 1;
                  const selected = reminderWeekdays.includes(weekday);
                  return (
                    <Pressable
                      key={weekday}
                      onPress={() => toggleWeekday(weekday)}
                      style={({ pressed }) => [
                        s.weekdayChip,
                        {
                          backgroundColor: selected ? colors.teal : colors.bgSecondary,
                          borderColor: selected ? colors.teal : colors.separator,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.weekdayChipText,
                          { color: selected ? colors.white : colors.text2 },
                        ]}
                      >
                        {t(`wizard.${key}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {frequency === 'monthly' && (
          <View style={[s.monthDaySection, { borderColor: colors.separator }]}>
            <Text style={[s.monthDayLabel, { color: colors.text1 }]}>{t('wizard.reminderDayOfMonthLabel')}</Text>
            <Pressable
              onPress={() => setDayPickerVisible(true)}
              style={[s.monthDayDropdown, { backgroundColor: colors.bgCard }]}
            >
              <Text style={[s.monthDayDropdownText, { color: colors.teal }]}>
                {dayOrdinal(reminderDayOfMonth)}
              </Text>
              <ChevronDown size={20} color={colors.text2} strokeWidth={2.5} />
            </Pressable>
            <Modal
              visible={dayPickerVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setDayPickerVisible(false)}
            >
              <Pressable style={s.modalOverlay} onPress={() => setDayPickerVisible(false)}>
                <Pressable style={[s.modalContent, { backgroundColor: colors.bgCard }]} onPress={() => {}}>
                  <View style={[s.modalHeader, { borderBottomColor: colors.separator }]}>
                    <Text style={[s.modalTitle, { color: colors.text1 }]}>
                      {t('wizard.reminderDayOfMonthLabel')}
                    </Text>
                  </View>
                  <FlatList
                    data={Array.from({ length: 31 }, (_, i) => i + 1)}
                    keyExtractor={(d) => String(d)}
                    style={s.dayList}
                    renderItem={({ item: day }) => (
                      <Pressable
                        onPress={() => {
                          setReminderDayOfMonth(day);
                          setDayPickerVisible(false);
                        }}
                        style={[s.dayOption, { borderBottomColor: colors.separator }]}
                      >
                        <Text
                          style={[
                            s.dayOptionText,
                            { color: reminderDayOfMonth === day ? colors.teal : colors.text1 },
                            reminderDayOfMonth === day && s.dayOptionTextSelected,
                          ]}
                        >
                          {dayOrdinal(day)}
                        </Text>
                      </Pressable>
                    )}
                  />
                </Pressable>
              </Pressable>
            </Modal>
          </View>
        )}

        <Text style={[s.preview, { color: colors.text2 }]}>{previewText}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function TimeColumn({ value, onInc, onDec }: { value: string; onInc: () => void; onDec: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={s.col}>
      <Pressable onPress={onInc} style={s.arrowBtn} hitSlop={8}>
        <ChevronUp size={28} color={colors.teal} strokeWidth={2.5} />
      </Pressable>
      <Text style={[s.timeNum, { color: colors.text1 }]}>{value}</Text>
      <Pressable onPress={onDec} style={s.arrowBtn} hitSlop={8}>
        <ChevronDown size={28} color={colors.teal} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  helper: {
    fontSize: 15,
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowTopBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flexShrink: 1 },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  timeValue: { fontSize: 16, fontWeight: '600' },
  timeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepper: { fontSize: 20, fontWeight: '600', paddingHorizontal: 4 },
  iosTimeSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iosPickerWrap: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  iosPicker: { width: '100%', height: 180 },
  androidStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  col: { alignItems: 'center', width: 64 },
  arrowBtn: { padding: 4 },
  timeNum: {
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 60,
    textAlign: 'center',
  },
  colon: { fontSize: 44, fontWeight: '700', marginBottom: 8, alignSelf: 'center' },
  ampmCol: { marginLeft: 12, gap: 8 },
  ampmBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  ampmBtnActive: {},
  ampmText: { fontSize: 15, fontWeight: '600' },
  weekdaySection: { marginTop: 24 },
  weekdayLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekdayCard: {
    borderRadius: 16,
    padding: 12,
    overflow: 'hidden',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  weekdayChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  weekdayChipText: { fontSize: 12, fontWeight: '600' },
  monthDaySection: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  monthDayLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  monthDayDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  monthDayDropdownText: { fontSize: 17, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  dayList: { maxHeight: 320 },
  dayOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayOptionText: { fontSize: 17 },
  dayOptionTextSelected: { fontWeight: '600' },
  preview: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 15,
  },
});
